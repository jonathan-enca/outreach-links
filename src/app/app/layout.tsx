import { ContentWidth } from "@/features/shell/content-width";
import Link from "next/link";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { MobileBack } from "@/features/shell/mobile-back";
import { loadOverview } from "@/features/shell/overview";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { ALL_SITES, selectedSiteId } from "@/features/shell/current-site";
import { selectSite, signOut } from "./actions";

/**
 * Menu : sites, compteurs de ce qui attend la personne, compte (la RLS limite à son espace).
 * Les compteurs suivent le site choisi ; la liste des sites reste complète.
 */
async function Nav() {
  const supabase = await createClient();
  const [{ data: auth }, siteId] = await Promise.all([
    supabase.auth.getUser(),
    selectedSiteId(supabase),
  ]);
  const overview = await loadOverview(supabase, siteId);
  const p = overview.pending;
  const sites = overview.sites;
  const currentSite = siteId ?? ALL_SITES;
  return (
    <AppNav
      sites={sites}
      currentSite={currentSite}
      selectSite={selectSite}
      counts={{ toValidate: p.drafts + p.replies + p.forms, conversations: p.replies }}
      email={auth.user?.email ?? null}
      signOut={signOut}
    />
  );
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
      {/* Téléphone seulement : sur ordinateur, le nom est en haut du menu latéral. */}
      <header className="flex h-12 items-center justify-between bg-sidebar px-4 md:hidden">
        <Link href="/app" className="font-display text-lg font-semibold text-white">
          {t.app.name}
        </Link>
        <Link href="/app/reglages" className="text-sm text-sidebar-foreground underline">
          {t.shell.nav.account}
        </Link>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <Suspense fallback={<AppNav sites={[]} />}>
          <Nav />
        </Suspense>
        <main id="contenu" className="min-w-0 flex-1 bg-muted/40 px-4 py-6 pb-24 md:px-8 md:pb-8">
          <MobileBack />
          <ContentWidth>{children}</ContentWidth>
        </main>
      </div>
    </div>
  );
}
