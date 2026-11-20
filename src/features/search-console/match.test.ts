import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { encryptSecret, parseKeyRing } from "@/features/mailboxes/crypto";
import { SEARCH_CONSOLE_SCOPE } from "@/features/google/oauth";
import { findSearchConsoleMatch, linkSearchConsole } from "./match";

const ring = parseKeyRing(`v1:${Buffer.alloc(32, 7).toString("base64")}`);
const config = { clientId: "cid", clientSecret: "sec", redirectUri: "https://x.test/cb" };
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const connection = (siteId: string, email: string, token: string, updated: string) => ({
  site_id: siteId,
  workspace_id: "w1",
  google_email: email,
  property: "sc-domain:ailleurs.fr",
  refresh_token_enc: encryptSecret(token, ring).value,
  key_version: "v1",
  scopes: SEARCH_CONSOLE_SCOPE,
  connected_at: updated,
  updated_at: updated,
});

/** Google simulé : chaque jeton de renouvellement donne accès à une liste de sites. */
function google(sitesByToken: Record<string, string[]>) {
  const calls: string[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push(url);
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      const refresh = new URLSearchParams(String(init?.body)).get("refresh_token") ?? "";
      return json({ access_token: `acc-${refresh}` });
    }
    const auth = new Headers(init?.headers).get("authorization") ?? "";
    const token = auth.replace("Bearer acc-", "");
    return json({
      siteEntry: (sitesByToken[token] ?? []).map((siteUrl) => ({
        siteUrl,
        permissionLevel: "siteOwner",
      })),
    });
  }) as typeof fetch;
  return { fetchFn, calls };
}

describe("Search Console déjà connectée, étape 1", () => {
  it("retrouve l'adresse saisie dans le compte connecté (avec ou sans www, https)", async () => {
    const db = fakeSupabase({
      search_console_connections: [connection("s1", "a@b.fr", "r1", "2026-11-19T00:00:00Z")],
    }).client;
    const { fetchFn } = google({ r1: ["sc-domain:ailleurs.fr", "https://www.exemple.fr/"] });
    const out = await findSearchConsoleMatch("w1", "https://Exemple.fr/blog", {
      db,
      config,
      keyRing: () => ring,
      fetchFn,
    });
    expect(out).toEqual({
      status: "found",
      email: "a@b.fr",
      property: "https://www.exemple.fr/",
      fromSiteId: "s1",
    });
  });

  it("compte connecté sans ce site : « missing » avec le compte ; aucun compte : « none »", async () => {
    const db = fakeSupabase({
      search_console_connections: [connection("s1", "a@b.fr", "r1", "2026-11-19T00:00:00Z")],
    }).client;
    const { fetchFn } = google({ r1: ["sc-domain:ailleurs.fr"] });
    const deps = { db, config, keyRing: () => ring, fetchFn };
    expect(await findSearchConsoleMatch("w1", "exemple.fr", deps)).toEqual({
      status: "missing",
      email: "a@b.fr",
    });
    expect(await findSearchConsoleMatch("w2", "exemple.fr", deps)).toEqual({ status: "none" });
  });

  it("essaie chaque compte Google une seule fois, et rien sans configuration ni adresse", async () => {
    const db = fakeSupabase({
      search_console_connections: [
        connection("s1", "a@b.fr", "r1", "2026-11-18T00:00:00Z"),
        connection("s2", "A@b.fr", "r1", "2026-11-19T00:00:00Z"),
        connection("s3", "c@d.fr", "r3", "2026-11-17T00:00:00Z"),
      ],
    }).client;
    const g = google({ r1: [], r3: ["sc-domain:exemple.fr"] });
    const out = await findSearchConsoleMatch("w1", "exemple.fr", {
      db,
      config,
      keyRing: () => ring,
      fetchFn: g.fetchFn,
    });
    expect(out).toMatchObject({ status: "found", email: "c@d.fr", fromSiteId: "s3" });
    expect(g.calls.filter((u) => u.includes("oauth2"))).toHaveLength(2);
    const none = google({});
    expect(
      await findSearchConsoleMatch("w1", "exemple.fr", {
        db,
        config: null,
        keyRing: () => ring,
        fetchFn: none.fetchFn,
      }),
    ).toEqual({ status: "none" });
    expect(
      await findSearchConsoleMatch("w1", "exemple", {
        db,
        config,
        keyRing: () => ring,
        fetchFn: none.fetchFn,
      }),
    ).toEqual({ status: "none" });
    expect(none.calls).toHaveLength(0);
  });

  it("relie la nouvelle campagne en copiant la connexion, avec la propriété de son site", async () => {
    const f = fakeSupabase({
      search_console_connections: [connection("s1", "a@b.fr", "r1", "2026-11-19T00:00:00Z")],
    });
    const { fetchFn } = google({ r1: ["sc-domain:exemple.fr"] });
    const deps = { db: f.client, config, keyRing: () => ring, fetchFn };
    expect(
      await linkSearchConsole({ id: "s9", workspaceId: "w1", domain: "exemple.fr" }, deps),
    ).toBe(true);
    const { data } = await f.client
      .from("search_console_connections")
      .select("*")
      .eq("site_id", "s9")
      .maybeSingle();
    expect(data).toMatchObject({
      workspace_id: "w1",
      google_email: "a@b.fr",
      property: "sc-domain:exemple.fr",
      scopes: SEARCH_CONSOLE_SCOPE,
    });
    const other = google({ r1: [] });
    expect(
      await linkSearchConsole(
        { id: "s8", workspaceId: "w1", domain: "absent.fr" },
        { ...deps, fetchFn: other.fetchFn },
      ),
    ).toBe(false);
  });
});
