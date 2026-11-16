import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  computeAuditEstimate,
  confirmAudit,
  createAudit,
  refreshEstimatedAudit,
  type SendEvent,
} from "@/features/audits/service";
import type { ChainEstimate } from "@/features/audits/chain";
import { normalizeDomain } from "@/features/sites/domain";
import type { PageRead } from "@/features/triage/page-reader";
import type { LlmClient } from "@/lib/llm/client";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import {
  buildAndStoreBrandProfile,
  getLatestBrandProfile,
  saveBrandProfileVersion,
  type BrandDeps,
} from "@/features/brand/service";
import { parseProfileForm, sameProfile } from "@/features/brand/form";
import type { StoredBrandProfile } from "@/features/brand/schema";
import { nicheQueries } from "@/features/public-audit/niche";
import { estimateQueryPhase, type QueryPhaseEstimate } from "@/features/queries/plan";
import { buildAndStoreQueryUniverse, type QueryDeps } from "@/features/queries/service";
import { isMarketCountry, type MarketCountry } from "@/features/sites/market";
import { deduceSite } from "./deduce";

type Client = SupabaseClient<Database>;

export const ONBOARDING_MESSAGES = t.onboarding.messages;

/** Audit en cours ou terminé : on y renvoie l'utilisateur au lieu d'en payer un second. */
const REUSABLE_AUDIT_STATUSES = ["en_attente", "estime", "confirme", "en_cours", "termine"];

export interface StartState {
  status: "idle" | "error" | "ok";
  message?: string;
  siteId?: string;
  /** Renseigné quand un audit existe déjà pour ce site : on y va directement. */
  auditId?: string;
  /** Ce qui a été compris à la lecture de l'accueil (affiché pendant la lecture du reste du site). */
  theme?: string;
  language?: string;
  /** Le profil de marque reste à établir (phase 2 : `understandSite`). */
  needsProfile?: boolean;
}

/** Marché et objectif demandés dès l'étape 1 (chantier B) : une campagne = un site × un pays. */
export interface StartMarket {
  country: MarketCountry;
  /** « auto » : langue détectée sur le site (modifiable ensuite). */
  language: "auto" | "fr" | "en";
  goal: SiteGoal;
}
export const DEFAULT_MARKET: StartMarket = {
  country: "FR",
  language: "auto",
  goal: "autorite_generale",
};

/** Lit le marché saisi dans le formulaire de l'étape 1 ; valeurs inconnues = valeurs par défaut. */
export function readMarket(formData: FormData): StartMarket {
  const country = formData.get("country");
  const language = formData.get("language");
  const goal = formData.get("goal");
  return {
    country: isMarketCountry(country) ? country : DEFAULT_MARKET.country,
    language: language === "fr" || language === "en" ? language : "auto",
    goal: (SITE_GOALS as readonly string[]).includes(String(goal))
      ? (goal as SiteGoal)
      : DEFAULT_MARKET.goal,
  };
}

export interface StartDeps {
  /** Lit la page d'accueil du domaine (lecteur sûr : SSRF, robots.txt). null = illisible. */
  readHomepage: (domain: string, language?: string) => Promise<PageRead | null>;
  /** Client LLM borné, ou null sans clé. */
  makeLlm: () => LlmClient | null;
  /** MT.1 : profil de marque (lecture du site + un appel LLM). Absent = pas de profil. */
  brand?: BrandDeps;
}

async function currentUserId(supabase: Client): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Étape 1 de l'onboarding en une URL : crée le site (ou retrouve celui du même domaine), déduit
 * thème, langue et requêtes depuis la page d'accueil, puis enregistre. AUCUN appel DataForSEO ici ;
 * seul appel payant possible : un appel LLM court, plafonné (voir DEDUCE_LIMITS). La vérification
 * de propriété, le prénom de signature, l'actif offert et la boîte d'envoi sont demandés plus
 * tard, juste avant le premier lot, jamais avant la première valeur.
 */
