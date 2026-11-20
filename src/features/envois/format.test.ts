import { describe, expect, it } from "vitest";
import {
  dayLabel,
  fromLabel,
  groupByDay,
  hoursLabel,
  nextLabel,
  scheduledRows,
  sentRows,
  timeLabel,
} from "./format";
import { mondayKey } from "./service";

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

  it("dit le prochain départ comme la maquette", () => {
    expect(nextLabel("2026-11-23T08:00:00Z", TZ)).toBe("Lundi 23 novembre, 9\u00a0h");
    expect(nextLabel("2026-11-23T08:06:00Z", TZ)).toBe("Lundi 23 novembre, 9\u00a0h\u00a006");
  });

  it("dit les horaires et la boîte d'envoi", () => {
    expect(hoursLabel({ days: [1, 2, 3, 4, 5], startHour: 9, endHour: 18 })).toBe(
      "du lundi au vendredi, entre 9 h et 18 h",
    );
    expect(hoursLabel({ days: [1, 2, 3, 4, 5, 6, 7], startHour: 0, endHour: 24 })).toBe(
      "tous les jours, 24 h sur 24",
    );
    expect(fromLabel("google", "a@b.example")).toBe("votre boîte Gmail");
    expect(fromLabel("smtp", "a@b.example")).toBe("a@b.example");
  });

  it("trouve le lundi de la semaine en cours dans le fuseau de la boîte", () => {
    expect(mondayKey(NOW, TZ)).toBe("2026-11-16");
    // Dimanche 23 h 30 UTC : déjà lundi à Paris.
    expect(mondayKey(new Date("2026-11-22T23:30:00Z"), TZ)).toBe("2026-11-23");
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
