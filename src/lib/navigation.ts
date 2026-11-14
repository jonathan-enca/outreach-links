import {
  ClipboardList,
  Inbox,
  Layers,
  Link2,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/messages";

export type NavKey = "audit" | "plan" | "lots" | "inbox" | "liens" | "garde_fous";

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Les six écrans de navigation de l'application (CLAUDE.md 4.1). */
export const NAV_ITEMS: NavItem[] = [
  { key: "audit", href: "/app/audit", label: t.nav.audit, icon: Search },
  { key: "plan", href: "/app/plan", label: t.nav.plan, icon: ClipboardList },
  { key: "lots", href: "/app/lots", label: t.nav.lots, icon: Layers },
  { key: "inbox", href: "/app/inbox", label: t.nav.inbox, icon: Inbox },
  { key: "liens", href: "/app/liens", label: t.nav.liens, icon: Link2 },
  { key: "garde_fous", href: "/app/garde-fous", label: t.nav.garde_fous, icon: ShieldCheck },
];
