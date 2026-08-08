import type { Metadata } from "next";
import "./globals.css";
import "./title.css";

export const metadata: Metadata = {
  title: "まなプラン｜卒業クエスト",
  description: "履修登録と単位管理を冒険に変える、RPG風の履修サポートサイトです。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
