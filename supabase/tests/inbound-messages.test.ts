import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M4.4 : messages entrants, signaux de réponse et suppression automatique des rebonds. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `inbound_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function inTx<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query("set local role service_role");
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

describe.skipIf(!adminUrl)("réponses entrantes : contraintes en base", () => {
  let workspaceId: string;
  let userId: string;
  let planId: string;
  let siteId: string;
  const drafts: string[] = [];
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
    const u = await db.query(
      "insert into auth.users (email) values ('a@example.com') returning id",
    );
    userId = u.rows[0].id;
    workspaceId = (
      await db.query("select workspace_id from public.memberships where user_id = $1", [userId])
    ).rows[0].workspace_id;
    siteId = (
      await db.query(
        "insert into public.sites (workspace_id, domain) values ($1, 'alice-site.fr') returning id",
        [workspaceId],
      )
    ).rows[0].id;
    const a = await db.query(
      `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
       values ($1, $2, array['q'], 3, 0.25) returning id`,
      [workspaceId, siteId],
    );
    const item = (d: string) => ({
      type: "annuaire",
      source_domain: d,
      target_page_url: "https://alice-site.fr/",
      anchor_kind: "marque",
      anchor_text: "Alice",
      expected_link_type: "editorial",
      rationale: "test",
      priority: "haute",
      priority_score: 80,
    });
    const p = await db.query("select * from public.create_link_plan($1, $2, $3::jsonb)", [
      a.rows[0].id,
      userId,
      JSON.stringify(["a", "b", "c", "d", "e"].map((x) => item(`${x}.fr`))),
    ]);
    planId = p.rows[0].plan_id;
    const items = (
      await db.query("select id from public.link_plan_items where plan_id = $1 order by position", [
        planId,
      ])
    ).rows.map((r) => r.id as string);
    for (const itemId of items) {
      drafts.push(
        (
          await db.query(
            `insert into public.target_drafts
               (plan_item_id, plan_id, workspace_id, channel, subject, body, hook, targeting_reason,
                proposed_url, url_status, ready)
             values ($1, $2, $3, 'email', 's', 'corps', 'h', 'r', 'https://alice-site.fr/', 200, true)
             returning id`,
            [itemId, planId, workspaceId],
          )
        ).rows[0].id,
      );
    }
    mailboxId = (
      await db.query(
        `insert into public.mailboxes (workspace_id, site_id, email, from_name, username, password_enc,
           key_version, smtp_host, smtp_port, imap_host, imap_port, status, smtp_ok, imap_ok, hourly_cap)
         values ($1, $2, 'jo@alice-site.fr', 'Jo', 'jo', 'v1.x.y.z', 'v1', 'smtp.alice-site.fr', 587,
           'imap.alice-site.fr', 993, 'verifiee', true, true, 2) returning id`,
        [workspaceId, siteId],
      )
    ).rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  /** Lot validé avec les `n` premiers brouillons (dans la transaction du test). */
  async function validatedBatch(c: Client, n: number) {
    const b = (
      await c.query(
        "insert into public.batches (plan_id, workspace_id, number) values ($1, $2, 1) returning id",
        [planId, workspaceId],
      )
    ).rows[0].id as string;
    for (let i = 0; i < n; i++) {
      await c.query(
        `insert into public.batch_items (batch_id, draft_id, plan_id, workspace_id, position)
         values ($1, $2, $3, $4, $5)`,
        [b, drafts[i], planId, workspaceId, i + 1],
      );
    }
    await c.query(
      "update public.batches set status = 'valide', validated_at = now(), validated_by = $2 where id = $1",
      [b, userId],
    );
    return b;
  }

  let seq = 0;
  const claim = (
    c: Client,
    o: {
      batch: string;
      draft: string;
      to?: string;
      dry?: boolean;
      mailbox?: string | null;
      status?: string;
      claimedAt?: string;
      step?: string;
    },
  ) =>
    c.query(
      `insert into public.sent_messages (workspace_id, plan_id, batch_id, draft_id, mailbox_id, dry_run,
         to_email, subject, body, message_id, status, skip_reason, claimed_at, step)
       values ($1, $2, $3, $4, $5, $6, $7, 's', 'corps', $8, $9, $10, coalesce($11::timestamptz, now()), $12)
       returning id`,
      [
        workspaceId,
        planId,
        o.batch,
        o.draft,
        o.mailbox === undefined ? mailboxId : o.mailbox,
        o.dry ?? true,
        o.to ?? "contact@cible.fr",
        `<m${++seq}@alice-site.fr>`,
        o.status ?? "en_cours",
        o.status === "ignore" ? "test" : null,
        o.claimedAt ?? null,
        o.step ?? "initial",
      ],
    );

  async function initialSent(c: Client, to = "contact@cible.fr") {
    const b = await validatedBatch(c, 1);
    const r = await claim(c, { batch: b, draft: drafts[0]!, to, dry: false });
    return { id: r.rows[0].id as string };
  }
  const inbound = (c: Client, sent: string, mid: string, kind = "reponse") =>
    c.query(
      `insert into public.inbound_messages (workspace_id, mailbox_id, sent_message_id, message_id, kind,
         match_method, received_at, body_excerpt)
       values ($1, $2, $3, $4, $5, 'en_tete', now(), 'texte') returning id`,
      [workspaceId, mailboxId, sent, mid, kind],
    );

  it("un message entrant n'est enregistré qu'une fois par boîte (idempotence)", async () => {
    await inTx(async (c) => {
      const s = await initialSent(c);
      await inbound(c, s.id, "<r1@cible.fr>");
      await c.query("savepoint a");
      await expect(inbound(c, s.id, "<r1@cible.fr>")).rejects.toThrow(/unique|duplicate/i);
      await c.query("rollback to savepoint a");
    });
  });

  it("types et tailles contraints : catégorie inconnue et extrait trop long refusés", async () => {
    await inTx(async (c) => {
      const s = await initialSent(c);
      await c.query("savepoint a");
      await expect(inbound(c, s.id, "<r2@cible.fr>", "chaud")).rejects.toThrow(/check/i);
      await c.query("rollback to savepoint a");
      await expect(
        c.query(
          `insert into public.inbound_messages (workspace_id, mailbox_id, sent_message_id, message_id,
             kind, match_method, received_at, body_excerpt)
           values ($1, $2, $3, '<r3@x.fr>', 'reponse', 'en_tete', now(), repeat('x', 4001))`,
          [workspaceId, mailboxId, s.id],
        ),
      ).rejects.toThrow(/check/i);
    });
  });

  it("un rebond met l'adresse en suppression, dans le workspace seulement", async () => {
    await inTx(async (c) => {
      const s = await initialSent(c, "Contact@Cible.fr".toLowerCase());
      await c.query(
        "insert into public.reply_signals (workspace_id, sent_message_id, kind) values ($1, $2, 'rebond')",
        [workspaceId, s.id],
      );
      const sup = await c.query(
        "select workspace_id, email, reason from public.suppressions where email = 'contact@cible.fr'",
      );
      expect(sup.rows).toEqual([
        { workspace_id: workspaceId, email: "contact@cible.fr", reason: "rebond" },
      ]);
    });
  });

  it("une réponse ne met pas l'adresse en suppression ; un rebond déjà supprimé ne casse rien", async () => {
    await inTx(async (c) => {
      const s = await initialSent(c);
      await c.query(
        "insert into public.reply_signals (workspace_id, sent_message_id, kind) values ($1, $2, 'reponse')",
        [workspaceId, s.id],
      );
      expect(
        (await c.query("select 1 from public.suppressions where email = 'contact@cible.fr'"))
          .rowCount,
      ).toBe(0);
      await c.query(
        "insert into public.suppressions (workspace_id, email, reason) values ($1, 'contact@cible.fr', 'ne_pas_contacter')",
        [workspaceId],
      );
      await c.query(
        "insert into public.reply_signals (workspace_id, sent_message_id, kind) values ($1, $2, 'rebond')",
        [workspaceId, s.id],
      );
      expect(
        (await c.query("select 1 from public.suppressions where email = 'contact@cible.fr'"))
          .rowCount,
      ).toBe(1);
    });
  });

  it("le rebond empêche ensuite tout nouvel envoi à cette adresse (garde-fou de suppression)", async () => {
    await inTx(async (c) => {
      const b = await validatedBatch(c, 2);
      const first = await claim(c, {
        batch: b,
        draft: drafts[0]!,
        to: "contact@cible.fr",
        dry: false,
      });
      await c.query(
        "insert into public.reply_signals (workspace_id, sent_message_id, kind) values ($1, $2, 'rebond')",
        [workspaceId, first.rows[0].id],
      );
      await c.query("savepoint a");
      await expect(
        claim(c, { batch: b, draft: drafts[1]!, to: "contact@cible.fr" }),
      ).rejects.toThrow(/suppression/i);
      await c.query("rollback to savepoint a");
    });
  });

  it("droits : un membre lit ses messages entrants, ne peut ni écrire ni lire ceux des autres", async () => {
    await db.query("begin");
    try {
      await db.query("set local role service_role");
      const s = await initialSent(db);
      await inbound(db, s.id, "<r9@cible.fr>");
      await db.query("reset role");
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated" }),
      ]);
      expect((await db.query("select 1 from public.inbound_messages")).rowCount).toBe(1);
      await db.query("savepoint a");
      await expect(inbound(db, s.id, "<r10@cible.fr>")).rejects.toThrow(/permission/i);
      await db.query("rollback to savepoint a");
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: "00000000-0000-4000-8000-000000000009", role: "authenticated" }),
      ]);
      expect((await db.query("select 1 from public.inbound_messages")).rowCount).toBe(0);
    } finally {
      await db.query("rollback");
    }
  });
});
