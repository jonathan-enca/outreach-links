import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M4.2 : garde-fous d'envoi en base (lot validé, suppression, boîte, plafonds, idempotence). */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `sent_test_${process.pid}_${Date.now()}`;
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

describe.skipIf(!adminUrl)("envois : garde-fous en base", () => {
  let workspaceId: string;
  let userId: string;
  let planId: string;
  let siteId: string;
  let drafts: string[] = [];
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

  it("accepte un envoi d'un lot validé, puis le termine ; un envoi terminé ne change plus", async () => {
    await inTx(async (c) => {
      const b = await validatedBatch(c, 1);
      const r = await claim(c, { batch: b, draft: drafts[0]! });
      await c.query(
        "update public.sent_messages set status = 'simule', sent_at = now() where id = $1",
        [r.rows[0].id],
      );
      await expect(
        c.query("update public.sent_messages set status = 'en_cours' where id = $1", [
          r.rows[0].id,
        ]),
      ).rejects.toThrow(/terminé/);
    });
  });

  it("refuse tout envoi dont le lot n'est pas validé", async () => {
    await inTx(async (c) => {
      const b = (
        await c.query(
          "insert into public.batches (plan_id, workspace_id, number) values ($1, $2, 1) returning id",
          [planId, workspaceId],
        )
      ).rows[0].id as string;
      await expect(claim(c, { batch: b, draft: drafts[0]! })).rejects.toThrow(
        /lot n'est pas validé/,
      );
    });
  });

  it("refuse une adresse ou un domaine en liste de suppression (global ou de l'espace)", async () => {
    await inTx(async (c) => {
      const b = await validatedBatch(c, 3);
      await c.query("insert into public.suppressions (workspace_id, email) values ($1, $2)", [
        workspaceId,
        "stop@cible.fr",
      ]);
      await c.query("insert into public.suppressions (workspace_id, domain) values (null, $1)", [
        "bloque.org",
      ]);
      await c.query("savepoint s");
      await expect(
        claim(c, { batch: b, draft: drafts[0]!, to: "STOP@cible.fr".toLowerCase() }),
      ).rejects.toThrow(/suppression/);
      await c.query("rollback to savepoint s");
      await expect(claim(c, { batch: b, draft: drafts[1]!, to: "x@bloque.org" })).rejects.toThrow(
        /suppression/,
      );
      await c.query("rollback to savepoint s");
      await expect(
        claim(c, { batch: b, draft: drafts[1]!, to: "x@sous.bloque.org" }),
      ).rejects.toThrow(/suppression/);
      await c.query("rollback to savepoint s");
      // Un autre destinataire passe ; un « ignore » (motif de saut) est toujours enregistrable.
      await claim(c, { batch: b, draft: drafts[2]!, to: "ok@cible.fr" });
    });
  });

  it("refuse une boîte non vérifiée, suspendue ou absente", async () => {
    await inTx(async (c) => {
      const b = await validatedBatch(c, 1);
      await c.query("update public.mailboxes set status = 'suspendue' where id = $1", [mailboxId]);
      await c.query("savepoint s");
      await expect(claim(c, { batch: b, draft: drafts[0]! })).rejects.toThrow(/non vérifiée/);
      await c.query("rollback to savepoint s");
      await expect(claim(c, { batch: b, draft: drafts[0]!, mailbox: null })).rejects.toThrow(
        /aucune boîte/,
      );
    });
  });

  it("plafond horaire : jamais plus que hourly_cap par heure (mode réel et simulation séparés)", async () => {
    await inTx(async (c) => {
      const b = await validatedBatch(c, 4);
      await claim(c, { batch: b, draft: drafts[0]!, dry: false });
      await claim(c, { batch: b, draft: drafts[1]!, dry: false });
      await c.query("savepoint s");
      await expect(claim(c, { batch: b, draft: drafts[2]!, dry: false })).rejects.toThrow(
        /plafond horaire/,
      );
      await c.query("rollback to savepoint s");
      // Les simulations ont leur propre compteur.
      await claim(c, { batch: b, draft: drafts[2]!, dry: true });
    });
  });

  it("l'heure suivante repart ; plafond journalier appliqué sur 24 h", async () => {
    await inTx(async (c) => {
      await c.query("update public.mailboxes set daily_cap = 3 where id = $1", [mailboxId]);
      const b = await validatedBatch(c, 5);
      await claim(c, {
        batch: b,
        draft: drafts[0]!,
        dry: false,
        claimedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
      });
      await claim(c, {
        batch: b,
        draft: drafts[1]!,
        dry: false,
        claimedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
      });
      await claim(c, { batch: b, draft: drafts[2]!, dry: false });
      await c.query("savepoint s");
      await expect(claim(c, { batch: b, draft: drafts[3]!, dry: false })).rejects.toThrow(
        /plafond journalier/,
      );
      await c.query("rollback to savepoint s");
      // Un envoi vieux de plus de 24 h ne compte plus.
      await c.query(
        "update public.sent_messages set claimed_at = now() - interval '25 hours' where draft_id = $1",
        [drafts[0]],
      );
      await claim(c, { batch: b, draft: drafts[3]!, dry: false });
    });
  });

  it("idempotence : un brouillon n'est enregistré qu'une fois par étape et par mode", async () => {
    await inTx(async (c) => {
      const b = await validatedBatch(c, 1);
      await claim(c, { batch: b, draft: drafts[0]!, dry: true });
      await c.query("savepoint s");
      await expect(claim(c, { batch: b, draft: drafts[0]!, dry: true })).rejects.toThrow(
        /duplicate key/,
      );
      await c.query("rollback to savepoint s");
      // Mode réel (autre mode) et relance (autre étape) restent possibles.
      await claim(c, { batch: b, draft: drafts[0]!, dry: false });
      await claim(c, { batch: b, draft: drafts[0]!, dry: false, step: "relance" });
    });
  });

  it("un envoi ne démarre que « en_cours » (ou « ignore »)", async () => {
    await inTx(async (c) => {
      const b = await validatedBatch(c, 2);
      await c.query("savepoint s");
      await expect(claim(c, { batch: b, draft: drafts[0]!, status: "envoye" })).rejects.toThrow(
        /commence par/,
      );
      await c.query("rollback to savepoint s");
      await claim(c, { batch: b, draft: drafts[0]!, status: "ignore" });
    });
  });

  it("RLS : un autre espace ne voit pas les envois, l'utilisateur peut les lire seulement", async () => {
    await db.query("begin");
    try {
      await db.query("set local role service_role");
      const b = await validatedBatch(db, 1);
      await claim(db, { batch: b, draft: drafts[0]! });
      await db.query("reset role");
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated" }),
      ]);
      const mine = await db.query("select count(*)::int as n from public.sent_messages");
      expect(mine.rows[0].n).toBe(1);
      await db.query("savepoint s");
      await expect(db.query("delete from public.sent_messages")).rejects.toThrow(
        /permission denied/,
      );
      await db.query("rollback to savepoint s");
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: "00000000-0000-4000-8000-000000000009", role: "authenticated" }),
      ]);
      const other = await db.query("select count(*)::int as n from public.sent_messages");
      expect(other.rows[0].n).toBe(0);
    } finally {
      await db.query("rollback");
    }
  });
});
