import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { parseKeyRing, decryptSecret } from "@/features/mailboxes/crypto";
import { googleConfig } from "./config";
import {
  GOOGLE_READ_SCOPE,
  GOOGLE_SEND_SCOPE,
  buildAuthUrl,
  hasRequiredScopes,
  readState,
  signState,
} from "./oauth";
import { completeGoogleConnect } from "./service";

const ring = parseKeyRing(`v1:${Buffer.alloc(32, 9).toString("base64")}`);
const cfg = {
  clientId: "cid",
  clientSecret: "sec",
  redirectUri: "https://x.test/api/google/callback",
};

describe("config", () => {
  const base = {
    GOOGLE_OAUTH_ENABLED: true,
    GOOGLE_OAUTH_CLIENT_ID: "a",
    GOOGLE_OAUTH_CLIENT_SECRET: "b",
    NEXT_PUBLIC_APP_URL: "https://x.test/",
  };
  it("est fermée par défaut et sans client", () => {
    expect(googleConfig({ ...base, GOOGLE_OAUTH_ENABLED: false })).toBeNull();
    expect(googleConfig({ ...base, GOOGLE_OAUTH_CLIENT_SECRET: undefined })).toBeNull();
  });
  it("construit l'adresse de retour", () => {
    expect(googleConfig(base)?.redirectUri).toBe("https://x.test/api/google/callback");
  });
});

describe("state", () => {
  it("fait l'aller-retour, expire, et refuse une altération", () => {
    const tok = signState({ siteId: "s1", userId: "u1", nonce: "n" }, ring, 1000);
    expect(readState(tok, ring, 2000)).toMatchObject({ siteId: "s1", userId: "u1", nonce: "n" });
    expect(readState(tok, ring, 1000 + 11 * 60 * 1000)).toBeNull();
    expect(readState(tok.slice(0, -2) + "xx", ring, 2000)).toBeNull();
    expect(readState(null, ring)).toBeNull();
  });
});

describe("adresse d'autorisation", () => {
  it("demande envoi + lecture, accès durable, consentement", () => {
    const u = new URL(buildAuthUrl(cfg, "st"));
    expect(u.searchParams.get("scope")).toBe(`${GOOGLE_SEND_SCOPE} ${GOOGLE_READ_SCOPE}`);
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("prompt")).toBe("consent");
    expect(u.searchParams.get("state")).toBe("st");
  });
  it("exige les deux autorisations", () => {
    expect(hasRequiredScopes(`${GOOGLE_SEND_SCOPE} ${GOOGLE_READ_SCOPE}`)).toBe(true);
    expect(hasRequiredScopes(GOOGLE_SEND_SCOPE)).toBe(false);
    expect(hasRequiredScopes(undefined)).toBe(false);
  });
});

function setup(
  tokenBody: object | null,
  profile: object | null = { emailAddress: "Jo@Gmail.com" },
) {
  const f = fakeSupabase({ sites: [{ id: "s1", workspace_id: "w1" }] }, { userId: "u1" });
  const fetchFn = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes("oauth2.googleapis.com"))
      return tokenBody
        ? new Response(JSON.stringify(tokenBody), { status: 200 })
        : new Response("{}", { status: 400 });
    return profile
      ? new Response(JSON.stringify(profile), { status: 200 })
      : new Response("{}", { status: 401 });
  }) as unknown as typeof fetch;
  const deps = { config: cfg, keyRing: () => ring, getServiceClient: () => f.client, fetchFn };
  return { f, deps };
}
const state = { siteId: "s1", userId: "u1", nonce: "n", exp: Date.now() + 1000 };
const good = {
  access_token: "at",
  refresh_token: "rt-secret",
  scope: `${GOOGLE_SEND_SCOPE} ${GOOGLE_READ_SCOPE}`,
};

describe("completeGoogleConnect", () => {
  it("enregistre la boîte prête, jeton chiffré, rattachée au site", async () => {
    const { f, deps } = setup(good);
    const r = await completeGoogleConnect(f.client, state, "code", deps);
    expect(r).toEqual({ ok: true, email: "jo@gmail.com", reconnected: false });
    const box = f.tables.mailboxes[0];
    expect(box).toMatchObject({ provider: "google", email: "jo@gmail.com" });
    expect(box.status).toBe("verifiee");
    const tok = f.tables.mailbox_google_tokens[0];
    expect(tok.refresh_token_enc).not.toContain("rt-secret");
    expect(decryptSecret(tok.refresh_token_enc as string, ring)).toBe("rt-secret");
    expect(f.tables.mailbox_sites).toHaveLength(1);
  });
  it("refuse sans une des autorisations, sans jeton durable, ou sur échec Google", async () => {
    const a = setup({ ...good, scope: GOOGLE_SEND_SCOPE });
    expect(await completeGoogleConnect(a.f.client, state, "c", a.deps)).toEqual({
      ok: false,
      reason: "scopes",
    });
    const b = setup({ ...good, refresh_token: undefined });
    expect(await completeGoogleConnect(b.f.client, state, "c", b.deps)).toEqual({
      ok: false,
      reason: "no_refresh",
    });
    const c = setup(null);
    expect(await completeGoogleConnect(c.f.client, state, "c", c.deps)).toEqual({
      ok: false,
      reason: "token",
    });
    const d = setup(good, null);
    expect(await completeGoogleConnect(d.f.client, state, "c", d.deps)).toEqual({
      ok: false,
      reason: "profile",
    });
    expect(a.f.tables.mailboxes ?? []).toHaveLength(0);
  });
  it("refuse une autre personne que celle du state", async () => {
    const { f, deps } = setup(good);
    expect(await completeGoogleConnect(f.client, { ...state, userId: "u2" }, "c", deps)).toEqual({
      ok: false,
      reason: "user",
    });
  });
});

