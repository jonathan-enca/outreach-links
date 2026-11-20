import { describe, expect, it } from "vitest";
import { messageSteps, writingProgress } from "./drafting-progress";

const base = {
  missing: 0,
  drafting: false,
  approved: 0,
  messages: [] as unknown[],
  forms: [] as unknown[],
  replies: [] as unknown[],
};

describe("les trois étapes des messages", () => {
  it("caché quand tout est vide et que rien ne tourne", () => {
    expect(messageSteps(base).visible).toBe(false);
  });

  it("visible dès qu'une étape a quelque chose", () => {
    expect(messageSteps({ ...base, missing: 8 }).visible).toBe(true);
    expect(messageSteps({ ...base, forms: [1] }).visible).toBe(true);
    expect(messageSteps({ ...base, approved: 3 }).visible).toBe(true);
    expect(messageSteps({ ...base, drafting: true }).visible).toBe(true);
  });

  it("chaque étape a son nombre : rien n'est mélangé", () => {
    const s = messageSteps({
      missing: 12,
      drafting: false,
      approved: 10,
      messages: Array.from({ length: 45 }),
      forms: Array.from({ length: 16 }),
      replies: [],
    });
    expect(s).toEqual({
      visible: true,
      running: false,
      toWrite: 12,
      emails: 45,
      forms: 16,
      replies: 0,
      toApprove: 61,
      approved: 10,
    });
  });

  it("les réponses à approuver comptent dans « à approuver »", () => {
    expect(messageSteps({ ...base, messages: [1], replies: [1, 2] }).toApprove).toBe(3);
  });
});

describe("avancement d'une rédaction en cours", () => {
  it("compte les messages écrits depuis le lancement", () => {
    expect(writingProgress(12, 7)).toEqual({ written: 5, total: 12, percent: 42 });
    expect(writingProgress(12, 12)).toEqual({ written: 0, total: 12, percent: 0 });
    expect(writingProgress(12, 0)).toEqual({ written: 12, total: 12, percent: 100 });
  });

  it("pas de barre quand le point de départ n'est pas connu ou n'a plus de sens", () => {
    expect(writingProgress(null, 7)).toBeNull();
    expect(writingProgress(0, 0)).toBeNull();
    // Des cibles ajoutées en cours de route : plus à écrire qu'au départ.
    expect(writingProgress(5, 9)).toBeNull();
  });
});
