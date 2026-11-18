import { notFound } from "next/navigation";
import { JourneySteps } from "@/features/shell/journey-steps";
import { MoreSites } from "@/features/targets/targets-screen";
import type { TargetsView } from "@/features/targets/service";

/**
 * Démonstration (hors production, sans base) : le fil d'étapes cliquable et la carte « Lire le lot suivant ».
 */
export default function DemoLotSuivantPage() {
  if (process.env.NODE_ENV === "production") notFound();
  async function idle() {
    "use server";
    return { status: "idle" as const };
  }
  const funnel = { stock: 211 } as NonNullable<TargetsView["funnel"]>;
  const more = {
    status: "aucun",
    added: null,
    auto: { status: "termine", added: 4, stop: "rendement_faible", startedAt: null },
  } as unknown as TargetsView["more"];
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <JourneySteps current="cibles" links={{ analyse: "/demo/analyse?etat=terminee" }} />
      <MoreSites funnel={funnel} more={more} start={idle} />
    </main>
  );
}
