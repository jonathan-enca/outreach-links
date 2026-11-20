import type { SupabaseClient } from "@supabase/supabase-js";
import { citedCount } from "@/features/brand/brand-fields";
import { getLatestBrandProfile } from "@/features/brand/service";
import type { StoredBrandProfile } from "@/features/brand/schema";
import { readSearchConsoleStatus } from "@/features/search-console/load";
import type { Database } from "@/lib/supabase/database.types";
import { t } from "@/lib/messages";
import { createServiceClient } from "@/lib/supabase/service";

type Client = SupabaseClient<Database>;

/** Ligne de résumé de l'étape 1 : adresse · pays · objectif · Search Console connectée. */
export function siteLine(
  site: { domain: string; country: string | null; goal: string },
  searchConsole: boolean,
): string {
  const f = t.onboarding.flow;
  const countries = t.sites.countries as Record<string, string>;
  const goal = f.goal[site.goal as keyof typeof f.goal] ?? f.goal.autorite_generale;
  return [
    site.domain,
    countries[site.country ?? "FR"] ?? site.country,
    goal,
    searchConsole ? f.scConnected : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Ligne de résumé de l'étape 2 : thème · pages proposées · types de sites cherchés. */
export function verifyLine(theme: string, brand: StoredBrandProfile | null, domain: string) {
  const f = t.onboarding.flow;
  const pages = citedCount(brand, domain);
  const types = (brand?.profile.publisher_types ?? []).filter((x) => x.active !== false).length;
  return [
    theme,
    pages <= 1 ? f.summaryHomeOnly : f.summaryPages(pages),
    types > 0 ? f.summaryTypes(types) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Ligne de résumé de l'étape 3 : la première façon d'écrire le nom · le ton. */
export function youLine(brand: StoredBrandProfile | null): string {
  const f = t.onboarding.flow;
  const name = brand?.profile.name_variants[0] ?? "";
  const tone = brand?.profile.tone?.trim() ?? "";
  return [name, tone ? f.summaryTone(tone) : ""].filter(Boolean).join(" · ");
}

/** Résumé de l'étape 1 sur l'écran des étapes 2 et 3 (la connexion n'est lisible que par le service). */
export async function siteSummary(
  siteId: string,
  site: { domain: string; country: string | null; goal: string },
): Promise<string> {
  const status = await readSearchConsoleStatus(createServiceClient(), siteId);
  return siteLine(site, Boolean(status));
}

/** Les trois lignes des étapes repliées, au-dessus de l'analyse (étape 4). */
export async function journeySummaries(
  supabase: Client,
  siteId: string,
): Promise<{ site: string; verify: string; you: string } | null> {
  const { data: site } = await supabase
    .from("sites")
    .select("id, domain, country, goal, niche")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return null;
  const [brand, status] = await Promise.all([
    getLatestBrandProfile(supabase, siteId),
    readSearchConsoleStatus(createServiceClient(), siteId),
  ]);
  return {
    site: siteLine(site, Boolean(status)),
    verify: verifyLine(site.niche ?? "", brand, site.domain),
    you: youLine(brand),
  };
}
