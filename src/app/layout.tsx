import type { Metadata, Viewport } from "next";
import { Dela_Gothic_One, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";
import "./omikuji.css";

// 日本語Webフォントは重い: preloadなし + display swap + 最大2種類。
// 見出し・ボタン・数字: 祭りポスター系 / 本文: 丸ゴシック（可読性優先）。
const displayFont = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-display-loaded",
});

const sansFont = Zen_Maru_Gothic({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-sans-loaded",
});

export const metadata: Metadata = {
  title: "BDSF 寄り道おみくじ",
  description: "今の気分から、学園祭で立ち寄る企画を見つけるおみくじ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "寄り道おみくじ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f4eb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${displayFont.variable} ${sansFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
