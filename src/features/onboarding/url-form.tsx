"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sortedByLabel } from "@/features/sites/market";
import { siteHref } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import type { SearchConsoleLookup } from "@/features/search-console/actions";
import { stageAnchor } from "./journey-stage";
import type { StartState } from "./service";

const inputClass =
  "h-12 w-full rounded-control border border-border bg-card px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[invalid=true]:border-danger";
const selectClass =
  "h-12 w-full rounded-control border border-border bg-card px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

type Phase = "idle" | "home" | "pages" | "done";

/** Search Console à l'étape 1 : connexion déjà faite pour un site (retour de Google), ou message d'erreur. */
export interface StartSearchConsole {
  connected: { domain: string; property: string; googleEmail: string } | null;
  error?: string;
}

/** Même site ? Comparaison souple de la saisie (schéma, « www. », chemin et casse ignorés). */
const bareDomain = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");

/**
 * L'étape 1 : adresse, pays, langue et objectif sur le même écran. Après l'envoi, jamais de bouton muet :
 * la liste des étapes de lecture se coche en direct (phase 1 = accueil, phase 2 = plan du site, pages
 * et profil, deux appels serveur distincts), avec la durée estimée.
 * Maquette validée le 20/11 (`docs/mockups/demarrer-campagne.html`) : la Search Console se propose ici,
 * juste avant le bouton. Elle se connecte pour un site : l'adresse est demandée d'abord, et une
 * adresse modifiée après coup remet l'encadré à « connecter ».
 */
