import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** RLS de dataforseo_cache : table système, service_role uniquement. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `dfscache_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
const KEY = "a".repeat(64);
let admin: Client;
let db: Client;

async function asRole<T>(
  role: "anon" | "authenticated" | "service_role",
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

describe.skipIf(!adminUrl)("dataforseo_cache (RLS)", () => {
  let userId: string;

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
    const u = await db.query(
      "insert into auth.users (email) values ('a@example.com') returning id",
    );
    userId = u.rows[0].id as string;
    await db.query(
      "insert into public.dataforseo_cache (cache_key, endpoint, params, response, expires_at) values ($1, 'serp', '{}', '{}', now() + interval '1 day')",
      [KEY],
    );
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName} with (force)`);
    await admin?.end();
  });

  it("un utilisateur connecté n'a aucun accès", async () => {
    await expect(
      asRole("authenticated", userId, (c) => c.query("select * from public.dataforseo_cache")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole("authenticated", userId, (c) =>
        c.query(
          "insert into public.dataforseo_cache (cache_key, endpoint, params, response, expires_at) values ($1, 'x', '{}', '{}', now())",
          ["b".repeat(64)],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("un anonyme n'a aucun accès", async () => {
    await expect(
      asRole("anon", null, (c) => c.query("select * from public.dataforseo_cache")),
    ).rejects.toThrow(/permission denied/);
  });

  it("service_role lit, écrit, met à jour et purge", async () => {
    await asRole("service_role", null, async (c) => {
      const r = await c.query("select cache_key from public.dataforseo_cache");
      expect(r.rows).toEqual([{ cache_key: KEY }]);
      await c.query(
        "insert into public.dataforseo_cache (cache_key, endpoint, params, response, expires_at) values ($1, 'x', '{}', '{}', now() - interval '1 minute')",
        ["c".repeat(64)],
      );
      await c.query("update public.dataforseo_cache set cost_usd = 0.01 where cache_key = $1", [
        KEY,
      ]);
      const d = await c.query("delete from public.dataforseo_cache where expires_at <= now()");
      expect(d.rowCount).toBe(1);
    });
  });

  it("refuse une clé de longueur invalide et un coût négatif", async () => {
    await expect(
      db.query(
        "insert into public.dataforseo_cache (cache_key, endpoint, params, response, expires_at) values ('court', 'x', '{}', '{}', now())",
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.query(
        "insert into public.dataforseo_cache (cache_key, endpoint, params, response, cost_usd, expires_at) values ($1, 'x', '{}', '{}', -1, now())",
        ["d".repeat(64)],
      ),
    ).rejects.toThrow(/check constraint/);
  });
});