export async function startFromUrl(
  supabase: Client,
  rawUrl: string,
  deps: StartDeps,
  market: StartMarket = DEFAULT_MARKET,
  opts: { profile?: boolean } = {},
): Promise<StartState> {
  const domain = normalizeDomain(rawUrl);
  if (!domain) return { status: "error", message: ONBOARDING_MESSAGES.invalidUrl };

  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: ONBOARDING_MESSAGES.unauthenticated };

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!ws) return { status: "error", message: ONBOARDING_MESSAGES.noWorkspace };

  const { data: existing } = await supabase
    .from("sites")
    .select("id, niche, priority_queries")
    .eq("workspace_id", ws.id)
    .eq("domain", domain)
    .eq("country", market.country)
    .maybeSingle();

  if (existing) {
    const { data: audit } = await supabase
      .from("audits")
      .select("id")
      .eq("site_id", existing.id)
      .in("status", REUSABLE_AUDIT_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (audit) return { status: "ok", siteId: existing.id, auditId: audit.id };
    // Site déjà cadré (ou saisi à la main) : pas de nouvelle déduction, donc pas de nouvel appel LLM.
    // Le profil de marque, lui, est établi s'il manque (site créé avant MT.1).
    if (existing.niche && existing.priority_queries.length > 0) {
      if (opts.profile === false) {
        return { status: "ok", siteId: existing.id, theme: existing.niche, needsProfile: true };
      }
      await ensureBrandProfile(supabase, deps, {
        siteId: existing.id,
        workspaceId: ws.id,
        userId,
        domain,
        home: null,
      });
      return { status: "ok", siteId: existing.id };
    }
  }

  let page: PageRead | null = null;
  try {
    page = await deps.readHomepage(
      domain,
      market.language === "auto" ? undefined : market.language,
    );
  } catch {
    page = null;
  }
  let llm: LlmClient | null = null;
  try {
    llm = deps.makeLlm();
  } catch {
    llm = null;
  }
  const deduction = await deduceSite({ domain, page, llm, workspaceId: ws.id });

  // Le marché choisi prime : pays demandé, langue demandée ou, à défaut, celle détectée sur le site.
  const language = market.language === "auto" ? deduction.language : market.language;
  const row = {
    niche: deduction.theme || null,
    country: market.country,
    language,
    goal: market.goal,
    ...(market.goal === "autorite_generale" ? { target_keywords: [] as string[] } : {}),
    priority_queries: deduction.queries,
  };

  let siteId: string;
  if (existing) {
    const { error } = await supabase.from("sites").update(row).eq("id", existing.id);
    if (error) return { status: "error", message: ONBOARDING_MESSAGES.saveError };
    siteId = existing.id;
  } else {
    const { data, error } = await supabase
      .from("sites")
      .insert({ workspace_id: ws.id, domain, ...row })
      .select("id")
      .single();
    if (error || !data) {
      return { status: "error", message: ONBOARDING_MESSAGES.saveError };
    }
    siteId = data.id;
    await supabase.from("events").insert({
      workspace_id: ws.id,
      actor_id: userId,
      type: "site.created",
      payload: { site_id: siteId, domain, origin: "onboarding_url" },
    });
  }
  await supabase.from("events").insert({
    workspace_id: ws.id,
    actor_id: userId,
    type: "onboarding.deduced",
    payload: {
      site_id: siteId,
      source: deduction.source,
      queries: deduction.queries.length,
    },
  });
  if (opts.profile === false) {
    return { status: "ok", siteId, theme: deduction.theme, language, needsProfile: true };
  }
  const brand = await ensureBrandProfile(supabase, deps, {
    siteId,
    workspaceId: ws.id,
    userId,
    domain,
    home: page,
    language,
  });
  if (brand) {
    await supabase.from("events").insert({
      workspace_id: ws.id,
      actor_id: userId,
      type: "brand_profile.created",
      payload: { site_id: siteId, version: brand.version, pages: brand.pagesRead.length },
    });
  }
  return { status: "ok", siteId };
}

/** Établit le profil de marque d'un site qui n'en a pas encore ; ne lève jamais. */
async function ensureBrandProfile(
  supabase: Client,
  deps: StartDeps,
  input: {
    siteId: string;
    workspaceId: string;
    userId: string;
    domain: string;
    home: PageRead | null;
    language?: string;
  },
): Promise<StoredBrandProfile | null> {
  if (!deps.brand) return null;
  try {
    if (await getLatestBrandProfile(supabase, input.siteId)) return null;
    return await buildAndStoreBrandProfile(supabase, input, deps.brand);
  } catch {
    return null;
  }
}

