import type { Metadata } from "next";

/** Pages de démonstration (données d'exemple) : jamais indexées. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
