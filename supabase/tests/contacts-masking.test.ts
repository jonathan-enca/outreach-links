import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * MO.2 : masquage en base. Un espace sans `contacts_visible` ne lit AUCUNE adresse ni AUCUN lien de
 * formulaire avec le jeton de l'utilisateur ; au-delà de `readable_drafts` messages, seuls l'objet
 * et la première phrase sortent. Un abonné lit les mêmes champs en entier.
 */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `masking_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

type Who = { userId: string; workspaceId: string; planId: string; itemIds: string[] };

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

const EMAIL = (n: number) => `contact${n}@editeur${n}.fr`;
const FORM = (n: number) => `https://editeur${n}.fr/contact`;
const BODY = (n: number) =>
  `Bonjour Marie,\n\nVotre page ${n} m'a plu. Voici ma proposition complète.\n\nCordialement`;

async function setup(email: string, domain: string): Promise<Who> {
  const u = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
  const userId = u.rows[0].id as string;
  const m = await db.query("select workspace_id from public.memberships where user_id = $1", [
    userId,
  ]);
  const workspaceId = m.rows[0].workspace_id as string;
  const s = await db.query(
    "insert into public.sites (workspace_id, domain) values ($1, $2) returning id",
    [workspaceId, domain],
  );
  const a = await db.query(
    `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
     values ($1, $2, array['coloriage'], 3, 0.25) returning id`,
    [workspaceId, s.rows[0].id],
  );
  const items = JSON.stringify(
    [1, 2, 3, 4, 5].map((n) => ({
      type: "annuaire",
      source_domain: `editeur${n}.fr`,
      target_page_url: `https://${domain}/`,
      anchor_kind: "marque",
      anchor_text: "Marque",
      expected_link_type: "editorial",
      rationale: "test",
      priority: "haute",
      priority_score: 90 - n,
    })),
  );
  const p = await db.query("select * from public.create_link_plan($1, $2, $3::jsonb)", [
    a.rows[0].id,
    userId,
    items,
  ]);
  const planId = p.rows[0].plan_id as string;
  const itemIds = (
    await db.query("select id from public.link_plan_items where plan_id = $1 order by position", [
      planId,
    ])
  ).rows.map((r) => r.id as string);
  // Contacts : 4 emails vérifiés, 1 formulaire ; un brouillon par cible ; une tâche manuelle.
  for (let i = 0; i < 5; i++) {
    const n = i + 1;
    if (n < 5) {
      await db.query(
        `insert into public.target_contacts (plan_item_id, plan_id, workspace_id, status, email, verification, sendable, contact_url, reason)
         values ($1, $2, $3, 'email_verifie', $4, 'valide', true, $5, 'ok')`,
        [itemIds[i], planId, workspaceId, EMAIL(n), FORM(n)],
      );
    } else {
      await db.query(
        `insert into public.target_contacts (plan_item_id, plan_id, workspace_id, status, form_url, reason)
         values ($1, $2, $3, 'formulaire', $4, 'ok')`,
        [itemIds[i], planId, workspaceId, FORM(n)],
      );
      await db.query(
        `insert into public.manual_tasks (plan_item_id, plan_id, workspace_id, form_url, message)
         values ($1, $2, $3, $4, 'Message à copier')`,
        [itemIds[i], planId, workspaceId, FORM(n)],
      );
    }
    await db.query(
      `insert into public.target_drafts (plan_item_id, plan_id, workspace_id, channel, subject, body, hook, targeting_reason, proposed_url)
       values ($1, $2, $3, $4, 'Objet', $5, 'h', 'r', $6)`,
      [
        itemIds[i],
        planId,
        workspaceId,
        n < 5 ? "email" : "formulaire",
        BODY(n),
        `https://${domain}/`,
      ],
    );
  }
  // Cible qualifiée (liste courte du parcours) : FK désactivées, seule la table nous intéresse.
  await db.query("set session_replication_role = replica");
  await db.query(
    `insert into public.qualified_targets
       (run_id, audit_id, workspace_id, domain, tactics, status, stage_reached, contact_status, contact_email, contact_url, form_url, sendable, rank, score, request_lines, why)
     values (gen_random_uuid(), $1, $2, 'editeur1.fr', array['inconnus'], 'liste_courte', 6, 'email_verifie', $3, $4, $5, true, 1, 80, array['a','b','c'], 'pourquoi')`,
    [a.rows[0].id, workspaceId, EMAIL(1), FORM(1), FORM(9)],
  );
  await db.query("set session_replication_role = origin");
  return { userId, workspaceId, planId, itemIds };
}

const sqlText = (rows: unknown) => JSON.stringify(rows);

