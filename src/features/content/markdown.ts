import { Marked, Renderer, type MarkedExtension, type Tokens } from "marked";
import { t } from "@/lib/messages";

/**
 * Rendu Markdown des contenus, côté serveur. Volontairement fermé : le HTML écrit dans un fichier
 * (commentaires compris) n'est jamais rendu, seuls les liens http(s), internes, d'ancre et mailto
 * passent. Deux blocs propres au site : l'exemple de message (bloc ```message) et l'emplacement de
 * l'appel à l'action (ligne `[[audit-gratuit]]`).
 */
export const CTA_MARKER = "[[audit-gratuit]]";
/** Sans marqueur, l'appel à l'action se place après la troisième section (avant le quatrième titre ##). */
const CTA_AFTER_SECTION = 3;
const WORDS_PER_MINUTE = 200;

export interface TocItem {
  id: string;
  label: string;
}

export interface RenderedBody {
  /** HTML avant l'appel à l'action. */
  before: string;
  /** HTML après l'appel à l'action (vide s'il tombe en fin de texte). */
  after: string;
  toc: TocItem[];
  words: number;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** « Ce qu'on vous propose » -> « ce-qu-on-vous-propose ». */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

const SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;

/** Passage surligné : `==texte==` (le « hook », signature visuelle du produit). */
const hookExtension: MarkedExtension = {
  extensions: [
    {
      name: "hook",
      level: "inline",
      start: (src) => {
        const i = src.indexOf("==");
        return i < 0 ? undefined : i;
      },
      tokenizer(src) {
        const m = /^==(?=\S)([^\n]*?\S)==/.exec(src);
        if (!m) return undefined;
        return { type: "hook", raw: m[0], tokens: this.lexer.inlineTokens(m[1]) };
      },
      renderer(token) {
        return `<mark class="mark-hook">${this.parser.parseInline(token.tokens ?? [])}</mark>`;
      },
    },
  ],
};

const baseRenderer: MarkedExtension["renderer"] = {
  html: () => "",
  link({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    if (!SAFE_HREF.test(href)) return text;
    const external = /^https?:\/\//i.test(href);
    return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ""}${
      external ? ' rel="noopener"' : ""
    }>${text}</a>`;
  },
  image({ href, title, text }) {
    if (!SAFE_HREF.test(href)) return escapeHtml(text);
    return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${
      title ? ` title="${escapeHtml(title)}"` : ""
    } loading="lazy" decoding="async" />`;
  },
};

const inlineMarked = new Marked(hookExtension, { renderer: baseRenderer });

/** Texte court de l'en-tête (point « En bref », réponse de FAQ, source) : gras, liens, code, surlignage. */
export function renderInline(text: string): string {
  return inlineMarked.parseInline(text, { async: false });
}

/** Le même texte sans aucune mise en forme (données structurées, description). */
export function plainText(text: string): string {
  return renderInline(text)
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * Exemple de message : premières lignes « Objet : … » (obligatoire) et « Étiquette : … » (facultative,
 * « Exemple de démonstration » par défaut), une ligne vide, puis le corps. Dans le corps, une ligne vide
 * sépare les paragraphes, un retour à la ligne est conservé et `==texte==` surligne le passage cité.
 */
function renderMail(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let subject: string | null = null;
  let label: string = t.content.article.mailDemoLabel;
  let i = 0;
  for (; i < lines.length; i++) {
    const m = /^(objet|[ée]tiquette)\s*:\s*(.+)$/i.exec(lines[i].trim());
    if (!m) break;
    if (m[1].toLowerCase() === "objet") subject = m[2].trim();
    else label = m[2].trim();
  }
  if (!subject) throw new Error("bloc ```message : la première ligne doit être « Objet : … »");
  const body = lines.slice(i).join("\n").trim();
  if (!body) throw new Error("bloc ```message : le corps du message est vide");
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => {
      const html = escapeHtml(p.trim())
        .replace(/==(?=\S)([^\n]*?\S)==/g, '<mark class="mark-hook">$1</mark>')
        .replace(/\n/g, "<br />");
      return `<p>${html}</p>`;
    })
    .join("");
  return `<div class="art-mail"><div class="art-mail-top"><span>${escapeHtml(
    t.content.article.mailSubject(subject),
  )}</span><span class="art-pill">${escapeHtml(label)}</span></div><div class="art-mail-body">${paragraphs}</div></div>\n`;
}

/** Lignes du texte avec, pour chacune, si elle est dans un bloc de code (``` ou ~~~). */
function scanLines(source: string): { text: string; inFence: boolean }[] {
  let fence: string | null = null;
  return source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((text) => {
      const m = /^ {0,3}(`{3,}|~{3,})/.exec(text);
      if (fence === null) {
        if (m) {
          fence = m[1];
          return { text, inFence: true };
        }
        return { text, inFence: false };
      }
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && /^\s*$/.test(text.slice(m[0].length)))
        fence = null;
      return { text, inFence: true };
    });
}

/** Coupe le texte à l'emplacement de l'appel à l'action : le marqueur, sinon après la troisième section. */
export function splitAtCta(source: string): [string, string] {
  const lines = scanLines(source);
  const join = (from: number, to?: number) =>
    lines
      .slice(from, to)
      .map((l) => l.text)
      .join("\n");
  const marker = lines.findIndex((l) => !l.inFence && l.text.trim() === CTA_MARKER);
  if (marker >= 0) {
    // Un second marqueur serait rendu en clair : on le retire.
    const rest = lines
      .slice(marker + 1)
      .filter((l) => l.inFence || l.text.trim() !== CTA_MARKER)
      .map((l) => l.text)
      .join("\n");
    return [join(0, marker), rest];
  }
  const h2 = lines.flatMap((l, i) => (!l.inFence && /^##\s+\S/.test(l.text) ? [i] : []));
  if (h2.length > CTA_AFTER_SECTION) return [join(0, h2[CTA_AFTER_SECTION]), join(h2[CTA_AFTER_SECTION])];
  return [source, ""];
}

/** Nombre de mots lus : le texte sans commentaires ni marqueurs. */
export function countWords(text: string): number {
  return text
    .replace(/<!--[\s\S]*?-->/g, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Corps d'un contenu -> HTML en deux morceaux (avant et après l'appel à l'action) et sommaire tiré des
 * titres ##. Un titre peut finir par `{Libellé court}` : c'est ce libellé qui va dans le sommaire.
 */
export function renderBody(source: string): RenderedBody {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  const uniqueId = (text: string) => {
    const base = slugify(text);
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n === 0 ? base : `${base}-${n + 1}`;
  };

  const marked = new Marked(hookExtension, {
    gfm: true,
    renderer: {
      ...baseRenderer,
      heading({ text, depth }: Tokens.Heading) {
        if (depth === 1)
          throw new Error("pas de titre « # » dans le corps : le titre de la page vient de l'en-tête");
        const m = /^(.*\S)\s*\{([^{}]+)\}\s*$/.exec(text);
        const full = m ? m[1] : text;
        const html = inlineMarked.parseInline(full, { async: false });
        if (depth !== 2) return `<h${depth}>${html}</h${depth}>\n`;
        const label = plainText(m ? m[2] : full);
        const id = uniqueId(plainText(full));
        toc.push({ id, label });
        return `<h2 id="${id}">${html}</h2>\n`;
      },
      table(token: Tokens.Table) {
        return `<div class="art-table">${Renderer.prototype.table.call(this, token)}</div>\n`;
      },
      code(token: Tokens.Code) {
        if (token.lang?.trim().toLowerCase() === "message") return renderMail(token.text);
        return Renderer.prototype.code.call(this, token);
      },
    },
  });

  const [first, second] = splitAtCta(source);
  const before = marked.parse(first, { async: false });
  const after = second.trim() ? marked.parse(second, { async: false }) : "";
  return { before, after, toc, words: countWords(source.replace(CTA_MARKER, " ")) };
}
