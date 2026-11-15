import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import { profileToFields } from "./form";
import type { StoredBrandProfile } from "./schema";

const areaClass =
  "w-full rounded-control border border-border bg-card px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function Field({
  name,
  label,
  hint,
  value,
  rows,
}: {
  name: string;
  label: string;
  hint: string;
  value: string;
  rows: number;
}) {
  const id = `profile_${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        defaultValue={value}
        className={areaClass}
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}

/**
 * MT.2a : « Pages à faire citer » en cases à cocher. L'accueil est toujours incluse (case figée) ;
 * les autres pages sont celles réellement lues sur le site. Une page décochée reste proposée.
 */
function CitedPages({ brand }: { brand: StoredBrandProfile | null }) {
  const b = t.onboarding.brand;
  const resources = brand?.profile.linkable_resources ?? [];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{b.resources}</legend>
      <label className="flex items-start gap-2">
        <input type="checkbox" checked disabled className="mt-1" aria-describedby="cited-hint" />
        <span>
          {b.homePage} <span className="text-sm text-muted-foreground">{b.homeAlways}</span>
        </span>
      </label>
      {resources.map((r, i) => (
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
          </span>
        </label>
      ))}
      <p id="cited-hint" className="text-sm text-muted-foreground">
        {resources.length > 0 ? b.resourcesHint : b.resourcesNone}
      </p>
    </fieldset>
  );
}

/**
 * Profil de marque (MT.1) en une étape de relecture : tout est modifiable, une zone de texte par
 * rubrique. Les champs sont envoyés avec le reste du formulaire d'onboarding ; une correction
 * crée une nouvelle version côté serveur.
 */
export function BrandFields({ brand }: { brand: StoredBrandProfile | null }) {
  const b = t.onboarding.brand;
  const f = profileToFields(brand?.profile ?? null);
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-xl font-semibold">{b.title}</h2>
        <p className="mt-1 text-muted-foreground">{brand ? b.body : b.empty}</p>
        {brand ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {brand.source === "llm"
              ? b.readSummary(brand.pagesRead.length, brand.version)
              : b.editedSummary(brand.version)}
          </p>
        ) : null}
      </div>
      <Field name="activity" label={b.activity} hint={b.activityHint} value={f.activity} rows={2} />
      <Field name="offer" label={b.offer} hint={b.offerHint} value={f.offer} rows={2} />
      <Field
        name="audience"
        label={b.audience}
        hint={b.audienceHint}
        value={f.audience}
        rows={Math.max(3, brand?.profile.audience.length ?? 3)}
      />
      <Field
        name="personas"
        label={b.personas}
        hint={b.personasHint}
        value={f.personas}
        rows={Math.max(6, (brand?.profile.personas.length ?? 0) * 3)}
      />
      <CitedPages brand={brand} />
      <Field
        name="names"
        label={b.names}
        hint={b.namesHint}
        value={f.names}
        rows={Math.max(3, brand?.profile.name_variants.length ?? 3)}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile_tone" className="text-sm font-medium">
          {b.tone}
        </label>
        <input
          id="profile_tone"
          name="profile_tone"
          defaultValue={f.tone}
          className="h-10 w-full rounded-control border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </div>
      {brand && brand.pagesRead.length > 0 ? (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">{b.pagesRead}</summary>
          <ul className="mt-2 list-disc pl-5">
            {brand.pagesRead.map((p) => (
              <li key={p.url} className="break-all">
                {p.title ? `${p.title} · ` : ""}
                {p.url}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
