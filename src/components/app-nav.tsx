"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Inbox, Link2, MessageSquare, Target, User } from "lucide-react";
import { siteHref } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";

const SITE_IN_PATH = /^\/app\/site\/([0-9a-f-]{36})\//i;
const ACCOUNT_PREFIXES = ["/app/compte", "/app/garde-fous", "/app/taches", "/app/facturation"];

const itemClass =
  "flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium md:flex-row md:gap-3 md:rounded-md md:px-3 md:py-2 md:text-sm";

/**
 * Menu réduit à ce qui sert maintenant (MU.2) : Accueil, Cibles, État des lieux, Compte. Les écrans
 * qui viennent après le premier lot sont grisés (bureau seulement). Barre basse sur mobile.
 * Le site courant est celui de l'adresse, sinon le premier.
 */
export function AppNav({ sites }: { sites: { id: string; domain: string }[] }) {
  const pathname = usePathname();
  const siteId = SITE_IN_PATH.exec(pathname)?.[1] ?? sites[0]?.id ?? null;
  const n = t.shell.nav;

  const isAccount =
    ACCOUNT_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === "/app/site";
  const items = [
    {
      key: "home",
      href: "/app",
      label: n.home,
      icon: Home,
      active:
        !isAccount &&
        (pathname === "/app" ||
          pathname.startsWith("/app/demarrer") ||
          /\/analyse$/.test(pathname) ||
          pathname.startsWith("/app/audit")),
    },
    {
      key: "cibles",
      href: siteId ? siteHref.cibles(siteId) : null,
      label: n.targets,
      icon: Target,
      active: /\/cibles$/.test(pathname),
    },
    {
      key: "etat",
      href: siteId ? siteHref.etatDesLieux(siteId) : null,
      label: n.overview,
      icon: BarChart3,
      active: /\/etat-des-lieux$/.test(pathname),
    },
    { key: "compte", href: "/app/compte", label: n.account, icon: User, active: isAccount },
  ];
  const locked = [
    { key: "messages", label: n.messages, icon: MessageSquare },
    { key: "reponses", label: n.replies, icon: Inbox },
    { key: "liens", label: n.links, icon: Link2 },
  ];

  return (
    <nav
      aria-label={t.nav.label}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card md:static md:w-56 md:shrink-0 md:border-t-0 md:border-r md:bg-transparent"
    >
      <ul className="flex justify-around md:flex-col md:gap-1 md:p-3">
        {items.map(({ key, href, label, icon: Icon, active }) => (
          <li key={key} className="flex-1 md:flex-none">
            {href ? (
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  itemClass,
                  active
                    ? "text-primary md:bg-primary/10"
                    : "text-muted-foreground hover:text-foreground md:hover:bg-muted",
                )}
              >
                <Icon aria-hidden className="size-5 md:size-4" />
                {label}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                title={n.needSite}
                className={cn(itemClass, "cursor-not-allowed text-muted-foreground/50")}
              >
                <Icon aria-hidden className="size-5 md:size-4" />
                {label}
              </span>
            )}
          </li>
        ))}
        {locked.map(({ key, label, icon: Icon }) => (
          <li key={key} className="hidden md:block">
            <span
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-1.5 text-sm text-muted-foreground/60"
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              <span className="flex flex-col leading-tight">
                {label}
                <span className="text-[11px]">{n.lockedHint}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
