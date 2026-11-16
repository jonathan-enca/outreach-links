import type { Metadata } from "next";
import { Compare } from "@/features/home/compare";
import { Faq } from "@/features/home/faq";
import { Features } from "@/features/home/features";
import { FinalCta } from "@/features/home/final-cta";
import { Hero } from "@/features/home/hero";
import { HowItWorks } from "@/features/home/how-it-works";
import { JsonLd } from "@/features/home/json-ld";
import { getPublicPlans } from "@/features/home/plans";
import { Pricing } from "@/features/home/pricing";
import { Quality } from "@/features/home/quality";
import { SiteFooter } from "@/features/home/site-footer";
import { SiteHeader } from "@/features/home/site-header";
import { Tactics } from "@/features/home/tactics";
import { Proofs } from "@/features/home/proofs-section";
import { WhatItIs } from "@/features/home/what-it-is";
import { t } from "@/lib/messages";

export const metadata: Metadata = {
  title: `${t.app.name} : ${t.home.hero.title}`,
  description: t.app.description,
  alternates: { canonical: "/" },
};

/** La page reste statique ; les tarifs (table `plans`) sont relus toutes les heures. */
export const revalidate = 3600;

/** Home publique (MH.2 et MH.3). La section « preuves » affiche des chiffres d'illustration (proofs.ts) jusqu'aux vraies mesures. */
export default async function Home() {
  const plans = await getPublicPlans();
  return (
    <>
      <SiteHeader />
      <main id="contenu">
        <Hero />
        <WhatItIs />
        <Tactics />
        <Proofs />
        <HowItWorks />
        <Quality />
        <Features />
        <Compare />
        <Pricing plans={plans} />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
      <JsonLd plans={plans} />
    </>
  );
}
