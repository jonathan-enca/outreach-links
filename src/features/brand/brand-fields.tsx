import { FactList } from "@/features/onboarding/journey-stage";
import { FactRow } from "@/features/onboarding/fact-row";
import { t } from "@/lib/messages";
import { profileToFields } from "./form";
import { PublisherTags } from "./publisher-tags";
import { pageKey } from "./rank-pages";
import type { StoredBrandProfile } from "./schema";

const areaClass =
  "w-full rounded-control border border-border bg-card px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const inputClass =
  "h-[42px] w-full rounded-control border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Ligne de texte libre : la valeur en phrase (les lignes jointes par des virgules), le champ dessous. */
function TextFact({
  name,
  label,
  hint,
  value,
  rows,
  inline = false,
}: {
  name: string;
  label: string;
  hint?: string;
  value: string;
  rows: number;
  /** Plusieurs lignes affichées sur une seule, séparées par des virgules. */
  inline?: boolean;
}) {
  const id = `profile_${name}`;
  const shown = inline
    ? value
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .join(", ")
    : value.trim();
  return (
    <FactRow
      field={name}
      label={label}
      value={
        shown || <span className="text-muted-foreground">{t.onboarding.brand.summaryEmpty}</span>
      }
      defaultOpen={!value.trim()}
      editor={
        <>
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <textarea
            id={id}
            name={id}
            rows={rows}
            defaultValue={value}
            className={areaClass}
            aria-describedby={hint ? `${id}-hint` : undefined}
          />
          {hint ? (
            <p id={`${id}-hint`} className="text-sm text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </>
      }
    />
  );
}

/**
 * MT.2a : « Pages à faire citer » en cases à cocher. L'accueil est toujours incluse (case figée) ;
 * les autres pages sont celles réellement lues sur le site. Une page décochée reste proposée.
 * MC.7 : une page déjà positionnée dans Google affiche ses recherches par mois et sa meilleure position.
 */
function CitedPages({ brand, domain }: { brand: StoredBrandProfile | null; domain: string }) {
  const b = t.onboarding.brand;
  const home = `https://${domain}/`;
  const same = (a: string, c: string) => a.replace(/\/+$/, "") === c.replace(/\/+$/, "");
  const resources = brand?.profile.linkable_resources ?? [];
  const searches = new Map((brand?.profile.ranked_pages ?? []).map((p) => [pageKey(p.url), p]));
  const hasSearches = resources.some((r) => searches.has(pageKey(r.url)));
  const homeEntry = resources.find((r) => same(r.url, home));
  const pages = [
    { url: home, title: homeEntry?.title ?? b.homePage, selected: homeEntry?.selected !== false },
    ...resources.filter((r) => !same(r.url, home)),
  ];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{b.resources}</legend>
      {pages.map((r, i) => {
        const found = searches.get(pageKey(r.url));
        return (
          <label key={r.url} className="flex items-start gap-2">
            <input type="hidden" name="profile_res_all" value={`${r.url} | ${r.title}`} />
            <input
              type="checkbox"
              name="profile_res_on"
              value={r.url}
              defaultChecked={r.selected !== false}
              className="mt-1"
              aria-describedby="cited-hint"
              data-testid={`cited-${i}`}
            />
            <span>
              {r.title} <span className="break-all text-sm text-muted-foreground">{r.url}</span>
              {found ? (
                <span
                  className="block text-sm text-muted-foreground"
                  data-testid={`cited-searches-${i}`}
                >
                  {b.pageSearches(found.volume, found.position)}
                </span>
              ) : null}
              {i === 0 ? (
                <span className="block text-sm text-muted-foreground">{b.homeAlways}</span>
              ) : null}
            </span>
          </label>
        );
      })}
      <div className="mt-1 flex flex-col gap-1">
        <label htmlFor="profile_res_add" className="text-sm font-medium">
          {b.addPage}
        </label>
        <input
          id="profile_res_add"
          name="profile_res_add"
          inputMode="url"
          placeholder={`${domain}/ma-page`}
          className="h-10 w-full rounded-control border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <p className="text-sm text-muted-foreground">{b.addPageHint}</p>
      </div>
      <p id="cited-hint" className="text-sm text-muted-foreground">
        {resources.length > 0 ? b.resourcesHint : b.resourcesNone}
        {hasSearches ? ` ${b.rankedHint}` : ""}
      </p>
    </fieldset>
  );
}

/** Les pages cochées au départ (accueil comprise) : pour le résumé de l'étape 2. */
export function citedCount(brand: StoredBrandProfile | null, domain: string): number {
  const home = `https://${domain}/`;
  const same = (a: string, c: string) => a.replace(/\/+$/, "") === c.replace(/\/+$/, "");
  const resources = brand?.profile.linkable_resources ?? [];
  const homeEntry = resources.find((r) => same(r.url, home));
  return (
    (homeEntry?.selected === false ? 0 : 1) +
    resources.filter((r) => !same(r.url, home) && r.selected !== false).length
  );
}

/**
 * Étape 2, « Vérification » (maquette du 20/11) : la fiche de ce que nous avons compris, une ligne par
 * rubrique, « Modifier » pour ouvrir le champ. Les champs fermés partent quand même avec le formulaire ;
 * une correction crée une nouvelle version du profil côté serveur.
 */
export function UnderstoodFacts({
  brand,
  domain,
  theme,
  pagesGoal,
}: {
  brand: StoredBrandProfile | null;
  domain: string;
  theme: string;
  /** Objectif « pages précises » (choisi à l'étape 1) : la liste des pages s'ouvre d'elle-même. */
  pagesGoal: boolean;
}) {
  const b = t.onboarding.brand;
  const f = t.onboarding.flow;
  const v = profileToFields(brand?.profile ?? null);
  const publishers = brand?.profile.publisher_types ?? [];
  const pages = citedCount(brand, domain);
  return (
    <FactList>
      <FactRow
        field="theme"
        label={f.theme}
        value={theme || <span className="text-muted-foreground">{b.summaryEmpty}</span>}
        defaultOpen={!theme}
        editor={
          <>
            <label htmlFor="theme" className="sr-only">
              {f.theme}
            </label>
            <input
              id="theme"
              name="theme"
              required
              minLength={2}
              maxLength={60}
              defaultValue={theme}
              className={inputClass}
              aria-describedby="theme-hint"
            />
            <p id="theme-hint" className="text-sm text-muted-foreground">
              {t.onboarding.review.themeHint}
            </p>
          </>
        }
      />
      <TextFact name="activity" label={f.activity} value={v.activity} rows={2} />
      <TextFact name="offer" label={f.offer} value={v.offer} rows={2} />
      <TextFact
        name="audience"
        label={f.audience}
        hint={f.audienceHint}
        value={v.audience}
        rows={Math.max(3, brand?.profile.audience.length ?? 3)}
        inline
      />
      <FactRow
        field="pages"
        label={f.pages}
        value={pagesGoal ? f.pagesPick : pages <= 1 ? f.pagesHome : f.summaryPages(pages)}
        defaultOpen={pagesGoal}
        toggle={!pagesGoal}
        editor={<CitedPages brand={brand} domain={domain} />}
      />
      <FactRow
        field="publishers"
        label={f.publishers}
        value={
          publishers.length > 0 ? (
            <PublisherTags
              key={brand?.version ?? 0}
              initial={publishers}
              themeTerms={brand?.profile.theme_terms ?? []}
              inline
            />
          ) : (
            <span className="text-muted-foreground">{b.publishers.none}</span>
          )
        }
        hint={publishers.length > 0 ? f.publishersHint : undefined}
        defaultOpen={!v.personas.trim()}
        editor={
          <>
            <label htmlFor="profile_personas" className="text-sm font-medium">
              {b.personas}
            </label>
            <textarea
              id="profile_personas"
              name="profile_personas"
              rows={Math.max(6, (brand?.profile.personas.length ?? 0) * 3)}
              defaultValue={v.personas}
              className={areaClass}
              aria-describedby="profile_personas-hint"
            />
            <p id="profile_personas-hint" className="text-sm text-muted-foreground">
              {b.personasHint}
            </p>
          </>
        }
      />
    </FactList>
  );
}

/** Étape 3, « Vous » : comment s'écrit votre nom et le ton des messages. */
export function YouFacts({ brand }: { brand: StoredBrandProfile | null }) {
  const b = t.onboarding.brand;
  const f = t.onboarding.flow;
  const v = profileToFields(brand?.profile ?? null);
  return (
    <FactList>
      <TextFact
        name="names"
        label={f.name}
        hint={f.nameHint}
        value={v.names}
        rows={Math.max(3, brand?.profile.name_variants.length ?? 3)}
        inline
      />
      <FactRow
        field="tone"
        label={f.tone}
        value={v.tone.trim() || <span className="text-muted-foreground">{b.summaryEmpty}</span>}
        defaultOpen={!v.tone.trim()}
        editor={
          <>
            <label htmlFor="profile_tone" className="sr-only">
              {f.tone}
            </label>
            <input
              id="profile_tone"
              name="profile_tone"
              defaultValue={v.tone}
              className={inputClass}
            />
          </>
        }
      />
    </FactList>
  );
}
