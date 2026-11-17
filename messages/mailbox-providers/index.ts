import type { ProviderGuide } from "../mailbox-guides";
import { autre } from "./autre";
import { grandPublic } from "./grand-public";
import { hebergeurs } from "./hebergeurs";
import { operateurs } from "./operateurs";
import { autresPros, suites } from "./pro";

/** Tous les fournisseurs, dans l'ordre d'affichage de chaque famille. */
export const mailboxProviders: readonly ProviderGuide[] = [
  ...grandPublic,
  ...operateurs,
  ...suites,
  ...hebergeurs,
  ...autresPros,
  ...autre,
];
