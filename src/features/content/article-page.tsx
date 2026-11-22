import Link from "next/link";
import { SiteFooter } from "@/features/home/site-footer";
import { SiteHeader } from "@/features/home/site-header";
import { t } from "@/lib/messages";
import "./article.css";
import { AuditField } from "./audit-field";
import { formatParisDate } from "./dates";
import { buildContentJsonLd, jsonLdScript } from "./json-ld";
import type { ContentEntry } from "./loader";
import { renderInline } from "./markdown";
import { Toc } from "./toc";

/** Ancre de l'appel à l'action A : le bouton de la colonne (B) y mène. */
const CTA_ID = "audit-gratuit";
const FAQ_ID = "faq";
const SOURCES_ID = "sources";

function Html({ html }: { html: string }) {
  return html ? <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} /> : null;
}

/** Appel à l'action A : dans le texte, à l'emplacement choisi par l'auteur (ou après la troisième section). */
function InlineCta() {
  const c = t.content.cta.inline;
  return (
    <div className="art-cta" id={CTA_ID}>
      <span className="art-pill">{c.pill}</span>
      <h3>{c.title}</h3>
      <p>{c.text}</p>
      <AuditField button={c.button} />
      <div className="art-small">{c.hint}</div>
    </div>
  );
}

/** Appel à l'action C : bandeau final sur la surface nuit. */
export function FinalBand() {
  const c = t.content.cta.final;
  return (
    <section className="art-night">
      <div className="art-night-in">
        <h2>{c.title}</h2>
        <p>{c.text(t.app.name)}</p>
        <AuditField button={c.button} />
        <ul>
          {c.hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ContentCard({ entry, detailed = false }: { entry: ContentEntry; detailed?: boolean }) {
  return (
    <Link className="art-card" href={entry.href}>
      <span className="art-card-theme">{t.content.themes[entry.meta.theme]}</span>
      <span className="art-card-title">{entry.meta.title}</span>
      {detailed ? (
        <>
          <span className="art-card-text">{entry.meta.description}</span>
          <span className="art-card-date">{formatParisDate(entry.meta.updatedAt)}</span>
        </>
      ) : null}
    </Link>
  );
}

/**
 * Page d'un contenu, identique à la maquette validée : fil d'Ariane, titre, chapô, auteur, « En bref »,
 * texte avec l'appel A, FAQ, sources ; colonne (sommaire, appel B) sur bureau ; bandeau final C ; « À lire ensuite ».
 * Sans sommaire (fiche courte du glossaire), la colonne disparaît.
 */
export function ArticlePage({
  entry,
  related,
  preview = false,
}: {
  entry: ContentEntry;
  related: ContentEntry[];
  preview?: boolean;
}) {
  const a = t.content.article;
  const { meta, body, section } = entry;
  const author = t.content.authors[meta.author];
  const toc = [...body.toc, ...(meta.faq.length ? [{ id: FAQ_ID, label: a.faqTitle }] : [])];
  const withAside = body.toc.length >= 2;
  const side = t.content.cta.side;

  return (
    <>
      <SiteHeader base="/" current="blog" />
      <main id="contenu" className="art">
        {preview ? (
          <div className="art-banner">
            <div className="art-wrap">{t.content.preview.banner}</div>
          </div>
        ) : null}
        <section className="art-hero">
          <div className="art-wrap">
            <nav className="art-crumbs" aria-label={a.breadcrumb}>
              <ol>
                <li>
                  <Link href="/">{t.content.home}</Link> ›{" "}
                </li>
                <li>
                  <Link href={`/${section}`}>{t.content.sections[section].label}</Link> ›{" "}
                </li>
                <li aria-current="page">{meta.shortTitle ?? meta.title}</li>
              </ol>
            </nav>
            <h1 className="art-title">{meta.title}</h1>
            <p className="art-chapo">{meta.lead ?? meta.description}</p>
            <div className="art-meta">
              <span className="art-avatar" aria-hidden>
                {author.initials}
              </span>
              <span>{author.byline(t.app.name)}</span>
              <span>
                <time dateTime={meta.updatedAt.toISOString()}>
                  {a.updated(formatParisDate(meta.updatedAt))}
                </time>
              </span>
              <span>{a.readingTime(entry.minutes)}</span>
            </div>
          </div>
        </section>

        <div className={withAside ? "art-wrap art-grid" : "art-wrap art-grid art-grid-single"}>
          <article className="art-body">
            {meta.summary.length ? (
              <div className="art-bref">
                <h2>{a.summaryTitle}</h2>
                <ul>
                  {meta.summary.map((point) => (
                    <li key={point} dangerouslySetInnerHTML={{ __html: renderInline(point) }} />
                  ))}
                </ul>
              </div>
            ) : null}

            <Html html={body.before} />
            <InlineCta />
            <Html html={body.after} />

            {meta.faq.length ? (
              <div className="art-faq">
                <h2 id={FAQ_ID}>{a.faqTitle}</h2>
                {meta.faq.map((f, i) => (
                  <details key={f.question} open={i === 0}>
                    <summary dangerouslySetInnerHTML={{ __html: renderInline(f.question) }} />
                    <p dangerouslySetInnerHTML={{ __html: renderInline(f.answer) }} />
                  </details>
                ))}
              </div>
            ) : null}

            {meta.sources.length ? (
              <>
                <h2 id={SOURCES_ID}>{a.sourcesTitle}</h2>
                <ul className="art-sources">
                  {meta.sources.map((s) => (
                    <li key={s} dangerouslySetInnerHTML={{ __html: renderInline(s) }} />
                  ))}
                </ul>
              </>
            ) : null}
          </article>

          {withAside ? (
            <aside className="art-aside">
              <div className="art-stick">
                <Toc items={toc} />
                <div className="art-side">
                  <h3>{side.title}</h3>
                  <p>{side.text}</p>
                  <a className="art-btn" href={`#${CTA_ID}`}>
                    {side.button}
                  </a>
                </div>
              </div>
            </aside>
          ) : null}
        </div>

        <FinalBand />

        {related.length ? (
          <section className="art-more">
            <div className="art-wrap">
              <h2>{a.relatedTitle}</h2>
              <div className="art-cards">
                {related.map((r) => (
                  <ContentCard key={r.href} entry={r} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(buildContentJsonLd(entry)) }}
      />
    </>
  );
}
