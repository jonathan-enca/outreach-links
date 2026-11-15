import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { declareLink } from "./declare";
import { decideAlert, MAX_ATTEMPTS, nextCheckAt, runLinkChecks } from "./service";
import { judgeResponse, verifyLinkInHtml } from "./verify";
import { alertText, detailFlags, statusLabel, type LinkRowView } from "./view";

const SRC = "https://blog.example/article";
const TGT = "https://alice-site.fr/guide";
const page = (body: string, head = "") =>
  `<html><head>${head}</head><body><main>${body}</main></body></html>`;
const sentence = (a: string) =>
  `<p>Pour aller plus loin sur ce sujet précis, voici une ressource utile : ${a} et la suite du texte.</p>`;

describe("verifyLinkInHtml", () => {
  it("détecte un lien dofollow contextuel vers la page exacte", () => {
    const v = verifyLinkInHtml(
      page(sentence(`<a href="https://www.alice-site.fr/guide/">le guide</a>`)),
      SRC,
      TGT,
    );
    expect(v).toMatchObject({
      found: true,
      rel: "dofollow",
      contextual: true,
      indexable: true,
      exactPage: true,
      anchor: "le guide",
    });
  });
  it("détecte nofollow, sponsored et ugc", () => {
    for (const rel of ["nofollow", "sponsored", "ugc"] as const) {
      const v = verifyLinkInHtml(
        page(sentence(`<a rel="noopener ${rel}" href="${TGT}">x</a>`)),
        SRC,
        TGT,
      );
      expect(v.rel).toBe(rel);
    }
  });
  it("un meta nofollow rend tous les liens nofollow", () => {
    const v = verifyLinkInHtml(
      page(sentence(`<a href="${TGT}">x</a>`), `<meta name="robots" content="nofollow">`),
      SRC,
      TGT,
    );
    expect(v.rel).toBe("nofollow");
  });
  it("lien disparu : found false", () => {
    const v = verifyLinkInHtml(page(sentence(`<a href="https://autre.fr/">x</a>`)), SRC, TGT);
    expect(v.found).toBe(false);
  });
  it("un lien interne au menu n'est pas contextuel", () => {
    const html = `<html><body><nav><a href="${TGT}">Alice</a></nav><main><p>Texte.</p></main></body></html>`;
    expect(verifyLinkInHtml(html, SRC, TGT).contextual).toBe(false);
  });
  it("page noindex ou canonique ailleurs : non indexable", () => {
    const a = verifyLinkInHtml(
      page(sentence(`<a href="${TGT}">x</a>`), `<meta name="robots" content="noindex, follow">`),
      SRC,
      TGT,
    );
    expect(a.indexable).toBe(false);
    const b = verifyLinkInHtml(
      page(sentence(`<a href="${TGT}">x</a>`), `<link rel="canonical" href="https://autre.fr/z">`),
      SRC,
      TGT,
    );
    expect(b.indexable).toBe(false);
  });
  it("préfère la page exacte puis le dofollow ; autre page du site acceptée mais signalée", () => {
    const html = page(
      sentence(`<a rel="nofollow" href="${TGT}">a</a>`) +
        sentence(`<a href="https://alice-site.fr/">b</a>`),
    );
    expect(verifyLinkInHtml(html, SRC, TGT)).toMatchObject({ exactPage: true, rel: "nofollow" });
    const only = verifyLinkInHtml(
      page(sentence(`<a href="https://alice-site.fr/">b</a>`)),
      SRC,
      TGT,
    );
    expect(only).toMatchObject({ found: true, exactPage: false });
  });
  it("ignore javascript: et les domaines voisins", () => {
    const html = page(
      `<a href="javascript:void(0)">x</a><a href="https://alice-site.fr.evil.com/guide">y</a>`,
    );
    expect(verifyLinkInHtml(html, SRC, TGT).found).toBe(false);
  });
});

describe("judgeResponse", () => {
  const live = page(sentence(`<a href="${TGT}">x</a>`));
  it("200 avec lien = live ; 200 sans lien, 404, 410 = disparu", () => {
    expect(judgeResponse({ status: 200, text: live }, SRC, TGT).outcome).toBe("live");
    expect(judgeResponse({ status: 200, text: "<p>rien</p>" }, SRC, TGT).outcome).toBe("disparu");
    expect(judgeResponse({ status: 404, text: "" }, SRC, TGT).outcome).toBe("disparu");
    expect(judgeResponse({ status: 410, text: "" }, SRC, TGT).outcome).toBe("disparu");
  });
  it("réseau, 403, 429 et 5xx = injoignable (jamais « disparu »)", () => {
    for (const r of [
      null,
      { status: 403, text: "" },
      { status: 429, text: "" },
      { status: 503, text: "" },
    ]) {
      expect(judgeResponse(r, SRC, TGT).outcome).toBe("injoignable");
    }
  });
});

