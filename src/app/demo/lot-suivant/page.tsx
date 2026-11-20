import { notFound } from "next/navigation";
import { LiveBanner, MoreSites } from "@/features/targets/targets-screen";
import type { TargetsView } from "@/features/targets/service";

type Auto = TargetsView["more"]["auto"];
const auto = (a: Partial<Auto>): Auto => ({
  status: "termine",
  added: 14,
  lots: 3,
  startedAt: null,
  costUsd: 0,
  stop: null,
  ...a,
});

/** États de la lecture des autres sites (`?etat=`), sans base ni appel payant. */
const STATES: Record<string, { stock: number; more: TargetsView["more"] }> = {
  "en-cours": {
    stock: 412,
    more: { status: "en_cours", added: null, auto: auto({ status: "en_cours", stop: null }) },
  },
  terminee: {
    stock: 0,
    more: { status: "termine", added: 3, auto: auto({ stop: "reserve_epuisee" }) },
  },
  duree: { stock: 211, more: { status: "termine", added: 2, auto: auto({ stop: "duree" }) } },
  erreur: {
    stock: 388,
    more: { status: "echoue", added: null, auto: auto({ status: "echoue", stop: "erreur" }) },
  },
  limite: { stock: 640, more: { status: "termine", added: 5, auto: auto({ stop: "budget" }) } },
  "non-lus": {
    stock: 37,
    more: { status: "termine", added: 0, auto: auto({ stop: "reserve_epuisee" }) },
  },
  "reserve-vide": {
    stock: 0,
    more: { status: "aucun", added: null, auto: auto({ status: "aucun", added: 0 }) },
  },
  ancienne: {
    stock: 120,
    more: { status: "aucun", added: null, auto: auto({ status: "aucun", added: 0 }) },
  },
};

/**
 * Démonstration (hors production, sans base) : le fil d'étapes cliquable, le bandeau de suivi et la
 * carte affichée après la lecture des autres sites, pour chaque état.
 */
export default async function DemoLotSuivantPage({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  async function idle() {
    "use server";
    return { status: "idle" as const };
  }
  const { etat } = await searchParams;
  const state = STATES[etat ?? ""] ?? STATES.limite!;
  const funnel = {
    candidates: 1412,
    preRead: [],
    preReadTotal: 0,
    pagesRead: 560,
    judged: 300,
    relevant: 80,
    shortlist: 64,
    stock: state.stock,
  } satisfies NonNullable<TargetsView["funnel"]>;
  const view = {
    funnel,
    more: state.more,
    cards: Array.from({ length: 64 }, (_, i) => ({ id: String(i) })),
  } as unknown as TargetsView;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <LiveBanner view={view} hidden={0} onReveal={idle} />
      <MoreSites funnel={funnel} more={state.more} start={idle} />
    </main>
  );
}
