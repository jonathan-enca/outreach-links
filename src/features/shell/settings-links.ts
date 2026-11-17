import { t } from "@/lib/messages";

/** Pages qui se rangent sous « Réglages » : l'onglet du téléphone leur sert de porte d'entrée. */
export const SETTINGS_HOME = "/app/reglages";
const FAMILY = [
  "/app/reglages",
  "/app/compte",
  "/app/facturation",
  "/app/garde-fous",
  "/app/taches",
  "/app/site",
] as const;

/** Vrai pour le hub lui-même ou l'une des pages qu'il propose. */
export function inSettings(pathname: string): boolean {
  return FAMILY.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Les pages que le hub propose, rangées par groupe. Une seule liste : le menu du téléphone la lit. */
export function settingsGroups() {
  const s = t.shell.settingsHub;
  return [
    {
      title: s.groups.sending,
      links: [
        { href: "/app/reglages/boite", ...s.links.mailbox },
        { href: "/app/reglages/messages", ...s.links.messages },
        { href: "/app/reglages/notifications", ...s.links.notifications },
        { href: "/app/garde-fous", ...s.links.safeguards },
      ],
    },
    {
      title: s.groups.follow,
      links: [
        { href: "/app/liens", ...s.links.links },
        { href: "/app/taches", ...s.links.tasks },
      ],
    },
    {
      title: s.groups.account,
      links: [
        { href: "/app/site", ...s.links.sites },
        { href: "/app/facturation", ...s.links.billing },
      ],
    },
  ];
}
