import type { SupabaseClient } from "@supabase/supabase-js";
import type { LlmClient } from "@/lib/llm/client";
import type { Database, Json } from "@/lib/supabase/database.types";
import { generateBrandProfile } from "./generate";
import { generatePublisherTypes } from "./publishers";
import type { SiteRead } from "./read-site";
import {
  brandProfileSchema,
  PROFILE_SOURCES,
  type BrandProfile,
  type PageRef,
  type ProfileSource,
  type StoredBrandProfile,
} from "./schema";

type Client = SupabaseClient<Database>;

function toStored(row: {
  version: number;
  source: string;
  profile: Json;
  pages_read: Json;
  cost_usd: number | string;
  created_at: string;
}): StoredBrandProfile | null {
  const parsed = brandProfileSchema.safeParse(row.profile);
  if (!parsed.success) return null; // une ligne illisible n'est jamais affichée de travers
  const source = (PROFILE_SOURCES as readonly string[]).includes(row.source)
    ? (row.source as ProfileSource)
    : "utilisateur";
  const pages = Array.isArray(row.pages_read) ? (row.pages_read as unknown as PageRef[]) : [];
  return {
    version: row.version,
    source,
    profile: parsed.data,
    pagesRead: pages.filter((p) => p && typeof p.url === "string"),
    costUsd: Number(row.cost_usd),
    createdAt: row.created_at,
  };
}

/** Dernière version du profil d'un site (celle qui fait foi), ou null. */
export async function getLatestBrandProfile(
  supabase: Client,
  siteId: string,
): Promise<StoredBrandProfile | null> {
  const { data } = await supabase
    .from("brand_profiles")
    .select("version, source, profile, pages_read, cost_usd, created_at")
    .eq("site_id", siteId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toStored(data) : null;
}

/**
 * Enregistre une NOUVELLE version (jamais de modification d'une version existante). Deux écritures
 * simultanées se disputent le même numéro : la contrainte unique tranche, on réessaie une fois.
 */
export async function saveBrandProfileVersion(
  supabase: Client,
  input: {
    siteId: string;
    workspaceId: string;
    userId: string | null;
    profile: BrandProfile;
    source: ProfileSource;
    pagesRead?: PageRef[];
    costUsd?: number;
  },
): Promise<{ ok: true; version: number } | { ok: false }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: last } = await supabase
      .from("brand_profiles")
      .select("version")
      .eq("site_id", input.siteId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (last?.version ?? 0) + 1;
    const { error } = await supabase.from("brand_profiles").insert({
      site_id: input.siteId,
      workspace_id: input.workspaceId,
      version,
      source: input.source,
      profile: input.profile as unknown as Json,
      pages_read: (input.pagesRead ?? []) as unknown as Json,
      cost_usd: input.costUsd ?? 0,
      created_by: input.userId,
    });
    if (!error) return { ok: true, version };
    if (error.code !== "23505") return { ok: false };
  }
  return { ok: false };
}

export interface BrandDeps {
  /** Lit le site (accueil, sitemap, quelques pages). Ne lève jamais. */
  readSite: (domain: string, home: SiteRead["home"] | null, language?: string) => Promise<SiteRead>;
  makeLlm: () => LlmClient | null;
}

/**
 * Lit le site, produit le profil (un appel LLM borné) et l'enregistre en version 1 ou suivante.
 * Ne lève jamais : toute panne laisse le site sans profil, que l'écran de relecture invite à remplir.
 */
export async function buildAndStoreBrandProfile(
  supabase: Client,
  input: {
    siteId: string;
    workspaceId: string;
    userId: string | null;
    domain: string;
    home: SiteRead["home"] | null;
    /** Langue de la campagne (profil et pages lues dans cette langue). */
    language?: string;
    /** Thème du site, s'il est déjà connu (aide à nommer le sujet des recherches). */
    theme?: string | null;
  },
  deps: BrandDeps,
): Promise<StoredBrandProfile | null> {
  try {
    const site = await deps.readSite(input.domain, input.home, input.language);
    let llm: LlmClient | null = null;
    try {
      llm = deps.makeLlm();
    } catch {
      llm = null;
    }
    const generated = await generateBrandProfile({
      site,
      llm,
      workspaceId: input.workspaceId,
      language: input.language,
    });
    if (!generated) return null;
    // Chantier H : types d'éditeurs à chercher (personas + voisins). Un échec n'empêche rien : les
    // types seront déduits des personas au moment de la recherche.
    const publishers = await generatePublisherTypes({
      profile: generated.profile,
      theme: input.theme ?? generated.profile.activity,
      domain: input.domain,
      language: input.language ?? generated.profile.language,
      llm,
      workspaceId: input.workspaceId,
    });
    const saved = await saveBrandProfileVersion(supabase, {
      siteId: input.siteId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      profile: publishers
        ? {
            ...generated.profile,
            publisher_types: publishers.types,
            theme_terms: publishers.themeTerms,
          }
        : generated.profile,
      source: "llm",
      pagesRead: generated.pagesRead,
      costUsd: generated.costUsd + (publishers?.costUsd ?? 0),
    });
    if (!saved.ok) return null;
    return getLatestBrandProfile(supabase, input.siteId);
  } catch {
    return null;
  }
}

/**
 * Chantier H : garantit que le profil d'un site porte ses types d'éditeurs. Un profil antérieur (ou
 * dont le second appel avait échoué) reçoit une NOUVELLE version, identique au reste (même source :
 * les corrections de l'utilisateur sont gardées telles quelles). Sans modèle ou en cas de panne, le
 * profil est rendu tel quel : la recherche déduira les types des personas. Ne lève jamais.
 */
export async function ensurePublisherTypes(
  supabase: Client,
  input: {
    siteId: string;
    workspaceId: string;
    domain: string;
    theme: string;
    language: string;
  },
  makeLlm: () => LlmClient | null,
): Promise<StoredBrandProfile | null> {
  const stored = await getLatestBrandProfile(supabase, input.siteId);
  // Des étiquettes déjà posées (même toutes retirées par l'utilisateur) ne sont jamais refaites.
  if (!stored || stored.profile.publisher_types !== undefined) return stored;
  try {
    let llm: LlmClient | null = null;
    try {
      llm = makeLlm();
    } catch {
      llm = null;
    }
    const publishers = await generatePublisherTypes({
      profile: stored.profile,
      theme: input.theme,
      domain: input.domain,
      language: input.language,
      llm,
      workspaceId: input.workspaceId,
    });
    if (!publishers) return stored;
    const saved = await saveBrandProfileVersion(supabase, {
      siteId: input.siteId,
      workspaceId: input.workspaceId,
      userId: null,
      profile: {
        ...stored.profile,
        publisher_types: publishers.types,
        theme_terms: publishers.themeTerms,
      },
      source: stored.source,
      pagesRead: stored.pagesRead,
      costUsd: publishers.costUsd,
    });
    return saved.ok ? ((await getLatestBrandProfile(supabase, input.siteId)) ?? stored) : stored;
  } catch {
    return stored;
  }
}
