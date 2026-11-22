"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import type { ComponentProps } from "react";

/** Lien d'appel à l'essai qui compte le clic (`cta_click`) avant de naviguer. */
export function TrackedCtaLink({
  emplacement,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { emplacement: string }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track("cta_click", { emplacement });
        onClick?.(e);
      }}
    />
  );
}
