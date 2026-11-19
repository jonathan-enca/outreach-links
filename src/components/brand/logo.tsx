import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";

/**
 * Logo PROVISOIRE (charte validée) : deux maillons croisés, le premier en marine, le second en ciel,
 * dans un carré arrondi. Le nom vient de `t.app.name` : aucun nom en dur.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <g
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(4 4)"
      >
        <path d="M9 17H7A5 5 0 0 1 7 7h2M8 12h8" stroke="var(--primary-foreground)" />
        <path d="M15 7h2a5 5 0 1 1 0 10h-2" stroke="var(--sidebar-accent)" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-lg font-bold tracking-tight">{t.app.name}</span>
    </span>
  );
}
