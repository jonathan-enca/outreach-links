import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { Database } from "@/lib/supabase/database.types";

export interface PublicPlan {
  key: "starter" | "pro" | "business";
  name: string;
  priceEurCents: number;
  monthlySendCap: number;
  maxSites: number;
  maxMailboxes: number;
  monthlyAudits: number;
}

/** Offres payantes affichées en cartes ; le gratuit (aucun envoi) est un bandeau au-dessus. */
const KEYS = ["starter", "pro", "business"] as const;

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
    const { data, error } = await db
      .from("plans")
      .select(
        "key, name, price_eur_cents, monthly_send_cap, max_sites, max_mailboxes, monthly_audits, sort_order",
      )
      .order("sort_order");
    if (error || !data) return null;
    const plans = data
      .filter((p): p is typeof p & { key: PublicPlan["key"] } =>
        (KEYS as readonly string[]).includes(p.key),
      )
      .map((p) => ({
        key: p.key,
        name: p.name,
        priceEurCents: p.price_eur_cents,
        monthlySendCap: p.monthly_send_cap,
        maxSites: p.max_sites,
        maxMailboxes: p.max_mailboxes,
        monthlyAudits: p.monthly_audits,
      }));
    return plans.length === KEYS.length ? plans : null;
  } catch {
    return null;
  }
}

/** « 19,90 € » ; sans décimales si le prix est rond. */
export function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
