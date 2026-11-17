"use client";

import { useActionState, useState } from "react";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import {
  COUNTERPARTS,
  SIGNATURE_ROLES,
  presentationText,
  signatureLines,
  type Counterpart,
  type SignatureRole,
} from "@/features/signature/signature";
import { t } from "@/lib/messages";

const S = t.settings.yourMessages;
const INPUT =
  "h-11 w-full rounded-control border border-slate-400 bg-card px-3 text-[15px] text-foreground";
const ROW =
  "flex min-h-12 cursor-pointer items-start gap-3 border-t border-border/70 py-3 first:border-t-0";
const BOX = "mt-0.5 size-[18px] shrink-0 accent-primary";

/** Réduit le logo dans le navigateur (96 px de haut au plus) : image légère, jamais de fichier brut. */
async function shrinkLogo(file: File): Promise<string | null> {
  if (!/^image\/(png|jpeg)$/.test(file.type)) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 96 / bitmap.height, 320 / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export interface MessagesFormProps {
  domain: string;
  firstName: string;
  lastName: string;
  role: SignatureRole | null;
  showSite: boolean;
  linkedinUrl: string;
  phone: string;
  logoUrl: string | null;
  counterparts: Counterpart[];
  save: (prev: AuditActionState, fd: FormData) => Promise<AuditActionState>;
}

/** « Vos messages » : qui écrit, la signature, et ce qu'on accepte de proposer. L'aperçu suit la saisie. */
export function MessagesForm(p: MessagesFormProps) {
  const [first, setFirst] = useState(p.firstName);
  const [last, setLast] = useState(p.lastName);
  const [role, setRole] = useState<SignatureRole | null>(p.role);
  const [site, setSite] = useState(p.showSite);
  const [linkedin, setLinkedin] = useState(Boolean(p.linkedinUrl));
  const [linkedinUrl, setLinkedinUrl] = useState(p.linkedinUrl);
  const [phone, setPhone] = useState(Boolean(p.phone));
  const [phoneNumber, setPhoneNumber] = useState(p.phone);
  const [logo, setLogo] = useState(Boolean(p.logoUrl));
  const [logoData, setLogoData] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [given, setGiven] = useState<Counterpart[]>(p.counterparts);
  const [state, action, pending] = useActionState(
    async (prev: AuditActionState, fd: FormData) => {
      const r = await p.save(prev, fd);
      // Le logo enregistré est désormais servi par le site : inutile de le renvoyer au prochain clic.
      if (r.status === "ok") setLogoData("");
      return r;
    },
    { status: "idle" } as AuditActionState,
  );

  const shownFirst = first.trim() || S.who.previewName;
  const logoShown = logo ? logoData || p.logoUrl : null;
  const lines = signatureLines({
    firstName: shownFirst,
    lastName: last.trim() || null,
    role,
    domain: p.domain,
    showSite: site,
    linkedinUrl: linkedin ? linkedinUrl.trim() || S.signature.linkedinPlaceholder : null,
    phone: phone ? phoneNumber.trim() || null : null,
    logoUrl: null,
  });
  // Sans rôle déclaré, l'aperçu ne présume rien.
  const intro = role ? presentationText(role, shownFirst, p.domain) : S.who.noRole(shownFirst);
  const offered = COUNTERPARTS.filter((c) => given.includes(c)).map((c) => S.counterparts.short[c]);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="p-0">
        <form action={action} className="flex flex-col">
          <section className="flex flex-col gap-4 p-6">
            <div>
              <h2 className="text-[17px] font-semibold">{S.who.title}</h2>
              <p className="text-sm text-muted-foreground">{S.who.body}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor="firstName">
                {S.who.firstName}
                <input
                  id="firstName"
                  name="firstName"
                  required
                  maxLength={60}
                  autoComplete="given-name"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  className={`${INPUT} font-normal`}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor="lastName">
                <span>
                  {S.who.lastName}{" "}
                  <span className="font-normal text-muted-foreground">{S.who.optional}</span>
                </span>
                <input
                  id="lastName"
                  name="lastName"
                  maxLength={60}
                  autoComplete="family-name"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  className={`${INPUT} font-normal`}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <span id="role-label" className="text-sm font-semibold">
                {S.who.role(p.domain)}
              </span>
              <input type="hidden" name="role" value={role ?? ""} />
              <div role="group" aria-labelledby="role-label" className="flex flex-wrap gap-2">
                {SIGNATURE_ROLES.map((x) => (
                  <button
                    key={x}
                    type="button"
                    aria-pressed={role === x}
                    onClick={() => setRole(x)}
                    className={`min-h-11 rounded-control border px-4 text-sm font-semibold ${
                      role === x
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-slate-400 bg-card text-foreground"
                    }`}
                  >
                    {S.who.roles[x]}
                  </button>
                ))}
              </div>
              {role ? (
                <p className="text-sm text-muted-foreground">{S.who.written(intro)}</p>
              ) : null}
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t border-border p-6">
            <div>
              <h2 className="text-[17px] font-semibold">{S.signature.title}</h2>
              <p className="text-sm text-muted-foreground">{S.signature.body}</p>
            </div>
            <div className="flex flex-col">
              <label className={ROW} htmlFor="logo">
                <input
                  id="logo"
                  name="logo"
                  type="checkbox"
                  checked={logo}
                  onChange={(e) => setLogo(e.target.checked)}
                  className={BOX}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{S.signature.logo}</span>
                  <span className="text-sm text-muted-foreground">{S.signature.logoHint}</span>
                </span>
              </label>
              <input type="hidden" name="logoData" value={logoData} />
              {logo ? (
                <div className="flex flex-col gap-1.5 pb-3 pl-[30px]">
                  <label className="text-[13px] font-semibold" htmlFor="logoFile">
                    {S.signature.logoFile}
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {logoShown ? (
                      // eslint-disable-next-line @next/next/no-img-element -- image saisie ou servie par jeton
                      <img
                        src={logoShown}
                        alt={S.signature.logoCurrent}
                        className="h-12 w-auto max-w-40 rounded-control border border-border bg-card object-contain p-1"
                      />
                    ) : null}
                    <input
                      id="logoFile"
                      type="file"
                      accept="image/png,image/jpeg"
                      className="min-h-11 max-w-full text-sm"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const data = await shrinkLogo(file);
                        setLogoError(!data);
                        if (data) setLogoData(data);
                      }}
                    />
                  </div>
                  {logoError ? (
                    <p role="alert" className="text-[13px] text-danger">
                      {S.signature.logoUnreadable}
                    </p>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">{S.signature.logoFileHint}</p>
                  )}
                </div>
              ) : null}

              <label className={ROW} htmlFor="showSite">
                <input
                  id="showSite"
                  name="showSite"
                  type="checkbox"
                  checked={site}
                  onChange={(e) => setSite(e.target.checked)}
                  className={BOX}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{S.signature.site}</span>
                  <span className="text-sm text-muted-foreground">
                    {S.signature.siteHint(p.domain)}
                  </span>
                </span>
              </label>

              <label className={ROW} htmlFor="linkedin">
                <input
                  id="linkedin"
                  name="linkedin"
                  type="checkbox"
                  checked={linkedin}
                  onChange={(e) => setLinkedin(e.target.checked)}
                  className={BOX}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{S.signature.linkedin}</span>
                  <span className="text-sm text-muted-foreground">{S.signature.linkedinHint}</span>
                </span>
              </label>
              {linkedin ? (
                <div className="flex flex-col gap-1.5 pb-3 pl-[30px]">
                  <label className="text-[13px] font-semibold" htmlFor="linkedinUrl">
                    {S.signature.linkedinUrl}
                  </label>
                  <input
                    id="linkedinUrl"
                    name="linkedinUrl"
                    inputMode="url"
                    maxLength={200}
                    placeholder={S.signature.linkedinPlaceholder}
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className={`${INPUT} max-w-sm`}
                  />
                </div>
              ) : null}

              <label className={ROW} htmlFor="phone">
                <input
                  id="phone"
                  name="phone"
                  type="checkbox"
                  checked={phone}
                  onChange={(e) => setPhone(e.target.checked)}
                  className={BOX}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{S.signature.phone}</span>
                  <span className="text-sm text-muted-foreground">{S.signature.phoneHint}</span>
                </span>
              </label>
              {phone ? (
                <div className="flex flex-col gap-1.5 pb-3 pl-[30px]">
                  <label className="text-[13px] font-semibold" htmlFor="phoneNumber">
                    {S.signature.phoneNumber}
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    autoComplete="tel"
                    maxLength={30}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`${INPUT} max-w-60`}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t border-border p-6">
            <div>
              <h2 className="text-[17px] font-semibold">{S.counterparts.title}</h2>
              <p className="text-sm text-muted-foreground">{S.counterparts.body}</p>
            </div>
            <div className="flex flex-col">
              {COUNTERPARTS.map((c) => (
                <label key={c} className={ROW} htmlFor={`counterpart_${c}`}>
                  <input
                    id={`counterpart_${c}`}
                    name={`counterpart_${c}`}
                    type="checkbox"
                    checked={given.includes(c)}
                    onChange={(e) =>
                      setGiven((g) => (e.target.checked ? [...g, c] : g.filter((x) => x !== c)))
                    }
                    className={BOX}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{S.counterparts.items[c].title}</span>
                    <span className="text-sm text-muted-foreground">
                      {S.counterparts.items[c].hint}
                    </span>
                  </span>
                </label>
              ))}
              <div className="flex min-h-12 items-start gap-3 border-t border-border/70 py-3">
                <Lock aria-hidden className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{S.counterparts.paid}</span>
                  <span className="text-sm text-muted-foreground">{S.counterparts.paidHint}</span>
                </span>
              </div>
            </div>
            <p role="status" className="rounded-control bg-muted px-3 py-2.5 text-sm">
              {offered.length
                ? S.counterparts.some(offered.join(S.counterparts.or))
                : S.counterparts.none}
            </p>
          </section>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-6 py-5">
            <Button type="submit" disabled={pending} className="min-h-11 px-5">
              {pending ? S.saving : S.save}
            </Button>
            {state.message ? (
              <p
                role="status"
                className={state.status === "error" ? "text-danger" : "text-success"}
              >
                {state.message}
              </p>
            ) : (
              <p className="min-w-0 flex-1 basis-60 text-sm text-muted-foreground">{S.saveNote}</p>
            )}
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-3.5 p-5">
        <div>
          <h2 className="text-[17px] font-semibold">{S.preview.title}</h2>
          <p className="text-sm text-muted-foreground">{S.preview.body}</p>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-border">
          <dl className="flex flex-col gap-1 bg-muted px-3.5 py-3 text-[13px]">
            <div className="flex gap-2">
              <dt className="w-11 shrink-0 text-muted-foreground">{S.preview.from}</dt>
              <dd className="min-w-0 font-semibold">{lines[0]?.text}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-11 shrink-0 text-muted-foreground">{S.preview.subject}</dt>
              <dd className="min-w-0">{S.preview.subjectValue}</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-3 px-3.5 py-4 text-[14.5px] leading-relaxed">
            <p>{S.preview.hello}</p>
            <p>{S.preview.p1(intro)}</p>
            <p className="[overflow-wrap:anywhere]">{S.preview.p2(p.domain)}</p>
            <p>{S.preview.bye}</p>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {S.preview.signature}
              </span>
              <div className="flex items-center gap-3 rounded-control border border-dashed border-amber-600 bg-amber-50 px-3 py-2.5 [overflow-wrap:anywhere]">
                {logoShown ? (
                  // eslint-disable-next-line @next/next/no-img-element -- image saisie ou servie par jeton
                  <img
                    src={logoShown}
                    alt={S.signature.logoAlt}
                    className="h-12 w-auto max-w-24 shrink-0 object-contain"
                  />
                ) : null}
                <div className="flex min-w-0 flex-col">
                  {lines.map((l, i) => (
                    <span
                      key={i}
                      className={
                        l.strong ? "font-semibold" : l.href ? "text-info underline" : undefined
                      }
                    >
                      {l.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {S.preview.facts.map((x) => (
            <li key={x} className="flex items-start gap-2">
              <Check
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-primary"
                strokeWidth={2.5}
              />
              {x}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
