import { env } from "@/env";
import { cleanAppUrl } from "@/features/auth/destination";
import { t } from "@/lib/messages";
import type { ContentEntry } from "./loader";
import { plainText } from "./markdown";

/** Données structurées d'un contenu : Article (ou DefinedTerm au glossaire), fil d'Ariane, FAQ s'il y en a une. */
export function buildContentJsonLd(entry: ContentEntry) {
  const base = cleanAppUrl(env.NEXT_PUBLIC_APP_URL);
  const url = `${base}${entry.href}`;
  const { meta, section } = entry;
  const sectionLabel = t.content.sections[section].label;
  const organization = { "@type": "Organization", "@id": `${base}/#organization`, name: t.app.name, url: base };
  const dates = {
    datePublished: meta.publishedAt.toISOString(),
    dateModified: meta.updatedAt.toISOString(),
  };

  const main =
    section === "glossaire"
      ? {
          "@type": "DefinedTerm",
          "@id": `${url}#terme`,
          name: meta.shortTitle ?? meta.title,
          description: meta.description,
          url,
          inLanguage: "fr",
          inDefinedTermSet: {
            "@type": "DefinedTermSet",
            "@id": `${base}/${section}#glossaire`,
            name: t.content.sections.glossaire.title,
            url: `${base}/${section}`,
          },
        }
      : {
          "@type": "Article",
          "@id": `${url}#article`,
          headline: meta.title,
          description: meta.description,
          url,
          mainEntityOfPage: url,
          inLanguage: "fr",
          image: `${url}/opengraph-image`,
          keywords: meta.keyword,
          articleSection: t.content.themes[meta.theme],
          ...dates,
          author: { "@type": "Person", name: t.content.authors[meta.author].name, url: base },
          publisher: organization,
        };

  return {
    "@context": "https://schema.org",
    "@graph": [
      main,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.content.home, item: base },
          { "@type": "ListItem", position: 2, name: sectionLabel, item: `${base}/${section}` },
          { "@type": "ListItem", position: 3, name: meta.shortTitle ?? meta.title, item: url },
        ],
      },
      ...(meta.faq.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: meta.faq.map((f) => ({
                "@type": "Question",
                name: plainText(f.question),
                acceptedAnswer: { "@type": "Answer", text: plainText(f.answer) },
              })),
            },
          ]
        : []),
    ],
  };
}

/** `<` échappé : une valeur ne peut pas fermer la balise script. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
