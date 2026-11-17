import { readFileSync, writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import { createSafeFetcher } from "@/features/sites/verify";
import { investigateItem } from "./investigate";
import { createMxVerifier } from "./provider";

/**
 * Mesure RÉELLE (gratuite : lectures HTTP polies, aucun appel payant) de l'enquêteur de contact sur
 * une liste de cibles : `CONTACT_MEASURE_IN` (JSON [{domain, url}]) -> `CONTACT_MEASURE_OUT`.
 *   NODE_USE_ENV_PROXY=1 CONTACT_MEASURE_IN=... CONTACT_MEASURE_OUT=... pnpm demo:contacts-measure
 */
const input = process.env.CONTACT_MEASURE_IN;

/** Résolveur MX par DNS-over-HTTPS : le DNS direct est bloqué dans le conteneur de développement. */
async function dohResolveMx(domain: string): Promise<{ exchange: string }[]> {
  const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
    headers: { accept: "application/dns-json" },
  });
  const json = (await res.json()) as { Status: number; Answer?: { type: number; data: string }[] };
  if (json.Status === 3) throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
  return (json.Answer ?? [])
    .filter((a) => a.type === 15)
    .map((a) => ({ exchange: a.data.split(" ")[1]!.replace(/\.$/, "") || "." }));
}

describe.skipIf(!input)("enquêteur de contact : mesure réelle", () => {
  it("rejoue l'enquête et écrit le tableau", { timeout: 600_000 }, async () => {
    const items = JSON.parse(readFileSync(input!, "utf8")) as { domain: string; url: string }[];
    const fetchPage = createSafeFetcher({
      userAgent: BOT_USER_AGENT,
      maxBytes: 256 * 1024,
      accept: "text/html,*/*;q=0.5",
    });
    const rows: unknown[] = [];
    let trace: string[] = [];
    const tracedFetch: typeof fetchPage = async (url, ...rest) => {
      const res = await fetchPage(url, ...rest);
      trace.push(`${(res as { status?: number } | null)?.status ?? "x"} ${url}`);
      return res;
    };
    for (const it of items) {
      const r = await investigateItem(
        { id: it.domain, domain: it.domain, resolvedUrl: it.url },
        {
          fetch: tracedFetch,
          sleep: (ms) => new Promise((x) => setTimeout(x, ms)),
          now: () => Date.now(),
          provider: null,
          freeVerifier: process.env.CONTACT_MEASURE_MX ? createMxVerifier(dohResolveMx) : null,
          isSuppressed: () => false,
          paidCallsLeft: 0,
        },
      );
      rows.push({
        domain: it.domain,
        status: r.status,
        email: r.email,
        form: r.formUrl,
        contactUrl: r.contactUrl,
        reason: r.reason,
        trace,
      });
      trace = [];
    }
    writeFileSync(process.env.CONTACT_MEASURE_OUT ?? "/dev/null", JSON.stringify(rows, null, 1));
  });
});