/**
 * Enregistre les corrections du profil de marque saisies à l'écran de relecture. Rien de saisi :
 * rien à faire. Profil modifié : une NOUVELLE version « utilisateur » (l'ancienne reste, jamais
 * écrasée). Profil identique à la dernière version : aucune version créée.
 */
async function applyProfileEdits(
  supabase: Client,
  site: { id: string; workspaceId: string; domain: string; language: string },
  userId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = parseProfileForm(formData, { domain: site.domain, language: site.language });
  if (parsed.status === "error") return { ok: false, message: parsed.message };
  if (parsed.status === "empty") return { ok: true };
  const latest = await getLatestBrandProfile(supabase, site.id);
  if (latest && sameProfile(latest.profile, parsed.profile)) return { ok: true };
  const saved = await saveBrandProfileVersion(supabase, {
    siteId: site.id,
    workspaceId: site.workspaceId,
    userId,
    profile: parsed.profile,
    source: "utilisateur",
    pagesRead: latest?.pagesRead ?? [],
  });
  if (!saved.ok) return { ok: false, message: t.onboarding.brand.messages.saveError };
  await supabase.from("events").insert({
    workspace_id: site.workspaceId,
    actor_id: userId,
    type: "brand_profile.edited",
    payload: { site_id: site.id, version: saved.version },
  });
  return { ok: true };
}

/** MT.2a : objectif de l'utilisateur (colonne `sites.goal`). */
export const SITE_GOALS = ["autorite_generale", "mots_cles"] as const;
export type SiteGoal = (typeof SITE_GOALS)[number];
export const DEFAULT_GOAL: SiteGoal = "autorite_generale";

export interface LaunchPreview {
  siteId: string;
  workspaceId: string;
  domain: string;
  theme: string;
  language: string;
  country: string;
  /** Recherches internes de l'audit v1 (jamais saisies à l'écran depuis MT.2a). */
  queries: string[];
  goal: SiteGoal;
  verified: boolean;
  /** Coût de tout le parcours annoncé (USD) et son détail. */
  totalUsd: number;
  capUsd: number;
  chain: ChainEstimate;
  /** Un audit existe déjà pour ce site (rien à lancer). */
  auditId: string | null;
  /** Dernière version du profil de marque (MT.1), null si elle n'a pas pu être établie. */
  brand: StoredBrandProfile | null;
  /** MT.2b : recherches d'éditeurs prévues (nombre maximal, coût maximal). Annonce seulement : rien n'est lancé. */
  queryPhase: QueryPhaseEstimate;
}

/** Écran de confirmation : ce qui a été compris + coût total du parcours. Lecture seule, 0 USD. */
export async function getLaunchPreview(
  supabase: Client,
  siteId: string,
): Promise<LaunchPreview | null> {
  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, workspace_id, domain, niche, language, country, priority_queries, offered_asset, verified_at, goal",
    )
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return null;
  const [{ data: ws }, { data: audit }, brand] = await Promise.all([
    supabase.from("workspaces").select("plan").eq("id", site.workspace_id).maybeSingle(),
    supabase
      .from("audits")
      .select("id")
      .eq("site_id", site.id)
      .in("status", REUSABLE_AUDIT_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getLatestBrandProfile(supabase, siteId),
  ]);
  const est = computeAuditEstimate({
    domain: site.domain,
    niche: site.niche,
    offeredAsset: site.offered_asset,
    priorityQueries: site.priority_queries,
    workspacePlan: ws?.plan,
  });
  return {
    siteId: site.id,
    workspaceId: site.workspace_id,
    domain: site.domain,
    theme: site.niche ?? "",
    language: site.language,
    country: site.country ?? "FR",
    queries: est.queries,
    goal: (SITE_GOALS as readonly string[]).includes(site.goal)
      ? (site.goal as SiteGoal)
      : DEFAULT_GOAL,
    verified: Boolean(site.verified_at),
    totalUsd: est.chain.totalUsd,
    capUsd: est.limits.costCapUsd,
    chain: est.chain,
    auditId: audit?.id ?? null,
    brand,
    queryPhase: estimateQueryPhase(),
  };
}

export interface LaunchState {
  status: "idle" | "error" | "ok";
  message?: string;
  auditId?: string;
}

