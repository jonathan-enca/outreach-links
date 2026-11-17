"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { t } from "@/lib/messages";
import { inSettings, SETTINGS_HOME } from "./settings-links";

/** Téléphone seulement : sur une page de réglages, un lien pour revenir à la liste (il n'y a pas de menu latéral). */
export function MobileBack() {
  const pathname = usePathname();
  if (pathname === SETTINGS_HOME || !inSettings(pathname)) return null;
  return (
    <Link
      href={SETTINGS_HOME}
      className="-mt-2 mb-3 inline-flex items-center gap-1 rounded-control py-1 text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
    >
      <ChevronLeft aria-hidden className="size-4" />
      {t.shell.settingsHub.back}
    </Link>
  );
}
