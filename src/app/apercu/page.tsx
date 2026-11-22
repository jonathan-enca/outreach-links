import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatParisDate } from "@/features/content/dates";
import { allContent, isPublished } from "@/features/content/loader";
import { t } from "@/lib/messages";

/** Liste de tous les contenus avec leur état : en développement seulement (404 en production). */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  const p = t.content.preview;
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-7">
      <h1 className="text-3xl font-bold">{p.title}</h1>
      <p className="mt-2 text-muted-foreground">{p.intro}</p>
      <ul className="mt-8 grid gap-3">
        {allContent().map((e) => (
          <li key={e.href} className="rounded-card border border-border bg-card p-4 shadow-card">
            <Link
              href={`/apercu${e.href}`}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {e.meta.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {e.href} ·{" "}
              {e.meta.draft
                ? p.draft
                : isPublished(e)
                  ? p.published
                  : p.scheduled(formatParisDate(e.meta.publishedAt))}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
