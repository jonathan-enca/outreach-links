import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Target } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  approveMessagesAction,
  completeFormAction,
  draftMissingAction,
  editMessageAction,
  refuseItemsAction,
} from "@/features/approvals/actions";
import { loadQueue } from "@/features/approvals/service";
import { CiblesScreen } from "@/features/cibles/cibles-screen";
import { parseTab } from "@/features/cibles/model";
import { loadOverview } from "@/features/shell/overview";
import { loadTargets } from "@/features/targets/service";
import { validateRequestsAction } from "@/features/targets/actions";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const C = t.ciblesScreen;
export const metadata: Metadata = { title: C.title };

/**
 * « Cibles » : une campagne à la fois (un site et son analyse). Le choix de campagne passe par
 * l'adresse (`?campagne=`), l'onglet par `?onglet=`.
 */
async function Cibles({
  searchParams,
}: {
  searchParams: Promise<{ campagne?: string; onglet?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const overview = await loadOverview(supabase);
  const campaigns = overview.campaigns
    .filter((c) => c.auditId)
    .map((c) => ({ siteId: c.siteId, domain: c.domain, auditId: c.auditId as string }));
  if (campaigns.length === 0)
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState icon={Target} title={C.title} body={C.empty} />
        <Button asChild>
          <Link href="/app/campagnes">{C.emptyCta}</Link>
        </Button>
      </div>
    );
  const campaign = campaigns.find((c) => c.siteId === sp.campagne) ?? campaigns[0];

  const [view, queue] = await Promise.all([
    loadTargets(supabase, createServiceClient, campaign.auditId, { previews: false }),
    loadQueue(supabase, new Date(), campaign.siteId),
  ]);
  if (!view) redirect("/app/campagnes");

  return (
    <CiblesScreen
      campaigns={campaigns.map(({ siteId, domain }) => ({ siteId, domain }))}
      selectedSiteId={campaign.siteId}
      initialTab={parseTab(sp.onglet)}
      view={view}
      queue={queue}
      actions={{
        validate: validateRequestsAction.bind(null, campaign.auditId),
        approveMessages: approveMessagesAction,
        editMessage: editMessageAction,
        refuseItems: refuseItemsAction,
        completeForm: completeFormAction,
        // La rédaction ne touche que les cibles validées de cette campagne.
        draftMissing: draftMissingAction.bind(null, campaign.siteId),
      }}
    />
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ campagne?: string; onglet?: string }>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={C.title} description={C.description} />
      <Suspense>
        <Cibles searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
