import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/env";
import { t } from "@/lib/messages";

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: t.app.name,
  description: t.app.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
