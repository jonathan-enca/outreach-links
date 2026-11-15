import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { declareLinkAction } from "@/features/links/actions";
import { LinksSection } from "@/features/links/links-section";
import { listLinks } from "@/features/links/list";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.pages.liens.title };

async function Links() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const { rows, sites } = await listLinks(supabase);
  return <LinksSection rows={rows} sites={sites} declareAction={declareLinkAction} />;
}

export default function Page() {
  return (
    <>
      <PageHeader title={t.pages.liens.title} description={t.links.intro} />
      <Suspense>
        <Links />
      </Suspense>
    </>
  );
}
