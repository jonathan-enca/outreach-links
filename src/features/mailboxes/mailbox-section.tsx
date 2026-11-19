"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import { DEFAULT_SEND_DAYS, describeWindow } from "@/features/sending/schedule";
import {
  connectMailboxAction,
  linkMailboxAction,
  removeMailboxAction,
  testMailboxAction,
  unlinkMailboxAction,
  updateScheduleAction,
} from "./actions";
import { GoogleConnect } from "@/features/google/google-connect";
import { explainMailboxError } from "./explain-error";
import { healthWarnings } from "./health-warnings";
import {
  detectProvider,
  GROUP_ORDER,
  guideHref,
  GUIDES_BASE,
  providerBySlug,
  providerForMailbox,
  providersByGroup,
} from "./providers";
import type { MailboxState } from "./service";

export interface MailboxView {
  id: string;
  email: string;
  status: "en_attente" | "verifiee" | "erreur" | "suspendue";
  smtpOk: boolean | null;
  imapOk: boolean | null;
  lastError: string | null;
  /** Serveur d'envoi enregistré : sert à retrouver le guide d'une adresse à son propre domaine. */
  smtpHost?: string | null;
  health: { spf: boolean; dkim: boolean; dmarc: boolean } | null;
  /** "google" : boîte connectée par compte Google (pas de mot de passe, pas de test SMTP/IMAP). */
  provider?: string;
  hourlyCap: number;
  dailyCap: number;
  /** Jours (ISO, 1 = lundi) et heures d'envoi choisis ; absents : les horaires conseillés. */
  sendDays?: number[] | null;
  windowStart?: number | null;
  windowEnd?: number | null;
  /** Autres campagnes (sites) qui utilisent aussi cette boîte. */
  otherSites?: string[];
}

/** Boîte déjà connectée dans l'espace de travail, pas (encore) rattachée à ce site. */
export interface AvailableMailbox {
  id: string;
  email: string;
  status: MailboxView["status"];
  sites: string[];
}

const m = t.mailboxes;
const g = t.mailboxGuides.ui;
const linkClass =
  "inline-flex items-center gap-1 rounded-control font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:size-3.5";
const inputClass =
  "h-10 w-full rounded-md border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function Status({ state }: { state: MailboxState }) {
  return state.message ? (
    <p role="status" className={state.status === "error" ? "text-danger" : "text-success"}>
      {state.message}
    </p>
  ) : null;
}

/** Texte d'avertissement de santé du domaine (testé séparément). */
export function healthText(h: MailboxView["health"]): string | null {
  if (!h) return null;
  const missing = healthWarnings(h);
  if (missing.length === 0) return m.healthOk;
  return m.healthMissing.replace("{list}", missing.map((x) => x.toUpperCase()).join(", "));
}

/** Guide dans un nouvel onglet : le formulaire en cours de saisie reste ouvert à côté. */
function GuideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} target="_blank" className={linkClass}>
      {children}
      <ExternalLink aria-hidden />
    </Link>
  );
}

/** Échec du test : l'explication en clair d'abord, le message brut du serveur ensuite, puis le guide. */
function FailureHelp({ box }: { box: MailboxView }) {
  const help = explainMailboxError(box.lastError);
  const provider = providerForMailbox(box.email, box.smtpHost);
  return (
    <div className="flex flex-col gap-1.5 rounded-control border border-danger/30 bg-danger/5 p-3 text-sm">
      {help ? <p className="font-medium text-danger">{help}</p> : null}
      <p className={help ? "break-words text-muted-foreground" : "break-words text-danger"}>
        {box.lastError}
      </p>
      <p>
        <GuideLink href={provider ? `${guideHref(provider.slug)}#si-le-test-echoue` : GUIDES_BASE}>
          {provider ? g.rowGuide(provider.name) : g.rowGuides}
        </GuideLink>
      </p>
    </div>
  );
}

