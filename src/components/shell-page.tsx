import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { NAV_ITEMS, type NavKey } from "@/lib/navigation";
import { t } from "@/lib/messages";

/** Page de navigation en coquille : titre, description et état vide, dans l'attente du jalon qui la remplit. */
export function ShellPage({ section }: { section: NavKey }) {
  const copy = t.pages[section];
  const Icon = NAV_ITEMS.find((item) => item.key === section)!.icon;
  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <EmptyState icon={Icon} title={copy.emptyTitle} body={copy.emptyBody} hint={copy.emptyHint} />
    </>
  );
}
