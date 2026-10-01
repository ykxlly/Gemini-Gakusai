// S2: なぞなぞ判定・発見カメラ（POST /api/omikuji/verify）・印の管理。
// memories（写真3件・非永続）と discoveryCards（永続・交換条件）を更新する。
"use client";

import { useState, type ChangeEvent } from "react";
import { copy } from "@/lib/copy";
import {
  festivalSpots,
  normalizeAnswer,
  photoRallyPrompts,
  type DiscoveryCard,
  type DiscoveryResult,
  type MemoryEntry,
  type Result,
} from "@/lib/fortune";

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
  const [isCheckingRiddle, setIsCheckingRiddle] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [photoRallyPrompt, setPhotoRallyPrompt] = useState(photoRallyPrompts[0]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);

  function resetDiscovery() {
    setMissionComplete(false);
    setRiddleAnswer("");
    setRiddleResult(null);
    setPhotoPreview(null);
    setDiscoveryResult(null);
    setPhotoRallyPrompt(photoRallyPrompts[Math.floor(Math.random() * photoRallyPrompts.length)]);
  }

  function celebrateMission() {
    if (missionComplete) {
      setMissionComplete(false);
      return;
    }
    setMissionComplete(true);
  }

  async function checkRiddle() {
    if (!result || !riddleAnswer.trim() || isCheckingRiddle) return;
    const answer = normalizeAnswer(riddleAnswer);
    const expected = normalizeAnswer(result.mission.riddle_answer || "");
    if (expected && (answer === expected || (expected.length >= 2 && answer.includes(expected)))) {
      setRiddleResult({ correct: true, feedback: copy.mission.riddleCorrect });
      return;
    }
    setIsCheckingRiddle(true);
    try {
      const response = await fetch("/api/omikuji/riddle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riddle: result.mission.riddle,
          expectedAnswer: result.mission.riddle_answer,
          userAnswer: riddleAnswer,
        }),
      });
      if (!response.ok) throw new Error("riddle check failed");
      setRiddleResult((await response.json()) as { correct: boolean; feedback: string });
    } catch {
      const correct = Boolean(expected && answer.includes(expected));
      setRiddleResult({
        correct,
        feedback: correct ? copy.mission.riddleFallbackCorrect : copy.mission.riddleFallbackHint,
      });
      notify(copy.mission.riddleGentle);
    } finally {
      setIsCheckingRiddle(false);
    }
  }

  function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setDiscoveryResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const image = new window.Image();
      image.onload = () => {
        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) return setPhotoPreview(reader.result as string);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setPhotoPreview(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => setPhotoPreview(reader.result as string);
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function saveDiscovery(data: DiscoveryResult) {
    if (!result || !photoPreview) return;
    const preview = photoPreview;
    const targetSpot = result.mission.target_spot;
    setDiscoveryResult(data);
    setMemories((current) =>
      [
        ...current.filter((entry) => entry.image !== preview),
        { image: preview, caption: data.caption, spot: targetSpot, area: missionLocation || "会場" },
      ].slice(-3),
    );
    setDiscoveryCards((current) =>
      [
        ...current.filter((card) => card.spot !== targetSpot),
        { spot: targetSpot, title: data.card_title, message: data.card_message },
      ].slice(-24),
    );
    if (!missionComplete) {
      setMissionComplete(true);
      onStampAcquired();
    }
  }

  async function createDiscoveryStamp() {
    if (!result || !photoPreview || isVerifying) return;
    const targetSpot = result.mission.target_spot;
    const [meta, base64] = photoPreview.split(",");
    const mimeType = meta.match(/data:(.*);base64/)?.[1] || "image/jpeg";
    setIsVerifying(true);
    try {
      const response = await fetch("/api/omikuji/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spot: targetSpot,
          missionDescription: result.mission.description,
          imageBase64: base64,
          mimeType,
          rallyPrompt: photoRallyPrompt,
        }),
      });
      if (!response.ok) throw new Error("discovery stamp failed");
      const data = (await response.json()) as DiscoveryResult;
      saveDiscovery(data);
      notify(copy.mission.photoSuccess(data.stamp_title, data.comment));
    } catch (verifyRequestError) {
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
      notify(copy.mission.photoFallbackToast);
      console.warn("Using local discovery fallback:", verifyRequestError);
    } finally {
      setIsVerifying(false);
    }
  }

  return {
    missionComplete, celebrateMission,
    riddleAnswer, setRiddleAnswer, riddleResult, isCheckingRiddle, checkRiddle,
    photoPreview, setPhotoPreview, handlePhotoSelect,
    isVerifying, discoveryResult, photoRallyPrompt,
    memories, setMemories,
    resetDiscovery, saveDiscovery, createDiscoveryStamp,
  };
}
