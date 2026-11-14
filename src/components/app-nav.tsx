"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/navigation";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";

/** Barre latérale sur écran large, barre basse sur mobile. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={t.nav.label}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card md:static md:w-56 md:shrink-0 md:border-t-0 md:border-r md:bg-transparent"
    >
      <ul className="flex justify-around md:flex-col md:gap-1 md:p-3">
        {NAV_ITEMS.map(({ key, href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={key} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium md:flex-row md:gap-3 md:rounded-md md:px-3 md:py-2 md:text-sm",
                  active
                    ? "text-primary md:bg-primary/10"
                    : "text-muted-foreground hover:text-foreground md:hover:bg-muted",
                )}
              >
                <Icon aria-hidden className="size-5 md:size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
