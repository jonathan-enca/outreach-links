import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { EnvoisScreen } from "@/features/envois/envois-view";
import { nextLabel, scheduledRows, sentRows } from "@/features/envois/format";
import type { EnvoisState, ScheduledEnvoi, SentEnvoi } from "@/features/envois/service";
import { t } from "@/lib/messages";

const TZ = "Europe/Paris";
const BODY =
  "Bonjour,\n\nJ'ai lu votre page avec attention : elle cite déjà plusieurs ressources du même type. Je me permets de vous signaler la nôtre, qui pourrait compléter votre liste : https://atelier-papier.example/guide\n\nMerci pour votre temps,\nCamille";

const TARGETS = [
  ["ecole-des-tilleuls.example", "Votre page « Ressources pour la classe » : une suggestion"],
  ["mairie-saint-aubin.example", "Un lien de votre page des activités ne fonctionne plus"],
  ["les-ptites-mains.example", "Vos sites préférés pour les mercredis : une idée à ajouter"],
  ["asso-loisirs-creatifs.example", "Votre bulletin de mars cite notre site"],
  ["maitresse-clara.example", "Vos trouvailles du mois : une ressource gratuite"],
  ["centre-social-des-acacias.example", "Votre page d'idées d'ateliers"],
  ["forum-parents-bricoleurs.example", "Votre sujet épinglé de liens utiles"],
] as const;

/**
 * Démonstration (hors production, sans base ni appel) : l'écran « Emails » avec des données fictives.
 * `?etat=pause`, `?etat=sans_boite` ou `?etat=simulation` montre les autres états ; `?vide=oui` les
 * dossiers vides.
 */
export default async function DemoEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string; vide?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { etat, vide } = await searchParams;
  const state: EnvoisState =
    etat === "pause" || etat === "sans_boite" || etat === "simulation" ? etat : "actif";
  const now = new Date();
  // Prochain jour à 9 h (heure de Paris en hiver), puis un email toutes les six minutes.
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(8, 0, 0, 0);
  const empty = vide === "oui";
  const scheduled: ScheduledEnvoi[] = empty
    ? []
    : TARGETS.map(([domain, subject], i) => ({
        draftId: `d${i}`,
        domain,
        email: `contact@${domain}`,
        subject,
        body: BODY,
        at:
          state === "actif"
            ? new Date(
                tomorrow.getTime() + (i < 5 ? i * 360_000 : 86_400_000 + (i - 5) * 360_000),
              ).toISOString()
            : null,
      }));
  const sent: SentEnvoi[] = empty
    ? []
    : Array.from({ length: 25 }, (_, i) => ({
        id: `s${i}`,
        domain: `blog-exemple-${i + 1}.example`,
        email: `bonjour@blog-exemple-${i + 1}.example`,
        subject: "Votre sélection d'outils : une suggestion",
        body: BODY,
        sentAt: new Date(
          now.getTime() - Math.floor(i / 5) * 86_400_000 - (i % 5) * 360_000 - 3_600_000,
        ).toISOString(),
      }));
  async function idle() {
    "use server";
    return { status: "ok" as const, message: "Démonstration : rien n'est modifié." };
  }
  return (
    <div className="flex">
      <main className="mx-auto min-w-0 max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <PageHeader title={t.envois.title} description={t.envois.description} />
        <EnvoisScreen
          state={state}
          scheduled={scheduledRows(scheduled, TZ, now)}
          sent={sentRows(sent, TZ, now)}
          sentTotal={empty ? 0 : 140}
          hours="du lundi au vendredi, de 9 h à 18 h"
          fromEmail="camille@atelier-papier.example"
          next={scheduled[0]?.at ? nextLabel(scheduled[0].at, TZ) : null}
          day={state === "sans_boite" ? null : { used: empty ? 0 : 5, cap: 5 }}
          warmingUp
          week={empty ? 0 : 25}
          month={{ used: empty ? 0 : 40, cap: 100 }}
          actions={{ cancel: idle, setPaused: idle }}
        />
      </main>
    </div>
  );
}
