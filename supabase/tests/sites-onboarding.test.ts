import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M1.2 : la vérification de propriété ne peut pas être forgée par un membre. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `sites_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function asRole<T>(
  role: "authenticated" | "service_role",
  userId: string | null,
  fn: (c: Client) => Promise<T>,
): Promise<T> {
  await db.query("begin");
  try {
    await db.query(`set local role ${role}`);
    if (userId) {
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role }),
      ]);
    }
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

async function signUp(email: string) {
  const u = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
  const userId = u.rows[0].id as string;
  const m = await db.query("select workspace_id from public.memberships where user_id = $1", [
    userId,
  ]);
  return { userId, workspaceId: m.rows[0].workspace_id as string };
}

describe.skipIf(!adminUrl)("sites : onboarding et vérification", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let siteId: string;

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`create database ${dbName}`);
    const url = new URL(adminUrl!);
    url.pathname = `/${dbName}`;
    db = new Client({ connectionString: url.toString() });
    await db.connect();
    await db.query(readFileSync(path.join(dir, "tests/bootstrap.sql"), "utf8"));
    for (const f of readdirSync(path.join(dir, "migrations")).sort()) {
      await db.query(readFileSync(path.join(dir, "migrations", f), "utf8"));
    }
    alice = await signUp("alice@example.com");
    bob = await signUp("bob@example.com");
    const s = await db.query(
      "insert into public.sites (workspace_id, domain) values ($1, 'alice-site.fr') returning id",
      [alice.workspaceId],
    );
    siteId = s.rows[0].id as string;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("génère un jeton de vérification à la création", async () => {
    const r = await db.query("select verification_token, verified_at from public.sites");
    expect(r.rows[0].verification_token).toMatch(/^[0-9a-f]{64}$/);
    expect(r.rows[0].verified_at).toBeNull();
  });

  it("un membre crée et modifie un site avec les colonnes d'onboarding", async () => {
    await asRole("authenticated", alice.userId, async (c) => {
      await c.query(
        `insert into public.sites (workspace_id, domain, niche, priority_queries, sender_email)
         values ($1, 'nouveau.fr', 'cuisine', array['recette crêpes', 'pâte à crêpes'], 'moi@nouveau.fr')`,
        [alice.workspaceId],
      );
      const u = await c.query(
        "update public.sites set niche = 'pâtisserie', priority_queries = array['a b c'] where id = $1",
        [siteId],
      );
      expect(u.rowCount).toBe(1);
    });
  });

  it("limite à 3 requêtes prioritaires", async () => {
    await expect(
      asRole("authenticated", alice.userId, (c) =>
        c.query("update public.sites set priority_queries = array['a','b','c','d'] where id = $1", [
          siteId,
        ]),
      ),
    ).rejects.toThrow(/check/);
  });

  it("MT.2a : objectif « autorité générale » par défaut, mots-clés choisis par le membre", async () => {
    const d = await db.query("select goal, target_keywords from public.sites where id = $1", [
      siteId,
    ]);
    expect(d.rows[0]).toMatchObject({ goal: "autorite_generale", target_keywords: [] });
    await asRole("authenticated", alice.userId, async (c) => {
      const u = await c.query(
        "update public.sites set goal = 'mots_cles', target_keywords = array['coloriage licorne'] where id = $1 returning goal, target_keywords",
        [siteId],
      );
      expect(u.rows[0]).toMatchObject({
        goal: "mots_cles",
        target_keywords: ["coloriage licorne"],
      });
    });
  });

  it("MT.2a : objectif inconnu et plus de 10 mots-clés refusés", async () => {
    await expect(
      asRole("authenticated", alice.userId, (c) =>
        c.query("update public.sites set goal = 'garanti' where id = $1", [siteId]),
      ),
    ).rejects.toThrow(/check/);
    const many = Array.from({ length: 11 }, (_, i) => `mot ${i}`);
    await expect(
      asRole("authenticated", alice.userId, (c) =>
        c.query("update public.sites set target_keywords = $2 where id = $1", [siteId, many]),
      ),
    ).rejects.toThrow(/check/);
  });

  it("un membre ne peut pas s'auto-déclarer vérifié ni écrire le jeton", async () => {
    for (const col of [
      "verified_at = now()",
      "verification_method = 'meta'",
      "verification_token = 'x'",
    ]) {
      await expect(
        asRole("authenticated", alice.userId, (c) =>
          c.query(`update public.sites set ${col} where id = $1`, [siteId]),
        ),
      ).rejects.toThrow(/permission denied/);
    }
    await expect(
      asRole("authenticated", alice.userId, (c) =>
        c.query(
          "insert into public.sites (workspace_id, domain, verified_at) values ($1, 'forge.fr', now())",
          [alice.workspaceId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("un membre lit le jeton de ses sites, pas ceux d'un autre workspace", async () => {
    await asRole("authenticated", alice.userId, async (c) => {
      const r = await c.query("select verification_token from public.sites where id = $1", [
        siteId,
      ]);
      expect(r.rows).toHaveLength(1);
    });
    await asRole("authenticated", bob.userId, async (c) => {
      const r = await c.query("select verification_token from public.sites where id = $1", [
        siteId,
      ]);
      expect(r.rows).toHaveLength(0);
    });
  });

  it("service_role écrit la vérification ; changer de domaine l'invalide et renouvelle le jeton", async () => {
    const before = (
      await db.query("select verification_token from public.sites where id = $1", [siteId])
    ).rows[0].verification_token as string;
    await db.query(
      "update public.sites set verified_at = now(), verification_method = 'meta' where id = $1",
      [siteId],
    );
    const mid = await db.query(
      "select verified_at, verification_token from public.sites where id = $1",
      [siteId],
    );
    expect(mid.rows[0].verified_at).not.toBeNull();
    expect(mid.rows[0].verification_token).toBe(before);

    await db.query("update public.sites set domain = 'autre-domaine.fr' where id = $1", [siteId]);
    const after = await db.query(
      "select verified_at, verification_method, verification_token from public.sites where id = $1",
      [siteId],
    );
    expect(after.rows[0].verified_at).toBeNull();
    expect(after.rows[0].verification_method).toBeNull();
    expect(after.rows[0].verification_token).not.toBe(before);
  });
});