function Row({ siteId, box }: { siteId: string; box: MailboxView }) {
  const [testState, test, testing] = useActionState(testMailboxAction.bind(null, siteId, box.id), {
    status: "idle",
  } as MailboxState);
  const [rmState, remove, removing] = useActionState(
    removeMailboxAction.bind(null, siteId, box.id),
    { status: "idle" } as MailboxState,
  );
  const [unlinkState, unlink, unlinking] = useActionState(
    unlinkMailboxAction.bind(null, siteId, box.id),
    { status: "idle" } as MailboxState,
  );
  const warn = healthText(box.health);
  const others = box.otherSites ?? [];
  const isGoogle = box.provider === "google";
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong>{box.email}</strong>
        <Badge>{m.status[box.status]}</Badge>
      </div>
      {others.length > 0 ? (
        <p className="text-sm text-muted-foreground">{m.reuse.sharedWith(others.join(", "))}</p>
      ) : null}
      {isGoogle ? (
        <p className="text-sm">{m.google.connected}</p>
      ) : (
        <p className="text-sm">
          {m.smtp} : {box.smtpOk === null ? "—" : box.smtpOk ? m.ok : m.ko} · {m.imap} :{" "}
          {box.imapOk === null ? "—" : box.imapOk ? m.ok : m.ko}
        </p>
      )}
      <p className="text-sm">
        {m.caps.replace("{hourly}", String(box.hourlyCap)).replace("{daily}", String(box.dailyCap))}
      </p>
      {warn ? (
        <p className="text-sm">
          <strong>{m.healthTitle} :</strong> {warn}
        </p>
      ) : null}
      {box.lastError ? <FailureHelp box={box} /> : null}
      <div className="flex flex-wrap gap-2">
        {isGoogle ? null : (
          <form action={test}>
            <Button type="submit" disabled={testing}>
              {testing ? m.testing : m.test}
            </Button>
          </form>
        )}
        <form
          action={remove}
          onSubmit={(e) => {
            // Suppression définitive : on dit ce qui part avec la boîte avant de l'exécuter.
            const text = others.length > 0 ? m.removeConfirmShared(others.length) : m.removeConfirm;
            if (!window.confirm(text)) e.preventDefault();
          }}
        >
          <Button type="submit" variant="outline" disabled={removing}>
            {m.remove}
          </Button>
        </form>
        <form action={unlink}>
          <Button type="submit" variant="outline" disabled={unlinking}>
            {unlinking ? m.reuse.unlinking : m.reuse.unlink}
          </Button>
        </form>
      </div>
      <Status state={unlinkState} />
      <Status state={testState} />
      <Status state={rmState} />
      <ScheduleForm siteId={siteId} box={box} />
    </div>
  );
}

const HOURS = Array.from({ length: 25 }, (_, h) => h);