describe.skipIf(!adminUrl)("MO.2 : masquage des contacts et des messages", () => {
  let free: Who;
  let paid: Who;

  const setBeta = (on: boolean) =>
    db.query("update public.app_flags set enabled = $1 where key = 'beta_mode'", [on]);

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
    free = await setup("gratuit@example.com", "gratuit-site.fr");
    paid = await setup("abonne@example.com", "abonne-site.fr");
    await db.query(
      "insert into public.subscriptions (workspace_id, plan, status) values ($1, 'starter', 'active')",
      [paid.workspaceId],
    );
    await setBeta(false);
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("gratuit : aucune adresse ni lien de formulaire ne sort, ni par les vues ni par les tables", async () => {
    await asRole("authenticated", free.userId, async (c) => {
      const contacts = (
        await c.query("select * from public.target_contacts_v order by plan_item_id")
      ).rows;
      expect(contacts).toHaveLength(5);
      expect(
        contacts.every((r) => r.email === null && r.form_url === null && r.contact_url === null),
      ).toBe(true);
      expect(contacts.every((r) => r.masked === true)).toBe(true);
      // L'état reste lisible et compté : 4 emails vérifiés, 1 formulaire.
      expect(contacts.filter((r) => r.status === "email_verifie")).toHaveLength(4);
      expect(contacts.filter((r) => r.status === "formulaire")).toHaveLength(1);
      const tasks = (await c.query("select * from public.manual_tasks_v")).rows;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].form_url).toBeNull();
      expect(tasks[0].message).toBeNull();
      expect(tasks[0].masked).toBe(true);
      // Aucune adresse ni lien dans AUCUNE vue lisible.
      const q = (await c.query("select * from public.qualified_targets_v")).rows;
      expect(q).toHaveLength(1);
      expect(q[0].contact_email).toBeNull();
      expect(q[0].form_url).toBeNull();
      expect(q[0].contact_url).toBeNull();
      expect(q[0].contact_status).toBe("email_verifie");
      expect(q[0].contact_masked).toBe(true);
      const all = sqlText([
        contacts,
        tasks,
        q,
        (await c.query("select * from public.target_drafts_v")).rows,
      ]);
      expect(all).not.toMatch(/@editeur|editeur\d\.fr\/contact/);
    });
  });

  it("gratuit : les tables elles-mêmes ne sont plus lisibles avec le jeton de l'utilisateur", async () => {
    for (const t of ["target_contacts", "manual_tasks", "target_drafts", "qualified_targets"]) {
      await asRole("authenticated", free.userId, async (c) => {
        await expect(c.query(`select * from public.${t}`)).rejects.toThrow(/permission denied/);
      });
    }
  });

  it("gratuit : 3 messages lisibles (les mieux classés, toujours les mêmes), les autres entrouverts", async () => {
    const read = () =>
      asRole("authenticated", free.userId, async (c) => {
        const r = await c.query(
          `select d.body, d.subject, d.locked, i.position
             from public.target_drafts_v d join public.link_plan_items i on i.id = d.plan_item_id
            order by i.position`,
        );
        return r.rows;
      });
    const first = await read();
    expect(first.map((r) => r.locked)).toEqual([false, false, false, true, true]);
    expect(first[0].body).toBe(BODY(1));
    expect(first[2].body).toBe(BODY(3));
    expect(first[3].body).toBe("Votre page 4 m'a plu.");
    expect(first[4].subject).toBe("Objet");
    expect(first[4].body).not.toMatch(/proposition complète|Cordialement/);
    // Stable d'une visite à l'autre.
    expect(await read()).toEqual(first);
    // Le corps complet reste en base, côté serveur.
    await asRole("service_role", null, async (c) => {
      const r = await c.query(
        "select body from public.target_drafts where workspace_id = $1 and body = $2",
        [free.workspaceId, BODY(5)],
      );
      expect(r.rows).toHaveLength(1);
    });
  });

  it("abonné : les mêmes champs sont lisibles en entier", async () => {
    await asRole("authenticated", paid.userId, async (c) => {
      const contacts = (
        await c.query("select * from public.target_contacts_v order by email nulls last")
      ).rows;
      expect(contacts.map((r) => r.email).filter(Boolean)).toEqual([1, 2, 3, 4].map(EMAIL));
      expect(contacts.every((r) => r.masked === false)).toBe(true);
      expect(contacts.find((r) => r.status === "formulaire").form_url).toBe(FORM(5));
      const tasks = (await c.query("select * from public.manual_tasks_v")).rows;
      expect(tasks[0].form_url).toBe(FORM(5));
      expect(tasks[0].message).toBe("Message à copier");
      const drafts = (
        await c.query("select body, locked from public.target_drafts_v order by body")
      ).rows;
      expect(drafts).toHaveLength(5);
      expect(drafts.every((r) => r.locked === false && /Cordialement/.test(r.body))).toBe(true);
      const q = (await c.query("select * from public.qualified_targets_v")).rows;
      expect(q[0].contact_email).toBe(EMAIL(1));
      expect(q[0].contact_masked).toBe(false);
    });
  });

  it("bêta : tout inscrit a les droits Starter, rien n'est masqué", async () => {
    await setBeta(true);
    try {
      await asRole("authenticated", free.userId, async (c) => {
        const contacts = (
          await c.query("select email from public.target_contacts_v where email is not null")
        ).rows;
        expect(contacts).toHaveLength(4);
        const drafts = (await c.query("select locked from public.target_drafts_v")).rows;
        expect(drafts.every((r) => r.locked === false)).toBe(true);
      });
    } finally {
      await setBeta(false);
    }
  });

  it("un utilisateur ne lit jamais les lignes d'un autre espace, ni par les vues", async () => {
    await asRole("authenticated", free.userId, async (c) => {
      const r = await c.query(
        "select count(*)::int as n from public.target_contacts_v where workspace_id = $1",
        [paid.workspaceId],
      );
      expect(r.rows[0].n).toBe(0);
    });
  });

  it("le serveur lit les vues en clair, sans filtre d'espace", async () => {
    await asRole("service_role", null, async (c) => {
      const r = await c.query(
        "select email, masked from public.target_contacts_v where email is not null",
      );
      expect(r.rows).toHaveLength(8);
      expect(r.rows.every((x) => x.masked === false)).toBe(true);
      const d = await c.query("select locked from public.target_drafts_v");
      expect(d.rows.every((x) => x.locked === false)).toBe(true);
    });
  });

  it("le serveur (service_role) lit toujours les adresses en clair : l'envoi n'est pas touché", async () => {
    await asRole("service_role", null, async (c) => {
      const r = await c.query(
        "select email from public.target_contacts where workspace_id = $1 and email is not null",
        [free.workspaceId],
      );
      expect(r.rows).toHaveLength(4);
    });
  });
});
