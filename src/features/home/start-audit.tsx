import { AuditForm } from "@/features/public-audit/audit-form";
import { t } from "@/lib/messages";
import { ProductTour } from "./product-tour";

/** Audit gratuit sans inscription (ancre `#audit`) : le champ « votre site » et la visite du produit. */
export function StartAudit() {
  const s = t.home.startAudit;
  return (
    <section
      id="audit"
      aria-labelledby="audit-titre"
      className="scroll-mt-20 bg-hero-wash px-4 py-16 text-center sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <h2 id="audit-titre" className="mx-auto max-w-[24ch] text-3xl font-bold sm:text-4xl">
          {s.title}
        </h2>
        <p className="mx-auto mb-8 mt-4 max-w-[56ch] text-lg text-muted-foreground">{s.lead}</p>
        <AuditForm variant="hero" />
        <ProductTour />
      </div>
    </section>
  );
}
