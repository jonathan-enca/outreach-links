import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon aria-hidden className="size-6" />
      </span>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-muted-foreground">{body}</p>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
