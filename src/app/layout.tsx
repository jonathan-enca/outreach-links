import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { env } from "@/env";
import { t } from "@/lib/messages";

const body = Outfit({
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
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
