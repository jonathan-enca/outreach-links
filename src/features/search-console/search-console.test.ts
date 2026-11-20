import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { parseKeyRing, encryptSecret } from "@/features/mailboxes/crypto";
import {
  buildAuthUrl,
  GOOGLE_SEND_SCOPE,
  readState,
  signState,
  SEARCH_CONSOLE_SCOPE,
  SEARCH_CONSOLE_SCOPES,
  GOOGLE_SCOPES,
} from "@/features/google/oauth";
import { analyticsWindow, normalizeDomain, pickProperty, queryRows, listProperties } from "./api";
import { loadSearchConsoleSnapshot, readSearchConsoleStatus } from "./load";
import { completeSearchConsoleConnect } from "./service";

const ring = parseKeyRing(`v1:${Buffer.alloc(32, 7).toString("base64")}`);
const cfg = {
  clientId: "cid",
  clientSecret: "sec",
  redirectUri: "https://x.test/api/google/callback",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("domaine et propriété", () => {
  it("normalise le domaine saisi", () => {
    expect(normalizeDomain("https://www.Exemple.fr/blog/")).toBe("exemple.fr");
    expect(normalizeDomain("  exemple.fr ")).toBe("exemple.fr");
  });

  it("choisit la propriété du site : domaine d'abord, puis https, sans propriété non vérifiée", () => {
    const props = [
      { siteUrl: "https://www.exemple.fr/", permissionLevel: "siteOwner" },
      { siteUrl: "sc-domain:exemple.fr", permissionLevel: "siteOwner" },
    ];
    expect(pickProperty("exemple.fr", props)).toBe("sc-domain:exemple.fr");
    expect(pickProperty("exemple.fr", [props[0]!])).toBe("https://www.exemple.fr/");
    expect(
      pickProperty("exemple.fr", [
        { siteUrl: "https://exemple.fr/", permissionLevel: "siteUnverifiedUser" },
      ]),
    ).toBeNull();
    expect(pickProperty("autre.fr", props)).toBeNull();
  });

  it("fenêtre de 90 jours, décalée de 3 jours pour le retard de Google", () => {
    expect(analyticsWindow(new Date("2026-11-19T12:00:00Z"))).toEqual({
      startDate: "2026-08-19",
      endDate: "2026-11-16",
    });
  });
});

describe("lecture seule (API)", () => {
  it("lit les propriétés du compte", async () => {
    const fetchFn = (async () =>
      json({
        siteEntry: [{ siteUrl: "sc-domain:exemple.fr", permissionLevel: "siteOwner" }],
      })) as typeof fetch;
    expect(await listProperties("tok", fetchFn)).toEqual([
      { siteUrl: "sc-domain:exemple.fr", permissionLevel: "siteOwner" },
    ]);
  });

  it("transforme les lignes de requêtes, les plus vues d'abord par Google", async () => {
    let body: Record<string, unknown> = {};
    const fetchFn = (async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return json({
        rows: [
          { keys: ["calculateur conges payes"], clicks: 12, impressions: 340, position: 7.36 },
        ],
      });
    }) as typeof fetch;
    const rows = await queryRows(
      "tok",
      "sc-domain:exemple.fr",
      "query",
      new Date("2026-11-19T00:00:00Z"),
      fetchFn,
    );
    expect(rows).toEqual([
      { key: "calculateur conges payes", clicks: 12, impressions: 340, position: 7.4 },
    ]);
    expect(body.dimensions).toEqual(["query"]);
    expect(body.rowLimit).toBe(100);
  });

  it("renvoie null si Google refuse (rien n'est inventé)", async () => {
    const fetchFn = (async () => json({ error: "denied" }, 403)) as typeof fetch;
    expect(await queryRows("tok", "sc-domain:x.fr", "page", new Date(), fetchFn)).toBeNull();
  });
});

