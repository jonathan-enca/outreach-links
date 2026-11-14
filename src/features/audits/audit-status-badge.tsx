import { Badge, type BadgeTone } from "@/components/ui/badge";
import { t } from "@/lib/messages";
import { AUDIT_STATUSES, type AuditStatus } from "./plans";

const TONES: Record<AuditStatus, BadgeTone> = {
  en_attente: "neutral",
  estime: "info",
  confirme: "info",
  en_cours: "warning",
  termine: "success",
  echoue: "danger",
};

function isAuditStatus(v: string): v is AuditStatus {
  return (AUDIT_STATUSES as readonly string[]).includes(v);
}

export function AuditStatusBadge({ status }: { status: string }) {
  if (!isAuditStatus(status)) return <Badge>{status}</Badge>;
  return <Badge tone={TONES[status]}>{t.audits.status[status]}</Badge>;
}
