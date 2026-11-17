"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Largeur de la zone de contenu : 56 rem pour les écrans de lecture, beaucoup plus large pour l'écran des
 * cibles (et la messagerie), dont le tableau a besoin de la largeur de l'écran (retour de Jonathan, 18/11 : les textes se
 * coupaient au bout de six mots).
 */
export function ContentWidth({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "";
  const wide =
    /^\/app\/site\/[^/]+\/cibles\/?$/.test(path) || /^\/app\/(inbox|a-valider)\/?$/.test(path);
  return <div className={`mx-auto ${wide ? "max-w-[96rem]" : "max-w-4xl"}`}>{children}</div>;
}