describe("autorisation Search Console", () => {
  it("demande la lecture seule, sans l'envoi Gmail", () => {
    expect(SEARCH_CONSOLE_SCOPES).toContain(SEARCH_CONSOLE_SCOPE);
    expect(SEARCH_CONSOLE_SCOPES).not.toContain(GOOGLE_SEND_SCOPE);
    const url = new URL(buildAuthUrl(cfg, "st", undefined, SEARCH_CONSOLE_SCOPES));
    expect(url.searchParams.get("scope")).not.toContain("gmail");
    expect(url.searchParams.get("scope")).toContain(SEARCH_CONSOLE_SCOPE);
    expect(new URL(buildAuthUrl(cfg, "st")).searchParams.get("scope")).toContain(GOOGLE_SEND_SCOPE);
    expect(GOOGLE_SCOPES).toContain(GOOGLE_SEND_SCOPE);
  });

  it("le state garde sa finalité (Gmail par défaut)", () => {
    const tok = signState(
      { siteId: "s1", userId: "u1", nonce: "n", purpose: "search_console" },
      ring,
      1000,
    );
    expect(readState(tok, ring, 2000)?.purpose).toBe("search_console");
    const old = signState({ siteId: "s1", userId: "u1", nonce: "n" }, ring, 1000);
    expect(readState(old, ring, 2000)?.purpose).toBe("gmail");
  });

  it("le state garde l'écran de retour et la langue du formulaire (étape 1 d'une campagne)", () => {
    const tok = signState(
      {
        siteId: "s1",
        userId: "u1",
        nonce: "n",
        purpose: "search_console",
        back: "demarrer",
        lang: "en",
      },
      ring,
      1000,
    );
    expect(readState(tok, ring, 2000)).toMatchObject({ back: "demarrer", lang: "en" });
    const plain = signState({ siteId: "s1", userId: "u1", nonce: "n" }, ring, 1000);
    expect(readState(plain, ring, 2000)?.back).toBeUndefined();
  });
});

const siteRow = { id: "s1", workspace_id: "w1", domain: "exemple.fr" };

function connectedDb() {
  return fakeSupabase(
    {
      sites: [siteRow],
      search_console_connections: [
        {
          site_id: "s1",
          workspace_id: "w1",
          google_email: "a@b.fr",
          property: "sc-domain:exemple.fr",
          refresh_token_enc: encryptSecret("refresh-1", ring).value,
          key_version: "v1",
          scopes: SEARCH_CONSOLE_SCOPE,
          connected_at: "2026-11-19T00:00:00Z",
          updated_at: "2026-11-19T00:00:00Z",
        },
      ],
    },
    { userId: "u1" },
  ).client;
}

describe("lecture pour l'audit", () => {
  it("donne les requêtes et les pages réelles d'un site connecté", async () => {
    const db = connectedDb();
    const seen: string[] = [];
    const fetchFn = (async (url: string, init?: RequestInit) => {
      seen.push(url);
      if (url.startsWith("https://oauth2.googleapis.com/token")) {
        expect(String(init?.body)).toContain("refresh_token=refresh-1");
        return json({ access_token: "acc" });
      }
      const body = JSON.parse(String(init?.body));
      if (body.dimensions[0] === "query") {
        return json({ rows: [{ keys: ["cloportes"], clicks: 3, impressions: 90, position: 12 }] });
      }
      return json({
        rows: [{ keys: ["https://exemple.fr/guide"], clicks: 5, impressions: 60, position: 4 }],
      });
    }) as typeof fetch;
    const snap = await loadSearchConsoleSnapshot("s1", {
      db,
      config: cfg,
      keyRing: () => ring,
      fetchFn,
      now: new Date("2026-11-19T00:00:00Z"),
    });
    expect(snap).toMatchObject({
      property: "sc-domain:exemple.fr",
      days: 90,
      queries: [{ key: "cloportes", clicks: 3, impressions: 90, position: 12 }],
      pages: [{ key: "https://exemple.fr/guide", clicks: 5, impressions: 60, position: 4 }],
    });
    expect(seen.filter((u) => u.includes("searchAnalytics"))).toHaveLength(2);
  });

  it("un site non connecté : null, sans appel et sans erreur", async () => {
    const db = fakeSupabase({ sites: [siteRow] }, { userId: "u1" }).client;
    const fetchFn = (async () => {
      throw new Error("ne doit pas appeler Google");
    }) as typeof fetch;
    expect(
      await loadSearchConsoleSnapshot("s1", { db, config: cfg, keyRing: () => ring, fetchFn }),
    ).toBeNull();
    expect(await readSearchConsoleStatus(db, "s1")).toBeNull();
  });

  it("flag coupé (pas de configuration) : null, sans appel", async () => {
    const db = connectedDb();
    const fetchFn = (async () => {
      throw new Error("ne doit pas appeler Google");
    }) as typeof fetch;
    expect(
      await loadSearchConsoleSnapshot("s1", { db, config: null, keyRing: () => ring, fetchFn }),
    ).toBeNull();
  });

  it("jeton refusé par Google : null, l'audit continue", async () => {
    const db = connectedDb();
    const fetchFn = (async () => json({ error: "invalid_grant" }, 400)) as typeof fetch;
    expect(
      await loadSearchConsoleSnapshot("s1", { db, config: cfg, keyRing: () => ring, fetchFn }),
    ).toBeNull();
  });
});

