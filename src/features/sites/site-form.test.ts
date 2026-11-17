import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteForm } from "./site-form";

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
