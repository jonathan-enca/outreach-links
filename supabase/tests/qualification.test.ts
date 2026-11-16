import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * MT.4 : qualification (runs, résultats par candidat) et fonction « domaines déjà contactés par un
 * autre espace ». Lecture par les membres, écriture service_role, contraintes de la liste courte.
 */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `qualification_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function inTx<T>(fn: (c: Client) => Promise<T>, role?: string, userId?: string): Promise<T> {
  await db.query("begin");
  try {
    if (role) await db.query(`set local role ${role}`);
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

describe.skipIf(!adminUrl)("qualification : RLS, contraintes, domaines déjà contactés", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let siteId: string;
  let auditId: string;
  let collectionId: string;
  let planId: string;
  let draftId: string;
  let mailboxId: string;

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
    siteId = (
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
    collectionId = (
      await db.query(
        `insert into public.candidate_collections (audit_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, target_usd, status)
         values ($1, $2, $3, '{}'::jsonb, 0.3, 0.5, 0.55, 'termine') returning id`,
        [auditId, alice.workspaceId, siteId],
      )
    ).rows[0].id;
    // Chaîne d'envoi d'Alice (plan, brouillon, boîte) pour la fonction « déjà contactés ».
    const p = await db.query("select * from public.create_link_plan($1, $2, $3::jsonb)", [
      auditId,
      alice.userId,
      JSON.stringify([
        {
          type: "annuaire",
          source_domain: "www.ecole-voisine.fr",
          target_page_url: "https://alice-site.fr/",
          anchor_kind: "marque",
          anchor_text: "Alice",
          expected_link_type: "editorial",
          rationale: "test",
          priority: "haute",
          priority_score: 80,
        },
      ]),
    ]);
    planId = p.rows[0].plan_id;
    const itemId = (
      await db.query("select id from public.link_plan_items where plan_id = $1", [planId])
    ).rows[0].id;
    draftId = (
      await db.query(
        `insert into public.target_drafts (plan_item_id, plan_id, workspace_id, channel, subject, body, hook,
           targeting_reason, proposed_url, url_status, ready)
         values ($1, $2, $3, 'email', 's', 'corps', 'h', 'r', 'https://alice-site.fr/', 200, true) returning id`,
        [itemId, planId, alice.workspaceId],
      )
    ).rows[0].id;
    mailboxId = (
      await db.query(
        `insert into public.mailboxes (workspace_id, site_id, email, from_name, username, password_enc,
           key_version, smtp_host, smtp_port, imap_host, imap_port, status, smtp_ok, imap_ok, hourly_cap)
         values ($1, $2, 'jo@alice-site.fr', 'Jo', 'jo', 'v1.x.y.z', 'v1', 'smtp.alice-site.fr', 587,
           'imap.alice-site.fr', 993, 'verifiee', true, true, 5) returning id`,
        [alice.workspaceId, siteId],
      )
    ).rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  const insertRun = (c: Client, extra: { worst?: number; budget?: number } = {}) =>
    c.query(
      `insert into public.qualification_runs (audit_id, collection_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, budget_usd)
       values ($1, $2, $3, $4, '{"model":"m","budgetUsd":0.1}'::jsonb, 0.05, $5, $6) returning id`,
      [auditId, collectionId, alice.workspaceId, siteId, extra.worst ?? 0.08, extra.budget ?? 0.1],
    );
  const insertTarget = (c: Client, runId: string, o: Record<string, unknown>) => {
    const cols = Object.keys(o);
    return c.query(
      `insert into public.qualified_targets (run_id, audit_id, workspace_id, ${cols.join(", ")})
       values ($1, $2, $3, ${cols.map((_, i) => `$${i + 4}`).join(", ")})`,
      [runId, auditId, alice.workspaceId, ...Object.values(o)],
    );
  };
  const short = {
    domain: "asso.fr",
    tactics: ["inconnus"],
    status: "liste_courte",
    stage_reached: 6,
    rank: 1,
    score: 60,
    request_lines: ["a", "b", "c"],
    why: "pourquoi",
    contact_status: "email_verifie",
  };

  it("un membre lit la qualification et ses cibles ; un autre espace ne voit rien ; personne n'écrit", async () => {
    await inTx(async (c) => {
      const r = await insertRun(c);
      await insertTarget(c, r.rows[0].id, short);
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: alice.userId, role: "authenticated" }),
      ]);
      await c.query("set local role authenticated");
      expect((await c.query("select * from public.qualified_targets")).rowCount).toBe(1);
      expect((await c.query("select * from public.qualification_runs")).rowCount).toBe(1);
      await c.query("savepoint a");
      await expect(c.query("update public.qualified_targets set rank = 2")).rejects.toThrow(
        /permission denied/,
      );
      await c.query("rollback to savepoint a");
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: bob.userId, role: "authenticated" }),
      ]);
      expect((await c.query("select * from public.qualified_targets")).rowCount).toBe(0);
    });
  });

  it("liste courte : rang, score, trois lignes, pourquoi et contact obligatoires ; exclu = motif obligatoire", async () => {
    await inTx(async (c) => {
      const run = (await insertRun(c)).rows[0].id;
      for (const bad of [
        { ...short, domain: "a1.fr", request_lines: ["a", "b"] },
        { ...short, domain: "a2.fr", contact_status: "introuvable" },
        { ...short, domain: "a3.fr", why: null },
        { domain: "a4.fr", tactics: ["inconnus"], status: "exclu", stage_reached: 1 },
        { domain: "a5.fr", tactics: ["inconnus"], status: "reserve", stage_reached: 4, rank: 3 },
        { domain: "a6.fr", tactics: ["inconnus"], status: "reserve", stage_reached: 7 },
        {
          domain: "a7.fr",
          tactics: ["inconnus"],
          status: "reserve",
          stage_reached: 4,
          site_type: "chaton",
        },
      ]) {
        await c.query("savepoint a");
        await expect(insertTarget(c, run, bad), JSON.stringify(bad)).rejects.toThrow(
          /check|violates/i,
        );
        await c.query("rollback to savepoint a");
      }
      await insertTarget(c, run, {
        domain: "ok.fr",
        tactics: ["inconnus"],
        status: "exclu",
        stage_reached: 1,
        exclusion_reason: "concurrent",
      });
      await c.query("savepoint b");
      await expect(
        insertTarget(c, run, {
          domain: "ok.fr",
          tactics: ["inconnus"],
          status: "reserve",
          stage_reached: 3,
        }),
      ).rejects.toThrow(/unique|duplicate/i);
      await c.query("rollback to savepoint b");
    });
  });

  it("le pire cas annoncé ne peut pas dépasser le budget ; une qualification par audit", async () => {
    await inTx(async (c) => {
      await c.query("savepoint a");
      await expect(insertRun(c, { worst: 0.2, budget: 0.1 })).rejects.toThrow(/check/i);
      await c.query("rollback to savepoint a");
      await insertRun(c);
      await c.query("savepoint b");
      await expect(insertRun(c)).rejects.toThrow(/unique|duplicate/i);
      await c.query("rollback to savepoint b");
    });
  });

  it("domaines déjà contactés : envois réels d'un AUTRE espace seulement, ni simulation, ni le sien ; fermé aux clients", async () => {
    await inTx(async (c) => {
      const b = (
        await c.query(
          "insert into public.batches (plan_id, workspace_id, number) values ($1, $2, 1) returning id",
          [planId, alice.workspaceId],
        )
      ).rows[0].id;
      await c.query(
        "insert into public.batch_items (batch_id, draft_id, plan_id, workspace_id, position) values ($1, $2, $3, $4, 1)",
        [b, draftId, planId, alice.workspaceId],
      );
      await c.query(
        "update public.batches set status = 'valide', validated_at = now(), validated_by = $2 where id = $1",
        [b, alice.userId],
      );
      const send = async (dry: boolean, to: string, mid: string) => {
        const s = await c.query(
          `insert into public.sent_messages (workspace_id, plan_id, batch_id, draft_id, mailbox_id, dry_run, to_email, subject, body, message_id, status)
           values ($1, $2, $3, $4, $5, $6, $7, 's', 'corps', $8, 'en_cours') returning id`,
          [alice.workspaceId, planId, b, draftId, mailboxId, dry, to, mid],
        );
        await c.query(
          `update public.sent_messages set status = $2, sent_at = now() where id = $1`,
          [s.rows[0].id, dry ? "simule" : "envoye"],
        );
      };
      await send(true, "x@simulation.fr", "<1@alice-site.fr>");
      const call = (ws: string) =>
        c.query(
          "select * from public.domains_contacted_elsewhere($1, $2::text[], 90) as d order by 1",
          [ws, ["ecole-voisine.fr", "contact-direct.fr", "simulation.fr", "jamais.fr"]],
        );
      expect((await call(bob.workspaceId)).rows).toEqual([]);
      await send(false, "direction@contact-direct.fr", "<2@alice-site.fr>");
      expect((await call(bob.workspaceId)).rows.map((r) => r.d)).toEqual([
        "contact-direct.fr",
        "ecole-voisine.fr",
      ]);
      expect((await call(alice.workspaceId)).rows).toEqual([]);
      await c.query("savepoint a");
      await c.query("set local role authenticated");
      await expect(call(bob.workspaceId)).rejects.toThrow(/permission denied/);
      await c.query("rollback to savepoint a");
    });
  });
});
