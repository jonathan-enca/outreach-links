import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isPrivateIp, normalizeDomain } from "./domain";
import { parseSiteForm } from "./schema";
import { createSite, updateSite, verifySite } from "./service";
import { checkOwnership, hasMetaToken, metaTag, FILE_PATH } from "./verify";

type Client = SupabaseClient<Database>;

function form(over: Record<string, string> = {}) {
  const base: Record<string, string> = {
    domain: "https://www.MonSite.fr/page?x=1",
    niche: "coloriages",
    country: "FR",
    language: "fr",
    signatureFirstName: "Jonathan",
    offeredAsset: "Un guide gratuit",
    senderEmail: "",
    query1: "coloriage licorne",
    query2: "coloriage chat",
    query3: "",
    ...over,
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

/** Client Supabase simulé : enregistre les appels, renvoie des résultats préparés par table. */
function fakeClient(opts: {
  userId?: string | null;
  results?: Record<string, { data?: unknown; error?: { code?: string; message: string } | null }>;
}) {
  const calls: { table: string; op: string; payload?: unknown; filters: unknown[] }[] = [];
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: opts.userId === null ? null : { id: opts.userId ?? "u1" } },
      }),
    },
    from(table: string) {
      const call = { table, op: "select", payload: undefined as unknown, filters: [] as unknown[] };
      calls.push(call);
      const res = () => {
        const r = opts.results?.[`${table}.${call.op}`] ?? {};
        return { data: r.data ?? null, error: r.error ?? null };
      };
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "order", "limit"]) chain[m] = () => chain;
      chain.insert = (p: unknown) => {
        call.op = "insert";
        call.payload = p;
        return chain;
      };
      chain.update = (p: unknown) => {
        call.op = "update";
        call.payload = p;
        return chain;
      };
      chain.eq = (...a: unknown[]) => {
        call.filters.push(a);
        return chain;
      };
      chain.single = async () => res();
      chain.maybeSingle = async () => res();
      chain.then = (ok: (v: unknown) => unknown) => Promise.resolve(res()).then(ok);
      return chain;
    },
  } as unknown as Client;
  return { client, calls };
}

describe("normalizeDomain", () => {
  it("normalise les saisies courantes", () => {
    expect(normalizeDomain("https://www.MonSite.fr/page?x=1")).toBe("monsite.fr");
    expect(normalizeDomain("  monsite.fr  ")).toBe("monsite.fr");
    expect(normalizeDomain("blog.monsite.fr:8080/a")).toBe("blog.monsite.fr");
    expect(normalizeDomain("http://exemple.com./")).toBe("exemple.com");
    expect(normalizeDomain("café.fr")).toBe("xn--caf-dma.fr");
  });
  it("refuse les entrées invalides ou internes", () => {
    for (const bad of [
      "",
      "monsite",
      "localhost",
      "127.0.0.1",
      "10.0.0.1",
      "a b.fr",
      "foo.local",
      "x.123",
      "[::1]",
    ]) {
      expect(normalizeDomain(bad), bad).toBeNull();
    }
  });
});

describe("isPrivateIp", () => {
  it("détecte les adresses privées et réservées", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "192.168.1.1",
      "172.16.0.1",
      "169.254.169.254",
      "::1",
      "fe80::1",
      "fd00::1",
      "::ffff:10.0.0.1",
      "0.0.0.0",
      "::ffff:7f00:1",
      "::ffff:a9fe:a9fe",
    ]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "93.184.216.34", "2606:4700::1111"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });
});

describe("parseSiteForm", () => {
  it("accepte un formulaire valide et normalise", () => {
    const r = parseSiteForm(form());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.domain).toBe("monsite.fr");
      expect(r.data.priorityQueries).toEqual(["coloriage licorne", "coloriage chat"]);
      expect(r.data.senderEmail).toBeNull();
    }
  });
  it("signale les erreurs par champ", () => {
    const r = parseSiteForm(
      form({
        domain: "nope",
        niche: "a",
        country: "XX",
        offeredAsset: "",
        query1: "",
        query2: "",
        senderEmail: "pas-un-mail",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(
        ["country", "domain", "niche", "offeredAsset", "priorityQueries", "senderEmail"].sort(),
      );
    }
  });
  it("dédoublonne les requêtes et refuse une requête trop courte", () => {
    const r = parseSiteForm(form({ query1: "Chat", query2: "chat", query3: "ab" }));
    expect(r.ok).toBe(false);
    const ok = parseSiteForm(form({ query1: "Chat noir", query2: "chat noir", query3: "" }));
    expect(ok.ok && ok.data.priorityQueries).toEqual(["chat noir"]);
  });
});

