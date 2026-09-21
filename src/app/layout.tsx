import type { Metadata } from "next";
import "./globals.css";
import "./omikuji.css";

export const metadata: Metadata = {
  title: "BDSF 寄り道おみくじ",
  description: "今の気分から、学園祭で立ち寄る企画を見つけるおみくじ",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
