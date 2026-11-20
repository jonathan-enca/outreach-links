import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TargetsScreen } from "@/features/targets/targets-screen";
import type { TargetsView } from "@/features/targets/service";
import type { TargetCard } from "@/features/targets/types";
import { t } from "@/lib/messages";

const SITES = [
  [
    "ecole-des-tilleuls.example",
    "ecole",
    "Sa page « Ressources pour la classe » cite déjà quatre sites comparables au vôtre.",
    "email",
    true,
  ],
  [
    "mairie-saint-aubin.example",
    "mairie",
    "La page des activités pour les familles renvoie vers un site qui n'existe plus.",
    "email",
    true,
  ],
  [
    "les-ptites-mains.example",
    "blog",
    "Billet « Nos sites préférés pour les mercredis » : une liste que l'auteure complète encore.",
    "formulaire",
    true,
  ],
  [
    "asso-loisirs-creatifs.example",
    "association",
    "Parle de votre site dans son bulletin de mars, sans faire de lien.",
    "email",
    false,
  ],
  [
    "maitresse-clara.example",
    "ecole",
    "Blog de classe qui partage ses trouvailles chaque mois ; personne ne semble la solliciter.",
    "email",
    true,
  ],
  [
    "centre-social-des-acacias.example",
    "association",
    "Sa page d'idées d'ateliers cite deux ressources proches de la vôtre.",
    "email",
    true,
  ],
  [
    "boutique-du-prefet.example",
    "ecommerce",
    "Guide d'achat avec une rubrique « Pour aller plus loin » tenue à jour.",
    "formulaire",
    true,
  ],
  [
    "forum-parents-bricoleurs.example",
    "forum_modere",
    "Sujet épinglé de liens utiles, mis à jour par les modérateurs.",
    "email",
    true,
  ],
] as const;

const LOST = [
  [
    "bibliotheque-vernay.example",
    "mairie",
    "Sa sélection de sites pour les familles cite deux ressources proches de la vôtre.",
    "/jeunesse/selection-de-sites",
  ],
  [
    "carnet-de-nounou.example",
    "blog",
    "Liste « Mes adresses » tenue par une assistante maternelle, complétée cette année.",
    "/mes-adresses",
  ],
  [
    "ludotheque-du-canal.example",
    "association",
    "Sa page de liens renvoie vers un site qui n'existe plus.",
    "/liens-utiles",
  ],
  [
    "club-photo-des-quais.example",
    "association",
    "Petit site associatif actif, sur votre sujet, que personne ne semble solliciter.",
    "/ateliers-enfants",
  ],
] as const;

const card = (
  id: string,
  domain: string,
  siteType: TargetCard["siteType"],
  why: string,
  kind: TargetCard["contact"]["kind"],
  verified: boolean,
  path = "/ressources",
): TargetCard => ({
  id,
  rank: null,
  domain,
  pageUrl: `https://${domain}${path}`,
  pageTitle: null,
  siteType,
  tactics: ["ressources"],
  why,
  hook: null,
  contact: {
    kind,
    verified,
    email: kind === "email" ? `contact@${domain}` : null,
    url: kind === "formulaire" ? `https://${domain}/contact` : null,
  },
  requestLines: [
    "Saluer le travail fait sur la page.",
    "Signaler la ressource qui complèterait la liste.",
    "Proposer de l'ajouter, sans rien demander d'autre.",
  ],
  findings: [],
  contactless: kind === "aucun",
  domainRank: null,
  platformHosted: false,
  alreadyValidated: false,
  resource: { url: "https://atelier-papier.example/guide", title: "Le guide complet" },
});

const run = { status: "termine" as const, costUsd: null, stop: null, error: null };

/**
 * Démonstration (hors production, sans base ni appel) : l'écran « Vos cibles » avec des données
 * fictives, pour vérifier le bas de page (barre, sites sans contact, origine de la liste).
 * `?signature=non` : le prénom et le rôle manquent, le bouton vert ouvre la fenêtre.
 */
export default async function DemoCiblesPage({
  searchParams,
}: {
  searchParams: Promise<{ signature?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { signature } = await searchParams;
  const signed = signature !== "non";
  async function idle() {
    "use server";
    return { status: "idle" as const };
  }
  const cards = SITES.map(([d, type, why, kind, verified], i) => ({
    ...card(`c${i}`, d, type, why, kind, verified),
    alreadyValidated: i === 3,
  }));
  const view: TargetsView = {
    auditId: "demo",
    siteId: "demo",
    siteDomain: "atelier-papier.example",
    founderRole: signed ? "equipe" : null,
    hasSignature: signed,
    signatureFirstName: signed ? "Camille" : null,
    collectionDone: true,
    collection: { ...run, preview: null, skipped: { mentions: null, deadPages: [] } },
    qualification: { ...run, preview: null },
    findings: { ...run, preview: null, count: 0 },
    cards,
    contactless: [],
    noContact: LOST.map(([d, type, why, path], i) =>
      card(`l${i}`, d, type, why, "aucun", false, path),
    ),
    competitors: Array.from({ length: 18 }, (_, i) => ({
      domain: `concurrent-${i + 1}.example`,
      queries: 3,
      bestRank: i + 1,
    })),
    publisherTypes: [],
    funnel: {
      candidates: 640,
      preRead: [],
      preReadTotal: 0,
      pagesRead: 429,
      judged: 429,
      relevant: 70,
      shortlist: cards.length,
      stock: 211,
    },
    more: {
      status: "termine",
      added: 2,
      auto: { status: "termine", added: 14, lots: 3, startedAt: null, costUsd: 0, stop: "duree" },
    },
  };
  return (
    <div className="flex">
      <main className="mx-auto min-w-0 max-w-[96rem] flex-1 px-4 py-8 sm:px-6">
        <PageHeader title={t.targets.title} description={t.targets.description} />
        <TargetsScreen
          view={view}
          auditId="demo"
          actions={{
            startCollection: idle,
            startQualification: idle,
            startFindings: idle,
            saveSettings: idle,
            validate: idle,
            readMore: idle,
          }}
        />
      </main>
    </div>
  );
}
