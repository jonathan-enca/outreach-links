import { writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { formatTrackingMarkdown } from "./tracking";
import { loadTrackedTargets } from "./tracking-report";

/**
 * Tableau interne (MQ.1) : lit la base réelle en service_role et écrit le Markdown dans le fichier
 * donné par TRACKING_REPORT_OUT (par défaut : affichage). Lecture seule, aucun envoi.
 * Lancer : `pnpm demo:tracking` (variables d'environnement Supabase requises).
 */
const enabled = Boolean(process.env.TRACKING_REPORT);

describe.skipIf(!enabled)("tableau interne du suivi des cibles", () => {
  it("affiche cibles, envois, réponses et liens par piste, niveau et type de site", async () => {
    const targets = await loadTrackedTargets(createServiceClient());
    const md = formatTrackingMarkdown(targets);
    const out = process.env.TRACKING_REPORT_OUT;
    if (out) writeFileSync(out, `${md}\n`, "utf8");
    console.log(md);
  }, 120_000);
});
