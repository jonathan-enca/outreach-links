import { z } from "zod";

/** Ports SMTP / IMAP admis (anti-SSRF : pas de port arbitraire). */
export const SMTP_PORTS = [25, 465, 587, 2525] as const;
export const IMAP_PORTS = [143, 993] as const;

const host = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(253)
  .regex(/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/, "hôte invalide");

export const mailboxSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  fromName: z.string().trim().min(1).max(80),
  username: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(256),
  smtpHost: host,
  smtpPort: z.coerce
    .number()
    .int()
    .refine((p) => (SMTP_PORTS as readonly number[]).includes(p)),
  imapHost: host,
  imapPort: z.coerce
    .number()
    .int()
    .refine((p) => (IMAP_PORTS as readonly number[]).includes(p)),
});
export type MailboxInput = z.infer<typeof mailboxSchema>;

/** 465 / 993 : TLS direct ; sinon STARTTLS obligatoire (jamais de mot de passe en clair). */
export const isImplicitTls = (port: number) => port === 465 || port === 993;

/** Horaires d'envoi choisis par la personne : au moins un jour (ISO, 1 = lundi), heure de fin après le début. */
export const scheduleSchema = z
  .object({
    days: z
      .array(z.coerce.number().int().min(1).max(7))
      .min(1)
      .max(7)
      .transform((d) => [...new Set(d)].sort((a, b) => a - b)),
    startHour: z.coerce.number().int().min(0).max(23),
    endHour: z.coerce.number().int().min(1).max(24),
  })
  .refine((v) => v.startHour < v.endHour);
export type ScheduleInput = z.infer<typeof scheduleSchema>;