const launchSchema = z.object({
  theme: z
    .string()
    .trim()
    .min(2, ONBOARDING_MESSAGES.themeInvalid)
    .max(60, ONBOARDING_MESSAGES.themeInvalid),
  goal: z.enum(SITE_GOALS, { message: t.onboarding.review.goal.invalid }),
});

/**
 * Thème et objectif saisis à l'écran de relecture (normalisés). Les recherches Google de l'audit v1
 * ne sont plus saisies : elles restent celles déjà déduites, ou, à défaut, les requêtes de secours
 * tirées du thème (voir `internalQueries`). Un formulaire sans objectif garde l'objectif actuel du site.
 */
function readCorrections(formData: FormData, currentGoal: SiteGoal = DEFAULT_GOAL) {
  const parsed = launchSchema.safeParse({
    theme: formData.get("theme") ?? "",
    goal: formData.get("goal") ?? currentGoal,
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? ONBOARDING_MESSAGES.invalid,
    };
  }
  return {
    ok: true as const,
    theme: parsed.data.theme.toLowerCase().replace(/\s+/g, " "),
    goal: parsed.data.goal,
  };
}

/** Recherches internes de l'audit v1 : celles déjà connues, sinon le repli sans LLM (MA.4). */
function internalQueries(known: readonly string[], theme: string): string[] {
  return known.length > 0 ? [...known] : nicheQueries(theme);
}

/** Colonnes à écrire pour un objectif : en autorité générale, aucun mot-clé n'est retenu. */
function goalColumns(goal: SiteGoal) {
  return goal === "autorite_generale" ? { goal, target_keywords: [] as string[] } : { goal };
}

/**
 * Cas où rien n'a pu être déduit (site illisible, sans clé LLM) : la seule saisie demandée est le
 * thème ; on l'enregistre avec l'objectif, les recherches internes viennent du repli, puis l'écran
 * réaffiche le coût réel.
 */
export async function saveCorrections(
  supabase: Client,
  siteId: string,
  formData: FormData,
): Promise<LaunchState> {
  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: ONBOARDING_MESSAGES.unauthenticated };
  const c = readCorrections(formData);
  if (!c.ok) return { status: "error", message: c.message };
  const { data: current } = await supabase
    .from("sites")
    .select("priority_queries")
    .eq("id", siteId)
    .maybeSingle();
  const { data, error } = await supabase
    .from("sites")
    .update({
      niche: c.theme,
      priority_queries: internalQueries(current?.priority_queries ?? [], c.theme).slice(0, 3),
      ...goalColumns(c.goal),
    })
    .eq("id", siteId)
    .select("id, workspace_id, domain, language")
    .maybeSingle();
  if (error) return { status: "error", message: ONBOARDING_MESSAGES.saveError };
  if (!data) return { status: "error", message: ONBOARDING_MESSAGES.siteNotFound };
  const edits = await applyProfileEdits(
    supabase,
    { id: data.id, workspaceId: data.workspace_id, domain: data.domain, language: data.language },
    userId,
    formData,
  );
  if (!edits.ok) return { status: "error", message: edits.message };
  return { status: "ok" };
}

/**
 * Étape 2 : l'UNIQUE confirmation. Enregistre les corrections éventuelles du thème et des
 * requêtes, puis estime (`createAudit`) et confirme (`confirmAudit`) en un seul geste : le
 * parcours s'enchaîne ensuite seul (MA.6). Refuse de lancer si le coût recalculé dépasse le coût
 * affiché (une correction qui ajoute des requêtes doit être revue avant d'être payée).
 */
