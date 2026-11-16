import { t } from "@/lib/messages";
import { userPublisherType } from "./publishers";
import {
  BRAND_LANGUAGES,
  brandProfileSchema,
  MAX_PUBLISHER_TYPES,
  publisherTypeSchema,
  type BrandProfile,
  type PublisherType,
} from "./schema";

/**
 * Relecture du profil dans le formulaire d'onboarding : chaque liste tient dans une zone de texte,
 * une entrée par ligne ; les ressources et les personas séparent leurs champs par « | ».
 */

const lines = (v: string) =>
  v
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

export function profileToFields(p: BrandProfile | null) {
  return {
    activity: p?.activity ?? "",
    offer: p?.offer ?? "",
    audience: (p?.audience ?? []).join("\n"),
    resources: (p?.linkable_resources ?? []).map((r) => `${r.url} | ${r.title}`).join("\n"),
    cited: (p?.linkable_resources ?? [])
      .filter((r) => r.selected !== false)
      .map((r) => r.url)
      .join("\n"),
    names: (p?.name_variants ?? []).join("\n"),
    personas: (p?.personas ?? []).map((x) => `${x.label} | ${x.sites} | ${x.reason}`).join("\n"),
    tone: p?.tone ?? "",
    publishers: JSON.stringify(
      (p?.publisher_types ?? []).map((x) => [x.label, x.category, x.terms, x.active !== false]),
    ),
    theme: (p?.theme_terms ?? []).join("\n"),
  };
}

const jsonArray = (raw: FormDataEntryValue | null): unknown[] | null => {
  if (typeof raw !== "string") return null;
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
};

/**
 * Étiquettes « types de sites cherchés » du formulaire (chantier H). Champ absent : null (le profil
 * garde ce qu'il avait). Une étiquette ajoutée à la main est reconstruite côté serveur (catégorie et
 * mots déduits de son libellé) ; une entrée illisible est ignorée, jamais enregistrée de travers.
 */
export function parsePublishers(raw: FormDataEntryValue | null): PublisherType[] | null {
  const list = jsonArray(raw);
  if (!list) return null;
  const out: PublisherType[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const parsed = publisherTypeSchema.safeParse(item);
    if (!parsed.success) continue;
    const key = parsed.data.label.toLowerCase();
    if (seen.has(key)) continue;
    const type =
      parsed.data.origin === "utilisateur"
        ? userPublisherType(parsed.data.label)
        : { ...parsed.data };
    if (!type) continue;
    seen.add(key);
    out.push(parsed.data.active === false ? { ...type, active: false } : type);
  }
  return out.slice(0, MAX_PUBLISHER_TYPES);
}

export type ProfileFormResult =
  | { status: "empty" }
  | { status: "ok"; profile: BrandProfile }
  | { status: "error"; message: string };

const M = t.onboarding.brand.messages;

/**
 * Lit le profil saisi. Tout vide : rien à enregistrer. Sinon il doit être complet et valide ;
 * une ressource doit être une page du domaine du site.
 */
export function parseProfileForm(
  formData: FormData,
  ctx: {
    domain: string;
    language: string;
    /** Pages ajoutées à la main et déjà vérifiées (HTTP 200) : cochées d'office (chantier C). */
    added?: { url: string; title: string }[];
  },
): ProfileFormResult {
  const get = (k: string) => String(formData.get(`profile_${k}`) ?? "");
  // MT.2a : les pages candidates arrivent une par champ caché `profile_res_all` (adresse | titre) ;
  // les cases cochées arrivent dans `profile_res_on` (adresses). Sans champ caché, on lit l'ancienne
  // zone de texte `profile_resources` (toutes les pages sont alors cochées).
  const allRes = [
    ...formData.getAll("profile_res_all").map(String),
    ...(ctx.added ?? []).map((a) => `${a.url} | ${a.title}`),
  ];
  const onRes = new Set([
    ...formData.getAll("profile_res_on").map((v) => String(v).trim()),
    ...(ctx.added ?? []).map((a) => a.url),
  ]);
  const raw = {
    activity: get("activity").trim(),
    offer: get("offer").trim(),
    audience: lines(get("audience")),
    resources:
      allRes.length > 0 ? allRes.map((l) => l.trim()).filter(Boolean) : lines(get("resources")),
    names: lines(get("names")),
    personas: lines(get("personas")),
    tone: get("tone").trim(),
  };
  if (
    !raw.activity &&
    !raw.offer &&
    raw.audience.length === 0 &&
    raw.resources.length === 0 &&
    raw.personas.length === 0
  ) {
    return { status: "empty" };
  }
  const domain = ctx.domain.replace(/^www\./, "");

  const resources: { url: string; title: string; selected: boolean }[] = [];
  for (const l of raw.resources) {
    const [url = "", ...rest] = l.split("|").map((x) => x.trim());
    const title = rest.join(" | ");
    let ok = false;
    try {
      const u = new URL(url);
      ok = /^https?:$/.test(u.protocol) && u.hostname.replace(/^www\./, "") === domain;
    } catch {
      ok = false;
    }
    if (!ok) return { status: "error", message: M.resourceInvalid };
    resources.push({
      url,
      title: title || url,
      selected: allRes.length > 0 ? onRes.has(url) : true,
    });
  }

  // Au moins une page à faire citer : l'accueil se décoche, mais jamais tout (chantier C).
  if (resources.length > 0 && !resources.some((r) => r.selected)) {
    return { status: "error", message: M.noPageSelected };
  }

  const personas: { label: string; sites: string; reason: string }[] = [];
  for (const l of raw.personas) {
    const [label = "", sites = "", ...rest] = l.split("|").map((x) => x.trim());
    const reason = rest.join(" | ");
    if (!label || !sites || !reason) return { status: "error", message: M.personaInvalid };
    personas.push({ label, sites, reason });
  }

  const language = (BRAND_LANGUAGES as readonly string[]).includes(ctx.language)
    ? ctx.language
    : "fr";
  const publishers = parsePublishers(formData.get("profile_publishers"));
  const themeTerms = (jsonArray(formData.get("profile_theme_terms")) ?? [])
    .flatMap((x) => (typeof x === "string" && x.trim().length >= 2 ? [x.trim().slice(0, 40)] : []))
    .slice(0, 5);
  const parsed = brandProfileSchema.safeParse({
    activity: raw.activity,
    offer: raw.offer,
    language,
    audience: raw.audience,
    linkable_resources: resources,
    name_variants: raw.names,
    tone: raw.tone,
    personas,
    ...(publishers ? { publisher_types: publishers } : {}),
    ...(themeTerms.length > 0 ? { theme_terms: themeTerms } : {}),
  });
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    const message =
      path === "personas"
        ? M.personasMissing
        : path === "audience"
          ? M.audienceMissing
          : path === "activity" || path === "offer"
            ? M.activityMissing
            : M.invalid;
    return { status: "error", message };
  }
  return { status: "ok", profile: parsed.data };
}

/** Deux profils identiques une fois mis en forme (sert à ne pas créer de version sans changement). */
export function sameProfile(a: BrandProfile, b: BrandProfile): boolean {
  return JSON.stringify(profileToFields(a)) === JSON.stringify(profileToFields(b));
}
