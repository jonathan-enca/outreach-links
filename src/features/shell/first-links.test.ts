import { describe, expect, it } from "vitest";
import { firstLinkSteps, nextFirstLinkKey, type FirstLinksInput } from "./first-links";

const none: FirstLinksInput = {
  firstSiteId: null,
  searchConsoleShown: true,
  searchConsoleConnected: false,
  campaignDone: false,
  campaignHref: "/app/demarrer",
  validated: false,
  mailbox: false,
  sent: false,
};

describe("firstLinkSteps", () => {
  it("affiche le fil dès l'arrivée, sans aucun site, avec les liens vers l'onboarding", () => {
    const steps = firstLinkSteps(none);
    expect(steps.map((s) => s.key)).toEqual([
      "searchConsole",
      "campaign",
      "validate",
      "mailbox",
      "send",
    ]);
    expect(steps.every((s) => s.href === "/app/demarrer" || s.key === "send")).toBe(true);
    expect(steps.find((s) => s.key === "send")?.href).toBe("/app/a-valider");
  });

  it("masque la Search Console quand elle n'est pas ouverte", () => {
    const steps = firstLinkSteps({ ...none, searchConsoleShown: false });
    expect(steps.some((s) => s.key === "searchConsole")).toBe(false);
  });

  it("marque la Search Console comme facultative et la met avant la campagne", () => {
    const steps = firstLinkSteps({ ...none, firstSiteId: "s1" });
    expect(steps[0]).toMatchObject({
      key: "searchConsole",
      optional: true,
      href: "/app/site/s1#search-console",
    });
    expect(steps[1]?.key).toBe("campaign");
  });

  it("relie chaque étape à son écran quand le site existe", () => {
    const steps = firstLinkSteps({
      ...none,
      firstSiteId: "s1",
      campaignHref: "/app/site/s1/analyse",
      mailbox: false,
    });
    const href = Object.fromEntries(steps.map((s) => [s.key, s.href]));
    expect(href.campaign).toBe("/app/site/s1/analyse");
    expect(href.validate).toBe("/app/site/s1/cibles");
    expect(href.mailbox).toBe("/app/reglages/boite?site=s1");
  });
});

describe("nextFirstLinkKey", () => {
  it("ne met jamais la Search Console en avant, même non cochée", () => {
    const steps = firstLinkSteps(none);
    expect(nextFirstLinkKey(steps)).toBe("campaign");
  });

  it("passe à la suivante une fois l'étape cochée, et renvoie null quand tout est fait", () => {
    const steps = firstLinkSteps({
      ...none,
      firstSiteId: "s1",
      searchConsoleConnected: true,
      campaignDone: true,
      validated: true,
      mailbox: true,
      sent: true,
    });
    expect(nextFirstLinkKey(steps)).toBeNull();
    expect(nextFirstLinkKey(firstLinkSteps({ ...none, campaignDone: true }))).toBe("validate");
  });
});