export async function launchJourney(
  supabase: Client,
  siteId: string,
  formData: FormData,
  getServiceClient: () => Client,
  sendEvent: SendEvent,
  queries?: QueryDeps,
): Promise<LaunchState> {
  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: ONBOARDING_MESSAGES.unauthenticated };

  const preview = await getLaunchPreview(supabase, siteId);
  if (!preview) return { status: "error", message: ONBOARDING_MESSAGES.siteNotFound };

  const c = readCorrections(formData, preview.goal);
  if (!c.ok) return { status: "error", message: c.message };
  const acceptedUsd = Number(formData.get("acceptedUsd") ?? "0");
  if (!Number.isFinite(acceptedUsd) || acceptedUsd < 0) {
    return { status: "error", message: ONBOARDING_MESSAGES.invalid };
  }
  const theme = c.theme;
  const finalQueries = internalQueries(preview.queries, theme).slice(0, 3);
  if (finalQueries.length === 0) {
    return { status: "error", message: ONBOARDING_MESSAGES.queriesMissing };
  }

  const changed =
    theme !== preview.theme ||
    c.goal !== preview.goal ||
    finalQueries.join("|") !== preview.queries.join("|");
  if (changed) {
    const { error } = await supabase
      .from("sites")
      .update({ niche: theme, priority_queries: finalQueries, ...goalColumns(c.goal) })
      .eq("id", siteId);
    if (error) return { status: "error", message: ONBOARDING_MESSAGES.saveError };
  }

  const edits = await applyProfileEdits(
    supabase,
    {
      id: siteId,
      workspaceId: preview.workspaceId,
      domain: preview.domain,
      language: preview.language,
    },
    userId,
    formData,
  );
  if (!edits.ok) return { status: "error", message: edits.message };

  // MT.2b : univers de requêtes par persona (un appel LLM court, zéro DataForSEO). Ne bloque jamais
  // le lancement : sans profil, sans clé ou en cas de panne, l'audit part quand même.
  if (queries) await buildAndStoreQueryUniverse(supabase, { siteId, userId }, queries);

  const created = await createAudit(supabase, siteId, getServiceClient);
  if (created.status !== "ok" || !created.auditId) {
    return { status: "error", message: created.message ?? ONBOARDING_MESSAGES.saveError };
  }
  // Un audit déjà « estimé » (pas encore payé) suit les corrections faites ici.
  await refreshEstimatedAudit(supabase, created.auditId, getServiceClient);
  // Le parcours figé doit être celui que la personne a vu : mêmes recherches internes, coût au plus
  // égal au coût accepté.
  const { data: audit } = await supabase
    .from("audits")
    .select("estimate_details, queries")
    .eq("id", created.auditId)
    .maybeSingle();
  const chain = (audit?.estimate_details as { chain?: { totalUsd?: number } } | null)?.chain;
  const total = chain?.totalUsd ?? 0;
  if (!audit || audit.queries.join("|") !== finalQueries.join("|") || total > acceptedUsd + 1e-6) {
    return { status: "error", auditId: created.auditId, message: ONBOARDING_MESSAGES.costChanged };
  }

  const confirmed = await confirmAudit(supabase, created.auditId, getServiceClient, sendEvent);
  if (confirmed.status === "error") {
    return { status: "error", auditId: created.auditId, message: confirmed.message };
  }
  await supabase.from("events").insert({
    workspace_id: preview.workspaceId,
    actor_id: userId,
    type: "onboarding.launched",
    payload: {
      site_id: siteId,
      audit_id: created.auditId,
      accepted_usd: acceptedUsd,
      goal: c.goal,
    },
  });
  return { status: "ok", auditId: created.auditId };
}

/**
 * Phase 2 de l'étape 1 : lecture du reste du site (plan du site, pages) et profil de marque, dans la
 * langue de la campagne. Séparée de la phase 1 pour que l'écran coche chaque étape quand elle est
 * réellement faite. Ne lève jamais ; un site sans profil est relu à la main à l'écran suivant.
 */
export async function understandSite(
  supabase: Client,
  siteId: string,
  deps: StartDeps,
): Promise<StartState> {
  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: ONBOARDING_MESSAGES.unauthenticated };
  const { data: site } = await supabase
    .from("sites")
    .select("id, workspace_id, domain, language")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return { status: "error", message: ONBOARDING_MESSAGES.siteNotFound };
  const brand = await ensureBrandProfile(supabase, deps, {
    siteId,
    workspaceId: site.workspace_id,
    userId,
    domain: site.domain,
    home: null,
    language: site.language,
  });
  if (brand) {
    await supabase.from("events").insert({
      workspace_id: site.workspace_id,
      actor_id: userId,
      type: "brand_profile.created",
      payload: { site_id: siteId, version: brand.version, pages: brand.pagesRead.length },
    });
  }
  return { status: "ok", siteId, language: site.language };
}
