import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { auditDiscover, discoverEventSchema } from "@/inngest/functions/audit-discover";
import { functions } from "@/inngest/functions";
import { AuditDetail, type AuditView } from "./audit-detail";
import { PrepareAuditForm } from "./prepare-audit-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

const base: AuditView = {
  id: "a1",
  siteId: "s1",
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

// Le script de relecture des formulaires de React contient des « $$ » : on ne teste que le HTML visible.
const render = (audit: AuditView) =>
  renderToStaticMarkup(
    createElement(AuditDetail, { audit, confirmAction: async () => ({ status: "idle" as const }) }),
  ).replace(/<script>[\s\S]*?<\/script>/g, "");

describe("AuditDetail", () => {
  it("estimé : une phrase, un bouton, aucun montant (décision D1)", () => {
    const html = render(base);
    expect(html).toContain("Lancer l&#x27;analyse");
    expect(html).toContain("environ 15 minutes");
    expect(html).not.toMatch(/USD|\$|dollar|plafond|coloriage licorne/i);
  });
  it("confirmé : propose seulement de relancer l'envoi", () => {
    const html = render({ ...base, status: "confirme" });
    expect(html).toContain("Relancer l");
    expect(html).not.toContain("Lancer l&#x27;analyse</button>");
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
  it("terminé : tableau des concurrents, sans coût", () => {
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
    expect(html).not.toMatch(/USD|\$/);
    expect(html).toContain("plan gratuit retient 3 concurrents");
    expect(html).not.toContain("Lancer l&#x27;analyse</button>");
  });
  it("terminé sans concurrent : message dédié", () => {
    expect(render({ ...base, status: "termine", actualCostUsd: 0.006 })).toContain(
      "Aucun concurrent",
    );
  });
});

describe("AuditDetail : analyse unique", () => {
  it("en cours : message de durée, pas de bouton", () => {
    const html = render({ ...base, status: "termine", analysisStatus: "en_cours" });
    expect(html).toContain("Analyse en cours");
    expect(html).not.toContain("<button");
  });
  it("en échec : reprise proposée, sans montant", () => {
    const html = render({ ...base, status: "termine", analysisStatus: "echoue" });
    expect(html).toContain("Reprendre l&#x27;analyse");
    expect(html).not.toMatch(/USD|\$/);
  });
  it("terminée : un seul bouton principal vers les cibles du site", () => {
    const html = render({ ...base, status: "termine", analysisStatus: "termine" });
    expect(html).toContain('href="/app/site/s1/cibles"');
    expect(html).toContain("Voir vos cibles");
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
