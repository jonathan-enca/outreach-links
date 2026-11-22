import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { t } from "@/lib/messages";
import { ArticlePage } from "./article-page";
import { SectionIndexPage } from "./index-page";
import {
  allContent,
  findContent,
  findPublished,
  publishedContent,
  publishedIn,
  relatedTo,
} from "./loader";
import { OG_ALT, OG_SIZE } from "./og";
import type { Section } from "./schema";

/**
 * Ce que partagent les quatre rubriques : chaque route de `src/app/<rubrique>/` n'est qu'un passe-plat.
 * Les pages sont statiques et revalidées toutes les heures (`revalidate = 3600` dans chaque route) :
 * un contenu programmé sort seul à sa date, sans redéploiement. Hors ligne, la page répond 404.
 */

/** Adresses préparées au build : tout ce qui n'est pas un brouillon, contenus programmés compris. */
export function sectionStaticParams(section: Section): { slug: string }[] {
  return allContent()
    .filter((e) => e.section === section && !e.meta.draft)
    .map((e) => ({ slug: e.slug }));
}

export function articleMetadata(section: Section, slug: string): Metadata {
  const entry = findPublished(section, slug);
  if (!entry) return { robots: { index: false } };
  const { meta } = entry;
  return {
    title: `${meta.title} | ${t.app.name}`,
    description: meta.description,
    alternates: { canonical: entry.href },
    openGraph: {
      type: "article",
      title: meta.title,
      description: meta.description,
      url: entry.href,
      siteName: t.app.name,
      locale: "fr_FR",
      publishedTime: meta.publishedAt.toISOString(),
      modifiedTime: meta.updatedAt.toISOString(),
    },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

export function renderArticle(section: Section, slug: string) {
  const entry = findPublished(section, slug);
  if (!entry) notFound();
  return <ArticlePage entry={entry} related={relatedTo(entry, publishedContent())} />;
}

export function indexMetadata(section: Section): Metadata {
  const s = t.content.sections[section];
  const empty = publishedIn(section).length === 0;
  return {
    title: t.content.index.metaTitle(s.title, t.app.name),
    description: s.intro,
    alternates: { canonical: `/${section}` },
    openGraph: {
      type: "website",
      title: s.title,
      description: s.intro,
      url: `/${section}`,
      siteName: t.app.name,
      locale: "fr_FR",
      // Un `openGraph` de page efface l'image héritée du site : on la redonne.
      images: [{ url: "/opengraph-image", ...OG_SIZE, alt: OG_ALT }],
    },
    // Un index sans contenu n'a rien à montrer aux moteurs.
    ...(empty ? { robots: { index: false, follow: true } } : {}),
  };
}

export function renderIndex(section: Section) {
  return <SectionIndexPage section={section} entries={publishedIn(section)} />;
}

/** Aperçu (développement uniquement) : n'importe quel contenu, brouillon ou programmé. */
export function renderPreview(section: Section, slug: string) {
  if (process.env.NODE_ENV === "production") notFound();
  const entry = findContent(section, slug);
  if (!entry) notFound();
  return <ArticlePage entry={entry} related={relatedTo(entry, allContent())} preview />;
}
