import { z } from "zod";
import { t } from "@/lib/messages";
import { normalizeDomain } from "./domain";

export const COUNTRIES = ["FR", "BE", "CH", "CA", "LU", "MC", "GB", "US"] as const;
export const LANGUAGES = ["fr", "en"] as const;

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, message);

/** Schéma partagé par la création et la modification d'un site (messages en français). */
export const siteInputSchema = z.object({
  domain: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const d = normalizeDomain(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: t.sites.validation.domain });
        return z.NEVER;
      }
      return d;
    }),
  niche: text(2, 120, t.sites.validation.niche),
  country: z.enum(COUNTRIES, { message: t.sites.validation.country }),
  language: z.enum(LANGUAGES, { message: t.sites.validation.language }),
  signatureFirstName: text(1, 60, t.sites.validation.signatureFirstName),
  offeredAsset: text(3, 500, t.sites.validation.offeredAsset),
  senderEmail: z
    .string()
    .trim()
    .max(254)
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email({ message: t.sites.validation.senderEmail }).nullable()),
  priorityQueries: z
    .array(z.string().trim())
    .transform((a) => [...new Set(a.filter((q) => q !== "").map((q) => q.toLowerCase()))])
    .pipe(
      z
        .array(z.string().min(3, t.sites.validation.queryShort).max(120))
        .min(1, t.sites.validation.queriesMin)
        .max(3, t.sites.validation.queriesMax),
    ),
});

export type SiteInput = z.infer<typeof siteInputSchema>;

export type FieldErrors = Partial<Record<keyof SiteInput, string>>;

/** Lit un FormData en objet brut avant validation. */
export function formDataToRaw(fd: FormData) {
  const s = (k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
  return {
    domain: s("domain"),
    niche: s("niche"),
    country: s("country"),
    language: s("language"),
    signatureFirstName: s("signatureFirstName"),
    offeredAsset: s("offeredAsset"),
    senderEmail: s("senderEmail"),
    priorityQueries: [s("query1"), s("query2"), s("query3")],
  };
}

export function parseSiteForm(
  fd: FormData,
): { ok: true; data: SiteInput } | { ok: false; errors: FieldErrors } {
  const r = siteInputSchema.safeParse(formDataToRaw(fd));
  if (r.success) return { ok: true, data: r.data };
  const errors: FieldErrors = {};
  for (const issue of r.error.issues) {
    const key = issue.path[0] as keyof SiteInput;
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
