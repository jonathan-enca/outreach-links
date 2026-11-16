/** En-tête de section : libellé, titre et, s'il y en a un, texte à droite (deux colonnes dès le bureau). */
export function SectionHeading({
  id,
  label,
  title,
  intro,
}: {
  id: string;
  label: string;
  title: string;
  intro?: string;
}) {
  return (
    <div className="mb-10">
      <p className="mb-4 border-t border-border pt-4 text-sm font-semibold text-primary">{label}</p>
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-12">
        <h2 id={id} className="text-3xl font-bold leading-tight sm:text-4xl">
          {title}
        </h2>
        {intro ? <p className="text-lg text-muted-foreground">{intro}</p> : null}
      </div>
    </div>
  );
}
