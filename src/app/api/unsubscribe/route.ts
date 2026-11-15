import { env } from "@/env";
import { parseKeyRing } from "@/features/mailboxes/crypto";
import { verifyUnsubscribeTokenWithRing } from "@/features/sending/message";
import { createServiceClient } from "@/lib/supabase/service";

/** Désinscription : lien du message (List-Unsubscribe). Jeton signé ; ajoute l'adresse aux suppressions. */
async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token) return false;
  let id: string | null;
  try {
    id = verifyUnsubscribeTokenWithRing(token, parseKeyRing(env.MAILBOX_ENCRYPTION_KEYS));
  } catch {
    return false;
  }
  if (!id) return false;
  const db = createServiceClient();
  const { data } = await db
    .from("sent_messages")
    .select("workspace_id, to_email")
    .eq("id", id)
    .maybeSingle();
  if (!data) return false;
  // 23505 (déjà désinscrit) est sans conséquence : l'adresse est bien en suppression.
  await db
    .from("suppressions")
    .insert({ workspace_id: data.workspace_id, email: data.to_email, reason: "desinscription" });
  await db.from("events").insert({
    workspace_id: data.workspace_id,
    type: "send.unsubscribed",
    payload: { sent_message_id: id },
  });
  return true;
}

const page = (body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Désinscription</title><body style="font-family:sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem">${body}</body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  // Pas d'effet par simple GET (les antivirus et aperçus de mail suivent les liens) : confirmation.
  return page(
    `<p>Confirmez-vous ne plus vouloir recevoir de message de cet expéditeur ?</p>
<form method="post" action="/api/unsubscribe?t=${encodeURIComponent(t)}"><button>Me désinscrire</button></form>`,
  );
}

export async function POST(req: Request) {
  const ok = await unsubscribe(new URL(req.url).searchParams.get("t"));
  return ok
    ? page("<p>C'est fait : vous ne recevrez plus de message.</p>")
    : page("<p>Lien invalide ou expiré.</p>", 400);
}
