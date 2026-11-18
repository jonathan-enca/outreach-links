import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { siteResources } from "@/features/findings/run";
import { createLlmClient, DEFAULT_MODELS } from "@/lib/llm/client";
import { judgeBatch, type BatchItem } from "./llm";
import { judgementExclusion } from "./score";
import type { LlmJudgement, PageSnapshot, QualCandidate, QualContext, Situation } from "./types";

/**
 * Mesure AVANT/APRÈS de MC.6f sur les MÊMES pages déjà lues en base (aucune lecture web, aucun appel
 * DataForSEO, aucun envoi) : les pages d'une campagne sont rejugées avec la consigne et la règle actuelles,
 * puis comparées au verdict stocké (ancienne règle : seuil 0,5, trois cas obligatoires, motifs « sans_angle »,
 * « pas_de_contenu », « page_commerciale »). Entrées (JSON extraits de la base par l'API de gestion) :
 *   MC6F_DIR/pages.json (qualified_targets avec page), sites.json (site et profil), sources.json (sources des candidats).
 *   MC6F=1 MC6F_DIR=... MC6F_OUT=... NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm vitest run src/features/qualification/rejudge.live.test.ts
 */
const live = process.env.MC6F === "1";
const chunksOf = <T>(xs: readonly T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

interface Row {
  audit: string;
  domain: string;
  url: string | null;
  status: string;
  reason: string | null;
  page: PageSnapshot;
  judgement: (LlmJudgement & { fit?: number }) | null;
  contact_status: string | null;
  competitors_count: number;
  domain_rank: number | null;
  tactics: string[];
}

/** Ancienne règle (avant MC.6f), recopiée pour comparer sur les mêmes jugements stockés. */
function oldKept(j: LlmJudgement): boolean {
  if (j.sellsLinks || j.sameOffer || j.unrealistic) return false;
  if (
    j.situation &&
    ["pas_une_page_de_contenu", "juridique", "commercial", "ferme_a_liens"].includes(j.situation)
  )
    return false;
  if (j.fit < 0.5) return false;
  const target: Situation[] = ["lien_mort", "petit_editeur_ressources", "cite_des_comparables"];
  if (j.situation && !target.includes(j.situation)) return false;
  return true;
}

describe.skipIf(!live)("MC.6f : rejugement des pages stockées", () => {
  it("avant / après sur les mêmes pages", async () => {
    const dir = process.env.MC6F_DIR!;
    const rows = JSON.parse(readFileSync(`${dir}/pages.json`, "utf8")) as Row[];
    const sites = JSON.parse(readFileSync(`${dir}/sites.json`, "utf8")) as {
      audit: string;
      domain: string;
      language: string;
      niche: string | null;
      profile: {
        name_variants: string[];
        activity: string;
        audience: string[];
        linkable_resources: { url: string; title: string; selected?: boolean }[];
      };
    }[];
    const sources = JSON.parse(readFileSync(`${dir}/sources.json`, "utf8")) as {
      audit: string;
      domain: string;
      sources: QualCandidate["sources"];
    }[];
    const srcOf = new Map(sources.map((s) => [`${s.audit}|${s.domain}`, s.sources]));
    const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";
    const llm = createLlmClient({
      costClient: fakeSupabase({ cost_ledger: [] }).client,
      provider,
      model: process.env.LLM_MODEL ?? DEFAULT_MODELS[provider],
      auth: provider === "anthropic" ? { apiKey: process.env.ANTHROPIC_API_KEY ?? "" } : "proxy",
      budgetUsd: Number(process.env.MC6F_BUDGET ?? 1.2),
    });
    // Pages qui ont atteint le jugement : jugées, ou restées sans jugement (échec), jamais écartées avant.
    const eligible = (r: Row) =>
      r.status === "liste_courte" ||
      r.reason === "non_qualifie" ||
      (r.judgement !== null &&
        [
          "hors_sujet",
          "sans_angle",
          "pas_de_contenu",
          "page_commerciale",
          "ferme_a_liens",
          "concurrent",
          "vend_des_liens",
          "irrealiste",
          "sans_contact",
        ].includes(r.reason ?? ""));
    const report: Record<string, unknown> = {};
    const out: unknown[] = [];
    for (const site of sites) {
      const ctx: QualContext = {
        ownDomain: site.domain,
        competitorDomains: [],
        language: site.language,
        theme: site.niche ?? "",
        brandName: site.profile.name_variants?.[0] ?? site.domain,
        activity: site.profile.activity ?? "",
        audience: site.profile.audience ?? [],
        resources: siteResources(site.domain, site.profile),
        contactedElsewhere: [],
        suppressedDomains: [],
        suppressedEmails: [],
      };
      const mine = rows.filter((r) => r.audit === site.audit && eligible(r));
      const items: BatchItem[] = mine.map((r, i) => ({
        id: `c${(i % 5) + 1}`,
        candidate: {
          domain: r.domain,
          url: r.url,
          title: r.page.title,
          tactics: [],
          sources: srcOf.get(`${site.audit}|${r.domain}`) ?? [],
          competitorsCount: r.competitors_count,
          domainRank: r.domain_rank === null ? null : Number(r.domain_rank),
          spamScore: null,
          pageType: null,
          signalCount: 1,
        } as QualCandidate,
        page: r.page,
      }));
      const groups = chunksOf(items, 5);
      const judged = new Map<number, LlmJudgement | null>();
      let k = 0;
      const t0 = Date.now();
      const runGroup = async (g: BatchItem[], base: number) => {
        try {
          const res = await judgeBatch(llm, g, ctx, { workspaceId: null, auditId: null });
          g.forEach((it, i) => judged.set(base + i, res.judgements.get(it.id) ?? null));
        } catch (e) {
          console.warn("groupe non jugé", (e as Error).message.slice(0, 120));
          g.forEach((_, i) => judged.set(base + i, null));
        }
      };
      for (let i = 0; i < groups.length; i += 6) {
        await Promise.all(groups.slice(i, i + 6).map((g, j) => runGroup(g, (i + j) * 5)));
        k += 6;
      }
      let before = 0,
        after = 0,
        both = 0,
        onlyAfter = 0,
        onlyBefore = 0,
        failed = 0,
        nearOnly = 0,
        three = 0;
      const afterRows: unknown[] = [];
      mine.forEach((r, i) => {
        const j = judged.get(i) ?? null;
        const wasKept = r.judgement ? oldKept(r.judgement) : false;
        if (!j) failed++;
        const nowKept = j ? judgementExclusion(j, 0.3) === null : false;
        if (wasKept) before++;
        if (nowKept) after++;
        if (wasKept && nowKept) both++;
        if (!wasKept && nowKept) onlyAfter++;
        if (wasKept && !nowKept) onlyBefore++;
        if (nowKept && j && ["autre", "aucune"].includes(j.situation ?? "")) nearOnly++;
        if (
          nowKept &&
          j &&
          ["lien_mort", "petit_editeur_ressources", "cite_des_comparables"].includes(
            j.situation ?? "",
          )
        )
          three++;
        afterRows.push({
          domain: r.domain,
          url: r.url,
          status: r.status,
          reason: r.reason,
          wasKept,
          nowKept,
          situation: j?.situation,
          fit: j?.fit,
          note: j?.note,
          fitReason: j?.fitReason,
          title: r.page.title,
          excerpt: r.page.excerpt,
          cites: r.page.cites?.links?.slice(0, 8),
          citesSites: r.page.cites?.sites,
        });
      });
      const listed = rows.filter(
        (r) => r.audit === site.audit && r.status === "liste_courte",
      ).length;
      const sansContact = rows.filter(
        (r) => r.audit === site.audit && r.reason === "sans_contact",
      ).length;
      report[site.domain] = {
        pagesRejugees: mine.length,
        echecDeJugement: failed,
        gardeesAvant: before,
        gardeesApres: after,
        gardeesAvantEtApres: both,
        nouvellesGardees: onlyAfter,
        perdues: onlyBefore,
        gardeesParProximite: nearOnly,
        gardeesTroisCas: three,
        tauxContact: listed / Math.max(1, listed + sansContact),
        listeCourteStockee: listed,
        projectionListeCourte: Math.round(after * (listed / Math.max(1, listed + sansContact))),
        secondes: Math.round((Date.now() - t0) / 1000),
      };
      out.push(...afterRows.map((x) => ({ site: site.domain, ...(x as object) })));
    }
    report.coutUsd = llm.spentUsd;
    writeFileSync(
      `${process.env.MC6F_OUT ?? dir}/rejudge-report.json`,
      JSON.stringify(report, null, 2),
    );
    writeFileSync(`${process.env.MC6F_OUT ?? dir}/rejudge-rows.json`, JSON.stringify(out));
    console.log(JSON.stringify(report, null, 2));
    expect(llm.spentUsd).toBeLessThan(Number(process.env.MC6F_BUDGET ?? 1.2));
  }, 3_600_000);
});
