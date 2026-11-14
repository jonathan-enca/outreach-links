import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { auditDiscover, discoverEventSchema } from "@/inngest/functions/audit-discover";
import { functions } from "@/inngest/functions";
import { AuditDetail, type AuditView } from "./audit-detail";
import { formatUsd } from "./format";
import { PrepareAuditForm } from "./prepare-audit-form";

const base: AuditView = {
  id: "a1",
  domain: "mega-coloring.com",
  status: "estime",
  plan: "gratuit",
  estimatedCostUsd: 0.018,
  actualCostUsd: null,
  costCapUsd: 0.25,
  perQuery: [
    { query: "coloriage licorne", usd: 0.006 },
    { query: "coloriage chat", usd: 0.006 },
  ],
  errorMessage: null,
  competitors: [],
};

const render = (audit: AuditView) =>
  renderToStaticMarkup(
    createElement(AuditDetail, { audit, confirmAction: async () => ({ status: "idle" as const }) }),
  );

describe("AuditDetail", () => {
  it("estimé : affiche le coût, le plafond et le bouton de confirmation", () => {
    const html = render(base);
    expect(html).toContain("Coût estimé avant lancement");
    expect(html).toContain("Confirmer et lancer l");
    expect(html).toContain("coloriage licorne");
    expect(html).toContain(formatUsd(0.018).replace(/ | /g, " ").slice(0, 3));
  });
  it("confirmé : propose seulement de relancer l'envoi", () => {
    const html = render({ ...base, status: "confirme" });
    expect(html).toContain("Relancer l");
    expect(html).not.toContain("Confirmer et lancer");
  });
  it("en cours : pas de bouton de confirmation", () => {
    const html = render({ ...base, status: "en_cours" });
    expect(html).toContain("Audit en cours");
    expect(html).not.toContain("<button");
  });
  it("échoué : message d'erreur", () => {
    const html = render({ ...base, status: "echoue", errorMessage: "HTTP 500" });
    expect(html).toContain("L&#x27;audit a échoué");
    expect(html).toContain("HTTP 500");
  });
  it("terminé : tableau des concurrents et comparaison estimé / réel", () => {
    const html = render({
      ...base,
      status: "termine",
      actualCostUsd: 0.018,
      competitors: [
        {
          domain: "hugolescargot.com",
          queriesCount: 3,
          bestRank: 1,
          appearances: 3,
          selected: true,
        },
        { domain: "coloriez.com", queriesCount: 2, bestRank: 3, appearances: 2, selected: false },
      ],
    });
    expect(html).toContain("hugolescargot.com");
    expect(html).toContain("coloriez.com");
    expect(html).toContain("Écart");
    expect(html).toContain("plan gratuit retient 3 concurrents");
    expect(html).not.toContain("Confirmer et lancer");
  });
  it("terminé sans concurrent : message dédié", () => {
    expect(render({ ...base, status: "termine", actualCostUsd: 0.006 })).toContain(
      "Aucun concurrent",
    );
  });
});

describe("PrepareAuditForm", () => {
  it("rend un bouton de préparation", () => {
    const html = renderToStaticMarkup(
      createElement(PrepareAuditForm, { action: async () => ({ status: "idle" as const }) }),
    );
    expect(html).toContain("Préparer un audit");
  });
});

describe("fonction Inngest audit.discover", () => {
  it("est enregistrée et validée par zod", () => {
    expect(functions).toContain(auditDiscover);
    expect(discoverEventSchema.safeParse({ auditId: "pas-un-uuid" }).success).toBe(false);
    expect(
      discoverEventSchema.safeParse({ auditId: "11111111-1111-4111-8111-111111111111" }).success,
    ).toBe(true);
  });
});
