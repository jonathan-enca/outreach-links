import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";

/**
 * Logo PROVISOIRE (docs/da.md) : deux maillons croisés dans un carré arrondi. Le nom vient de
 * `t.app.name` : aucun nom en dur, le logo suit un changement de nom sans refonte.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <g fill="none" stroke="var(--primary-foreground)" strokeWidth="2.6" strokeLinecap="round">
        <rect x="6.5" y="12" width="12" height="8" rx="4" transform="rotate(-35 12.5 16)" />
        <rect x="13.5" y="12" width="12" height="8" rx="4" transform="rotate(-35 19.5 16)" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight">{t.app.name}</span>
    </span>
  );
}
