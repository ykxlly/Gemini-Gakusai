import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./omikuji.css";

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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f7f4eb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
