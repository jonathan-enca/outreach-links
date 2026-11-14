import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { t } from "@/lib/messages";

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
        <AppNav />
        <main id="contenu" className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