import { encryptSecret } from "@/features/mailboxes/crypto";
import { fetchViaGoogle, sendViaGoogle } from "./gmail";

describe("Gmail : envoi et lecture", () => {
  const mail = {
    from: { name: "Jo", address: "jo@gmail.com" },
    to: "cible@exemple.fr",
    subject: "Bonjour",
    text: "Un message.",
    messageId: "<abc@x.test>",
    inReplyTo: "<prev@x.test>",
    references: "<prev@x.test>",
    headers: { "List-Unsubscribe": "<https://x.test/u>" },
  };
  function box(refresh = "rt") {
    const f = fakeSupabase(
      {
        mailbox_google_tokens: [
          { mailbox_id: "m1", refresh_token_enc: encryptSecret(refresh, ring).value },
        ],
      },
      { userId: "u1" },
    );
    return f.client;
  }
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });
  const gmail = (apiStatus: number, extra: object = {}) =>
    vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("oauth2.googleapis.com")) return json({ access_token: "at" });
      return json(extra, apiStatus);
    }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
  const opts = (fetchFn: typeof fetch) => ({ config: cfg, fetchFn });

  it("envoie le message MIME (fil et en-têtes compris) avec le jeton d'accès", async () => {
    const fn = gmail(200);
    const r = await sendViaGoogle(box(), { id: "m1" }, mail, ring, opts(fn));
    expect(r).toEqual({ ok: true });
    const call = (fn as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) =>
      String(c[0]).endsWith("/messages/send"),
    )!;
    expect((call[1] as RequestInit).headers).toMatchObject({ authorization: "Bearer at" });
    const raw = Buffer.from(
      JSON.parse(String((call[1] as RequestInit).body)).raw,
      "base64url",
    ).toString();
    expect(raw).toContain("Message-ID: <abc@x.test>");
    expect(raw).toContain("In-Reply-To: <prev@x.test>");
    expect(raw).toContain("List-Unsubscribe: <https://x.test/u>");
  });
  it("classe les échecs : accès retiré, limite, adresse refusée", async () => {
    const send = (fn: typeof fetch) => sendViaGoogle(box(), { id: "m1" }, mail, ring, opts(fn));
    expect(await send(gmail(401))).toMatchObject({ ok: false, kind: "auth" });
    expect(await send(gmail(429))).toMatchObject({ ok: false, kind: "temporary" });
    expect(await send(gmail(503))).toMatchObject({ ok: false, kind: "temporary" });
    expect(await send(gmail(400))).toMatchObject({ ok: false, kind: "permanent" });
    const revoked = vi.fn(async () =>
      json({ error: "invalid_grant" }, 400),
    ) as unknown as typeof fetch;
    expect(await send(revoked)).toMatchObject({ ok: false, kind: "auth" });
  });
  it("sans accès enregistré, la boîte doit être reconnectée", async () => {
    const f = fakeSupabase({ mailbox_google_tokens: [] }, { userId: "u1" });
    expect(await sendViaGoogle(f.client, { id: "m1" }, mail, ring, opts(gmail(200)))).toMatchObject(
      { ok: false, kind: "auth" },
    );
  });
  it("lit les messages reçus, du plus ancien au plus récent, en lecture seule", async () => {
    const raw = (n: string) => Buffer.from(`Subject: ${n}\r\n\r\ncorps`).toString("base64url");
    const fn = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("oauth2.googleapis.com")) return json({ access_token: "at" });
      if (u.includes("/messages?")) return json({ messages: [{ id: "b" }, { id: "a" }] });
      if (u.includes("/messages/a")) return json({ raw: raw("a"), internalDate: "1763500000000" });
      return json({ raw: raw("b"), internalDate: "1763600000000" });
    }) as unknown as typeof fetch;
    const r = await fetchViaGoogle(
      box(),
      { id: "m1" },
      { afterUid: 0, since: new Date(1763000000000), knownUidValidity: null },
      ring,
      opts(fn),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.messages.map((m) => m.uid)).toEqual([1763500000, 1763600000]);
      expect(r.maxUid).toBe(1763600000);
      expect(r.more).toBe(false);
    }
    const methods = (fn as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[1] as RequestInit | undefined)?.method ?? "GET",
    );
    expect(methods.filter((m) => m !== "GET")).toEqual(["POST"]); // seul l'échange du jeton
  });
});
