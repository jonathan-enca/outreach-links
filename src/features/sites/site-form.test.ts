import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteForm } from "./site-form";
import { VerificationPanel } from "./verification-panel";

describe("SiteForm", () => {
  it("affiche les cinq champs de contexte et trois requêtes", () => {
    const html = renderToStaticMarkup(
      createElement(SiteForm, {
        action: async () => ({ status: "idle" as const }),
        submitLabel: "Créer",
      }),
    );
    for (const name of [
      "domain",
      "niche",
      "country",
      "language",
      "signatureFirstName",
      "offeredAsset",
      "senderEmail",
      "query1",
      "query2",
      "query3",
    ]) {
      expect(html).toContain(`name="${name}"`);
    }
    expect(html).toContain("Créer");
  });
});

describe("VerificationPanel", () => {
  const action = async () => ({ status: "idle" as const });
  it("montre la balise et le fichier tant que le domaine n'est pas vérifié", () => {
    const html = renderToStaticMarkup(
      createElement(VerificationPanel, {
        domain: "monsite.fr",
        token: "tok123",
        verified: false,
        action,
      }),
    );
    expect(html).toContain("outreach-links-verification");
    expect(html).toContain("tok123");
    expect(html).toContain("/.well-known/outreach-links-verification.txt");
  });
  it("n'affiche plus le jeton une fois vérifié", () => {
    const html = renderToStaticMarkup(
      createElement(VerificationPanel, {
        domain: "monsite.fr",
        token: "tok123",
        verified: true,
        action,
      }),
    );
    expect(html).not.toContain("tok123");
  });
});
