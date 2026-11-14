import type { Metadata } from "next";
import { ShellPage } from "@/components/shell-page";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: t.pages.plan.title };

export default function Page() {
  return <ShellPage section="plan" />;
}
