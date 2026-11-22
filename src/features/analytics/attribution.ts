import { z } from "zod";

/** Cookie « première visite » : la source du visiteur, gardée jusqu'à l'inscription (jours plus tard). */
export const ATTRIBUTION_COOKIE = "ol_attr";
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 90;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.trim().slice(0, max))
    .optional();

const schema = z.object({
  utm_source: text(100),
  utm_medium: text(100),
  utm_campaign: text(100),
  utm_content: text(150),
  utm_term: text(150),
  referrer_host: text(100),
  landing_path: text(200),
});

export type Attribution = z.infer<typeof schema>;

/**
 * Source tirée d'une première URL : les UTM, sinon le site d'origine (referrer) s'il est externe.
 * `null` si rien n'indique d'où vient la personne (accès direct) : on ne pose alors aucun cookie.
 */
export function attributionFromRequest(
  url: URL,
  referrer: string | null,
  ownHost: string,
): Attribution | null {
  const out: Attribution = {};
  for (const k of UTM_KEYS) {
    const v = url.searchParams.get(k);
    if (v) out[k] = v;
  }
  let host: string | undefined;
  try {
    host = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : undefined;
  } catch {
    host = undefined;
  }
  if (host && host !== ownHost.replace(/^www\./, "")) out.referrer_host = host;
  if (Object.keys(out).length === 0) return null;
  out.landing_path = url.pathname;
  const parsed = schema.safeParse(out);
  return parsed.success ? parsed.data : null;
}

/** Relit le cookie en le revalidant (il vient du navigateur : jamais de confiance). */
export function parseAttribution(raw: string | undefined): Attribution | null {
  if (!raw) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success && Object.keys(parsed.data).length > 0 ? parsed.data : null;
  } catch {
    return null;
  }
}
