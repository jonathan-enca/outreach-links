import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** MT.1 : RLS, versionnage et immuabilité de brand_profiles. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `brand_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function asUser<T>(userId: string, fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
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

describe.skipIf(!adminUrl)("profil de marque : RLS, versions, immuabilité", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let siteId: string;

  const insert = (workspaceId: string, site: string, version: number, by: string) => ({
    text: `insert into public.brand_profiles (site_id, workspace_id, version, source, profile, created_by)
           values ($1, $2, $3, 'llm', '{"activity":"x"}'::jsonb, $4)`,
    values: [site, workspaceId, version, by],
  });

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
    siteId = s.rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("un membre crée et lit les versions de son site ; un autre espace ne voit rien", async () => {
    await asUser(alice.userId, async (c) => {
      await c.query(insert(alice.workspaceId, siteId, 1, alice.userId));
      await c.query(insert(alice.workspaceId, siteId, 2, alice.userId));
      expect((await c.query("select * from public.brand_profiles")).rowCount).toBe(2);
    });
    await db.query(insert(alice.workspaceId, siteId, 1, alice.userId));
    await asUser(bob.userId, async (c) => {
      expect((await c.query("select * from public.brand_profiles")).rowCount).toBe(0);
    });
    await db.query("delete from public.brand_profiles");
  });

  it("refuse d'écrire dans l'espace d'un autre ou sur le site d'un autre", async () => {
    await asUser(bob.userId, async (c) => {
      await expect(c.query(insert(alice.workspaceId, siteId, 1, bob.userId))).rejects.toThrow(
        /row-level security/,
      );
    });
    await asUser(bob.userId, async (c) => {
      // Espace de Bob mais site d'Alice : refusé par la vérification d'appartenance du site.
      await expect(c.query(insert(bob.workspaceId, siteId, 1, bob.userId))).rejects.toThrow(
        /row-level security/,
      );
    });
  });

  it("la version est unique par site et strictement positive", async () => {
    await db.query(insert(alice.workspaceId, siteId, 1, alice.userId));
    await expect(db.query(insert(alice.workspaceId, siteId, 1, alice.userId))).rejects.toThrow(
      /brand_profiles_site_id_version_key/,
    );
    await expect(db.query(insert(alice.workspaceId, siteId, 0, alice.userId))).rejects.toThrow(
      /check/,
    );
    await db.query("delete from public.brand_profiles");
  });

  it("une version est immuable : ni update ni delete pour un membre", async () => {
    await db.query(insert(alice.workspaceId, siteId, 1, alice.userId));
    await asUser(alice.userId, async (c) => {
      await expect(
        c.query("update public.brand_profiles set profile = '{}'::jsonb"),
      ).rejects.toThrow(/permission denied/);
    });
    await asUser(alice.userId, async (c) => {
      await expect(c.query("delete from public.brand_profiles")).rejects.toThrow(
        /permission denied/,
      );
    });
    await db.query("delete from public.brand_profiles");
  });

  it("la suppression du site supprime ses profils (cascade)", async () => {
    const s = await db.query(
      "insert into public.sites (workspace_id, domain) values ($1, 'jetable.fr') returning id",
      [alice.workspaceId],
    );
    await db.query(insert(alice.workspaceId, s.rows[0].id, 1, alice.userId));
    await db.query("delete from public.sites where id = $1", [s.rows[0].id]);
    expect(
      (await db.query("select * from public.brand_profiles where site_id = $1", [s.rows[0].id]))
        .rowCount,
    ).toBe(0);
  });
});
