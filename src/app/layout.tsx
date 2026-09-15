import type { Metadata } from "next";
import "./globals.css";
import "./omikuji.css";

export const metadata: Metadata = {
  title: "超パーソナルAIおみくじ",
  description: "学園祭を楽しむためのエンタメおみくじ",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}