describe("connexion", () => {
  it("enregistre la propriété trouvée, jeton chiffré", async () => {
    const f = fakeSupabase({ sites: [siteRow] }, { userId: "u1" });
    const db = f.client;
    const fetchFn = (async (url: string) => {
      if (url.startsWith("https://oauth2.googleapis.com/token"))
        return json({
          access_token: "acc",
          refresh_token: "refresh-2",
          scope: `${SEARCH_CONSOLE_SCOPE} openid https://www.googleapis.com/auth/userinfo.email`,
        });
      if (url.includes("openidconnect")) return json({ email: "A@B.fr" });
      return json({
        siteEntry: [{ siteUrl: "sc-domain:exemple.fr", permissionLevel: "siteOwner" }],
      });
    }) as typeof fetch;
    const res = await completeSearchConsoleConnect(
      db as never,
      { siteId: "s1", userId: "u1", nonce: "n", exp: Date.now() + 1000, purpose: "search_console" },
      "code",
      { config: cfg, keyRing: () => ring, getServiceClient: () => db as never, fetchFn },
    );
    expect(res).toMatchObject({ ok: true, email: "a@b.fr", property: "sc-domain:exemple.fr" });
    const saved = f.tables.search_console_connections?.[0];
    expect(saved?.refresh_token_enc).not.toContain("refresh-2");
    expect(await readSearchConsoleStatus(db as never, "s1")).toMatchObject({
      property: "sc-domain:exemple.fr",
      googleEmail: "a@b.fr",
    });
  });

  it("refuse si Google n'a pas de propriété pour ce site", async () => {
    const db = fakeSupabase({ sites: [siteRow] }, { userId: "u1" }).client;
    const fetchFn = (async (url: string) => {
      if (url.startsWith("https://oauth2.googleapis.com/token"))
        return json({
          access_token: "acc",
          refresh_token: "r",
          scope: `${SEARCH_CONSOLE_SCOPE} openid https://www.googleapis.com/auth/userinfo.email`,
        });
      if (url.includes("openidconnect")) return json({ email: "a@b.fr" });
      return json({ siteEntry: [{ siteUrl: "https://autre.fr/", permissionLevel: "siteOwner" }] });
    }) as typeof fetch;
    const res = await completeSearchConsoleConnect(
      db as never,
      { siteId: "s1", userId: "u1", nonce: "n", exp: Date.now() + 1000, purpose: "search_console" },
      "code",
      { config: cfg, keyRing: () => ring, getServiceClient: () => db as never, fetchFn },
    );
    expect(res).toEqual({ ok: false, reason: "property" });
  });
});
