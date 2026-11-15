import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M3.1 : RLS et contraintes de link_target_triage et link_plan_triage_runs. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `triage_test_${process.pid}_${Date.now()}`;
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

describe.skipIf(!adminUrl)("tri des cibles : RLS et contraintes", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let planId: string;
  let itemId: string;

  const insertTriage = (verdict: string, url: string | null, status: number | null) =>
    `insert into public.link_target_triage
       (plan_item_id, plan_id, workspace_id, verdict, reason, source, resolved_url, url_status)
     select '${itemId}', '${planId}', '${alice.workspaceId}', '${verdict}', 'motif', 'regles',
            ${url ? `'${url}'` : "null"}, ${status ?? "null"}`;

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
    const a = await db.query(
      `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
       values ($1, $2, array['coloriage licorne'], 3, 0.25) returning id`,
      [alice.workspaceId, s.rows[0].id],
    );
    const items = JSON.stringify([
      {
        type: "annuaire",
        source_domain: "annuaire.fr",
        target_page_url: "https://alice-site.fr/",
        anchor_kind: "marque",
        anchor_text: "Alice",
        expected_link_type: "editorial",
        rationale: "test",
        priority: "haute",
        priority_score: 80,
      },
    ]);
    const p = await db.query("select * from public.create_link_plan($1, $2, $3::jsonb)", [
      a.rows[0].id,
      alice.userId,
      items,
    ]);
    planId = p.rows[0].plan_id;
    itemId = (await db.query("select id from public.link_plan_items where plan_id = $1", [planId]))
      .rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("service_role écrit un verdict ; un membre le lit, un autre workspace non", async () => {
    await db.query("begin");
    try {
      await db.query("set local role service_role");
      expect((await db.query(insertTriage("payant", null, 200))).rowCount).toBe(1);
      await db.query("reset role");
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: alice.userId, role: "authenticated" }),
      ]);
      expect((await db.query("select * from public.link_target_triage")).rowCount).toBe(1);
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: bob.userId, role: "authenticated" }),
      ]);
      expect((await db.query("select * from public.link_target_triage")).rowCount).toBe(0);
    } finally {
      await db.query("rollback");
    }
  });

  it("un « ok » exige une page lue en HTTP 200", async () => {
    await asRole("service_role", null, async (c) => {
      await expect(c.query(insertTriage("ok", null, null))).rejects.toThrow(/ok_needs_200/);
    });
    await asRole("service_role", null, async (c) => {
      await expect(c.query(insertTriage("ok", "https://annuaire.fr/p", 301))).rejects.toThrow(
        /ok_needs_200/,
      );
    });
    await asRole("service_role", null, async (c) => {
      expect((await c.query(insertTriage("ok", "https://annuaire.fr/p", 200))).rowCount).toBe(1);
    });
  });

  it("verdict inconnu refusé ; un seul verdict par cible", async () => {
    await asRole("service_role", null, async (c) => {
      await expect(c.query(insertTriage("peut_etre", null, null))).rejects.toThrow(/check/);
    });
    await asRole("service_role", null, async (c) => {
      await c.query(insertTriage("mort", null, 404));
      await expect(c.query(insertTriage("payant", null, 200))).rejects.toThrow(/duplicate key/);
    });
  });

  it.each([
    "insert into public.link_target_triage (plan_item_id) values (gen_random_uuid())",
    "update public.link_target_triage set verdict = 'ok'",
    "delete from public.link_target_triage",
    "update public.link_plan_triage_runs set status = 'termine'",
  ])("aucune écriture côté client : %s", async (sql) => {
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(c.query(sql)).rejects.toThrow(/permission denied/);
    });
  });

  it("service_role ne peut pas supprimer un verdict", async () => {
    await asRole("service_role", null, async (c) => {
      await expect(c.query("delete from public.link_target_triage")).rejects.toThrow(
        /permission denied/,
      );
    });
  });

  it("un anonyme est refusé", async () => {
    await db.query("begin");
    try {
      await db.query("set local role anon");
      await expect(db.query("select * from public.link_target_triage")).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.query("rollback");
    }
  });

  it("l'état du run : un par plan, statut contraint", async () => {
    await asRole("service_role", null, async (c) => {
      const ins = `insert into public.link_plan_triage_runs (plan_id, workspace_id, status)
                   values ('${planId}', '${alice.workspaceId}', 'en_cours')`;
      await c.query(ins);
      await expect(c.query(ins)).rejects.toThrow(/duplicate key/);
    });
    await asRole("service_role", null, async (c) => {
      await expect(
        c.query(`insert into public.link_plan_triage_runs (plan_id, workspace_id, status)
                 values ('${planId}', '${alice.workspaceId}', 'bizarre')`),
      ).rejects.toThrow(/check/);
    });
  });
});
