import type { Metadata } from "next";
import { GuideIndex } from "@/features/mailboxes/guides/guide-index";
import { GUIDES_BASE } from "@/features/mailboxes/providers";
import { t } from "@/lib/messages";

const i = t.mailboxGuides.ui.index;

export const metadata: Metadata = {
  title: `${i.metaTitle} | ${t.app.name}`,
  description: i.description,
  alternates: { canonical: GUIDES_BASE },
};

export default function Page() {
  return <GuideIndex />;
}
