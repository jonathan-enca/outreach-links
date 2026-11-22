import Link from "next/link";
import { SiteFooter } from "@/features/home/site-footer";
import { SiteHeader } from "@/features/home/site-header";
import { t } from "@/lib/messages";
import "./article.css";
import { ContentCard, FinalBand } from "./article-page";
import type { ContentEntry } from "./loader";
import type { Section } from "./schema";

/** Page d'index d'une rubrique : les contenus en ligne, du plus récent au plus ancien. */
export function SectionIndexPage({ section, entries }: { section: Section; entries: ContentEntry[] }) {
  const s = t.content.sections[section];
  return (
    <>
      <SiteHeader base="/" current="blog" />
      <main id="contenu" className="art">
        <section className="art-hero">
          <div className="art-wrap">
            <nav className="art-crumbs" aria-label={t.content.article.breadcrumb}>
              <ol>
                <li>
                  <Link href="/">{t.content.home}</Link> ›{" "}
                </li>
                <li aria-current="page">{s.label}</li>
              </ol>
            </nav>
            <h1 className="art-title">{s.title}</h1>
            <p className="art-chapo">{s.intro}</p>
          </div>
        </section>
        <div className="art-wrap art-index">
          {entries.length ? (
            <div className="art-cards">
              {entries.map((e) => (
                <ContentCard key={e.href} entry={e} detailed />
              ))}
            </div>
          ) : (
            <p>{t.content.index.empty}</p>
          )}
        </div>
        <FinalBand />
      </main>
      <SiteFooter />
    </>
  );
}
