// Génère les gabarits d'emails d'authentification (Supabase Auth) dans supabase/email-templates/.
// Une seule mise en page commune, six contenus. Lancer : node scripts/email-templates/build.mjs
// Le logo est un fichier image hébergé (LOGO_URL) ; tant qu'il n'existe pas, le nom s'affiche en texte.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BRAND = "backleenks";
// Couleurs du logo validé (marine), et non plus l'émeraude de docs/da.md.
const BRAND_COLOR = "#0b3a78";
const INK = "#0b1f44";
const MUTED = "#5b6678";
const APP_URL = "https://outreach-links.vercel.app";
// Logo hébergé avec le site (public/brand/logo-email.png). EMAIL_LOGO_URL permet de le remplacer.
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? `${APP_URL}/brand/logo-email.png`;

const FONT = "Inter, Helvetica, Arial, sans-serif";

const templates = {
  confirmation: {
    subject: "Confirmez votre adresse : backleenks",
    preheader: "Bienvenue ! Confirmez votre adresse pour ouvrir votre espace.",
    title: "Confirmez votre adresse email",
    intro: "Bienvenue ! Confirmez votre adresse pour ouvrir votre espace.",
    cta: "Confirmer mon adresse",
    href: `${APP_URL}/auth/callback?token_hash={{ .TokenHash }}&type=signup`,
    closing: "Si vous n'avez pas créé d'espace, ignorez simplement cet email : rien ne sera créé.",
  },
  recovery: {
    subject: "Réinitialiser votre mot de passe : backleenks",
    preheader: "Le lien de réinitialisation est valable une heure.",
    title: "Choisissez un nouveau mot de passe",
    intro:
      "Vous avez demandé à réinitialiser le mot de passe de votre espace. Le lien est valable une heure.",
    cta: "Choisir un nouveau mot de passe",
    href: `${APP_URL}/auth/recuperation?token_hash={{ .TokenHash }}&type=recovery`,
    closing:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe ne change pas.",
  },
  magic_link: {
    subject: "Votre lien de connexion : backleenks",
    preheader: "Cliquez pour vous connecter à votre espace.",
    title: "Votre lien de connexion",
    intro: "Cliquez sur le bouton pour vous connecter à votre espace.",
    cta: "Me connecter",
    href: `${APP_URL}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink`,
    closing: "Si vous n'avez pas demandé ce lien, ignorez cet email.",
  },
  invite: {
    subject: "Invitation à rejoindre un espace : backleenks",
    preheader: "Acceptez l'invitation pour créer votre accès.",
    title: "Vous êtes invité(e) à rejoindre un espace",
    intro: "Acceptez l'invitation pour créer votre accès.",
    cta: "Accepter l'invitation",
    href: `${APP_URL}/auth/callback?token_hash={{ .TokenHash }}&type=invite`,
    closing: "Si vous n'attendiez pas cette invitation, ignorez cet email.",
  },
  email_change: {
    subject: "Confirmez votre nouvelle adresse : backleenks",
    preheader: "Confirmez le changement d'adresse de votre espace.",
    title: "Confirmez votre nouvelle adresse email",
    intro: "Confirmez le changement d'adresse de votre espace.",
    cta: "Confirmer la nouvelle adresse",
    href: `${APP_URL}/auth/callback?token_hash={{ .TokenHash }}&type=email_change`,
    closing: "Si vous n'avez pas demandé ce changement, contactez-nous sans cliquer.",
  },
  reauthentication: {
    subject: "Votre code de confirmation : backleenks",
    preheader: "Votre code de confirmation.",
    title: "Votre code de confirmation",
    intro: "Saisissez ce code pour confirmer l'opération :",
    code: "{{ .Token }}",
    closing: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
  },
};

function brandBlock() {
  if (LOGO_URL) {
    return `<img src="${LOGO_URL}" width="140" alt="${BRAND}" style="display:block;border:0;outline:none;text-decoration:none;height:auto;width:140px;max-width:140px" />`;
  }
  return `<span style="font:700 22px/1 ${FONT};letter-spacing:-0.02em;color:${INK}">${BRAND}<span style="color:${BRAND_COLOR}">.</span></span>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td align="center" style="border-radius:10px;background:${BRAND_COLOR}"><a href="${href}" style="display:inline-block;padding:14px 26px;font:600 16px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:10px">${label}</a></td></tr></table>`;
}

function layout(t) {
  const body = t.code
    ? `<div style="margin:8px 0 4px;text-align:center;font:700 32px/1.2 ui-monospace,Menlo,monospace;letter-spacing:6px;color:${INK}">${t.code}</div>`
    : `${button(t.href, t.cta)}
              <p style="margin:24px 0 0;font:400 13px/1.5 ${FONT};color:${MUTED}">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br /><span style="word-break:break-all;color:${BRAND_COLOR}">${t.href}</span></p>`;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${t.title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${t.preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e3e8ef;border-radius:16px">
            <tr>
              <td style="padding:28px 32px 0 32px">${brandBlock()}</td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;font:700 22px/1.3 ${FONT};color:${INK}">${t.title}</td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0 32px;font:400 16px/1.6 ${FONT};color:${INK}">${t.intro}</td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px">${body}</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0 32px"><hr style="border:0;border-top:1px solid #e3e8ef;margin:0" /></td>
            </tr>
            <tr>
              <td style="padding:16px 32px 28px 32px;font:400 13px/1.6 ${FONT};color:${MUTED}">${t.closing}<br /><br />L'équipe ${BRAND}</td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font:400 12px/1.5 ${FONT};color:${MUTED}">Vous recevez cet email parce qu'une action a été demandée sur ${BRAND}.</p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "supabase", "email-templates");
for (const [name, t] of Object.entries(templates)) {
  writeFileSync(join(outDir, `${name}.html`), layout(t), "utf8");
}
console.log(`Gabarits écrits dans ${outDir} (${Object.keys(templates).length} fichiers).`);
