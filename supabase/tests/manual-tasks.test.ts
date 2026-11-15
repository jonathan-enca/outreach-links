import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M5.4 : garde-fous en base des tâches manuelles (lot validé, relance J+10, statuts finaux). */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `mtasks_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function asService<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query("set local role service_role");
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

describe.skipIf(!adminUrl)("tâches manuelles : garde-fous en base", () => {
  let workspaceId: string;
  let userId: string;
  let planId: string;
  let itemId: string;
  let draftId: string;
  let taskId: string;

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
      "insert into auth.users (email) values ('alice@example.com') returning id",
    );
    userId = u.rows[0].id;
    workspaceId = (
      await db.query("select workspace_id from public.memberships where user_id = $1", [userId])
    ).rows[0].workspace_id;
    const s = await db.query(
      "insert into public.sites (workspace_id, domain) values ($1, 'alice-site.fr') returning id",
      [workspaceId],
    );
    const a = await db.query(
      `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
       values ($1, $2, array['coloriage'], 3, 0.25) returning id`,
      [workspaceId, s.rows[0].id],
    );
    const items = JSON.stringify([
      {
        type: "annuaire",
        source_domain: "mairie.fr",
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
      userId,
      items,
    ]);
    planId = p.rows[0].plan_id;
    itemId = (await db.query("select id from public.link_plan_items where plan_id = $1", [planId]))
      .rows[0].id;
    draftId = (
      await db.query(
        `insert into public.target_drafts
           (plan_item_id, plan_id, workspace_id, channel, body, hook, targeting_reason,
            proposed_url, url_status, ready, lint_issues)
         values ($1, $2, $3, 'formulaire', 'corps', 'h', 'r', 'https://alice-site.fr/', 200, true, '[]')
         returning id`,
        [itemId, planId, workspaceId],
      )
    ).rows[0].id;
    taskId = (
      await db.query(
        `insert into public.manual_tasks (plan_item_id, plan_id, workspace_id, form_url)
         values ($1, $2, $3, 'https://mairie.fr/contact') returning id`,
        [itemId, planId, workspaceId],
      )
    ).rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  const markDone = (c: Client) =>
    c.query(
      `update public.manual_tasks
         set status = 'fait', done_at = now(), follow_up_status = 'en_attente',
             follow_up_due_at = now() + interval '10 days'
       where id = $1`,
      [taskId],
    );
  const validateBatch = async (c: Client) => {
    const b = await c.query(
      "insert into public.batches (plan_id, workspace_id, number) values ($1, $2, 1) returning id",
      [planId, workspaceId],
    );
    await c.query(
      `insert into public.batch_items (batch_id, draft_id, plan_id, workspace_id, position)
       values ($1, $2, $3, $4, 1)`,
      [b.rows[0].id, draftId, planId, workspaceId],
    );
    await c.query(
      "update public.batches set status = 'valide', validated_at = now(), validated_by = $2 where id = $1",
      [b.rows[0].id, userId],
    );
  };

  it("une tâche ne peut pas être faite avant la validation du lot", async () => {
    await asService(async (c) => {
      await expect(markDone(c)).rejects.toThrow(/lot n'est pas validé/);
    });
  });

  it("une tâche faite lance une relance en attente ; incohérences refusées", async () => {
    await db.query("begin");
    try {
      await validateBatch(db);
      await db.query("set local role service_role");
      await markDone(db);
      const r = await db.query(
        "select status, follow_up_status from public.manual_tasks where id = $1",
        [taskId],
      );
      expect(r.rows[0]).toEqual({ status: "fait", follow_up_status: "en_attente" });
      // statut final : ne revient pas à « à faire »
      await db.query("savepoint s1");
      await expect(
        db.query(
          "update public.manual_tasks set status = 'a_faire', done_at = null where id = $1",
          [taskId],
        ),
      ).rejects.toThrow(/statut final/);
      await db.query("rollback to savepoint s1");
      // relance trop tôt
      await expect(
        db.query(
          `update public.manual_tasks set follow_up_status = 'fait', follow_up_done_at = now()
           where id = $1`,
          [taskId],
        ),
      ).rejects.toThrow(/trop tôt/);
      await db.query("rollback to savepoint s1");
      // relance due : acceptée, puis figée
      await db.query("update public.manual_tasks set follow_up_due_at = now() - interval '1 hour'");
      await db.query(
        `update public.manual_tasks set follow_up_status = 'fait', follow_up_done_at = now()
         where id = $1`,
        [taskId],
      );
      await db.query("savepoint s2");
      await expect(
        db.query(
          `update public.manual_tasks set follow_up_status = 'annulee',
             follow_up_cancel_reason = 'reponse', follow_up_done_at = null where id = $1`,
          [taskId],
        ),
      ).rejects.toThrow(/statut final/);
    } finally {
      await db.query("rollback");
    }
  });

  it("une relance annulée exige un motif ; une tâche « ignorée » n'a pas de relance", async () => {
    await db.query("begin");
    try {
      await validateBatch(db);
      await db.query("set local role service_role");
      await markDone(db);
      await db.query("savepoint s1");
      await expect(
        db.query("update public.manual_tasks set follow_up_status = 'annulee' where id = $1", [
          taskId,
        ]),
      ).rejects.toThrow(/cancel_consistent/);
      await db.query("rollback to savepoint s1");
      await db.query(
        `update public.manual_tasks set follow_up_status = 'annulee',
           follow_up_cancel_reason = 'reponse' where id = $1`,
        [taskId],
      );
    } finally {
      await db.query("rollback");
    }
    await asService(async (c) => {
      await expect(
        c.query(
          "update public.manual_tasks set status = 'ignoree', follow_up_status = 'en_attente', follow_up_due_at = now() where id = $1",
          [taskId],
        ),
      ).rejects.toThrow(/follow_up_needs_done/);
    });
  });

  it("une nouvelle tâche est toujours « à faire »", async () => {
    await asService(async (c) => {
      await expect(
        c.query(
          `insert into public.manual_tasks (plan_item_id, plan_id, workspace_id, form_url, status)
           select id, plan_id, workspace_id, 'https://x.fr', 'ignoree' from public.link_plan_items`,
        ),
      ).rejects.toThrow();
    });
  });
});
