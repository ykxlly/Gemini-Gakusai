// 裏動線「思い出」用フック。主フロー（S0〜S3）からは呼ばない。
// bookmark / card / narrate / chat / summary + しおりPNG出力。
// MemoriesSheet の遅延表示時にのみ使うこと。
"use client";

import { useState } from "react";
import type { HistoryEntry } from "@/hooks/usePersistentState";
import type { MemoryEntry, Result } from "@/lib/fortune";

export function useMemories(options: { result: Result | null; memories: MemoryEntry[]; history: HistoryEntry[] }) {
  const { result, memories, history } = options;
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

  function resetMemories() {
    setBookmark(null);
    setCard(null);
    setNarrationUrl(null);
    setChatMessages([]);
    setChatInput("");
    setSummaryText("");
  }

  async function generateCard(notify: (message: string) => void) {
    if (!result || isGeneratingCard) return;
    setIsGeneratingCard(true);
    try {
      const response = await fetch("/api/omikuji/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fortuneName: result.fortune_name,
          color: result.lucky_elements.color,
          spot: result.mission.target_spot,
        }),
      });
      if (!response.ok) throw new Error("card failed");
      const data = (await response.json()) as { phrase: string; accent_hex: string };
      setCard({ phrase: data.phrase, accentHex: data.accent_hex });
    } catch {
      setCard({ phrase: `${result.mission.target_spot}で、今日だけの発見を。`, accentHex: "#d83a2e" });
      notify("お守りカードを作りました");
    } finally {
      setIsGeneratingCard(false);
    }
  }

  async function playNarration(notify: (message: string) => void) {
    if (!result || isNarrating) return;
    setIsNarrating(true);
    try {
      const response = await fetch("/api/omikuji/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result.message }),
      });
      if (!response.ok) throw new Error("narrate failed");
      const data = (await response.json()) as { audio: string };
      setNarrationUrl(data.audio);
    } catch (narrationRequestError) {
      notify(narrationRequestError instanceof Error ? narrationRequestError.message : "通信エラーが発生しました。");
    } finally {
      setIsNarrating(false);
    }
  }

  async function sendChatMessage(message: string, notify: (text: string) => void) {
    const text = message.trim();
    if (!text || !result || isChatting) return;
    setIsChatting(true);
    const nextMessages: { role: "user" | "model"; text: string }[] = [...chatMessages, { role: "user" as const, text }];
    setChatMessages(nextMessages);
    setChatInput("");
    try {
      const response = await fetch("/api/omikuji/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(-6).map((entry) => ({ role: entry.role, text: entry.text })),
          fortuneName: result.fortune_name,
          missionTitle: result.mission.title,
        }),
      });
      if (!response.ok) throw new Error("chat failed");
      const data = (await response.json()) as { reply: string };
      setChatMessages([...nextMessages, { role: "model", text: data.reply }]);
    } catch {
      setChatMessages([
        ...nextMessages,
        { role: "model", text: `「${result.mission.target_spot}」を目指してみよう！会場案内や企画の詳細は現地表示も確認してね。` },
      ]);
      notify("案内モードで返信しました");
    } finally {
      setIsChatting(false);
    }
  }

  async function createBookmark(notify: (message: string) => void) {
    if (!result || memories.length === 0 || isCreatingBookmark) return;
    setIsCreatingBookmark(true);
    try {
      const response = await fetch("/api/omikuji/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fortuneName: result.fortune_name,
          memories: memories.map(({ caption, spot, area }) => ({ caption, spot, area })),
        }),
      });
      if (!response.ok) throw new Error("bookmark failed");
      const data = (await response.json()) as { title: string; closing_comment: string };
      setBookmark({ title: data.title, closingComment: data.closing_comment });
    } catch {
      setBookmark({
        title: "今日の寄り道しおり",
        closingComment: "今日見つけた小さな発見が、きっと次の楽しい寄り道につながります。",
      });
      notify("思い出しおりを作りました");
    } finally {
      setIsCreatingBookmark(false);
    }
  }

  async function exportBookmark() {
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
    let y = 340;
    for (const [index, memory] of memories.entries()) {
      const image = new window.Image();
      image.src = memory.image;
      await new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
      if (image.complete && image.naturalWidth) {
        const ratio = Math.min(940 / image.naturalWidth, 360 / image.naturalHeight);
        const width = image.naturalWidth * ratio;
        const height = image.naturalHeight * ratio;
        context.drawImage(image, 70, y, width, height);
        y += height + 26;
      }
      context.fillStyle = "#176b57";
      context.font = "700 25px sans-serif";
      context.fillText(`${index + 1}. ${memory.spot}`, 70, y);
      context.fillStyle = "#171714";
      context.font = "31px sans-serif";
      context.fillText(memory.caption, 70, y + 47);
      y += 105;
    }
    context.fillStyle = "#f2c84b";
    context.fillRect(55, Math.min(y + 15, 1660), 970, 3);
    context.fillStyle = "#5f5b51";
    context.font = "30px sans-serif";
    const words = Array.from(bookmark.closingComment);
    let line = "";
    let lineY = Math.min(y + 80, 1730);
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
  }

  async function fetchSummary(notify: (message: string) => void) {
    if (history.length < 2 || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const response = await fetch("/api/omikuji/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fortunes: history }),
      });
      if (!response.ok) throw new Error("summary failed");
      const data = (await response.json()) as { summary: string };
      setSummaryText(data.summary);
    } catch {
      setSummaryText(
        `今日は${history.length}回の寄り道を楽しみました。気になった企画へ向かった一歩が、今日だけの思い出になっています。`,
      );
      notify("今日のまとめを作りました");
    } finally {
      setIsSummarizing(false);
    }
  }

  return {
    bookmark, isCreatingBookmark, createBookmark, exportBookmark,
    card, isGeneratingCard, generateCard,
    narrationUrl, isNarrating, playNarration,
    chatMessages, chatInput, setChatInput, isChatting, sendChatMessage,
    summaryText, isSummarizing, fetchSummary,
    resetMemories,
  };
}
