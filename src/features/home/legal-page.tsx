import Link from "next/link";
import { t } from "@/lib/messages";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

interface Doc {
  title: string;
  sections: readonly { title: string; body: readonly string[] }[];
}

/** Page légale (provisoire, voir l'encart) : en-tête et pied de page du site, mise en page commune aux trois documents. */
export function LegalPage({ doc }: { doc: Doc }) {
  const l = t.legalPages;
  return (
    <>
      <SiteHeader base="/" />
      <main id="contenu" className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-7">
        <h1 className="text-3xl font-bold sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{l.updated}</p>
        <p className="mt-5 rounded-card border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          {l.provisional}
        </p>
        {doc.sections.map((s) => (
          <section key={s.title} className="mt-8">
            <h2 className="text-xl font-semibold">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-2 text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}
        <p className="mt-12">
          <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
            {l.back}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
