import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { startFromUrlAction } from "@/features/onboarding/actions";
import { UrlForm } from "@/features/onboarding/url-form";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: t.onboarding.title };

export default function Page() {
  return (
    <>
      <PageHeader title={t.onboarding.title} description={t.onboarding.description} />
      <Card className="p-6">
        <UrlForm action={startFromUrlAction} />
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">
        {t.onboarding.advanced}{" "}
        <Link href="/app/site/nouveau" className="text-primary underline">
          {t.onboarding.advancedLink}
        </Link>
      </p>
    </>
  );
}
