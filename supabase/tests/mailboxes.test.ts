import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M4.1 : boîte d'envoi, secret non lisible par l'utilisateur, RLS. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `mailboxes_test_${process.pid}_${Date.now()}`;
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

describe.skipIf(!adminUrl)("boîtes d'envoi : secret et RLS", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let siteId: string;

  const insert = (c: Client, over: Record<string, unknown> = {}) => {
    const v = {
      email: "jo@alice-site.fr",
      status: "en_attente",
      smtp_ok: null,
      imap_ok: null,
      smtp_port: 587,
      ...over,
    };
    return c.query(
      `insert into public.mailboxes (workspace_id, site_id, email, from_name, username, password_enc,
         key_version, smtp_host, smtp_port, imap_host, imap_port, status, smtp_ok, imap_ok)
       values ($1, $2, $3, 'Jo', 'jo', 'v1.x.y.z', 'v1', 'smtp.alice-site.fr', $4, 'imap.alice-site.fr', 993, $5, $6, $7)
       returning id`,
      [alice.workspaceId, siteId, v.email, v.smtp_port, v.status, v.smtp_ok, v.imap_ok],
    );
  };

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
    siteId = s.rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("le serveur crée une boîte ; l'utilisateur connecté ne peut pas insérer", async () => {
    await asRole("service_role", null, (c) => insert(c));
    await expect(asRole("authenticated", alice.userId, (c) => insert(c))).rejects.toThrow();
  });

  it("le membre lit sa boîte mais jamais le mot de passe chiffré", async () => {
    await insert(db, { email: "a@alice-site.fr" });
    const ok = await asRole("authenticated", alice.userId, (c) =>
      c.query("select email, status from public.mailboxes"),
    );
    expect(ok.rows.length).toBeGreaterThan(0);
    await expect(
      asRole("authenticated", alice.userId, (c) =>
        c.query("select password_enc from public.mailboxes"),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole("authenticated", alice.userId, (c) => c.query("select * from public.mailboxes")),
    ).rejects.toThrow(/permission denied/);
  });

  it("un autre workspace ne voit rien", async () => {
    await insert(db, { email: "c@alice-site.fr" });
    const r = await asRole("authenticated", bob.userId, (c) =>
      c.query("select id from public.mailboxes"),
    );
    expect(r.rows).toHaveLength(0);
  });

  it("« verifiee » exige SMTP et IMAP réussis ; ports hors liste refusés ; email unique", async () => {
    await expect(
      asRole("service_role", null, (c) => insert(c, { status: "verifiee", smtp_ok: true })),
    ).rejects.toThrow(/mailboxes_verified_needs_tests/);
    await asRole("service_role", null, (c) =>
      insert(c, { email: "v@alice-site.fr", status: "verifiee", smtp_ok: true, imap_ok: true }),
    );
    await expect(
      asRole("service_role", null, (c) => insert(c, { email: "p@alice-site.fr", smtp_port: 22 })),
    ).rejects.toThrow(/smtp_port/);
    await expect(
      asRole("service_role", null, async (c) => {
        await insert(c, { email: "d@alice-site.fr" });
        await insert(c, { email: "d@alice-site.fr" });
      }),
    ).rejects.toThrow(/mailboxes_workspace_email_uq/);
  });
});
