import { Play } from "lucide-react";
import { t } from "@/lib/messages";
import { PRODUCT_TOUR_VIDEO } from "./sections";

/**
 * Fenêtre « visite du produit » du hero. Le format 16:9 est réservé dès maintenant : quand la vidéo existera,
 * renseigner `PRODUCT_TOUR_VIDEO` (sections.ts) suffit, la mise en page ne bouge pas.
 */
export function ProductTour() {
  const tour = t.home.tour;
  return (
    <figure className="mx-auto mt-12 w-full max-w-4xl overflow-hidden rounded-panel border border-border bg-card shadow-float">
      <div
        className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5"
        aria-hidden="true"
      >
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="mx-auto text-xs text-muted-foreground">{tour.title}</span>
      </div>
      <div className="aspect-video bg-muted/60">
        {PRODUCT_TOUR_VIDEO ? (
          <video
            className="size-full object-cover"
            src={PRODUCT_TOUR_VIDEO.src}
            poster={PRODUCT_TOUR_VIDEO.poster}
            controls
            muted
            loop
            playsInline
            preload="none"
            aria-label={tour.videoLabel}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Play aria-hidden className="size-6" />
            </span>
            <p className="font-semibold">{tour.pending}</p>
            <p className="text-sm text-muted-foreground">{tour.pendingHint}</p>
          </div>
        )}
      </div>
    </figure>
  );
}