export function UrlForm({
  startAction,
  understandAction,
  searchConsoleSiteAction,
  searchConsole = null,
  lookupSearchConsole,
  linkSearchConsole,
  defaultUrl = "",
  defaultCountry = "FR",
  defaultLanguage = "auto",
  defaultGoal = "autorite_generale",
}: {
  startAction: (formData: FormData) => Promise<StartState>;
  understandAction: (siteId: string) => Promise<StartState>;
  /** Crée (ou retrouve) la campagne avant de partir chez Google. */
  searchConsoleSiteAction: (formData: FormData) => Promise<StartState>;
  /** null : la Search Console n'est pas proposée (réglage fermé). */
  searchConsole?: StartSearchConsole | null;
  /** L'adresse saisie est-elle dans une Search Console déjà connectée (accueil, autre campagne) ? */
  lookupSearchConsole?: (url: string) => Promise<SearchConsoleLookup>;
  /** Relie la campagne créée à cette Search Console. */
  linkSearchConsole?: (siteId: string) => Promise<boolean>;
  defaultUrl?: string;
  defaultCountry?: string;
  defaultLanguage?: string;
  defaultGoal?: string;
}) {
  const o = t.onboarding;
  const m = o.market;
  const sc = o.searchConsole;
  const [url, setUrl] = useState(defaultUrl);
  const [connecting, setConnecting] = useState(false);
  const [scError, setScError] = useState(searchConsole?.error ?? null);
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ theme: string; language: string } | null>(null);
  const [, startTransition] = useTransition();
  const busy = (phase !== "idle" && phase !== "done") || connecting;
  // Recherche de l'adresse dans la Search Console déjà connectée : `for` = l'adresse cherchée.
  const [lookup, setLookup] = useState<{ for: string; result: SearchConsoleLookup | null } | null>(
    null,
  );
  const lookupSeq = useRef(0);
  const oauthConnected =
    searchConsole?.connected && bareDomain(url) === bareDomain(searchConsole.connected.domain)
      ? searchConsole.connected
      : null;
  const typed = bareDomain(url);
  const current = lookup && lookup.for === typed ? lookup.result : null;
  const checking = Boolean(lookup && lookup.for === typed && lookup.result === null);
  const found = current?.status === "found" ? current : null;
  const missing = current?.status === "missing" ? current : null;
  const connected = oauthConnected
    ? oauthConnected
    : found
      ? { domain: typed, property: found.property, googleEmail: found.email }
      : null;

  useEffect(() => {
    if (!searchConsole || !lookupSearchConsole || oauthConnected) return;
    const domain = bareDomain(url);
    if (!domain.includes(".") || domain.length < 4) return;
    const seq = ++lookupSeq.current;
    const timer = setTimeout(() => {
      setLookup({ for: domain, result: null });
      lookupSearchConsole(domain)
        .then((result) => {
          if (seq === lookupSeq.current) setLookup({ for: domain, result });
        })
        .catch(() => {
          if (seq === lookupSeq.current) setLookup({ for: domain, result: { status: "none" } });
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [url, searchConsole, lookupSearchConsole, oauthConnected]);

  const connect = (form: HTMLFormElement | null) => {
    if (!form) return;
    setError(null);
    setScError(null);
    if (!url.trim()) {
      setError(sc.needUrl);
      form.querySelector<HTMLInputElement>("#url")?.focus();
      return;
    }
    // Lu avant de griser le formulaire : un champ désactivé ne figure pas dans les données.
    const data = new FormData(form);
    setConnecting(true);
    startTransition(async () => {
      const res = await searchConsoleSiteAction(data);
      if (res.status !== "ok" || !res.siteId) {
        setConnecting(false);
        setError(res.message ?? o.messages.saveError);
        return;
      }
      const lang = String(data.get("language") ?? "auto");
      // Navigation complète voulue : cette adresse est une route serveur qui renvoie chez Google.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(
        `/api/google/start?site=${encodeURIComponent(res.siteId)}&purpose=search_console&back=demarrer&lang=${encodeURIComponent(lang)}`,
      );
    });
  };

  const submit = (formData: FormData) => {
    setError(null);
    setScError(null);
    if (!url.trim()) {
      setError(o.messages.emptyUrl);
      return;
    }
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
      await Promise.all([
        first.needsProfile ? understandAction(first.siteId) : null,
        found && linkSearchConsole ? linkSearchConsole(first.siteId).catch(() => false) : null,
      ]);
      setPhase("done");
      // Même mise en page : l'étape 1 se replie et l'étape 2 s'ouvre juste en dessous.
      router.push(`${siteHref.relecture(first.siteId)}#${stageAnchor(2)}`);
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
    <form action={submit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="url" className="text-sm font-medium">
          {o.urlLabel}
        </label>
        <input
          id="url"
          name="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
          autoComplete="url"
          inputMode="url"
          placeholder={o.urlPlaceholder}
          className={inputClass}
          aria-invalid={error !== null}
          aria-describedby={error ? "url-error" : undefined}
          readOnly={busy}
        />
        {error ? (
          <p id="url-error" role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
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
            {sortedByLabel(t.sites.countries).map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
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
            defaultValue={defaultLanguage}
            className={selectClass}
            disabled={busy}
          >
            <option value="auto">{m.languageAuto}</option>
            <option value="en">{t.sites.languages.en}</option>
            <option value="fr">{t.sites.languages.fr}</option>
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
              defaultChecked={value === defaultGoal || (i === 0 && defaultGoal !== "mots_cles")}
              className="mt-1"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{label}</span>
              <span className="text-sm text-muted-foreground">{body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {searchConsole && connected ? (
        <section
          aria-labelledby="sc-done"
          data-search-console="connected"
          className="flex flex-col gap-2.5 rounded-[10px] border border-[#a7dcc6] bg-[#ecfdf5] p-4"
        >
          <h2 id="sc-done" className="flex items-center gap-2 font-semibold">
            <span
              aria-hidden
              className="grid size-[22px] shrink-0 place-items-center rounded-full bg-success text-white"
            >
              <Check className="size-3.5" />
            </span>
            {sc.doneTitle}
          </h2>
          <p className="text-[14.5px]">{sc.doneBody}</p>
          <p className="text-[13px] text-muted-foreground">
            {t.searchConsole.connectedBy(connected.property, connected.googleEmail)}
          </p>
        </section>
      ) : searchConsole && checking ? (
        <p
          role="status"
          data-search-console="checking"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 aria-hidden className="size-4 text-primary motion-safe:animate-spin" />
          {sc.checking}
        </p>
      ) : searchConsole && missing ? (
        <section
          aria-labelledby="sc-miss"
          data-search-console="missing"
          className="flex flex-col gap-2.5 rounded-[10px] border border-[#f5c27a] bg-[#fff8eb] p-4"
        >
          <h2 id="sc-miss" className="font-semibold text-[#8a4b00]">
            {sc.missTitle}
          </h2>
          <p className="text-[14.5px]">{sc.missBody(typed, missing.email)}</p>
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="h-10 w-full bg-card px-4 sm:w-auto"
              onClick={(e) => connect(e.currentTarget.form)}
            >
              {sc.other}
            </Button>
          </div>
          <p className="text-[13px] text-muted-foreground">{sc.without}</p>
        </section>
      ) : searchConsole ? (
        <section
          aria-labelledby="sc-todo"
          data-search-console="todo"
          className="flex flex-col gap-2.5 rounded-[10px] border border-[#bfe3fb] bg-[#e9f6fe] p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="sc-todo" className="font-semibold">
              {sc.title}
            </h2>
            <span className="rounded-full border border-[#bfe3fb] bg-card px-2.5 py-0.5 text-[12.5px] font-medium text-primary">
              {sc.badge}
            </span>
          </div>
          <p className="text-[14.5px]">{sc.body}</p>
          {scError ? (
            <p role="alert" className="text-sm text-danger">
              {scError} {sc.without}
            </p>
          ) : null}
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="h-10 w-full bg-card px-4 sm:w-auto"
              onClick={(e) => connect(e.currentTarget.form)}
            >
              {sc.button}
            </Button>
          </div>
          <p className="text-[13px] text-muted-foreground">{sc.safe}</p>
        </section>
      ) : null}
      <div>
        <Button type="submit" disabled={busy} className="h-12 w-full px-6 text-base sm:w-auto">
          {busy && !connecting ? o.submitting : o.submit}
        </Button>
      </div>
      {(busy && !connecting) || phase === "done" ? (
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
