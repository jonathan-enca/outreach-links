import { redirect } from "next/navigation";
import { START_HREF } from "@/features/shell/next-step";

/** L'ancien onglet « Vos messages » a rejoint la boîte d'envoi : ses anciens liens y mènent. */
export default async function Page(props: { searchParams: Promise<{ site?: string }> }) {
  const { site } = await props.searchParams;
  if (!site) redirect(START_HREF);
  redirect(`/app/reglages/boite?site=${encodeURIComponent(site)}`);
}
