"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CheckSquare,
  ChevronsUpDown,
  CreditCard,
  Home,
  Link2,
  LogOut,
  Mail,
  MessageSquare,
  PenLine,
  Target,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";

const SITE_IN_PATH = /^\/app\/site\/([0-9a-f-]{36})(\/|$)/i;

export interface NavCounts {
  /** Messages, réponses et formulaires qui attendent l'accord de la personne. */
  toValidate: number;
  /** Réponses à traiter. */
  conversations: number;
}

interface Item {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  count?: number;
  /** Présent dans la barre basse du téléphone. */
  mobile?: boolean;
  /** Libellé court pour la barre basse (la place est comptée). */
  short?: string;
}

/**
 * Menu de l'espace client (maquette validée par Jonathan le 18/11) : fond sombre, rangé par groupes
 * (Prospection, Messagerie, Résultats, Réglages), site courant en haut, compte et déconnexion en bas.
 * Téléphone : barre basse avec les cinq écrans principaux.
 */
export function AppNav({
  sites,
  counts = { toValidate: 0, conversations: 0 },
  email = null,
  signOut,
}: {
  sites: { id: string; domain: string }[];
  counts?: NavCounts;
  email?: string | null;
  signOut?: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const n = t.shell.nav;
  const siteId = SITE_IN_PATH.exec(pathname)?.[1] ?? sites[0]?.id ?? null;
  const site = sites.find((s) => s.id === siteId) ?? sites[0] ?? null;
  const settingsHref = site ? `/app/site/${site.id}` : "/app/site";
  const onSettings = /^\/app\/site(\/[0-9a-f-]{36})?\/?$/i.test(pathname);
  const starts = (p: string) => pathname === p || pathname.startsWith(`${p}/`);

  const groups: { title: string | null; items: Item[] }[] = [
    {
      title: null,
      items: [
        {
          key: "home",
          href: "/app",
          label: n.home,
          icon: Home,
          active: pathname === "/app",
          mobile: true,
        },
      ],
    },
    {
      title: n.groups.prospecting,
      items: [
        {
          key: "campagnes",
          href: "/app/campagnes",
          label: n.campaigns,
          icon: Target,
          active:
            starts("/app/campagnes") ||
            starts("/app/demarrer") ||
            starts("/app/audit") ||
            /\/(cibles|analyse|etat-des-lieux)$/.test(pathname),
          mobile: true,
        },
      ],
    },
    {
      title: n.groups.mailbox,
      items: [
        {
          key: "a-valider",
          href: "/app/a-valider",
          label: n.toValidate,
          icon: CheckSquare,
          active: starts("/app/a-valider") || starts("/app/taches"),
          count: counts.toValidate,
          mobile: true,
        },
        {
          key: "conversations",
          href: "/app/inbox",
          label: n.conversations,
          icon: MessageSquare,
          active: starts("/app/inbox"),
          count: counts.conversations,
          mobile: true,
          short: n.short.conversations,
        },
      ],
    },
    {
      title: n.groups.results,
      items: [
        {
          key: "liens",
          href: "/app/liens",
          label: n.links,
          icon: Link2,
          active: starts("/app/liens"),
        },
      ],
    },
    {
      title: n.groups.settings,
      items: [
        {
          key: "boite",
          href: `${settingsHref}#boite-envoi`,
          label: n.mailbox,
          icon: Mail,
          active: false,
        },
        {
          key: "messages",
          href: settingsHref,
          label: n.yourMessages,
          icon: PenLine,
          active: onSettings || starts("/app/garde-fous"),
          mobile: true,
          short: n.short.settings,
        },
        {
          key: "abonnement",
          href: "/app/facturation",
          label: n.billing,
          icon: CreditCard,
          active: starts("/app/facturation"),
        },
      ],
    },
  ];
  const all = groups.flatMap((g) => g.items);
  const initial = (email ?? "?").charAt(0).toUpperCase();

  return (
    <nav
      aria-label={t.nav.label}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-t-0"
    >
      {/* Téléphone : barre basse */}
      <ul className="flex justify-around md:hidden">
        {all
          .filter((i) => i.mobile)
          .map(({ key, href, label, short, icon: Icon, active, count }) => (
            <li key={key} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium",
                  active ? "text-white" : "text-sidebar-foreground/80",
                )}
              >
                <Icon aria-hidden className="size-5" />
                <span className="max-w-full truncate">{short ?? label}</span>
                {count ? (
                  <span className="absolute right-[18%] top-1 rounded-full bg-sidebar-accent px-1.5 text-[10px] font-bold text-sidebar">
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
      </ul>

      {/* Ordinateur : menu latéral */}
      <div className="hidden min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3 md:flex">
        <Link href="/app" className="px-2 pb-3 pt-1 font-display text-lg font-semibold text-white">
          {t.app.name}
        </Link>
        {site ? (
          <Link
            href="/app/site"
            title={n.changeSite}
            className="mb-2 flex items-center justify-between gap-2 rounded-md border border-sidebar-border px-3 py-2 text-sm font-semibold text-white hover:bg-sidebar-hover"
          >
            <span className="truncate">{site.domain}</span>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 opacity-70" />
          </Link>
        ) : null}
        {groups.map((g) => (
          <div key={g.title ?? "top"} className="flex flex-col gap-0.5">
            {g.title ? (
              <p className="px-2 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-widest text-sidebar-label">
                {g.title}
              </p>
            ) : null}
            {g.items.map(({ key, href, label, icon: Icon, active, count }) => (
              <Link
                key={key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                  active ? "bg-sidebar-active font-semibold text-white" : "hover:bg-sidebar-hover",
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {count ? (
                  <span className="rounded-full bg-sidebar-accent px-2 text-[11px] font-bold text-sidebar">
                    {count}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Compte et déconnexion, en bas à gauche */}
      <div className="relative hidden border-t border-sidebar-border p-3 md:block">
        {menu && signOut ? (
          <form
            action={signOut}
            className="absolute inset-x-3 bottom-full mb-1 rounded-card border border-border bg-card p-1.5 shadow-lg"
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
            >
              <LogOut aria-hidden className="size-4" />
              {t.auth.signOut}
            </button>
          </form>
        ) : null}
        <button
          type="button"
          aria-expanded={menu}
          onClick={() => setMenu((v) => !v)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-semibold text-white hover:bg-sidebar-hover"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate">{email ?? n.account}</span>
          <ChevronsUpDown aria-hidden className="size-4 shrink-0 opacity-70" />
        </button>
      </div>
    </nav>
  );
}
