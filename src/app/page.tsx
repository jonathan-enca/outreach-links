import type { Metadata } from "next";
import { Hero } from "@/features/home/hero";
import { HowItWorks } from "@/features/home/how-it-works";
import { Problem } from "@/features/home/problem";
import { SiteHeader } from "@/features/home/site-header";
import { TrustStrip } from "@/features/home/trust-strip";
import { WhatItIs } from "@/features/home/what-it-is";
import { t } from "@/lib/messages";

export const metadata: Metadata = {
  title: `${t.app.name} : ${t.home.hero.title}`,
  description: t.app.description,
};

/** Home publique (MH.2) : en-tête, hero, réassurance, c'est quoi, problème, comment ça marche. La suite : MH.3. */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="contenu">
        <Hero />
        <TrustStrip />
        <WhatItIs />
        <Problem />
        <HowItWorks />
      </main>
    </>
  );
}
