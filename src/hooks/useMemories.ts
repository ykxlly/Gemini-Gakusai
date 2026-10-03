// 裏動線「思い出」用フック。主フロー（S0〜S3）からは呼ばない。
// bookmark / card / narrate / chat / summary + しおりPNG出力（テキスト版）。
// MemoriesSheet の遅延表示時にのみ使うこと。
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { apiPost } from "@/lib/api-client";
import type { HistoryEntry } from "@/hooks/usePersistentState";
import type { Result } from "@/lib/fortune";

const MAX_CHAT_TURNS = 30;

export function useMemories(options: { result: Result | null; history: HistoryEntry[] }) {
  const [bookmark, setBookmark] = useState<{ title: string; closingComment: string } | null>(null);
  const [isCreatingBookmark, setIsCreatingBookmark] = useState(false);
  const [card, setCard] = useState<{ phrase: string; accentHex: string } | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [narrationUrl, setNarrationUrl] = useState<string | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  const busyRef = useRef({ card: false, narration: false, chat: false, summary: false, bookmark: false });
  const live = useRef(options);
  live.current = options;
  const chatRef = useRef(chatMessages);
  chatRef.current = chatMessages;

  const resetMemories = useCallback(() => {
    busyRef.current = { card: false, narration: false, chat: false, summary: false, bookmark: false };
    setBookmark(null);
    setIsCreatingBookmark(false);
    setCard(null);
    setIsGeneratingCard(false);
    setNarrationUrl(null);
    setIsNarrating(false);
    setChatMessages([]);
    setChatInput("");
    setIsChatting(false);
    setSummaryText("");
    setIsSummarizing(false);
  }, []);

  const generateCard = useCallback(
    async (notify: (message: string) => void) => {
      const { result } = live.current;
      if (!result || busyRef.current.card) return;
      busyRef.current.card = true;
      setIsGeneratingCard(true);
      try {
        const data = await apiPost<{ phrase: unknown; accent_hex: unknown }>(
          "/api/omikuji/card",
          {
            fortuneName: result.fortune_name,
            color: result.lucky_elements.color,
            spot: result.mission.target_spot,
          },
          { timeoutMs: 20_000, errorMessage: "お守りカードの生成に失敗しました。" },
        );
        setCard({
          phrase:
            typeof data.phrase === "string" && data.phrase
              ? data.phrase
              : `${result.mission.target_spot}で、今日だけの発見を。`,
          accentHex: typeof data.accent_hex === "string" ? data.accent_hex : "#d83a2e",
        });
      } catch {
        setCard({ phrase: `${result.mission.target_spot}で、今日だけの発見を。`, accentHex: "#d83a2e" });
        notify("お守りカードを作りました");
      } finally {
        busyRef.current.card = false;
        setIsGeneratingCard(false);
      }
    },
    [],
  );

  const playNarration = useCallback(async (notify: (message: string) => void) => {
    const { result } = live.current;
    if (!result || busyRef.current.narration) return;
    busyRef.current.narration = true;
    setIsNarrating(true);
    try {
      const data = await apiPost<{ audio: unknown }>("/api/omikuji/narrate", { text: result.message }, {
        timeoutMs: 30_000,
        errorMessage: "音声の生成に失敗しました。",
      });
      if (typeof data.audio !== "string" || !data.audio) throw new Error("音声の生成に失敗しました。");
      setNarrationUrl(data.audio);
    } catch (narrationRequestError) {
      notify(narrationRequestError instanceof Error ? narrationRequestError.message : "通信エラーが発生しました。");
    } finally {
      busyRef.current.narration = false;
      setIsNarrating(false);
    }
  }, []);

  const sendChatMessage = useCallback(
    async (message: string, notify: (text: string) => void) => {
      const { result } = live.current;
      const text = message.trim();
      if (!text || !result || busyRef.current.chat) return;
      busyRef.current.chat = true;
      setIsChatting(true);
      const nextMessages = [...chatRef.current, { role: "user" as const, text }].slice(-MAX_CHAT_TURNS);
      setChatMessages(nextMessages);
      setChatInput("");
      try {
        const data = await apiPost<{ reply: unknown }>(
          "/api/omikuji/chat",
          {
            message: text,
            history: nextMessages.slice(0, -1).slice(-6).map((entry) => ({ role: entry.role, text: entry.text })),
            fortuneName: result.fortune_name,
            missionTitle: result.mission.title,
          },
          { timeoutMs: 30_000, errorMessage: "返信の取得に失敗しました。" },
        );
        const reply =
          typeof data.reply === "string" && data.reply
            ? data.reply
            : `「${result.mission.target_spot}」を目指してみよう！会場案内や企画の詳細は現地表示も確認してね。`;
        setChatMessages((current) => [...current, { role: "model" as const, text: reply }].slice(-MAX_CHAT_TURNS));
      } catch (error) {
        setChatMessages((current) =>
          [
            ...current,
            { role: "model" as const, text: `「${result.mission.target_spot}」を目指してみよう！会場案内や企画の詳細は現地表示も確認してね。` },
          ].slice(-MAX_CHAT_TURNS),
        );
        notify(error instanceof Error ? error.message : "案内モードで返信しました");
      } finally {
        busyRef.current.chat = false;
        setIsChatting(false);
      }
    },
    [],
  );

  const createBookmark = useCallback(async (notify: (message: string) => void) => {
    const { result } = live.current;
    if (!result || busyRef.current.bookmark) return;
    busyRef.current.bookmark = true;
    setIsCreatingBookmark(true);
    try {
      const data = await apiPost<{ title: unknown; closing_comment: unknown }>(
        "/api/omikuji/bookmark",
        {
          fortuneName: result.fortune_name,
          visits: [
            {
              spot: result.mission.target_spot,
              note: result.action_tip,
            },
          ],
        },
        { timeoutMs: 20_000, errorMessage: "しおりを作れませんでした。" },
      );
      setBookmark({
        title: typeof data.title === "string" && data.title ? data.title : "今日の寄り道しおり",
        closingComment:
          typeof data.closing_comment === "string" && data.closing_comment
            ? data.closing_comment
            : "今日見つけた小さな発見が、きっと次の楽しい寄り道につながります。",
      });
    } catch {
      setBookmark({
        title: "今日の寄り道しおり",
        closingComment: "今日見つけた小さな発見が、きっと次の楽しい寄り道につながります。",
      });
      notify("思い出しおりを作りました");
    } finally {
      busyRef.current.bookmark = false;
      setIsCreatingBookmark(false);
    }
  }, []);

  const exportBookmark = useCallback(async () => {
    const { result, history } = live.current;
    if (!bookmark || !result) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f7f4eb";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#d83a2e";
    context.fillRect(0, 0, canvas.width, 30);
    context.fillStyle = "#171714";
    context.font = "700 34px sans-serif";
    context.fillText("BDSF 2026 · 寄り道おみくじ", 70, 105);
    context.font = "700 62px serif";
    context.fillText(bookmark.title, 70, 205);
    context.font = "32px sans-serif";
    context.fillStyle = "#5f5b51";
    context.fillText(`運勢：${result.fortune_name}`, 70, 270);
    context.fillStyle = "#171714";
    context.font = "700 34px sans-serif";
    context.fillText(`今日の寄り道：${result.mission.target_spot}`, 70, 350);
    let y = 440;
    if (history.length > 0) {
      context.fillStyle = "#176b57";
      context.font = "700 30px sans-serif";
      context.fillText("今日引いた御神籤", 70, y);
      y += 60;
      context.fillStyle = "#171714";
      context.font = "30px sans-serif";
      for (const [index, entry] of history.slice(-5).entries()) {
        context.fillText(`${index + 1}. ${entry.fortune_name}`, 90, y);
        y += 52;
      }
      y += 20;
    }
    context.fillStyle = "#f2c84b";
    context.fillRect(55, Math.min(y, 1660), 970, 3);
    context.fillStyle = "#5f5b51";
    context.font = "30px sans-serif";
    const words = Array.from(bookmark.closingComment);
    let line = "";
    let lineY = Math.min(y + 70, 1730);
    for (const word of words) {
      if (lineY > 1880) break;
      if (context.measureText(line + word).width > 900) {
        context.fillText(line, 70, lineY);
        line = word;
        lineY += 45;
      } else line += word;
    }
    if (line && lineY <= 1880) context.fillText(line, 70, lineY);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], "bdsf-omide-shiori.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: bookmark.title, files: [file] });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [bookmark]);

  const fetchSummary = useCallback(async (notify: (message: string) => void) => {
    const { history } = live.current;
    if (history.length < 2 || busyRef.current.summary) return;
    busyRef.current.summary = true;
    setIsSummarizing(true);
    try {
      const data = await apiPost<{ summary: unknown }>(
        "/api/omikuji/summary",
        { fortunes: history },
        { timeoutMs: 30_000, errorMessage: "まとめの生成に失敗しました。" },
      );
      setSummaryText(
        typeof data.summary === "string" && data.summary
          ? data.summary
          : `今日は${history.length}回の寄り道を楽しみました。気になった企画へ向かった一歩が、今日だけの思い出になっています。`,
      );
    } catch {
      setSummaryText(
        `今日は${history.length}回の寄り道を楽しみました。気になった企画へ向かった一歩が、今日だけの思い出になっています。`,
      );
      notify("今日のまとめを作りました");
    } finally {
      busyRef.current.summary = false;
      setIsSummarizing(false);
    }
  }, []);

  return useMemo(
    () => ({
      bookmark, isCreatingBookmark, createBookmark, exportBookmark,
      card, isGeneratingCard, generateCard,
      narrationUrl, isNarrating, playNarration,
      chatMessages, chatInput, setChatInput, isChatting, sendChatMessage,
      summaryText, isSummarizing, fetchSummary,
      resetMemories,
    }),
    [
      bookmark, isCreatingBookmark, createBookmark, exportBookmark,
      card, isGeneratingCard, generateCard,
      narrationUrl, isNarrating, playNarration,
      chatMessages, chatInput, isChatting, sendChatMessage,
      summaryText, isSummarizing, fetchSummary,
      resetMemories,
    ],
  );
}
