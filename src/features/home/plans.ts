import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { Database } from "@/lib/supabase/database.types";

export interface PublicPlan {
  key: "starter" | "pro" | "business";
  name: string;
  priceEurCents: number;
  priceAnnualEurCents: number;
  monthlySendCap: number;
  maxSites: number;
  maxMailboxes: number;
  monthlyCampaigns: number;
  dedicatedDomain: boolean;
  linkChecks: boolean;
  weeklyDigest: boolean;
}

/** Offres payantes affichées en cartes ; le gratuit (aucun envoi) est un bandeau au-dessus. */
const KEYS = ["starter", "pro", "business"] as const;

const SELECT =
  "key, name, price_eur_cents, price_annual_eur_cents, monthly_send_cap, max_sites, max_mailboxes, monthly_campaigns, dedicated_domain, link_checks, weekly_digest, sort_order";

/**
 * Offres payantes affichées sur la home : lues dans la table `plans` (lecture publique, aucune écriture).
 * Sans cookies, donc la page reste statique (revalidée). Une lecture impossible renvoie `null` :
 * la page n'affiche alors AUCUN prix, jamais une valeur de remplacement inventée.
 */
export async function getPublicPlans(): Promise<PublicPlan[] | null> {
  try {
    const db = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await db.from("plans").select(SELECT).order("sort_order");
    if (error || !data) return null;
    const plans = data
      .filter((p): p is typeof p & { key: PublicPlan["key"] } =>
        (KEYS as readonly string[]).includes(p.key),
      )
      .map((p) => ({
        key: p.key,
        name: p.name,
        priceEurCents: p.price_eur_cents,
        priceAnnualEurCents: p.price_annual_eur_cents,
        monthlySendCap: p.monthly_send_cap,
        maxSites: p.max_sites,
        maxMailboxes: p.max_mailboxes,
        monthlyCampaigns: p.monthly_campaigns,
        dedicatedDomain: p.dedicated_domain,
        linkChecks: p.link_checks,
        weeklyDigest: p.weekly_digest,
      }));
    return plans.length === KEYS.length ? plans : null;
  } catch {
    return null;
  }
}
