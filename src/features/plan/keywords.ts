import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
const M = t.plan.keywords.messages;

/** Nombre maximal de mots-clés retenus (identique au `check` de `sites.target_keywords`). */
export const MAX_TARGET_KEYWORDS = 10;
/** Nombre maximal de mots-clés proposés à l'écran. */
export const MAX_KEYWORD_CHOICES = 60;

export interface KeywordChoice {
  keyword: string;
  /** Meilleure position connue du site sur ce mot-clé. */
  position: number;
  volume: number;
  /** Page du site qui se positionne dessus. */
  url: string;
}

export interface KeywordChoiceView {
  auditId: string;
  goal: "autorite_generale" | "mots_cles";
  /** Mots-clés réels du site (positions mesurées par l'audit), du plus recherché au moins recherché. */
  choices: KeywordChoice[];
  selected: string[];
  maxSelected: number;
}

/**
 * Mots-clés réels du site à partir des pages de l'audit : un seul exemplaire par mot-clé (la meilleure
 * position), triés par volume puis par position. Fonction pure : aucune lecture réseau, 0 USD.
 */
export function collectKeywordChoices(
  pages: { url: string; keywords_json: unknown }[],
): KeywordChoice[] {
  const best = new Map<string, KeywordChoice>();
  for (const p of pages) {
    const list = Array.isArray(p.keywords_json) ? (p.keywords_json as unknown[]) : [];
    for (const raw of list) {
      const k = raw as { keyword?: unknown; position?: unknown; volume?: unknown };
      if (typeof k.keyword !== "string") continue;
      const keyword = k.keyword.trim().toLowerCase().replace(/\s+/g, " ");
      const position = Number(k.position);
      if (keyword.length < 2 || keyword.length > 120 || !Number.isFinite(position)) continue;
      const volume = Math.max(0, Number(k.volume) || 0);
      const prev = best.get(keyword);
      if (!prev || position < prev.position)
        best.set(keyword, { keyword, position, volume, url: p.url });
    }
  }
  return [...best.values()]
    .sort(
      (a, b) =>
        b.volume - a.volume || a.position - b.position || a.keyword.localeCompare(b.keyword),
    )
    .slice(0, MAX_KEYWORD_CHOICES);
}

/** Écran de choix des mots-clés du Plan de liens. Lecture seule : aucun appel DataForSEO. */
export async function loadKeywordChoice(
  supabase: Client,
  auditId: string,
): Promise<KeywordChoiceView | null> {
  const { data: audit } = await supabase
    .from("audits")
    .select("id, site_id")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return null;
  const [{ data: site }, { data: pages }] = await Promise.all([
    supabase.from("sites").select("goal, target_keywords").eq("id", audit.site_id).maybeSingle(),
    supabase.from("audit_pages").select("url, keywords_json").eq("audit_id", auditId).limit(200),
  ]);
  if (!site) return null;
  return {
    auditId,
    goal: site.goal === "mots_cles" ? "mots_cles" : "autorite_generale",
    choices: collectKeywordChoices(pages ?? []),
    selected: site.target_keywords,
    maxSelected: MAX_TARGET_KEYWORDS,
  };
}

/**
 * Enregistre les mots-clés choisis. Seuls des mots-clés réellement vus pour le site sont acceptés
 * (jamais une saisie libre) ; au plus 10 ; objectif « mots-clés » obligatoire.
 */
export async function saveTargetKeywords(
  supabase: Client,
  auditId: string,
  requested: string[],
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: M.unauthenticated };
  const view = await loadKeywordChoice(supabase, auditId);
  if (!view) return { status: "error", message: M.notFound };
  if (view.goal !== "mots_cles") return { status: "error", message: M.wrongGoal };
  const allowed = new Set(view.choices.map((c) => c.keyword));
  const chosen = [
    ...new Set(requested.map((k) => k.trim().toLowerCase().replace(/\s+/g, " "))),
  ].filter(Boolean);
  if (chosen.some((k) => !allowed.has(k))) return { status: "error", message: M.unknown };
  if (chosen.length > MAX_TARGET_KEYWORDS) {
    return { status: "error", message: M.tooMany.replace("{max}", String(MAX_TARGET_KEYWORDS)) };
  }
  const { data: audit } = await supabase
    .from("audits")
    .select("site_id, workspace_id")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { status: "error", message: M.notFound };
  const { data, error } = await supabase
    .from("sites")
    .update({ target_keywords: chosen })
    .eq("id", audit.site_id)
    .select("id");
  if (error || !data?.length) return { status: "error", message: M.saveError };
  await supabase.from("events").insert({
    workspace_id: audit.workspace_id,
    actor_id: auth.user.id,
    type: "site.target_keywords_set",
    payload: { site_id: audit.site_id, audit_id: auditId, count: chosen.length },
  });
  return {
    status: "ok",
    auditId,
    message: chosen.length === 0 ? M.cleared : M.saved.replace("{count}", String(chosen.length)),
  };
}
