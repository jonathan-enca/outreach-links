import type { Metadata } from "next";
import { LegalPage } from "@/features/home/legal-page";
import { t } from "@/lib/messages";

const doc = t.legalPages.notice;

export const metadata: Metadata = {
  title: `${doc.title} | ${t.app.name}`,
  description: doc.description,
  alternates: { canonical: "/mentions-legales" },
};

export default function Page() {
  return <LegalPage doc={doc} />;
}
