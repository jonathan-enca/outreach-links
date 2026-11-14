import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** RLS de cost_ledger : lecture par les membres, écriture réservée à service_role. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `cost_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
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

async function signUp(email: string) {
  const u = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
  const userId = u.rows[0].id as string;
  const m = await db.query("select workspace_id from public.memberships where user_id = $1", [
    userId,
  ]);
  return { userId, workspaceId: m.rows[0].workspace_id as string };
}

describe.skipIf(!adminUrl)("cost_ledger (RLS)", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };

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
    await db.query(
      "insert into public.cost_ledger (workspace_id, provider, operation, estimated_cost_usd) values ($1, 'dataforseo', 'serp', 0.002), (null, 'internal', 'health.check', 0)",
      [alice.workspaceId],
    );
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName} with (force)`);
    await admin?.end();
  });

  it("un membre lit les coûts de son workspace, jamais ceux des autres ni les lignes système", async () => {
    const a = await asRole("authenticated", alice.userId, (c) =>
      c.query("select provider from public.cost_ledger"),
    );
    expect(a.rows).toEqual([{ provider: "dataforseo" }]);
    const b = await asRole("authenticated", bob.userId, (c) =>
      c.query("select * from public.cost_ledger"),
    );
    expect(b.rows).toHaveLength(0);
  });

  it("un anonyme n'a aucun accès", async () => {
    await expect(
      asRole("anon", null, (c) => c.query("select * from public.cost_ledger")),
    ).rejects.toThrow(/permission denied/);
  });

  it("aucune écriture côté client (insert, update, delete)", async () => {
    await expect(
      asRole("authenticated", alice.userId, (c) =>
        c.query(
          "insert into public.cost_ledger (workspace_id, provider, operation) values ($1, 'x', 'y')",
          [alice.workspaceId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole("authenticated", alice.userId, (c) =>
        c.query("update public.cost_ledger set estimated_cost_usd = 0"),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole("authenticated", alice.userId, (c) => c.query("delete from public.cost_ledger")),
    ).rejects.toThrow(/permission denied/);
  });

  it("service_role peut écrire et lire, mais ni modifier ni supprimer (journal en ajout seul)", async () => {
    await asRole("service_role", null, async (c) => {
      const r = await c.query(
        "insert into public.cost_ledger (provider, operation, units) values ('internal', 'health.check', 1) returning id",
      );
      expect(r.rows).toHaveLength(1);
    });
    await expect(
      asRole("service_role", null, (c) => c.query("delete from public.cost_ledger")),
    ).rejects.toThrow(/permission denied/);
  });

  it("refuse un coût négatif", async () => {
    await expect(
      db.query(
        "insert into public.cost_ledger (provider, operation, estimated_cost_usd) values ('x', 'y', -1)",
      ),
    ).rejects.toThrow(/check constraint/);
  });
});
