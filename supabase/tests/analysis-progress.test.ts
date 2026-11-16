import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * MU.1 : progression de l'analyse (`analysis_steps`, `analysis_feed`, `analysis_step_update`).
 * Lecture par les membres, écriture service_role, une étape terminée n'est jamais rouverte.
 */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `analysis_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function inTx<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
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

describe.skipIf(!adminUrl)("progression de l'analyse : RLS, contraintes, helper SQL", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let auditId: string;

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
    const siteId = (
      await db.query(
        "insert into public.sites (workspace_id, domain) values ($1, 'alice-site.fr') returning id",
        [alice.workspaceId],
      )
    ).rows[0].id;
    auditId = (
      await db.query(
        `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
         values ($1, $2, array['coloriage'], 10, 2) returning id`,
        [alice.workspaceId, siteId],
      )
    ).rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  const addStep = (c: Client, key = "tri", position = 5) =>
    c.query(
      "insert into public.analysis_steps (audit_id, workspace_id, key, position) values ($1, $2, $3, $4)",
      [auditId, alice.workspaceId, key, position],
    );
  const update = async (
    c: Client,
    key: string,
    status: string | null,
    counters: object | null = null,
    example: string | null = null,
    error: string | null = null,
  ) =>
    (
      await c.query("select public.analysis_step_update($1, $2, $3, $4::jsonb, $5, $6) as ok", [
        auditId,
        key,
        status,
        counters ? JSON.stringify(counters) : null,
        example,
        error,
      ])
    ).rows[0].ok as boolean;
  const step = async (c: Client, key = "tri") =>
    (
      await c.query("select * from public.analysis_steps where audit_id = $1 and key = $2", [
        auditId,
        key,
      ])
    ).rows[0];
  const asUser = async (c: Client, userId: string) => {
    await c.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    await c.query("set local role authenticated");
  };

  it("un audit part sans analyse ; statut d'analyse inconnu refusé", async () => {
    await inTx(async (c) => {
      const a = (await c.query("select * from public.audits where id = $1", [auditId])).rows[0];
      expect(a.analysis_status).toBe("aucun");
      expect(a.links_state).toEqual({});
      await c.query("savepoint a");
      await expect(c.query("update public.audits set analysis_status = 'inconnu'")).rejects.toThrow(
        /check|violates/i,
      );
      await c.query("rollback to savepoint a");
    });
  });

  it("le helper fusionne les compteurs, date le début et la fin, garde le dernier exemple", async () => {
    await inTx(async (c) => {
      await addStep(c);
      expect(await update(c, "tri", "en_cours", { total: 150, done: 0 })).toBe(true);
      let s = await step(c);
      expect(s.status).toBe("en_cours");
      expect(s.started_at).not.toBeNull();
      expect(s.finished_at).toBeNull();
      expect(await update(c, "tri", null, { done: 20, found: 9 }, "ecole-jules-ferry.fr")).toBe(
        true,
      );
      s = await step(c);
      expect(s.counters).toEqual({ total: 150, done: 20, found: 9 });
      expect(s.last_example).toBe("ecole-jules-ferry.fr");
      expect(await update(c, "tri", "termine", { done: 150 })).toBe(true);
      s = await step(c);
      expect(s.status).toBe("termine");
      expect(s.finished_at).not.toBeNull();
      expect(s.counters).toEqual({ total: 150, done: 150, found: 9 });
      expect(s.last_example).toBe("ecole-jules-ferry.fr");
    });
  });

  it("une étape terminée ou sautée n'est jamais rouverte par une écriture tardive", async () => {
    await inTx(async (c) => {
      await addStep(c);
      await update(c, "tri", "termine", { done: 3 });
      expect(await update(c, "tri", null, { done: 1 })).toBe(false);
      expect(await update(c, "tri", "en_cours")).toBe(false);
      expect(await update(c, "tri", "attente")).toBe(false);
      expect((await step(c)).counters).toEqual({ done: 3 });
      await addStep(c, "constats", 7);
      await update(c, "constats", "saute");
      expect(await update(c, "constats", "en_cours")).toBe(false);
      expect((await step(c, "constats")).status).toBe("saute");
    });
  });

  it("un échec garde son message ; la reprise remet l'étape à zéro", async () => {
    await inTx(async (c) => {
      await addStep(c);
      await update(c, "tri", "en_cours", { total: 10, done: 4 }, "exemple.fr");
      await update(c, "tri", "echoue", null, null, "panne du lecteur");
      let s = await step(c);
      expect(s.status).toBe("echoue");
      expect(s.error_message).toBe("panne du lecteur");
      expect(s.finished_at).not.toBeNull();
      await update(c, "tri", "attente");
      s = await step(c);
      expect(s.status).toBe("attente");
      expect(s.counters).toEqual({});
      expect(s.last_example).toBeNull();
      expect(s.error_message).toBeNull();
      expect(s.started_at).toBeNull();
      expect(s.finished_at).toBeNull();
      expect(await update(c, "inconnue", "en_cours")).toBe(false);
    });
  });

  it("clé, position, statut et sorte d'événement inconnus refusés ; une ligne par étape", async () => {
    await inTx(async (c) => {
      await addStep(c);
      for (const sql of [
        `insert into public.analysis_steps (audit_id, workspace_id, key, position) values ('${auditId}', '${alice.workspaceId}', 'tri', 6)`,
        `insert into public.analysis_steps (audit_id, workspace_id, key, position) values ('${auditId}', '${alice.workspaceId}', 'contacts', 5)`,
        `insert into public.analysis_steps (audit_id, workspace_id, key, position) values ('${auditId}', '${alice.workspaceId}', 'autre', 2)`,
        `insert into public.analysis_steps (audit_id, workspace_id, key, position) values ('${auditId}', '${alice.workspaceId}', 'contacts', 9)`,
        `update public.analysis_steps set status = 'inconnu'`,
        `update public.analysis_steps set counters = '[]'::jsonb`,
        `insert into public.analysis_feed (audit_id, workspace_id, kind, message) values ('${auditId}', '${alice.workspaceId}', 'autre', 'x')`,
        `insert into public.analysis_feed (audit_id, workspace_id, kind, message) values ('${auditId}', '${alice.workspaceId}', 'cible', '')`,
      ]) {
        await c.query("savepoint a");
        await expect(c.query(sql), sql).rejects.toThrow(/check|violates|duplicate|unique/i);
        await c.query("rollback to savepoint a");
      }
    });
  });

  it("un membre lit étapes et événements ; un autre espace ne voit rien ; aucun client n'écrit", async () => {
    await inTx(async (c) => {
      await addStep(c);
      await c.query(
        "insert into public.analysis_feed (audit_id, workspace_id, kind, step_key, message) values ($1, $2, 'cible', 'contacts', 'Cible prête : asso.fr')",
        [auditId, alice.workspaceId],
      );
      await asUser(c, alice.userId);
      expect((await c.query("select * from public.analysis_steps")).rowCount).toBe(1);
      expect((await c.query("select * from public.analysis_feed")).rowCount).toBe(1);
      for (const sql of [
        "update public.analysis_steps set status = 'termine'",
        "delete from public.analysis_feed",
        `insert into public.analysis_feed (audit_id, workspace_id, kind, message) values ('${auditId}', '${alice.workspaceId}', 'info', 'x')`,
        `select public.analysis_step_update('${auditId}', 'tri', 'termine')`,
        "update public.audits set analysis_status = 'termine'",
      ]) {
        await c.query("savepoint a");
        await expect(c.query(sql), sql).rejects.toThrow(/permission denied/);
        await c.query("rollback to savepoint a");
      }
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: bob.userId, role: "authenticated" }),
      ]);
      expect((await c.query("select * from public.analysis_steps")).rowCount).toBe(0);
      expect((await c.query("select * from public.analysis_feed")).rowCount).toBe(0);
    });
  });

  it("le service écrit par le helper ; supprimer l'audit emporte sa progression", async () => {
    await inTx(async (c) => {
      await addStep(c);
      await c.query("set local role service_role");
      expect(await update(c, "tri", "en_cours", { total: 2 })).toBe(true);
      await c.query(
        "insert into public.analysis_feed (audit_id, workspace_id, kind, message) values ($1, $2, 'etape', 'Tri terminé')",
        [auditId, alice.workspaceId],
      );
      await c.query("reset role");
      await c.query("delete from public.audits where id = $1", [auditId]);
      expect((await c.query("select 1 from public.analysis_steps")).rowCount).toBe(0);
      expect((await c.query("select 1 from public.analysis_feed")).rowCount).toBe(0);
    });
  });
});
