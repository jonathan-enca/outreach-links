"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MARKET_COUNTRIES } from "@/features/sites/market";
import { siteHref } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import type { StartState } from "./service";

const inputClass =
  "h-12 w-full rounded-control border border-border bg-card px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[invalid=true]:border-danger";
const selectClass =
  "h-12 w-full rounded-control border border-border bg-card px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

type Phase = "idle" | "home" | "pages" | "done";

/**
 * L'étape 1 : adresse, pays, langue et objectif sur le même écran. Après l'envoi, jamais de bouton muet :
 * la liste des étapes de lecture se coche en direct (phase 1 = accueil, phase 2 = plan du site, pages
 * et profil, deux appels serveur distincts), avec la durée estimée.
 */
export function UrlForm({
  startAction,
  understandAction,
  defaultUrl = "",
  defaultCountry = "FR",
}: {
  startAction: (formData: FormData) => Promise<StartState>;
  understandAction: (siteId: string) => Promise<StartState>;
  defaultUrl?: string;
  defaultCountry?: string;
}) {
  const o = t.onboarding;
  const m = o.market;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ theme: string; language: string } | null>(null);
  const [, startTransition] = useTransition();
  const busy = phase !== "idle" && phase !== "done";

  const submit = (formData: FormData) => {
    setError(null);
    setPhase("home");
    startTransition(async () => {
      const first = await startAction(formData);
      if (first.status !== "ok" || !first.siteId) {
        setPhase("idle");
        setError(first.message ?? o.messages.saveError);
        return;
      }
      if (first.auditId) {
        router.push(siteHref.analyse(first.siteId));
        return;
      }
      setInfo({ theme: first.theme ?? "", language: first.language ?? "fr" });
      setPhase("pages");
      if (first.needsProfile) await understandAction(first.siteId);
      setPhase("done");
      router.push(siteHref.relecture(first.siteId));
    });
  };

  const rows: {
    key: Phase | "profile";
    label: string;
    detail?: string;
    state: "wait" | "run" | "ok";
  }[] = [
    {
      key: "home",
      label: o.reading.home,
      detail: info ? o.reading.homeDetail(info.language, info.theme) : undefined,
      state: phase === "home" ? "run" : "ok",
    },
    {
      key: "pages",
      label: o.reading.pages,
      state: phase === "home" ? "wait" : phase === "pages" ? "run" : "ok",
    },
    {
      key: "profile",
      label: o.reading.profile,
      state: phase === "done" ? "ok" : "wait",
    },
  ];

  return (
    <form action={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="url" className="text-sm font-medium">
          {o.urlLabel}
        </label>
        <input
          id="url"
          name="url"
          required
          defaultValue={defaultUrl}
          autoFocus
          autoComplete="url"
          inputMode="url"
          placeholder={o.urlPlaceholder}
          className={inputClass}
          aria-invalid={error !== null}
          aria-describedby={error ? "url-error" : "url-hint"}
          disabled={busy}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="country" className="text-sm font-medium">
            {m.country}
          </label>
          <select
            id="country"
            name="country"
            defaultValue={defaultCountry}
            className={selectClass}
            disabled={busy}
          >
            {MARKET_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {t.sites.countries[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="language" className="text-sm font-medium">
            {m.language}
          </label>
          <select
            id="language"
            name="language"
            defaultValue="auto"
            className={selectClass}
            disabled={busy}
          >
            <option value="auto">{m.languageAuto}</option>
            <option value="fr">{t.sites.languages.fr}</option>
            <option value="en">{t.sites.languages.en}</option>
          </select>
        </div>
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">{m.countryHint}</p>
      <fieldset className="flex flex-col gap-2" disabled={busy}>
        <legend className="text-sm font-medium">{m.goalLegend}</legend>
        {(
          [
            ["autorite_generale", m.goalAuthority, m.goalAuthorityBody],
            ["mots_cles", m.goalPages, m.goalPagesBody],
          ] as const
        ).map(([value, label, body], i) => (
          <label
            key={value}
            className="flex cursor-pointer items-start gap-3 rounded-control border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-muted"
          >
            <input
              type="radio"
              name="goal"
              value={value}
              defaultChecked={i === 0}
              className="mt-1"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{label}</span>
              <span className="text-sm text-muted-foreground">{body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <Button type="submit" disabled={busy} className="h-12 px-6 text-base">
          {busy ? o.submitting : o.submit}
        </Button>
      </div>
      <p id="url-hint" className="text-sm text-muted-foreground">
        {m.campaignNote}
      </p>
      {error ? (
        <p id="url-error" role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {busy || phase === "done" ? (
        <div
          className="rounded-control border border-border bg-muted/40 p-4"
          role="status"
          aria-live="polite"
        >
          <p className="font-medium">{o.reading.title}</p>
          <p className="text-sm text-muted-foreground">{o.reading.estimate}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.key} data-reading={r.key} data-state={r.state} className="flex gap-2">
                {r.state === "ok" ? (
                  <Check aria-hidden className="mt-0.5 size-4 text-success" />
                ) : r.state === "run" ? (
                  <Loader2
                    aria-hidden
                    className="mt-0.5 size-4 text-primary motion-safe:animate-spin"
                  />
                ) : (
                  <Circle aria-hidden className="mt-0.5 size-4 text-muted-foreground/50" />
                )}
                <span className="flex flex-col">
                  <span className={r.state === "wait" ? "text-muted-foreground" : ""}>
                    {r.label}
                  </span>
                  {r.detail && r.state === "ok" ? (
                    <span className="text-sm text-muted-foreground">{r.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
