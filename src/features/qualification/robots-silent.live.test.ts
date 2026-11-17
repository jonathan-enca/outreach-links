import { readFileSync, writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import { createSafeFetcher } from "@/features/sites/verify";
import { mapByHost } from "@/lib/concurrency";
import { checkRobotsFor } from "./deps";
import type { QualCandidate } from "./types";

/** Mesure RÉELLE (gratuite, une requête par site) : combien de sites ne répondent pas au robots.txt ? */
const input = process.env.ROBOTS_IN;
describe.skipIf(!input)("robots.txt : sites muets", () => {
  it("vérifie chaque site comme le fait l'avant-lecture", { timeout: 1_800_000 }, async () => {
    const rows = JSON.parse(readFileSync(input!, "utf8")) as {
      domain: string;
      url: string | null;
    }[];
    const fetchRobots = createSafeFetcher({
      userAgent: BOT_USER_AGENT,
      maxBytes: 64 * 1024,
      accept: "text/plain,*/*;q=0.5",
      timeoutMs: 5_000,
    });
    const out = await mapByHost(
      rows,
      (r) => r.domain,
      async (r) =>
        checkRobotsFor(fetchRobots, { domain: r.domain, url: r.url } as QualCandidate).catch(
          () => "muet" as const,
        ),
      { concurrency: 12, sleep: (ms) => new Promise((x) => setTimeout(x, ms)) },
    );
    writeFileSync(
      process.env.ROBOTS_OUT ?? "/dev/null",
      JSON.stringify(rows.map((r, i) => ({ domain: r.domain, check: out[i] }))),
    );
  });
});
