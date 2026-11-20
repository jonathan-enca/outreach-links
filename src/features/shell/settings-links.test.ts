import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inSettings, SETTINGS_HOME, settingsGroups } from "./settings-links";

const appDir = path.resolve(import.meta.dirname, "../../app");

describe("réglages sur téléphone", () => {
  it("chaque lien du hub mène à une page qui existe, sans doublon", () => {
    const hrefs = settingsGroups().flatMap((g) => g.links.map((l) => l.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of [SETTINGS_HOME, ...hrefs]) {
      expect(existsSync(path.join(appDir, href.slice(1), "page.tsx")), href).toBe(true);
    }
  });

  it("toutes les pages de réglages du menu de l'ordinateur sont dans le hub", () => {
    const hrefs = settingsGroups().flatMap((g) => g.links.map((l) => l.href));
    for (const h of [
      "/app/reglages/boite",
      "/app/reglages/notifications",
      "/app/facturation",
      "/app/garde-fous",
      "/app/liens",
    ])
      expect(hrefs).toContain(h);
  });

  it("l'onglet Réglages reste actif sur chaque page qu'il ouvre", () => {
    for (const p of [
      "/app/reglages",
      "/app/reglages/boite",
      "/app/facturation",
      "/app/garde-fous",
      "/app/site/0f6e1a0e-0000-4000-8000-000000000000",
    ])
      expect(inSettings(p), p).toBe(true);
    for (const p of ["/app", "/app/inbox", "/app/campagnes", "/app/a-valider"])
      expect(inSettings(p), p).toBe(false);
  });
});