/** Jours et heures d'envoi de la boîte : conseillés par défaut, modifiables par la personne. */
function ScheduleForm({ siteId, box }: { siteId: string; box: MailboxView }) {
  const sc = m.schedule;
  const [state, save, saving] = useActionState(updateScheduleAction.bind(null, siteId, box.id), {
    status: "idle",
  } as MailboxState);
  const days = box.sendDays ?? DEFAULT_SEND_DAYS;
  const start = box.windowStart ?? 9;
  const end = box.windowEnd ?? 18;
  const selectClass = inputClass.replace("w-full ", "");
  // « 24 h sur 24 » : de 0 h à 24 h, un seul geste. Les heures se grisent quand il est coché.
  const [allDay, setAllDay] = useState(start === 0 && end === 24);
  return (
    <form action={save} className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
      <div>
        <h3 className="font-semibold">{sc.title}</h3>
        <p className="text-sm text-muted-foreground">{sc.body}</p>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{sc.days}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {sc.dayNames.map((name, i) => (
            <label key={name} className="inline-flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="days"
                value={i + 1}
                defaultChecked={days.includes(i + 1)}
                className="size-4 accent-primary"
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="inline-flex items-center gap-1.5 text-sm font-medium">
        <input
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="size-4 accent-primary"
        />
        {sc.allDay}
      </label>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={`start-${box.id}`} className="font-medium">
          {sc.from}
        </label>
        <select
          id={`start-${box.id}`}
          name="startHour"
          defaultValue={start}
          disabled={allDay}
          className={selectClass}
        >
          {HOURS.slice(0, 24).map((h) => (
            <option key={h} value={h}>
              {sc.hour(h)}
            </option>
          ))}
        </select>
        <label htmlFor={`end-${box.id}`} className="font-medium">
          {sc.to}
        </label>
        <select
          id={`end-${box.id}`}
          name="endHour"
          defaultValue={end}
          disabled={allDay}
          className={selectClass}
        >
          {HOURS.slice(1).map((h) => (
            <option key={h} value={h}>
              {sc.hour(h)}
            </option>
          ))}
        </select>
        <span className="text-muted-foreground">{sc.timezone}</span>
      </div>
      <p className="text-sm text-muted-foreground">{sc.advice}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={saving}>
          {saving ? sc.saving : sc.save}
        </Button>
        <span className="text-sm text-muted-foreground">
          {sc.current(describeWindow({ days, startHour: start, endHour: end }))}
        </span>
      </div>
      <Status state={state} />
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  value,
  onChange,
  onBlur,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1" htmlFor={`mb-${name}`}>
      <span className="font-medium">{label}</span>
      <input
        id={`mb-${name}`}
        name={name}
        type={type}
        required
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onBlur}
        aria-describedby={hint ? `mb-${name}-hint` : undefined}
        autoComplete={type === "password" ? "new-password" : "off"}
        className={inputClass}
      />
      {hint ? (
        <span id={`mb-${name}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const EMPTY_SERVER = { smtpHost: "", smtpPort: "587", imapHost: "", imapPort: "993" };

/**
 * Formulaire de connexion. On choisit sa messagerie : les serveurs se remplissent seuls, le champ du
 * mot de passe dit lequel coller, et le guide pas à pas s'ouvre à côté. Une messagerie reconnue à
 * l'adresse (gmail.com, orange.fr…) est choisie d'office.
 */
function ConnectForm({
  action,
  pending,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const [slug, setSlug] = useState("");
  const [detected, setDetected] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [server, setServer] = useState(EMPTY_SERVER);
  const [open, setOpen] = useState(false);
  const provider = providerBySlug(slug);
  const preset = provider?.server;
  // Sans réglages connus, les champs de serveurs sont à remplir : on les montre d'office.
  const showAdvanced = open || !preset;

  function pick(next: string, auto = false) {
    const p = providerBySlug(next);
    setSlug(next);
    setDetected(auto && p !== null);
    setOpen(false);
    setServer(
      p?.server
        ? {
            smtpHost: p.server.smtpHost,
            smtpPort: String(p.server.smtpPort),
            imapHost: p.server.imapHost,
            imapPort: String(p.server.imapPort),
          }
        : { ...EMPTY_SERVER, smtpPort: String(p?.defaultSmtpPort ?? EMPTY_SERVER.smtpPort) },
    );
  }
  const set = (key: keyof typeof EMPTY_SERVER) => (value: string) =>
    setServer((s) => ({ ...s, [key]: value }));

  return (
    <form
      action={action}
      onInvalidCapture={() => setOpen(true)}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <p className="text-sm text-muted-foreground sm:col-span-2">
        {g.form.firstTime} <GuideLink href={GUIDES_BASE}>{g.form.allGuides}</GuideLink>
      </p>
      <label className="flex flex-col gap-1 sm:col-span-2" htmlFor="mb-provider">
        <span className="font-medium">{g.form.provider}</span>
        <select
          id="mb-provider"
          value={slug}
          onChange={(e) => pick(e.target.value)}
          className={inputClass}
        >
          <option value="">{g.form.providerPlaceholder}</option>
          {GROUP_ORDER.map((group) => (
            <optgroup key={group} label={g.index.groups[group]}>
              {providersByGroup(group).map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                  {p.compatible ? "" : ` (${g.index.notCompatible.toLowerCase()})`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {provider ? (
        <div
          className={`flex flex-col gap-1.5 rounded-control border p-3 text-sm sm:col-span-2 ${
            provider.compatible
              ? "border-primary/30 bg-primary/5"
              : "border-warning/30 bg-warning/10"
          }`}
        >
          {detected ? (
            <p className="text-muted-foreground">{g.form.detected(provider.name)}</p>
          ) : null}
          <p className="flex items-start gap-2">
            {provider.compatible ? null : (
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            )}
            <span>{provider.intro}</span>
          </p>
          {provider.compatible && provider.serverHint ? <p>{provider.serverHint}</p> : null}
          <p>
            <GuideLink href={guideHref(provider.slug)}>
              {provider.compatible ? g.form.guide(provider.name) : g.form.whyNot}
            </GuideLink>
          </p>
        </div>
      ) : null}
      {provider && !provider.compatible ? null : (
        <>
          <Field
            name="email"
            label={m.email}
            type="email"
            value={email}
            onChange={setEmail}
            onBlur={() => {
              const found = slug ? null : detectProvider(email);
              if (found) pick(found.slug, true);
            }}
          />
          <Field name="fromName" label={m.fromName} />
          <div className="sm:col-span-2">
            <Field
              name="password"
              label={
                provider?.password === "boite" ? g.form.passwordBoite : g.form.passwordApplication
              }
              type="password"
              hint={provider?.passwordHint}
            />
          </div>
          <details
            open={showAdvanced}
            onToggle={(e) => setOpen(e.currentTarget.open)}
            className="rounded-control border border-border p-3 sm:col-span-2"
          >
            <summary className="cursor-pointer rounded-control font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {g.form.advanced}{" "}
              <span className="font-normal text-muted-foreground">
                ({preset ? g.form.advancedFilled : g.form.advancedToFill})
              </span>
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  name="username"
                  label={m.username}
                  value={username ?? email}
                  onChange={setUsername}
                  hint={provider?.username ?? g.form.usernameHint}
                />
              </div>
              <Field
                name="smtpHost"
                label={m.smtpHost}
                value={server.smtpHost}
                onChange={set("smtpHost")}
              />
              <Field
                name="smtpPort"
                label={m.smtpPort}
                value={server.smtpPort}
                onChange={set("smtpPort")}
              />
              <Field
                name="imapHost"
                label={m.imapHost}
                value={server.imapHost}
                onChange={set("imapHost")}
              />
              <Field
                name="imapPort"
                label={m.imapPort}
                value={server.imapPort}
                onChange={set("imapPort")}
              />
            </div>
          </details>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? m.connecting : m.connect}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

/** Une boîte déjà connectée pour un autre site : un clic la rattache à celui-ci. */
function AvailableRow({ siteId, box }: { siteId: string; box: AvailableMailbox }) {
  const [state, link, linking] = useActionState(linkMailboxAction.bind(null, siteId, box.id), {
    status: "idle",
  } as MailboxState);
  return (
    <form
      action={link}
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="break-all">{box.email}</strong>
          <Badge>{m.status[box.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {box.sites.length > 0 ? m.reuse.alsoUsedBy(box.sites.join(", ")) : m.reuse.notUsed}
        </p>
        <Status state={state} />
      </div>
      <Button type="submit" disabled={linking}>
        {linking ? m.reuse.using : m.reuse.use}
      </Button>
    </form>
  );
}

export function MailboxSection({
  siteId,
  boxes,
  available = [],
  googleEnabled = false,
}: {
  siteId: string;
  boxes: MailboxView[];
  available?: AvailableMailbox[];
  /** G1 : vrai si la connexion par compte Google est ouverte (drapeau + client OAuth). */
  googleEnabled?: boolean;
}) {
  // L'état vit ici : le message « Boîte enregistrée » doit rester quand le formulaire disparaît.
  const [state, connect, pending] = useActionState(connectMailboxAction.bind(null, siteId), {
    status: "idle",
  } as MailboxState);
  // Des boîtes déjà connectées existent : on propose de les réutiliser, ou d'en connecter une autre.
  const [other, setOther] = useState(false);
  const canReuse = boxes.length === 0 && available.length > 0;
  return (
    <Card id="boite-envoi" className="flex scroll-mt-4 flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold">{m.title}</h2>
      <p>{m.body}</p>
      {boxes.map((b) => (
        <Row key={b.id} siteId={siteId} box={b} />
      ))}
      {canReuse ? (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="font-semibold">{m.reuse.title}</h3>
            <p className="text-sm text-muted-foreground">{m.reuse.hint}</p>
          </div>
          {available.map((b) => (
            <AvailableRow key={b.id} siteId={siteId} box={b} />
          ))}
          <div>
            <Button type="button" variant="outline" onClick={() => setOther((v) => !v)}>
              {other ? m.reuse.back : m.reuse.other}
            </Button>
          </div>
        </div>
      ) : null}
      {googleEnabled && !boxes.some((b) => b.provider === "google") ? (
        <GoogleConnect siteId={siteId} upgrade={boxes.length > 0} />
      ) : null}
      {/* v1 archivée : le formulaire SMTP/IMAP n'est proposé que si la connexion Google est fermée. */}
      {boxes.length === 0 && (!canReuse || other) && !googleEnabled ? (
        <ConnectForm action={connect} pending={pending} />
      ) : null}
      <Status state={state} />
    </Card>
  );
}
