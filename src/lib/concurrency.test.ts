import { describe, expect, it } from "vitest";
import { hostLane, mapByHost } from "./concurrency";

const tick = () => new Promise<void>((r) => setTimeout(r, 1));

describe("hostLane", () => {
  it("regroupe les sous-domaines d'un même site ou d'une même plateforme", () => {
    expect(hostLane("www.exemple.fr")).toBe("exemple.fr");
    expect(hostLane("blog.exemple.fr")).toBe("exemple.fr");
    expect(hostLane("maitresse-julie.eklablog.com")).toBe("eklablog.com");
    expect(hostLane("https://Ecole-X.ac-lyon.fr/page?a=1")).toBe("ac-lyon.fr");
    expect(hostLane("exemple.fr")).toBe("exemple.fr");
    expect(hostLane("localhost")).toBe("localhost");
  });
});

describe("mapByHost", () => {
  it("garde l'ordre des résultats et lit des hôtes différents de front", async () => {
    let running = 0;
    let peak = 0;
    const hosts = ["a.fr", "b.fr", "c.fr", "d.fr", "e.fr", "f.fr"];
    const out = await mapByHost(
      hosts,
      (h) => h,
      async (h, i) => {
        running++;
        peak = Math.max(peak, running);
        await tick();
        await tick();
        running--;
        return `${i}:${h}`;
      },
      { concurrency: 3 },
    );
    expect(out).toEqual(hosts.map((h, i) => `${i}:${h}`));
    expect(peak).toBe(3);
  });

  it("ne frappe jamais deux fois le même hôte en même temps, et attend entre deux lectures", async () => {
    const active = new Map<string, number>();
    let overlap = false;
    const sleeps: number[] = [];
    const urls = [
      "https://un.blogspot.com/a",
      "https://exemple.fr/1",
      "https://deux.blogspot.com/b",
      "https://www.exemple.fr/2",
      "https://autre.fr/",
    ];
    const order: string[] = [];
    await mapByHost(
      urls,
      (u) => u,
      async (u) => {
        const lane = hostLane(u);
        if ((active.get(lane) ?? 0) > 0) overlap = true;
        active.set(lane, (active.get(lane) ?? 0) + 1);
        await tick();
        order.push(u);
        active.set(lane, (active.get(lane) ?? 0) - 1);
      },
      {
        concurrency: 8,
        sameHostDelayMs: 600,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
      },
    );
    expect(overlap).toBe(false);
    // Deux files de deux éléments : une attente chacune, aucune pour l'hôte seul.
    expect(sleeps).toEqual([600, 600]);
    expect(order.indexOf("https://exemple.fr/1")).toBeLessThan(
      order.indexOf("https://www.exemple.fr/2"),
    );
  });

  it("une concurrence de 1 revient à une lecture en série ; une liste vide ne fait rien", async () => {
    const seen: number[] = [];
    await mapByHost(
      [1, 2, 3],
      (n) => `h${n}.fr`,
      async (n) => {
        seen.push(n);
      },
      { concurrency: 1 },
    );
    expect(seen).toEqual([1, 2, 3]);
    expect(await mapByHost([], String, async () => 1, { concurrency: 4 })).toEqual([]);
  });

  it("remonte l'erreur et n'entame plus de nouvel hôte", async () => {
    const started: string[] = [];
    await expect(
      mapByHost(
        ["a.fr", "b.fr", "c.fr", "d.fr"],
        (h) => h,
        async (h) => {
          started.push(h);
          if (h === "a.fr") throw new Error("panne");
          await tick();
        },
        { concurrency: 1 },
      ),
    ).rejects.toThrow("panne");
    expect(started).toEqual(["a.fr"]);
  });
});
