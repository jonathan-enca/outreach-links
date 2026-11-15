import { env } from "@/env";
import { t } from "@/lib/messages";
import type { PublicPlan } from "./plans";

/** Données structurées de la home. Les offres viennent de la table `plans` ; la FAQ, des textes affichés. */
export function buildJsonLd(plans: PublicPlan[] | null) {
  const url = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const name = t.app.name;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${url}/#organization`, name, url },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name,
        inLanguage: "fr",
        publisher: { "@id": `${url}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name,
        description: t.app.description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "fr",
        url,
        ...(plans
          ? {
              offers: plans.map((p) => ({
                "@type": "Offer",
                name: p.name,
                price: (p.priceEurCents / 100).toFixed(2),
                priceCurrency: "EUR",
              })),
            }
          : {}),
      },
      {
        "@type": "FAQPage",
        mainEntity: t.home.faq.items.map((i) => ({
          "@type": "Question",
          name: i.q,
          acceptedAnswer: { "@type": "Answer", text: i.a },
        })),
      },
    ],
  };
}

export function JsonLd({ plans }: { plans: PublicPlan[] | null }) {
  // `<` échappé : une valeur ne peut pas fermer la balise script.
  const json = JSON.stringify(buildJsonLd(plans)).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
