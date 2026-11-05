import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AJK Command Center 2026",
  description: "Sistem pengurusan jawatankuasa dan susulan tugasan – Hari Anugerah Ashabul Yamin 2026",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a1b3d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
