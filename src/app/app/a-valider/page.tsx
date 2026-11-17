import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadOverview } from "@/features/shell/overview";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

const V = t.toValidate;
export const metadata: Metadata = { title: V.title };

/**
 * « À valider » (première version) : ce qui attend l'accord de la personne, regroupé par nature, avec
 * un accès direct à l'écran où on le traite. La file unique (approuver, modifier, passer sur place) de
 * la maquette viendra remplacer ces trois renvois.
 */
async function Queue() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const o = await loadOverview(supabase);
  const plan = o.campaigns.find((c) => c.auditId && c.validated > 0) ?? null;
  const blocks = [
    {
      n: o.pending.replies,
      copy: V.replies,
      href: "/app/inbox",
    },
    {
      n: o.pending.drafts,
      copy: V.drafts,
      href: plan?.auditId ? `/app/audit/${plan.auditId}/plan` : "/app/campagnes",
    },
    { n: o.pending.forms, copy: V.forms, href: "/app/taches" },
  ].filter((b) => b.n > 0);
  if (blocks.length === 0) return <Card className="p-6 text-muted-foreground">{V.none}</Card>;
  return (
    <ul className="flex flex-col gap-4">
      {blocks.map((b) => (
        <li key={b.href}>
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <h2 className="font-semibold">
                {b.copy.title}{" "}
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {b.n}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">{b.copy.body(b.n)}</p>
            </div>
            <Button asChild size="sm">
              <Link href={b.href}>{b.copy.cta}</Link>
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          {V.eyebrow}
        </p>
        <h1 className="font-display text-2xl font-bold">{V.title}</h1>
        <p className="max-w-2xl text-muted-foreground">{V.description}</p>
      </div>
      <Suspense>
        <Queue />
      </Suspense>
    </div>
  );
}
