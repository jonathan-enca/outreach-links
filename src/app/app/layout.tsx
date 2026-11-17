import { ContentWidth } from "@/features/shell/content-width";
import Link from "next/link";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

/** Les sites de la personne (la RLS limite à son espace) pour le menu ; vide tant que rien n'est chargé. */
async function Nav() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("id, domain")
    .order("created_at", { ascending: true });
  return <AppNav sites={data ?? []} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-20 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        {t.nav.skipToContent}
      </a>
      <header className="flex h-14 items-center border-b border-border bg-card px-4">
        <Link href="/app" className="font-display text-lg font-semibold text-primary">
          {t.app.name}
        </Link>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <Suspense fallback={<AppNav sites={[]} />}>
          <Nav />
        </Suspense>
        <main id="contenu" className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
          <ContentWidth>{children}</ContentWidth>
        </main>
      </div>
    </div>
  );
}
