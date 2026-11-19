import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AvailableMailbox, MailboxView } from "./mailbox-section";

type Client = SupabaseClient<Database>;

const COLUMNS =
  "id, email, status, smtp_ok, imap_ok, last_error, smtp_host, health, hourly_cap, daily_cap, send_days, send_window_start, send_window_end, provider";

/**
 * Boîtes d'envoi d'un site : celles qui lui sont rattachées, et celles de l'espace de travail
 * qu'il pourrait réutiliser. Lecture sous RLS (la personne ne voit que son espace).
 */
export async function loadMailboxes(
  supabase: Client,
  siteId: string,
): Promise<{ boxes: MailboxView[]; available: AvailableMailbox[] }> {
  const [{ data: rows }, { data: links }, { data: sites }] = await Promise.all([
    supabase.from("mailboxes").select(COLUMNS).order("created_at"),
    supabase.from("mailbox_sites").select("mailbox_id, site_id"),
    supabase.from("sites").select("id, domain, country"),
  ]);
  const name = new Map(
    (sites ?? []).map((s) => [s.id, s.country ? `${s.domain} · ${s.country}` : s.domain]),
  );
  const sitesOf = (mailboxId: string, except?: string) =>
    (links ?? [])
      .filter((l) => l.mailbox_id === mailboxId && l.site_id !== except)
      .map((l) => name.get(l.site_id))
      .filter((n): n is string => Boolean(n));
  const mine = new Set((links ?? []).filter((l) => l.site_id === siteId).map((l) => l.mailbox_id));
  const boxes: MailboxView[] = (rows ?? [])
    .filter((r) => mine.has(r.id))
    .map((r) => ({
      id: r.id,
      email: r.email,
      status: r.status as MailboxView["status"],
      smtpOk: r.smtp_ok,
      imapOk: r.imap_ok,
      lastError: r.last_error,
      smtpHost: r.smtp_host,
      provider: r.provider,
      health: (r.health as MailboxView["health"]) ?? null,
      hourlyCap: r.hourly_cap,
      dailyCap: r.daily_cap,
      sendDays: r.send_days,
      windowStart: r.send_window_start,
      windowEnd: r.send_window_end,
      otherSites: sitesOf(r.id, siteId),
    }));
  const available: AvailableMailbox[] = (rows ?? [])
    .filter((r) => !mine.has(r.id))
    .map((r) => ({
      id: r.id,
      email: r.email,
      status: r.status as MailboxView["status"],
      sites: sitesOf(r.id),
    }));
  return { boxes, available };
}
