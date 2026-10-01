// サイト共通クローム: ヘッダー・フッター・トースト・紙吹雪。
"use client";

import Image from "next/image";
import type { ConfettiPiece } from "@/hooks/useCelebration";
import { copy } from "@/lib/copy";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label={`${copy.site.title} トップ`}>
        <span className="brand-mark">
          <Image alt="" height={38} priority src="/sparkle-clean.png" unoptimized width={38} />
        </span>
        <span>
          {copy.site.festival}
          <br />
          <strong>寄り道おみくじ</strong>
        </span>
      </a>
      <span className="festival-tag">{copy.site.boothLabel}</span>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      {copy.site.title} <span>·</span> 学園祭を楽しむためのエンターテインメントです
    </footer>
  );
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div aria-live="polite" className="toast" role="status">
      {message}
    </div>
  );
}

export function ConfettiLayer({ pieces }: { pieces: ConfettiPiece[] }) {
  if (pieces.length === 0) return null;
  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          className="confetti-piece"
          key={piece.id}
          style={{
            left: `${piece.left}%`,
            background: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
