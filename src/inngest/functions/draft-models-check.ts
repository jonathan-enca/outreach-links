import { inngest } from "@/inngest/client";
import type { CataloguePage } from "@/features/drafting/catalogue";
import { DRAFT_LIMITS, DRAFT_MODELS } from "@/features/drafting/limits";
import type { DraftContext, DraftItem, TargetPage } from "@/features/drafting/types";
import { triageTarget, writeMessage } from "@/features/drafting/write";
import { createLlmClientFromEnv, pickProvider } from "@/lib/llm/client";

export const DRAFT_MODELS_CHECK_EVENT = "drafting/models.check";

/**
 * Contrôle des deux modèles de la rédaction sur un exemple fictif : la forme des requêtes change d'une
 * génération de modèles à l'autre (outil forcé et température refusés par les modèles récents), et
 * une requête refusée laisserait toutes les cibles « non rédigées » sans bruit. À déclencher à la main
 * après un changement de modèle (événement `drafting/models.check`). Deux appels, environ un centime ;
 * aucune écriture hors `cost_ledger`, aucun envoi.
 */
const CTX: DraftContext = {
  siteDomain: "exemple-jardin.fr",
  niche: "jardinage",
  siteSummary: "exemple-jardin.fr : guides pratiques de jardinage pour débutants",
  language: "fr",
  offeredAsset: null,
  signatureFirstName: "Camille",
};
const ITEM: DraftItem = {
  id: "controle",
  domain: "blog-potager.example",
  type: "site_non_sollicite",
  expectedLinkType: "editorial",
  offer: null,
  rationale: "",
  targetPageUrl: "https://exemple-jardin.fr/",
  anchorText: "",
  brokenUrl: null,
  channel: "email",
  pageUrl: "https://blog-potager.example/semis-de-tomates",
  pageTitle: "Réussir ses semis de tomates",
  hook: "",
  brief: null,
};
const PAGE: TargetPage = {
  url: ITEM.pageUrl,
  title: "Réussir ses semis de tomates",
  description: "",
  moved: false,
  text: `# Réussir ses semis de tomates

Semez en godets à partir de mars, à 20 °C, puis repiquez quand les plants ont quatre feuilles.

## Et après le repiquage ?

Il faudra ensuite tailler les gourmands. Je n'ai pas encore écrit d'article sur la taille : si vous connaissez un bon guide illustré, dites-le-moi en commentaire, je l'ajouterai ici.`,
};
const CATALOGUE: CataloguePage[] = [
  {
    url: "https://exemple-jardin.fr/guides/tailler-les-tomates",
    title: "Tailler les tomates : le guide illustré",
    description: "Quels gourmands retirer, quand et comment, avec douze photos.",
    text: "Ce guide montre en douze photos quels gourmands retirer sur un plant de tomate, à quel moment de la saison, et les erreurs à éviter sur les variétés à port déterminé.",
  },
  {
    url: "https://exemple-jardin.fr/guides/arroser-le-potager",
    title: "Arroser le potager",
    description: "Fréquence et quantité selon les légumes.",
    text: "Fréquence et quantité d'arrosage selon les légumes.",
  },
];

export const draftModelsCheck = inngest.createFunction(
  { id: "draft-models-check", triggers: [{ event: DRAFT_MODELS_CHECK_EVENT }], retries: 0 },
  async ({ step }) => {
    const anthropic = pickProvider() === "anthropic";
    const client = (model: string, maxCostPerCallUsd: number) =>
      createLlmClientFromEnv({
        ...(anthropic ? { model } : {}),
        budgetUsd: 0.5,
        maxCostPerCallUsd,
      });
    const scope = { workspaceId: null, auditId: null };
    const attempt = async <T>(run: () => Promise<T>) => {
      try {
        return { ok: true as const, ...(await run()) };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message.slice(0, 400) : "erreur",
        };
      }
    };
    const triage = await step.run("tri", () =>
      attempt(async () => {
        const llm = client(DRAFT_MODELS.triage, DRAFT_LIMITS.triageMaxCostPerCallUsd);
        const out = await triageTarget(llm, ITEM, CTX, PAGE, CATALOGUE, scope);
        return { model: llm.model, ...out };
      }),
    );
    const writer = await step.run("redaction", () =>
      attempt(async () => {
        const llm = client(DRAFT_MODELS.writer, DRAFT_LIMITS.writerMaxCostPerCallUsd);
        const out = await writeMessage(
          llm,
          ITEM,
          CTX,
          PAGE,
          CATALOGUE.slice(0, 1),
          { issues: [], avoid: [] },
          scope,
        );
        return { model: llm.model, ...out };
      }),
    );
    return { provider: pickProvider(), triage, writer };
  },
);
