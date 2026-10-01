// ブース集客用デジタルポスター（印刷・縦型サイネージ兼用）。
// 閲覧URL: /poster。印刷ボタンでA4縦1枚に出力できる。
"use client";

import { Bell, Gift, MapPin, QrCode, ScrollText, Sparkles } from "lucide-react";
import Image from "next/image";

const steps = [
  { no: "STEP 1", title: "スマホで鈴を鳴らす！", icon: Bell },
  { no: "STEP 2", title: "AIおみくじを授かる！", icon: ScrollText },
  { no: "STEP 3", title: "指定のスポットへGO！", icon: MapPin },
  { no: "STEP 4", title: "ノベルティGET！", icon: Gift },
];

export default function BoothPosterPage() {
  return (
    <main className="min-h-screen bg-neutral-800 py-6 px-4 print:bg-white print:p-0">
      <article className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-amber-50 text-gray-800 shadow-2xl print:min-h-0 print:rounded-none print:shadow-none">
        {/* 和紙テクスチャ */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgba(120, 90, 40, .07) 1px, transparent 1.2px)",
            backgroundSize: "6px 6px",
          }}
        />
        {/* 朱の天地ライン */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-2 bg-red-700" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2 bg-red-700" />

        <div className="relative flex flex-1 flex-col items-center px-6 pb-6 pt-8 text-center sm:px-10">
          {/* ヘッダー */}
          <p className="text-xs font-bold tracking-[0.3em] text-gray-500">
            関西大学 BDSF 寄り道おみくじ
          </p>

          {/* メインキャッチ */}
          <h1
            className="mt-4 font-serif text-5xl font-black leading-tight text-gray-800 sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            AIが導く、
            <br />
            <span className="text-red-700">あなただけの寄り道。</span>
          </h1>

          {/* サブキャッチ */}
          <p className="mt-4 max-w-md text-sm font-bold leading-relaxed text-gray-700 sm:text-base">
            今の気分で引く、次世代おみくじ！ミッションクリアで限定グッズもGET🎁
          </p>

          {/* ビジュアル＆QRエリア */}
          <div className="mt-6 flex w-full flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
            {/* マスコット */}
            <div className="relative">
              <div className="absolute -left-3 -top-3 rotate-[-8deg] rounded-full bg-red-700 px-3 py-1 text-xs font-black text-white shadow-lg">
                ここからスタート！
              </div>
              <div className="overflow-hidden rounded-full border-4 border-red-700 bg-white shadow-xl">
                <Image
                  alt="寄り道おみくじの案内キャラクター"
                  height={220}
                  priority
                  src="/mascot-clean.png"
                  unoptimized
                  width={220}
                />
              </div>
              <p className="mt-1 text-2xl" aria-hidden="true">
                👹✨
              </p>
            </div>

            {/* QR */}
            <div className="flex flex-col items-center">
              <div className="flex h-48 w-48 items-center justify-center rounded-xl border-4 border-gray-800 bg-white shadow-lg">
                <QrCode size={140} className="text-gray-800" strokeWidth={1.5} />
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs font-black tracking-wider text-gray-700">
                <Sparkles size={14} className="text-red-700" />
                スマホで読み取ってスタート
              </p>
            </div>
          </div>

          {/* 体験フロー */}
          <div className="mt-8 grid w-full grid-cols-2 gap-3">
            {steps.map((step) => (
              <div
                key={step.no}
                className="flex flex-col items-center rounded-xl border border-amber-200 bg-white/80 px-2 py-4 shadow"
              >
                <span className="rounded-full bg-red-700 px-3 py-0.5 text-[11px] font-black tracking-widest text-white">
                  {step.no}
                </span>
                <step.icon size={26} className="mt-2 text-red-700" />
                <p className="mt-1 text-sm font-black leading-snug text-gray-800">{step.title}</p>
              </div>
            ))}
          </div>

          {/* フッター */}
          <p className="mt-6 text-[11px] font-bold tracking-widest text-gray-500">
            吹田みらいキャンパス祭 BDSF 2026 ・ 御神籤授与所
          </p>

          <button
            type="button"
            onClick={() => window.print()}
            className="mt-4 rounded-full bg-gray-800 px-6 py-2 text-sm font-bold text-white shadow transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 print:hidden"
          >
            このポスターを印刷する
          </button>
        </div>
      </article>
    </main>
  );
}
