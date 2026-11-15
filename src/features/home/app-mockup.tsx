import { Badge, type BadgeTone } from "@/components/ui/badge";
import { LogoMark } from "@/components/brand/logo";
import { t } from "@/lib/messages";

interface Row {
  domain: string;
  type: string;
  hookBefore?: string;
  hook?: string;
  hookAfter?: string;
  retained?: boolean;
  reason?: string;
  tone?: BadgeTone;
}

/**
 * Maquette de l'application (DA : la capture est l'illustration). HTML/CSS, données de démonstration, fenêtre claire.
 * Décorative : masquée aux lecteurs d'écran, la légende dit qu'il s'agit d'une démonstration.
 */
export function AppMockup() {
  const m = t.home.mockup;
  return (
    <figure className="text-foreground">
      <div
        aria-hidden="true"
        className="light-window overflow-hidden rounded-panel border border-border bg-white text-[13px] text-[#0e1a2b] shadow-float [--border:#e3e8ef] [--muted:#f1f5f9] [--muted-foreground:#5b6678]"
      >
        <div className="grid md:grid-cols-[190px_1fr]">
          <div className="hidden border-r border-border bg-[#f5f8fa] p-3 md:block">
            <div className="mb-4 flex items-center gap-2 px-2 font-bold">
              <LogoMark className="size-5" />
              {t.app.name}
            </div>
            {m.sidebar.map((item) => (
              <div
                key={item}
                className={`flex justify-between rounded-md px-2.5 py-1.5 ${item === m.activeItem ? "bg-white font-semibold shadow-[0_0_0_1px_#e3e8ef]" : "text-[#5b6678]"}`}
              >
                {item}
                {item === "Inbox" ? (
                  <b className="rounded-full bg-[#047857] px-1.5 text-[11px] text-white">
                    {m.inboxCount}
                  </b>
                ) : null}
              </div>
            ))}
          </div>
          <div className="min-w-0 p-4 sm:p-5">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">{m.batchTitle}</h3>
                <p className="text-xs text-[#5b6678]">{m.batchMeta}</p>
              </div>
              <span className="rounded-md bg-[#047857] px-3 py-1.5 text-xs font-semibold text-white">
                {m.validate}
              </span>
            </div>
            <div className="mb-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {m.stats.map((s) => (
                <div key={s.label} className="rounded-[10px] border border-border px-3 py-2">
                  <p className="text-[11px] text-[#5b6678]">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] border-collapse text-left">
                <thead>
                  <tr>
                    {m.columns.map((c) => (
                      <th
                        key={c}
                        className="border-b border-border px-1.5 py-2 font-medium text-[#5b6678]"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(m.rows as readonly Row[]).map((r) => (
                    <tr key={r.domain}>
                      <td className="border-b border-border px-1.5 py-2.5 font-medium">
                        {r.domain}
                      </td>
                      <td className="border-b border-border px-1.5 py-2.5">{r.type}</td>
                      <td className="border-b border-border px-1.5 py-2.5">
                        {r.hookBefore ? (
                          <>
                            {r.hookBefore}
                            <span className="mark-hook">{r.hook}</span>
                            {r.hookAfter}
                          </>
                        ) : r.retained ? (
                          r.hook
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="border-b border-border px-1.5 py-2.5">
                        <Badge tone={r.retained ? "success" : (r.tone ?? "neutral")}>
                          {r.retained ? m.retainedLabel : r.reason}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground">
        {m.caption}
      </figcaption>
    </figure>
  );
}
