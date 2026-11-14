import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { createSiteAction } from "@/features/sites/actions";
import { SiteForm } from "@/features/sites/site-form";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: t.sites.newTitle };

export default function Page() {
  return (
    <>
      <PageHeader title={t.sites.newTitle} description={t.sites.description} />
      <Card className="p-6">
        <SiteForm action={createSiteAction} submitLabel={t.sites.create} />
      </Card>
      <p className="mt-4">
        <Link href="/app/site" className="text-primary underline">
          {t.sites.back}
        </Link>
      </p>
    </>
  );
}
