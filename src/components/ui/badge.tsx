import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Pastille générique. Pour un statut métier, utiliser `StatusBadge` (un seul système). */
export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        info: "border-info/30 bg-info/10 text-info",
        warning: "border-warning/30 bg-warning/10 text-warning",
        success: "border-success/30 bg-success/10 text-success",
        danger: "border-danger/30 bg-danger/10 text-danger",
        accent: "border-primary/30 bg-primary/10 text-primary",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