describe("createSite", () => {
  it("crée le site dans le workspace de l'utilisateur et journalise", async () => {
    const { client, calls } = fakeClient({
      results: {
        "workspaces.select": { data: { id: "w1" } },
        "sites.insert": { data: { id: "s1" } },
      },
    });
    const r = await createSite(client, form());
    expect(r).toMatchObject({ status: "saved", siteId: "s1" });
    const insert = calls.find((c) => c.table === "sites" && c.op === "insert")!;
    expect(insert.payload).toMatchObject({
      workspace_id: "w1",
      domain: "monsite.fr",
      signature_first_name: "Jonathan",
      priority_queries: ["coloriage licorne", "coloriage chat"],
    });
    expect(insert.payload).not.toHaveProperty("verified_at");
    expect(calls.some((c) => c.table === "events" && c.op === "insert")).toBe(true);
  });
  it("refuse sans écrire si la validation échoue", async () => {
    const { client, calls } = fakeClient({});
    const r = await createSite(client, form({ domain: "x" }));
    expect(r.status).toBe("error");
    expect(r.errors?.domain).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
  it("refuse un utilisateur non connecté", async () => {
    const { client, calls } = fakeClient({ userId: null });
    const r = await createSite(client, form());
    expect(r.status).toBe("error");
    expect(calls).toHaveLength(0);
  });
  it("signale un domaine en double", async () => {
    const { client } = fakeClient({
      results: {
        "workspaces.select": { data: { id: "w1" } },
        "sites.insert": { error: { code: "23505", message: "dup" } },
      },
    });
    const r = await createSite(client, form());
    expect(r.errors?.domain).toBeTruthy();
  });
});

describe("updateSite", () => {
  it("met à jour sans jamais toucher aux colonnes de vérification", async () => {
    const { client, calls } = fakeClient({
      results: { "sites.update": { data: { id: "s1", workspace_id: "w1" } } },
    });
    const r = await updateSite(client, "s1", form());
    expect(r.status).toBe("saved");
    const up = calls.find((c) => c.op === "update")!;
    expect(up.filters).toContainEqual(["id", "s1"]);
    for (const k of ["verified_at", "verification_token", "verification_method"]) {
      expect(up.payload).not.toHaveProperty(k);
    }
  });
  it("répond introuvable si la RLS masque le site", async () => {
    const { client } = fakeClient({ results: { "sites.update": { data: null } } });
    expect((await updateSite(client, "autre", form())).status).toBe("error");
  });
});

describe("vérification de propriété", () => {
  const token = "a".repeat(64);
  it("reconnaît la balise meta quel que soit l'ordre des attributs", () => {
    expect(hasMetaToken(`<head>${metaTag(token)}</head>`, token)).toBe(true);
    expect(
      hasMetaToken(`<meta content='${token}' name='outreach-links-verification'/>`, token),
    ).toBe(true);
    expect(hasMetaToken(metaTag("b".repeat(64)), token)).toBe(false);
    expect(hasMetaToken(`<meta name="description" content="${token}">`, token)).toBe(false);
  });
  it("valide par balise meta", async () => {
    const fetchPage = vi.fn(async (url: string) =>
      url === "https://monsite.fr/" ? { status: 200, text: metaTag(token) } : null,
    );
    expect(await checkOwnership("monsite.fr", token, fetchPage)).toEqual({
      verified: true,
      method: "meta",
    });
  });
  it("valide par fichier", async () => {
    const fetchPage = async (url: string) =>
      url === `https://monsite.fr${FILE_PATH}`
        ? { status: 200, text: `${token}\n` }
        : { status: 200, text: "<html></html>" };
    expect(await checkOwnership("monsite.fr", token, fetchPage)).toEqual({
      verified: true,
      method: "file",
    });
  });
  it("distingue jeton absent et site injoignable", async () => {
    expect(
      await checkOwnership("monsite.fr", token, async () => ({ status: 200, text: "rien" })),
    ).toEqual({ verified: false, reason: "not_found" });
    expect(await checkOwnership("monsite.fr", token, async () => null)).toEqual({
      verified: false,
      reason: "unreachable",
    });
  });
  it("replie sur http si https ne répond pas", async () => {
    const fetchPage = async (url: string) =>
      url === "http://monsite.fr/" ? { status: 200, text: metaTag(token) } : null;
    expect((await checkOwnership("monsite.fr", token, fetchPage)).verified).toBe(true);
  });

  describe("verifySite", () => {
    const site = {
      id: "s1",
      workspace_id: "w1",
      domain: "monsite.fr",
      verification_token: token,
      verified_at: null,
    };
    it("écrit verified_at avec le client service uniquement en cas de succès", async () => {
      const user = fakeClient({ results: { "sites.select": { data: site } } });
      const service = fakeClient({});
      const r = await verifySite(
        user.client,
        "s1",
        async () => ({ status: 200, text: metaTag(token) }),
        () => service.client,
      );
      expect(r.status).toBe("verified");
      const up = service.calls.find((c) => c.op === "update")!;
      expect(up.payload).toMatchObject({ verification_method: "meta" });
      expect(user.calls.some((c) => c.op === "update")).toBe(false);
    });
    it("n'appelle pas le client service si la vérification échoue", async () => {
      const user = fakeClient({ results: { "sites.select": { data: site } } });
      const getService = vi.fn();
      const r = await verifySite(user.client, "s1", async () => null, getService as never);
      expect(r.status).toBe("failed");
      expect(getService).not.toHaveBeenCalled();
    });
    it("gère l'absence de clé service avec un message clair", async () => {
      const user = fakeClient({ results: { "sites.select": { data: site } } });
      const r = await verifySite(
        user.client,
        "s1",
        async () => ({ status: 200, text: metaTag(token) }),
        () => {
          throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
        },
      );
      expect(r.status).toBe("error");
    });
    it("introuvable si le site n'est pas visible par l'utilisateur", async () => {
      const user = fakeClient({ results: { "sites.select": { data: null } } });
      const r = await verifySite(
        user.client,
        "x",
        async () => null,
        () => user.client,
      );
      expect(r.status).toBe("error");
    });
  });
});

describe("safeFetchPage (SSRF)", () => {
  it("refuse localhost, IP privée, port non standard et autre schéma", async () => {
    const { safeFetchPage } = await import("./verify");
    expect(await safeFetchPage("http://localhost/")).toBeNull();
    expect(await safeFetchPage("http://127.0.0.1/")).toBeNull();
    expect(await safeFetchPage("https://example.com:8443/")).toBeNull();
    expect(await safeFetchPage("ftp://example.com/")).toBeNull();
  });
});
