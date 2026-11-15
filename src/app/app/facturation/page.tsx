import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { env } from "@/env";
import { checkoutAction, portalAction } from "@/features/billing/actions";
import { BillingSection } from "@/features/billing/billing-section";
import { getBillingOverview } from "@/features/billing/service";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.billing.title };

async function Billing({ params }: { params: Promise<{ erreur?: string; paiement?: string }> }) {
  const { erreur, paiement } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const overview = await getBillingOverview(supabase);
  if (!overview) return <p className="text-muted-foreground">{t.billing.noWorkspace}</p>;
  return (
    <div className="flex flex-col gap-4">
      {erreur ? (
        <p role="alert" className="rounded-md border border-destructive p-3 text-sm">
          {erreur}
        </p>
      ) : null}
      {paiement === "ok" ? (
        <p role="status" className="rounded-md border border-border p-3 text-sm">
          {t.billing.paymentOk}
        </p>
      ) : null}
      <BillingSection
        overview={overview}
        checkout={checkoutAction}
        portal={portalAction}
        testMode={!env.STRIPE_SECRET_KEY}
      />
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; paiement?: string }>;
}) {
  return (
    <>
      <PageHeader title={t.billing.title} description={t.billing.description} />
      <Suspense>
        <Billing params={searchParams} />
      </Suspense>
    </>
  );
}
