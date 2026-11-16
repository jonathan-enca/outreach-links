import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

/**
 * Un step (un appel fournisseur, ses nouvelles tentatives comprises) peut durer plusieurs minutes :
 * Content Analysis a répondu en 46 s pour 3 résultats. Sans cette limite, Vercel coupe le step.
 */
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client: inngest, functions });
