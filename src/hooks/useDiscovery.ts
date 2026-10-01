// S2: なぞなぞ判定・発見カメラ（POST /api/omikuji/verify）・印の管理。
// memories（写真3件・非永続）と discoveryCards（永続・交換条件）を更新する。
"use client";

import { useCallback, useMemo, useRef, useState, type ChangeEvent } from "react";
import { apiPost } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import {
  festivalSpots,
  isDiscoveryResult,
  normalizeAnswer,
  photoRallyPrompts,
  type DiscoveryCard,
  type DiscoveryResult,
  type MemoryEntry,
  type Result,
} from "@/lib/fortune";

function scaleImageToDataUrl(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): string | null {
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

export function useDiscovery(options: {
  result: Result | null;
  missionLocation: string;
  setDiscoveryCards: React.Dispatch<React.SetStateAction<DiscoveryCard[]>>;
  notify: (message: string) => void;
  onStampAcquired: () => void;
}) {
  const { result, missionLocation, setDiscoveryCards, notify, onStampAcquired } = options;
  const [missionComplete, setMissionComplete] = useState(false);
  const [riddleAnswer, setRiddleAnswer] = useState("");
  const [riddleResult, setRiddleResult] = useState<{ correct: boolean; feedback: string } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCheckingRiddle, setIsCheckingRiddle] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [photoRallyPrompt, setPhotoRallyPrompt] = useState(photoRallyPrompts[0]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);

  const checkingRef = useRef(false);
  const verifyingRef = useRef(false);
  const live = useRef({ result, missionLocation, missionComplete, photoPreview, onStampAcquired });
  live.current = { result, missionLocation, missionComplete, photoPreview, onStampAcquired };

  const resetDiscovery = useCallback(() => {
    checkingRef.current = false;
    verifyingRef.current = false;
    setMissionComplete(false);
    setRiddleAnswer("");
    setRiddleResult(null);
    setIsCheckingRiddle(false);
    setPhotoPreview(null);
    setIsVerifying(false);
    setDiscoveryResult(null);
    setPhotoRallyPrompt(photoRallyPrompts[Math.floor(Math.random() * photoRallyPrompts.length)]);
  }, []);

  const celebrateMission = useCallback(() => {
    setMissionComplete((current) => !current);
  }, []);

  const saveDiscovery = useCallback(
    (data: DiscoveryResult) => {
      const { result: current, missionLocation: area, missionComplete: done, photoPreview: preview, onStampAcquired: acquired } = live.current;
      if (!current || !preview) return;
      const targetSpot = current.mission.target_spot;
      setDiscoveryResult(data);
      setMemories((prev) =>
        [
          ...prev.filter((entry) => entry.image !== preview),
          { image: preview, caption: data.caption, spot: targetSpot, area: area || "会場" },
        ].slice(-3),
      );
      setDiscoveryCards((prev) =>
        [
          ...prev.filter((card) => card.spot !== targetSpot),
          { spot: targetSpot, title: data.card_title, message: data.card_message },
        ].slice(-24),
      );
      if (!done) {
        setMissionComplete(true);
        acquired();
      }
    },
    [setDiscoveryCards],
  );

  const checkRiddle = useCallback(async () => {
    const { result: current } = live.current;
    if (!current || checkingRef.current) return;
    const trimmed = riddleAnswer.trim();
    if (!trimmed) return;
    const answer = normalizeAnswer(trimmed);
    const expected = normalizeAnswer(current.mission.riddle_answer || "");
    if (expected && (answer === expected || (expected.length >= 2 && answer.includes(expected)))) {
      setRiddleResult({ correct: true, feedback: copy.mission.riddleCorrect });
      return;
    }
    checkingRef.current = true;
    setIsCheckingRiddle(true);
    try {
      const data = await apiPost<{ correct: boolean; feedback: string }>(
        "/api/omikuji/riddle",
        { riddle: current.mission.riddle, expectedAnswer: current.mission.riddle_answer, userAnswer: trimmed },
        { timeoutMs: 20_000, errorMessage: "答え合わせに失敗しました。" },
      );
      setRiddleResult({
        correct: data.correct === true,
        feedback: typeof data.feedback === "string" ? data.feedback : copy.mission.riddleFallbackHint,
      });
    } catch (error) {
      const correct = Boolean(expected && answer.includes(expected));
      setRiddleResult({
        correct,
        feedback: correct ? copy.mission.riddleFallbackCorrect : copy.mission.riddleFallbackHint,
      });
      notify(error instanceof Error ? error.message : copy.mission.riddleGentle);
    } finally {
      checkingRef.current = false;
      setIsCheckingRiddle(false);
    }
  }, [riddleAnswer, notify]);

  const handlePhotoSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 同一ファイルの再選択でも change が発火するようリセットする。
    event.target.value = "";
    if (!file) return;
    setDiscoveryResult(null);

    const fromBitmap = async (): Promise<string | null> => {
      if (typeof window.createImageBitmap !== "function") return null;
      const bitmap = await window.createImageBitmap(
        file,
        // EXIF Orientation を反映し、スマホ撮影の回転ズレを防ぐ。
        { imageOrientation: "from-image" } as ImageBitmapOptions,
      );
      try {
        return scaleImageToDataUrl(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    };

    const fromFileReader = (): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== "string") return reject(new Error("read failed"));
          const image = new window.Image();
          image.onload = () => {
            resolve(scaleImageToDataUrl(image, image.naturalWidth, image.naturalHeight) ?? reader.result as string);
          };
          image.onerror = () => resolve(reader.result as string);
          image.src = reader.result;
        };
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });

    (async () => {
      try {
        const dataUrl = (await fromBitmap()) ?? (await fromFileReader());
        setPhotoPreview(dataUrl);
      } catch {
        setPhotoPreview(null);
      }
    })();
  }, []);

  const createDiscoveryStamp = useCallback(async () => {
    const { result: current, photoPreview: preview } = live.current;
    if (!current || !preview || verifyingRef.current) return;
    const parts = preview.split(",");
    if (parts.length !== 2 || !parts[1]) {
      notify("写真を読み直してください。");
      return;
    }
    const mimeType = parts[0].match(/data:(.*);base64/)?.[1] || "image/jpeg";
    verifyingRef.current = true;
    setIsVerifying(true);
    try {
      const data = await apiPost<unknown>(
        "/api/omikuji/verify",
        {
          spot: current.mission.target_spot,
          missionDescription: current.mission.description,
          imageBase64: parts[1],
          mimeType,
          rallyPrompt: photoRallyPrompt,
        },
        { timeoutMs: 30_000, errorMessage: "発見スタンプを作れませんでした。" },
      );
      if (!isDiscoveryResult(data)) throw new Error("unexpected verify response");
      saveDiscovery(data);
      notify(copy.mission.photoSuccess(data.stamp_title, data.comment));
    } catch (verifyRequestError) {
      const targetSpot = current.mission.target_spot;
      const missionCategory = festivalSpots.find((spot) => spot.name === targetSpot)?.category;
      const nextSpot =
        festivalSpots.find((spot) => spot.name !== targetSpot && spot.category !== missionCategory) ||
        festivalSpots[0];
      saveDiscovery({
        stamp_title: copy.mission.photoFallbackTitle,
        comment: copy.mission.photoFallbackComment,
        caption: `${targetSpot}で見つけた今日の一枚`,
        rally_complete: false,
        card_title: "寄り道の記憶カード",
        card_message: "立ち止まって見つけた一枚が、今日だけの思い出になる。",
        next_spot: nextSpot.name,
      });
      notify(verifyRequestError instanceof Error ? verifyRequestError.message : copy.mission.photoFallbackToast);
      console.warn("Using local discovery fallback:", verifyRequestError);
    } finally {
      verifyingRef.current = false;
      setIsVerifying(false);
    }
  }, [photoRallyPrompt, saveDiscovery, notify]);

  return useMemo(
    () => ({
      missionComplete, celebrateMission,
      riddleAnswer, setRiddleAnswer, riddleResult, isCheckingRiddle, checkRiddle,
      photoPreview, setPhotoPreview, handlePhotoSelect,
      isVerifying, discoveryResult, photoRallyPrompt,
      memories, setMemories,
      resetDiscovery, saveDiscovery, createDiscoveryStamp,
    }),
    [
      missionComplete, celebrateMission,
      riddleAnswer, riddleResult, isCheckingRiddle, checkRiddle,
      photoPreview, handlePhotoSelect,
      isVerifying, discoveryResult, photoRallyPrompt,
      memories, resetDiscovery, saveDiscovery, createDiscoveryStamp,
    ],
  );
}