describe("calendrier et alertes", () => {
  it("J+7, J+14, J+30 puis plus rien", () => {
    const d = "2026-11-01T00:00:00.000Z";
    expect(nextCheckAt(d, 0)).toBe("2026-11-08T00:00:00.000Z");
    expect(nextCheckAt(d, 1)).toBe("2026-11-15T00:00:00.000Z");
    expect(nextCheckAt(d, 2)).toBe("2026-12-01T00:00:00.000Z");
    expect(nextCheckAt(d, 3)).toBeNull();
  });
  const chk = (
    outcome: "live" | "disparu",
    rel: "dofollow" | "nofollow" | null,
    indexable = true,
  ) => ({
    outcome,
    httpStatus: 200,
    error: null,
    verdict: {
      found: outcome === "live",
      rel,
      contextual: true,
      indexable,
      exactPage: true,
      anchor: "x",
    },
  });
  it("alerte seulement si un lien vu en ligne disparaît ou passe nofollow", () => {
    expect(decideAlert({ firstLiveAt: "x", rel: "dofollow" }, chk("disparu", null))).toBe(
      "disparu",
    );
    expect(decideAlert({ firstLiveAt: null, rel: null }, chk("disparu", null))).toBeNull();
    expect(decideAlert({ firstLiveAt: "x", rel: "dofollow" }, chk("live", "nofollow"))).toBe(
      "devenu_nofollow",
    );
    expect(decideAlert({ firstLiveAt: null, rel: null }, chk("live", "nofollow"))).toBeNull();
    expect(decideAlert({ firstLiveAt: "x", rel: "dofollow" }, chk("live", "dofollow", false))).toBe(
      "non_indexable",
    );
    expect(decideAlert({ firstLiveAt: "x", rel: "dofollow" }, chk("live", "dofollow"))).toBeNull();
  });
});

const NOW = new Date("2026-11-08T12:00:00Z");
function linkRow(over: Record<string, unknown> = {}) {
  return {
    id: "l1",
    workspace_id: "ws1",
    source_url: SRC,
    target_url: TGT,
    declared_at: "2026-11-01T10:00:00.000Z",
    status: "a_verifier",
    rel: null,
    checks_done: 0,
    attempts: 0,
    first_live_at: null,
    alert: null,
    next_check_at: "2026-11-08T10:00:00.000Z",
    ...over,
  };
}
function deps(pages: Record<string, { status: number; text: string } | null>) {
  const fetch = vi.fn(async (u: string) => (u in pages ? pages[u]! : { status: 404, text: "" }));
  return { fetch, now: () => NOW, sleep: async () => {}, hostDelayMs: 0 };
}
const ROBOTS = "https://blog.example/robots.txt";
const LIVE = page(sentence(`<a href="${TGT}">le guide</a>`));

