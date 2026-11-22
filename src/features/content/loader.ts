import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { countWords, readingMinutes, renderBody, type RenderedBody } from "./markdown";
import { frontmatterSchema, SECTIONS, type Frontmatter, type Section } from "./schema";

/**
 * Chargeur des contenus : un fichier Markdown par page dans `content/<rubrique>/<slug>.md`.
 * Un fichier invalide fait échouer le chargement (donc le build et les tests) avec le nom du fichier
 * et le champ fautif : rien de bancal ne part en ligne.
 */
export const CONTENT_DIR = path.join(process.cwd(), "content");
const RELATED_COUNT = 3;

export interface ContentEntry {
  section: Section;
  slug: string;
  /** Adresse de la page, par exemple `/guides/backlinks-gratuits`. */
  href: string;
  meta: Frontmatter & { updatedAt: Date };
  body: RenderedBody;
  minutes: number;
}

export class ContentError extends Error {
  constructor(file: string, detail: string) {
    super(`Contenu invalide (${file}) : ${detail}`);
    this.name = "ContentError";
  }
}

/** Un fichier -> un contenu validé et rendu. `file` ne sert qu'aux messages d'erreur. */
export function parseContent(section: Section, fileSlug: string, raw: string): ContentEntry {
  const file = `content/${section}/${fileSlug}.md`;
  let parsed: matter.GrayMatterFile<string>;
  try {
    // Sans cache : gray-matter garde sinon le même objet pour un même texte.
    parsed = matter(raw, {});
  } catch (e) {
    throw new ContentError(file, `en-tête YAML illisible (${e instanceof Error ? e.message : e})`);
  }
  const result = frontmatterSchema.safeParse(parsed.data);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join(".") || "en-tête"} : ${i.message}`)
      .join(" ; ");
    throw new ContentError(file, detail);
  }
  const meta = result.data;
  if (meta.slug !== fileSlug)
    throw new ContentError(file, `slug « ${meta.slug} » différent du nom du fichier`);
  let body: RenderedBody;
  try {
    body = renderBody(parsed.content);
  } catch (e) {
    throw new ContentError(file, e instanceof Error ? e.message : String(e));
  }
  if (body.words === 0) throw new ContentError(file, "le corps du contenu est vide");
  const words =
    body.words +
    countWords([...meta.summary, ...meta.faq.flatMap((f) => [f.question, f.answer])].join(" "));
  return {
    section,
    slug: meta.slug,
    href: `/${section}/${meta.slug}`,
    meta: { ...meta, updatedAt: meta.updatedAt ?? meta.publishedAt },
    body,
    minutes: readingMinutes(words),
  };
}

/** Tous les contenus d'un dossier, brouillons et contenus programmés compris, du plus récent au plus ancien. */
export function readContentDir(dir: string): ContentEntry[] {
  const entries: ContentEntry[] = [];
  for (const section of SECTIONS) {
    const folder = path.join(dir, section);
    if (!existsSync(folder)) continue;
    for (const name of readdirSync(folder).sort()) {
      if (!name.endsWith(".md")) continue;
      entries.push(
        parseContent(section, name.slice(0, -3), readFileSync(path.join(folder, name), "utf8")),
      );
    }
  }
  return entries.sort((a, b) => b.meta.publishedAt.getTime() - a.meta.publishedAt.getTime());
}

let cache: ContentEntry[] | null = null;

/** Contenus du dépôt. En production les fichiers ne changent pas : lus une fois par processus. */
export function allContent(): ContentEntry[] {
  if (process.env.NODE_ENV !== "production") return readContentDir(CONTENT_DIR);
  cache ??= readContentDir(CONTENT_DIR);
  return cache;
}

/** En ligne : pas un brouillon, et la date de publication (heure de Paris) est passée. */
export function isPublished(entry: ContentEntry, now: Date = new Date()): boolean {
  return !entry.meta.draft && entry.meta.publishedAt.getTime() <= now.getTime();
}

export function publishedContent(
  now: Date = new Date(),
  entries: ContentEntry[] = allContent(),
): ContentEntry[] {
  return entries.filter((e) => isPublished(e, now));
}

export function publishedIn(
  section: Section,
  now: Date = new Date(),
  entries: ContentEntry[] = allContent(),
): ContentEntry[] {
  return publishedContent(now, entries).filter((e) => e.section === section);
}

export function findContent(
  section: Section,
  slug: string,
  entries: ContentEntry[] = allContent(),
): ContentEntry | undefined {
  return entries.find((e) => e.section === section && e.slug === slug);
}

/** Le contenu s'il est en ligne, sinon rien (la page répond alors 404). */
export function findPublished(
  section: Section,
  slug: string,
  now: Date = new Date(),
  entries: ContentEntry[] = allContent(),
): ContentEntry | undefined {
  const entry = findContent(section, slug, entries);
  return entry && isPublished(entry, now) ? entry : undefined;
}

/** Rubriques qui ont au moins un contenu en ligne : seules celles-là ont un lien et une ligne au sitemap. */
export function sectionsWithContent(
  now: Date = new Date(),
  entries: ContentEntry[] = allContent(),
): Section[] {
  const live = new Set(publishedContent(now, entries).map((e) => e.section));
  return SECTIONS.filter((s) => live.has(s));
}

/**
 * « À lire ensuite » : les contenus cités dans l'en-tête qui sont en ligne, complétés jusqu'à trois par
 * les plus récents du même thème, puis des autres. `pool` : les contenus parmi lesquels choisir.
 */
export function relatedTo(entry: ContentEntry, pool: ContentEntry[]): ContentEntry[] {
  const others = pool.filter((e) => e.href !== entry.href);
  const picked: ContentEntry[] = [];
  const add = (e: ContentEntry | undefined) => {
    if (e && picked.length < RELATED_COUNT && !picked.includes(e)) picked.push(e);
  };
  for (const ref of entry.meta.related) add(others.find((e) => e.href === `/${ref}`));
  for (const e of others) if (e.meta.theme === entry.meta.theme) add(e);
  for (const e of others) add(e);
  return picked;
}
