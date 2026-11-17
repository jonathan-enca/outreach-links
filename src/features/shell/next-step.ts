import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** Les cinq étapes du fil commun (MU.2) : `messages/fr.ts > journey.steps`, dans cet ordre. */
export const JOURNEY_STEPS = ["site", "verification", "vous", "analyse", "cibles"] as const;
export type JourneyStep = (typeof JOURNEY_STEPS)[number];

/** Ce que `nextStep` sait d'un site : le dernier audit (s'il existe) suffit à décider. */
export interface SiteSnapshot {
  id: string;
  domain: string;
  /** Pays de la campagne (une campagne = un site × un pays). */
  country?: string | null;
  /** Dernier audit du site, ou null si la personne n'a pas encore lancé l'analyse. */
  audit: {
    id: string;
    status: string;
    analysisStatus: string;
  } | null;
}

export type NextStepKind = "onboarding" | "analyse" | "reprise" | "cibles";

export interface NextStep {
  kind: NextStepKind;
  /** Adresse de l'écran où la personne doit être. */
  href: string;
  /** Étape du fil (`JOURNEY_STEPS`) que cet écran illustre. */
  step: JourneyStep;
}

/** Adresses d'un site (une seule source : les anciennes adresses par audit redirigent ici). */
export const siteHref = {
  analyse: (siteId: string) => `/app/site/${siteId}/analyse`,
  cibles: (siteId: string) => `/app/site/${siteId}/cibles`,
  etatDesLieux: (siteId: string) => `/app/site/${siteId}/etat-des-lieux`,
  relecture: (siteId: string) => `/app/demarrer/${siteId}`,
};
export const START_HREF = "/app/demarrer";

/**
 * La prochaine étape d'un site, et rien d'autre (docs/jalon-mu.md 3.2) :
 * pas d'audit → relecture (onboarding en cours) ; analyse lancée ou en attente de confirmation →
 * écran d'analyse ; analyse en échec → écran d'analyse (bouton « Reprendre ») ; analyse finie
 * (ou ancien audit terminé) → « Vos cibles ».
 */
export function nextStep(site: SiteSnapshot): NextStep {
  const a = site.audit;
  if (!a) return { kind: "onboarding", href: siteHref.relecture(site.id), step: "verification" };
  if (a.analysisStatus === "termine") {
    return { kind: "cibles", href: siteHref.cibles(site.id), step: "cibles" };
  }
  if (a.analysisStatus === "aucun" && a.status === "termine") {
    // Ancien audit (avant l'analyse unique) : ses cibles existent déjà.
    return { kind: "cibles", href: siteHref.cibles(site.id), step: "cibles" };
  }
  if (a.analysisStatus === "echoue" || a.status === "echoue") {
    return { kind: "reprise", href: siteHref.analyse(site.id), step: "analyse" };
  }
  return { kind: "analyse", href: siteHref.analyse(site.id), step: "analyse" };
}

/**
 * Où envoyer `/app` : pas de site → étape 1 ; sinon l'accueil s'affiche (la liste des sites, chacun avec
 * son état et sa prochaine étape). Avant le 18/11, un seul site renvoyait droit à son écran : l'onglet
 * « Accueil » était alors inaccessible (retour de Jonathan).
 */
export function homeDestination(sites: SiteSnapshot[]): string | null {
  if (sites.length === 0) return START_HREF;
  return null;
}

/** Les sites de la personne (la RLS limite à son espace) avec leur dernier audit. */
export async function loadSiteSnapshots(supabase: Client): Promise<SiteSnapshot[]> {
  const [{ data: sites }, { data: audits }] = await Promise.all([
    supabase.from("sites").select("id, domain, country").order("created_at", { ascending: true }),
    supabase
      .from("audits")
      .select("id, site_id, status, analysis_status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const latest = new Map<string, NonNullable<SiteSnapshot["audit"]>>();
  for (const a of audits ?? []) {
    if (!latest.has(a.site_id)) {
      latest.set(a.site_id, { id: a.id, status: a.status, analysisStatus: a.analysis_status });
    }
  }
  return (sites ?? []).map((s) => ({
    id: s.id,
    domain: s.domain,
    country: s.country,
    audit: latest.get(s.id) ?? null,
  }));
}

/** Le dernier audit d'un site (null si aucun) : pour les écrans par site. */
export async function loadLatestAuditId(supabase: Client, siteId: string): Promise<string | null> {
  const { data } = await supabase
    .from("audits")
    .select("id")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un site et son dernier audit (null si aucun) ; `null` si le site n'existe pas ou n'est pas visible (RLS). */
export async function loadSiteWithAudit(supabase: Client, siteId: string) {
  const { data: site } = await supabase
    .from("sites")
    .select("id, domain")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return null;
  const { data: audit } = await supabase
    .from("audits")
    .select("id, status, analysis_status")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { site, audit: audit ?? null };
}
