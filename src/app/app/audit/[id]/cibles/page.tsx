import { notFound, redirect } from "next/navigation";
import { siteHref, UUID_RE } from "@/features/shell/next-step";
import { createClient } from "@/lib/supabase/server";

/** MU.2 : ancienne adresse par audit, renvoyée vers « Vos cibles » du site. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("audits").select("site_id").eq("id", id).maybeSingle();
  if (!data) notFound();
  redirect(siteHref.cibles(data.site_id));
}
