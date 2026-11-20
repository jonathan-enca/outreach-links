import { notFound } from "next/navigation";
import { ApprovalQueue, type QueueActions } from "@/features/approvals/queue";
import type {
  PendingForm,
  PendingMessage,
  PendingReply,
  QueueView,
} from "@/features/approvals/service";
import { t } from "@/lib/messages";

const SITES = [
  { id: "a", label: "atelier-coloriage.fr · France", n: 12 },
  { id: "e", label: "effacer-mes-donnees.fr · France", n: 5 },
  { id: "j", label: "jardin-des-petits.fr · France", n: 2 },
];

function message(planId: string, campaign: string, i: number): PendingMessage {
  return {
    kind: "message",
    id: `${planId}-m${i}`,
    planId,
    channel: "email",
    domain: `blog-exemple-${planId}${i}.fr`,
    campaign,
    to: `contact@blog-exemple-${planId}${i}.fr`,
    subject: `Une ressource pour votre page « Liens utiles » (${i})`,
    body: "Bonjour,\n\nVotre page « Liens utiles » recommande plusieurs sites comparables au nôtre.\n\nNous venons de publier une fiche pratique, gratuite et sans inscription : https://exemple.fr/fiche\n\nSi elle vous semble utile à vos lecteurs, elle aurait sa place dans votre liste.\n\nBonne journée,\nJulien",
    signed: null,
    hook: "Sa page liste déjà douze sites comparables.",
    reason: "Page de ressources tenue à jour, qui cite des sites comme le vôtre.",
    ready: i !== 3,
    issues: i === 3 ? [{ message: "L'adresse de la page proposée ne répond pas." } as never] : [],
    reviewNote: i === 2 ? "la page date de 2019, elle n'est peut-être plus tenue à jour." : null,
    snoozedUntil: null,
  };
}

/**
 * Démonstration (hors production, sans base) de la file « À valider ».
 * `?etat=vide` : boîte à zéro ; `?etat=debut` : rien n'a encore été rédigé.
 */
export default async function DemoToValidatePage({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string; sites?: string; redaction?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  // `?sites=1` : un seul site analysé quatre fois (quatre plans, une seule campagne) ;
  // `?redaction=oui` : une rédaction est en cours.
  const { etat, sites, redaction } = await searchParams;
  const one = sites === "1";
  const writing = redaction === "oui";
  async function idle() {
    "use server";
    return { status: "ok" as const, message: "Démonstration : rien n'est enregistré." };
  }
  const empty = etat === "vide" || etat === "debut";
  const messages = one
    ? Array.from({ length: SITES[0]!.n }, (_, i) => ({
        ...message(`a${i % 4}`, SITES[0]!.label, i + 1),
        campaignId: "a",
      }))
    : SITES.flatMap((s) => Array.from({ length: s.n }, (_, i) => message(s.id, s.label, i + 1)));
  const replies: PendingReply[] = [
    {
      kind: "reponse",
      id: "r1",
      classificationId: "c1",
      to: "sophie@lesptitsloupsdecp.fr",
      subject: "Re: Une ressource pour votre page",
      body: "Bonjour Sophie,\n\nMerci beaucoup. Voici l'image en pièce jointe.\n\nBonne journée,\nJulien",
      signed: null,
      theirs: "Avec plaisir, je l'ajoute cette semaine. Auriez-vous une image à me fournir ?",
      snoozedUntil: null,
      planId: "a",
      campaign: SITES[0]!.label,
    },
  ];
  const forms: PendingForm[] = [
    {
      kind: "formulaire",
      id: "f1",
      taskId: "t1",
      domain: "centre-loisirs-bellevue.fr",
      campaign: SITES[0]!.label,
      formUrl: "https://exemple.fr/contact",
      body: "Bonjour,\n\nVotre page « Activités » recommande plusieurs sites comme le nôtre.\n\nBonne journée,\nJulien",
      ready: true,
      issues: [],
      snoozedUntil: null,
      planId: "a",
    },
  ];
  const view: QueueView = {
    campaigns: (one ? SITES.slice(0, 1) : SITES).map(({ id, label }) => ({ id, label })),
    messages: empty ? [] : messages,
    replies: empty ? [] : replies,
    forms: empty ? [] : forms,
    hasMailbox: true,
    snoozed: 2,
    later: [
      {
        id: "s1",
        nature: "messages",
        title: "creche-les-lutins.fr",
        line: "Pour votre page « Idées d'activités »",
        planId: "a",
        campaign: SITES[0]!.label,
        until: "2026-11-19T08:10:00Z",
        returns: "jeudi 19 novembre vers 9 h 10",
      },
      {
        id: "s2",
        nature: "reponses",
        title: "contact@club-informatique-dole.fr",
        line: "« Nous en reparlons après notre réunion de jeudi. »",
        planId: "e",
        campaign: SITES[1]!.label,
        until: "2026-11-19T08:15:00Z",
        returns: "jeudi 19 novembre vers 9 h 15",
      },
    ],
    handled: etat !== "debut",
    approved: etat === "debut" ? 0 : 10,
    missing: empty ? 0 : writing ? 7 : 12,
    drafting: writing,
    declined: [],
  };
  const actions = Object.fromEntries(
    [
      "approveMessages",
      "editMessage",
      "approveReply",
      "approveReplies",
      "snooze",
      "wakeSnoozed",
      "refuseItems",
      "editReply",
      "rejectReply",
      "completeForm",
      "draftMissing",
      "draftAnyway",
    ].map((k) => [k, idle]),
  ) as unknown as QueueActions;
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 bg-muted/40 px-4 py-6 md:px-8">
      <h1 className="font-display text-2xl font-bold">{t.toValidate.title}</h1>
      <ApprovalQueue view={view} actions={actions} />
    </main>
  );
}
