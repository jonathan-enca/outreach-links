import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M6.1 : tables de facturation (mode test imposé en base, idempotence, RLS). */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `billing_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function inTx<T>(
  role: string,
  sub: string | null,
  fn: (c: Client) => Promise<T>,
): Promise<T> {
  await db.query("begin");
  try {
    if (sub) await db.query("select set_config('request.jwt.claim.sub', $1, true)", [sub]);
    await db.query(`set local role ${role}`);
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

describe.skipIf(!adminUrl)("facturation : garde-fous en base", () => {
  let wsA: string;
  let wsB: string;
  let userA: string;

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
    userA = (await db.query("insert into auth.users (email) values ('a@example.com') returning id"))
      .rows[0].id;
    const uB = (
      await db.query("insert into auth.users (email) values ('b@example.com') returning id")
    ).rows[0].id;
    wsA = (
      await db.query("select workspace_id from public.memberships where user_id = $1", [userA])
    ).rows[0].workspace_id;
    wsB = (await db.query("select workspace_id from public.memberships where user_id = $1", [uB]))
      .rows[0].workspace_id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("catalogue : le gratuit n'envoie rien, les plafonds croissent", async () => {
    const r = await db.query("select key, monthly_send_cap from public.plans order by sort_order");
    expect(r.rows.map((x) => x.key)).toEqual(["gratuit", "starter", "pro", "business"]);
    expect(r.rows[0].monthly_send_cap).toBe(0);
    expect(r.rows[1].monthly_send_cap).toBeLessThan(r.rows[2].monthly_send_cap);
    expect(r.rows[2].monthly_send_cap).toBeLessThan(r.rows[3].monthly_send_cap);
  });

  it("le catalogue est lisible sans connexion (page Tarifs), sans aucune écriture", async () => {
    const r = await inTx("anon", null, (c) => c.query("select key from public.plans"));
    expect(r.rows).toHaveLength(4);
    await expect(
      inTx("anon", null, (c) => c.query("update public.plans set price_eur_cents = 1")),
    ).rejects.toThrow(/permission denied/);
  });

  it("un abonnement live est refusé en base (mode test uniquement)", async () => {
    await expect(
      inTx("service_role", null, (c) =>
        c.query(
          "insert into public.subscriptions (workspace_id, plan, status, livemode) values ($1, 'starter', 'active', true)",
          [wsA],
        ),
      ),
    ).rejects.toThrow(/livemode|check/);
    await expect(
      inTx("service_role", null, (c) =>
        c.query("insert into public.stripe_events (id, type, livemode) values ('e', 't', true)"),
      ),
    ).rejects.toThrow(/livemode|check/);
  });

  it("un abonnement par workspace ; un événement Stripe ne s'enregistre qu'une fois", async () => {
    await inTx("service_role", null, async (c) => {
      await c.query(
        "insert into public.subscriptions (workspace_id, plan, status) values ($1, 'pro', 'active')",
        [wsA],
      );
      await expect(
        c.query(
          "insert into public.subscriptions (workspace_id, plan, status) values ($1, 'starter', 'active')",
          [wsA],
        ),
      ).rejects.toThrow(/unique|duplicate/);
    });
    await inTx("service_role", null, async (c) => {
      await c.query("insert into public.stripe_events (id, type) values ('evt_1', 'x')");
      await expect(
        c.query("insert into public.stripe_events (id, type) values ('evt_1', 'x')"),
      ).rejects.toThrow(/duplicate/);
    });
  });

  it("crédits : clé d'idempotence unique, journal en ajout seul", async () => {
    await inTx("service_role", null, async (c) => {
      await c.query(
        "insert into public.credits_ledger (workspace_id, delta, reason, idempotency_key) values ($1, 100, 'abonnement', 'invoice:1')",
        [wsA],
      );
      await expect(
        c.query(
          "insert into public.credits_ledger (workspace_id, delta, reason, idempotency_key) values ($1, 100, 'abonnement', 'invoice:1')",
          [wsA],
        ),
      ).rejects.toThrow(/duplicate/);
    });
    await db.query(
      "insert into public.credits_ledger (workspace_id, delta, reason) values ($1, 5, 'ajustement')",
      [wsA],
    );
    await expect(
      inTx("service_role", null, (c) => c.query("update public.credits_ledger set delta = 99")),
    ).rejects.toThrow(/permission/);
    await db.query("delete from public.credits_ledger");
  });

  it("RLS : un membre lit son abonnement, pas celui d'un autre, et ne peut pas écrire", async () => {
    await db.query(
      "insert into public.subscriptions (workspace_id, plan, status) values ($1, 'pro', 'active'), ($2, 'starter', 'active')",
      [wsA, wsB],
    );
    const rows = await inTx("authenticated", userA, (c) =>
      c.query("select workspace_id from public.subscriptions"),
    );
    expect(rows.rows.map((r) => r.workspace_id)).toEqual([wsA]);
    await expect(
      inTx("authenticated", userA, (c) => c.query("update public.subscriptions set plan = 'pro'")),
    ).rejects.toThrow(/permission/);
    await expect(
      inTx("authenticated", userA, (c) => c.query("update public.workspaces set plan = 'payant'")),
    ).rejects.toThrow(/permission/);
    await db.query("delete from public.subscriptions");
  });
});
