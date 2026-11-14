import { Badge } from "@/components/ui/badge";
import { STATUS_TONES, statusLabel, type StatusKey } from "@/lib/statuses";

/** Unique composant d'affichage d'un statut, partout dans l'application. */
export function StatusBadge({ status, className }: { status: StatusKey; className?: string }) {
  return (
    <Badge tone={STATUS_TONES[status]} className={className} data-status={status}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </Badge>
  );
}
