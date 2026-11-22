import { env } from "@/env";
import { cleanAppUrl } from "@/features/auth/destination";
import { GUIDES_BASE } from "@/features/mailboxes/providers";
import { t } from "@/lib/messages";
import { allContent, publishedContent, sectionsWithContent, type ContentEntry } from "./loader";
import { SECTIONS } from "./schema";

/**
 * Ce que le site annonce de ses contenus : lignes du sitemap, liens de navigation, `/llms.txt`.
 * Partout la même règle : seulement ce qui est en ligne, et jamais de lien vers une rubrique vide.
 */

/** Lignes du sitemap : les index qui ont au moins un contenu en ligne, puis chaque contenu en ligne. */
export function contentSitemapEntries(
  now: Date = new Date(),
  entries: ContentEntry[] = allContent(),
): { path: string; lastModified: Date }[] {
  const live = publishedContent(now, entries);
  const latest = (list: ContentEntry[]) =>
    new Date(Math.max(...list.map((e) => e.meta.updatedAt.getTime())));
  return [
    ...sectionsWithContent(now, entries).map((section) => ({
      path: `/${section}`,
      lastModified: latest(live.filter((e) => e.section === section)),
    })),
    ...live.map((e) => ({ path: e.href, lastModified: e.meta.updatedAt })),
  ];
}

/** Liens du pied de page (Guides, Blog, Glossaire, Comparatifs) : seulement les rubriques qui ont un contenu en ligne. */
export function contentNavLinks(
  now: Date = new Date(),
  entries: ContentEntry[] = allContent(),
): { href: string; label: string }[] {
  return sectionsWithContent(now, entries).map((s) => ({
    href: `/${s}`,
    label: t.content.sections[s].label,
  }));
}

/** Lien « Blog » de l'en-tête : absent tant qu'aucun article de blog n'est en ligne. */
export function blogNavLink(
  now: Date = new Date(),
  entries: ContentEntry[] = allContent(),
): { href: string; label: string } | null {
  return sectionsWithContent(now, entries).includes("blog")
    ? { href: "/blog", label: t.content.navBlog }
    : null;
}

/** Texte de `/llms.txt` : le site en quelques lignes, puis les contenus en ligne (titre et adresse). */
export function buildLlmsTxt(
  now: Date = new Date(),
  entries: ContentEntry[] = allContent(),
): string {
  const base = cleanAppUrl(env.NEXT_PUBLIC_APP_URL);
  const l = t.content.llms;
  const live = publishedContent(now, entries);
  const lines = [
    `# ${t.app.name}`,
    "",
    `> ${l.summary}`,
    "",
    `## ${l.pagesTitle}`,
    "",
    `- [${l.homeLabel}](${base}/): ${t.home.hero.title}`,
    `- [${l.helpLabel}](${base}${GUIDES_BASE})`,
  ];
  for (const section of SECTIONS) {
    const list = live.filter((e) => e.section === section);
    if (!list.length) continue;
    lines.push("", `## ${t.content.sections[section].title}`, "");
    for (const e of list) lines.push(`- [${e.meta.title}](${base}${e.href}): ${e.meta.description}`);
  }
  return `${lines.join("\n")}\n`;
}