describe("runLinkChecks", () => {
  it("lien en ligne à J+7 : live, journal, prochain contrôle à J+14", async () => {
    const f = fakeSupabase({ links: [linkRow()], link_checks: [] });
    const s = await runLinkChecks(
      f.client,
      deps({ [ROBOTS]: { status: 404, text: "" }, [SRC]: { status: 200, text: LIVE } }),
    );
    expect(s).toMatchObject({ checked: 1, live: 1 });
    const l = f.tables.links![0]!;
    expect(l).toMatchObject({ status: "live", rel: "dofollow", checks_done: 1, alert: null });
    expect(l.next_check_at).toBe("2026-11-15T10:00:00.000Z");
    expect(l.first_live_at).toBeTruthy();
    expect(f.tables.link_checks![0]).toMatchObject({
      milestone_day: 7,
      outcome: "live",
      found: true,
    });
  });
  it("lien disparu à J+14 après avoir été en ligne : alerte et date de perte", async () => {
    const f = fakeSupabase({
      links: [
        linkRow({
          checks_done: 1,
          status: "live",
          rel: "dofollow",
          first_live_at: "2026-11-08T10:00:00Z",
          next_check_at: "2026-11-08T10:00:00.000Z",
        }),
      ],
      link_checks: [],
      events: [],
    });
    const s = await runLinkChecks(
      f.client,
      deps({ [SRC]: { status: 200, text: "<p>plus rien</p>" } }),
    );
    expect(s.lost).toBe(1);
    expect(f.tables.links![0]).toMatchObject({
      status: "disparu",
      alert: "disparu",
      checks_done: 2,
    });
    expect(f.tables.links![0]!.lost_at).toBeTruthy();
    expect(f.tables.events![0]).toMatchObject({ type: "link.disparu" });
  });
  it("devenu nofollow : alerte", async () => {
    const f = fakeSupabase({
      links: [
        linkRow({
          checks_done: 1,
          status: "live",
          rel: "dofollow",
          first_live_at: "2026-11-02T00:00:00Z",
        }),
      ],
      link_checks: [],
      events: [],
    });
    const nf = page(sentence(`<a rel="nofollow" href="${TGT}">x</a>`));
    await runLinkChecks(f.client, deps({ [SRC]: { status: 200, text: nf } }));
    expect(f.tables.links![0]).toMatchObject({
      status: "live",
      rel: "nofollow",
      alert: "devenu_nofollow",
    });
  });
  it("30 jours : dernier contrôle, plus de prochaine échéance", async () => {
    const f = fakeSupabase({ links: [linkRow({ checks_done: 2 })], link_checks: [] });
    await runLinkChecks(f.client, deps({ [SRC]: { status: 200, text: LIVE } }));
    expect(f.tables.links![0]).toMatchObject({ checks_done: 3, next_check_at: null });
    expect(f.tables.link_checks![0]).toMatchObject({ milestone_day: 30 });
  });
  it("page injoignable : nouvel essai à 24 h sans consommer le jalon, puis jalon consommé", async () => {
    const f = fakeSupabase({ links: [linkRow()], link_checks: [] });
    const d = deps({ [SRC]: { status: 503, text: "" } });
    await runLinkChecks(f.client, d);
    expect(f.tables.links![0]).toMatchObject({
      status: "injoignable",
      checks_done: 0,
      attempts: 1,
    });
    expect(f.tables.links![0]!.next_check_at).toBe("2026-11-09T12:00:00.000Z");
    expect(f.tables.links![0]!.alert).toBeNull();
    f.tables.links![0]!.attempts = MAX_ATTEMPTS - 1;
    f.tables.links![0]!.next_check_at = "2026-11-08T10:00:00.000Z";
    await runLinkChecks(f.client, d);
    expect(f.tables.links![0]).toMatchObject({ checks_done: 1, attempts: 0 });
  });
  it("respecte robots.txt : page interdite jamais lue", async () => {
    const f = fakeSupabase({ links: [linkRow()], link_checks: [] });
    const d = deps({
      [ROBOTS]: { status: 200, text: "User-agent: *\nDisallow: /article" },
      [SRC]: { status: 200, text: LIVE },
    });
    await runLinkChecks(f.client, d);
    expect(d.fetch).not.toHaveBeenCalledWith(SRC);
    expect(f.tables.links![0]).toMatchObject({
      status: "injoignable",
      last_error: "robots_interdit",
    });
  });
  it("ignore les liens dont l'échéance n'est pas venue", async () => {
    const f = fakeSupabase({ links: [linkRow({ next_check_at: "2026-11-09T00:00:00.000Z" })] });
    const d = deps({});
    expect((await runLinkChecks(f.client, d)).checked).toBe(0);
    expect(d.fetch).not.toHaveBeenCalled();
  });
});

describe("declareLink", () => {
  const site = { id: "s1", workspace_id: "ws1", domain: "alice-site.fr" };
  const run = (input: Parameters<typeof declareLink>[2], opts: { userId?: string | null } = {}) => {
    const user = fakeSupabase({ sites: [site] }, opts);
    const svc = fakeSupabase({ links: [] });
    return declareLink(
      user.client,
      () => svc.client,
      input,
      () => NOW,
    ).then((r) => ({ r, svc }));
  };
  const ok = { siteId: "s1", sourceUrl: SRC, targetUrl: TGT };
  it("enregistre le lien et planifie J+7", async () => {
    const { r, svc } = await run(ok);
    expect(r.status).toBe("ok");
    expect(svc.tables.links![0]).toMatchObject({
      source_domain: "blog.example",
      next_check_at: "2026-11-15T12:00:00.000Z",
      origin: "manuel",
    });
  });
  it("refuse : non connecté, site inconnu, URL invalide, page d'un autre site, même site", async () => {
    expect((await run(ok, { userId: null })).r.status).toBe("error");
    expect((await run({ ...ok, siteId: "zz" })).r.status).toBe("error");
    expect((await run({ ...ok, sourceUrl: "javascript:alert(1)" })).r.status).toBe("error");
    expect((await run({ ...ok, targetUrl: "https://autre.fr/" })).r.status).toBe("error");
    expect((await run({ ...ok, sourceUrl: "https://www.alice-site.fr/x" })).r.status).toBe("error");
  });
});

describe("vue", () => {
  const base: LinkRowView = {
    id: "1",
    sourceUrl: SRC,
    sourceDomain: "blog.example",
    targetUrl: TGT,
    status: "live",
    rel: "dofollow",
    contextual: true,
    indexable: true,
    exactPage: true,
    anchorFound: "x",
    checksDone: 1,
    nextCheckAt: null,
    firstLiveAt: "x",
    alert: null,
  };
  it("étiquettes honnêtes", () => {
    expect(statusLabel({ status: "disparu", firstLiveAt: "x" }).label).toBe("Disparu");
    expect(statusLabel({ status: "disparu", firstLiveAt: null }).label).toBe("Introuvable");
    expect(detailFlags(base)).toEqual([
      "Dofollow",
      "dans le texte",
      "page indexable",
      "page exacte",
    ]);
    expect(detailFlags({ ...base, status: "disparu" })).toEqual([]);
    expect(alertText("disparu")).toMatch(/disparu/);
    expect(alertText(null)).toBeNull();
  });
});
