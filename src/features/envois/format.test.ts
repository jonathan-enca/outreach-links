import { describe, expect, it } from "vitest";
import { dayLabel, groupByDay, nextLabel, scheduledRows, sentRows, timeLabel } from "./format";

const TZ = "Europe/Paris";
// Vendredi 20 novembre 2026, 15 h à Paris.
const NOW = new Date("2026-11-20T14:00:00Z");

describe("dates de l'écran Emails", () => {
  it("dit le jour dans le fuseau de la boîte, avec aujourd'hui, demain et hier", () => {
    expect(dayLabel(new Date("2026-11-20T08:02:00Z"), TZ, NOW)).toBe(
      "Aujourd'hui, vendredi 20 novembre",
    );
    expect(dayLabel(new Date("2026-11-21T08:00:00Z"), TZ, NOW)).toBe("Demain, samedi 21 novembre");
    expect(dayLabel(new Date("2026-11-19T08:00:00Z"), TZ, NOW)).toBe("Hier, jeudi 19 novembre");
    expect(dayLabel(new Date("2026-11-23T08:00:00Z"), TZ, NOW)).toBe("Lundi 23 novembre");
    // 23 h 30 UTC le dimanche : déjà lundi à Paris.
    expect(dayLabel(new Date("2026-11-22T23:30:00Z"), TZ, NOW)).toBe("Lundi 23 novembre");
  });

  it("écrit l'heure à la française, minutes sur deux chiffres", () => {
    expect(timeLabel(new Date("2026-11-23T08:00:00Z"), TZ)).toBe("9 h 00");
    expect(timeLabel(new Date("2026-11-23T08:06:00Z"), TZ)).toBe("9 h 06");
    expect(timeLabel(new Date("2026-11-23T16:45:00Z"), TZ)).toBe("17 h 45");
  });

  it("met la majuscule au prochain départ et garde « vers »", () => {
    expect(nextLabel("2026-11-23T08:00:00Z", TZ)).toBe("Lundi 23 novembre vers 9 h");
  });
});

describe("lignes de la boîte", () => {
  const scheduled = scheduledRows(
    [
      {
        draftId: "a",
        domain: "a.example",
        email: "x@a.example",
        subject: "A",
        body: "…",
        at: "2026-11-23T08:00:00Z",
      },
      {
        draftId: "b",
        domain: "b.example",
        email: "x@b.example",
        subject: "B",
        body: "…",
        at: "2026-11-23T08:06:00Z",
      },
      {
        draftId: "c",
        domain: "c.example",
        email: "x@c.example",
        subject: "C",
        body: "…",
        at: "2026-11-24T08:00:00Z",
      },
      {
        draftId: "d",
        domain: "d.example",
        email: "x@d.example",
        subject: "D",
        body: "…",
        at: null,
      },
    ],
    TZ,
    NOW,
  );

  it("range les emails programmés par jour, l'heure inconnue à part", () => {
    const groups = groupByDay(scheduled);
    expect(groups.map((g) => [g.day, g.rows.map((r) => r.id)])).toEqual([
      ["Lundi 23 novembre", ["a", "b"]],
      ["Mardi 24 novembre", ["c"]],
      ["En attente de départ", ["d"]],
    ]);
    expect(scheduled[1]).toMatchObject({
      draftId: "b",
      time: "9 h 06",
      meta: "Départ prévu lundi 23 novembre vers 9 h 06",
    });
    expect(scheduled[3]).toMatchObject({ time: "—", meta: "Heure de départ pas encore connue" });
  });

  it("montre le site contacté d'un email parti, à défaut le domaine de l'adresse", () => {
    const rows = sentRows(
      [
        {
          id: "1",
          domain: "site.example",
          email: "x@gmail.com",
          subject: "S",
          body: "…",
          sentAt: "2026-11-20T08:27:00Z",
        },
        { id: "2", domain: "", email: "y@autre.example", subject: "S", body: "…", sentAt: null },
      ],
      TZ,
      NOW,
    );
    expect(rows[0]).toMatchObject({
      domain: "site.example",
      day: "Aujourd'hui, vendredi 20 novembre",
      time: "9 h 27",
      meta: "Envoyé vendredi 20 novembre à 9 h 27",
    });
    expect(rows[0]!.draftId).toBeUndefined();
    expect(rows[1]).toMatchObject({ domain: "autre.example", day: "", time: "—" });
  });
});
