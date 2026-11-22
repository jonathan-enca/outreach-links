import { z } from "zod";
import { t } from "@/lib/messages";
import { parseParisDate } from "./dates";

/** Les quatre rubriques : le nom du dossier dans `content/` est aussi le début de l'adresse. */
export const SECTIONS = ["guides", "blog", "glossaire", "comparatifs"] as const;
export type Section = (typeof SECTIONS)[number];

export const THEMES = Object.keys(t.content.themes) as [
  keyof typeof t.content.themes,
  ...(keyof typeof t.content.themes)[],
];
export const AUTHORS = Object.keys(t.content.authors) as [
  keyof typeof t.content.authors,
  ...(keyof typeof t.content.authors)[],
];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RELATED = /^(guides|blog|glossaire|comparatifs)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Date de l'en-tête, à l'heure de Paris. YAML transforme « 2026-11-25 » en date UTC : on reprend
 * alors ses chiffres tels qu'ils ont été écrits. Un fuseau explicite (« Z », « +01:00 ») est refusé.
 */
const parisDate = z
  .preprocess(
    (v) => (v instanceof Date && !Number.isNaN(v.getTime()) ? v.toISOString().slice(0, 19) : v),
    z.string({ message: "date attendue, par exemple 2026-11-25 ou 2026-11-25T08:00" }),
  )
  .transform((text, ctx) => {
    const date = parseParisDate(text);
    if (!date) {
      ctx.addIssue({
        code: "custom",
        message: `date illisible « ${text} » : écrire 2026-11-25 ou 2026-11-25T08:00 (heure de Paris, sans fuseau)`,
      });
      return z.NEVER;
    }
    return date;
  });

const line = (max: number) => z.string().trim().min(1, "ne doit pas être vide").max(max);

/** En-tête (frontmatter) d'un contenu. Toute clé inconnue est refusée : une faute de frappe ne passe pas en silence. */
export const frontmatterSchema = z
  .strictObject({
    title: line(110),
    /** Titre court : fil d'Ariane. Par défaut, le titre. */
    shortTitle: line(60).optional(),
    description: line(200),
    slug: z.string().regex(SLUG, "minuscules, chiffres et tirets seulement"),
    keyword: line(80),
    theme: z.enum(THEMES),
    author: z.enum(AUTHORS).default(AUTHORS[0]),
    publishedAt: parisDate,
    updatedAt: parisDate.optional(),
    draft: z.boolean().default(false),
    /** Chapô affiché sous le titre. Par défaut, la description. */
    lead: line(400).optional(),
    summary: z.array(line(300)).max(6).default([]),
    faq: z.array(z.strictObject({ question: line(200), answer: line(1200) })).default([]),
    sources: z.array(line(400)).default([]),
    related: z
      .array(z.string().regex(RELATED, "forme attendue : rubrique/slug, par exemple blog/mon-article"))
      .max(6)
      .default([]),
  })
  .refine((f) => !f.updatedAt || f.updatedAt.getTime() >= f.publishedAt.getTime(), {
    path: ["updatedAt"],
    message: "updatedAt ne peut pas précéder publishedAt",
  });

export type Frontmatter = z.infer<typeof frontmatterSchema>;
