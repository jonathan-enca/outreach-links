"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { UnderstoodFacts, YouFacts, citedCount } from "@/features/brand/brand-fields";
import { t } from "@/lib/messages";
import { JourneyTop, Stage, stageAnchor } from "./journey-stage";
import type { LaunchPreview, LaunchState } from "./service";

/** Résumé de l'étape 2 une fois validée : thème, pages proposées, types de sites cherchés. */
function verifySummary(form: HTMLFormElement): string {
  const f = t.onboarding.flow;
  const data = new FormData(form);
  const theme = String(data.get("theme") ?? "").trim();
  const pages = data.getAll("profile_res_on").length;
  let types = 0;
  try {
    const raw: unknown = JSON.parse(String(data.get("profile_publishers") ?? "[]"));
    if (Array.isArray(raw))
      types = raw.filter((x) => (x as { active?: boolean }).active !== false).length;
  } catch {
    types = 0;
  }
  return [
    theme,
    pages <= 1 ? f.summaryHomeOnly : f.summaryPages(pages),
    types > 0 ? f.summaryTypes(types) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Étapes 2 et 3 du parcours en une page (maquette validée le 20/11, `docs/mockups/parcours-campagne-v2.html`) :
 * l'étape 1 est repliée en haut ; « C'est juste, continuer » replie la fiche de l'étape 2 et ouvre
 * l'étape 3, puis « Lancer l'analyse » envoie tout en une fois. Les deux étapes partagent un seul
 * formulaire : la fiche repliée reste dans la page et part avec lui. Le coût affiché est renvoyé au
 * serveur, qui refuse de lancer si le coût recalculé le dépasse.
 */
export function LaunchPanel({
  preview,
  action,
  saveAction,
  siteSummary,
  editSiteHref,
  emailEnabled = false,
}: {
  preview: LaunchPreview;
  /** Vrai quand l'email « vos cibles sont prêtes » peut réellement partir (clé Resend posée). */
  emailEnabled?: boolean;
  action: (prev: LaunchState, formData: FormData) => Promise<LaunchState>;
  /** Utilisée tant qu'aucune recherche n'est connue : enregistre, puis l'écran affiche le coût. */
  saveAction: (prev: LaunchState, formData: FormData) => Promise<LaunchState>;
  /** Ligne de résumé de l'étape 1 (adresse, pays, objectif, Search Console). */
  siteSummary: string;
  /** « Modifier » de l'étape 1 : le formulaire de l'étape 1, rempli. */
  editSiteHref: string;
}) {
  const f = t.onboarding.flow;
  const r = t.onboarding.review;
  const needsInput = preview.queries.length === 0;
  const [state, formAction, pending] = useActionState(needsInput ? saveAction : action, {
    status: "idle",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [stage, setStage] = useState<2 | 3>(2);
  const [summary, setSummary] = useState("");
  const [stageError, setStageError] = useState<string | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    // Pas au premier affichage : l'adresse (#etape-2) s'en charge.
    if (!moved.current) return;
    document
      .getElementById(stageAnchor(stage))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage]);

  const go = (next: 2 | 3) => {
    moved.current = true;
    setStage(next);
  };

  const confirmVerify = () => {
    const form = formRef.current;
    if (!form) return;
    const theme = form.elements.namedItem("theme");
    if (theme instanceof HTMLInputElement && !theme.checkValidity()) {
      setStageError(t.onboarding.messages.themeInvalid);
      return;
    }
    setStageError(null);
    setSummary(verifySummary(form));
    go(3);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <JourneyTop current={stage} />
      <form ref={formRef} action={formAction} noValidate>
        <div className="flex flex-col gap-3.5">
          <Stage n={1} state="done" summary={siteSummary} editHref={editSiteHref} />
          <Stage
            n={2}
            state={stage === 2 ? "current" : "done"}
            summary={
              summary ||
              [
                preview.theme,
                citedCount(preview.brand, preview.domain) <= 1
                  ? f.summaryHomeOnly
                  : f.summaryPages(citedCount(preview.brand, preview.domain)),
              ]
                .filter(Boolean)
                .join(" · ")
            }
            onEdit={() => go(2)}
            keepMounted
          >
            <p className="text-[15px] text-muted-foreground">
              {needsInput ? r.emptyDeduction : f.verifyIntro}
            </p>
            <UnderstoodFacts
              brand={preview.brand}
              domain={preview.domain}
              theme={preview.theme}
              pagesGoal={preview.goal === "mots_cles"}
            />
            <input type="hidden" name="goal" value={preview.goal} />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={confirmVerify}
                className="h-12 w-full px-6 text-base sm:w-auto sm:self-start"
              >
                {f.continue}
              </Button>
              {stageError ? (
                <p role="alert" className="text-sm text-danger">
                  {stageError}
                </p>
              ) : null}
            </div>
          </Stage>
          <Stage n={3} state={stage === 3 ? "current" : "todo"} keepMounted>
            <YouFacts brand={preview.brand} />
            <div className="flex flex-col gap-1.5 rounded-[10px] border border-border bg-background p-4">
              <p className="font-semibold">{f.launchTitle}</p>
              <p className="text-sm text-muted-foreground">
                {emailEnabled ? f.launchWithEmail : f.launchNoEmail}
              </p>
              {needsInput ? null : (
                <input type="hidden" name="acceptedUsd" value={preview.totalUsd} />
              )}
              <div className="mt-2">
                <Button
                  type="submit"
                  disabled={pending}
                  className="h-12 w-full px-6 text-base sm:w-auto"
                >
                  {needsInput ? r.seeCost : pending ? r.launching : r.launch}
                </Button>
              </div>
              {state.status === "error" && state.message ? (
                <p role="alert" className="text-sm text-danger">
                  {state.message}
                </p>
              ) : null}
            </div>
          </Stage>
          <Stage n={4} state="todo" />
        </div>
      </form>
    </div>
  );
}
