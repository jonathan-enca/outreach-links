/**
 * Lecture minimale de robots.txt (RFC 9309, sous-ensemble) : groupes User-agent, Allow et
 * Disallow par préfixe, jokers `*` et `$`. La règle la plus longue gagne, Allow en cas
 * d'égalité. Absence ou erreur de robots.txt = tout autorisé (4xx), 5xx = tout interdit
 * (prudence, comme le prévoit la norme).
 */
export interface RobotsRules {
  allowed(path: string): boolean;
}

interface Rule {
  allow: boolean;
  pattern: string;
}

export const ALLOW_ALL: RobotsRules = { allowed: () => true };
export const DISALLOW_ALL: RobotsRules = { allowed: () => false };

function matches(pattern: string, path: string): boolean {
  if (!pattern) return false;
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp(
    "^" +
      body
        .split("*")
        .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*") +
      (anchored ? "$" : ""),
  );
  return re.test(path);
}

export function parseRobots(text: string, userAgentToken: string): RobotsRules {
  const token = userAgentToken.toLowerCase();
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key === "allow" || key === "disallow") {
      lastWasAgent = false;
      if (current && value) current.rules.push({ allow: key === "allow", pattern: value });
    } else {
      lastWasAgent = false;
    }
  }
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules = chosen.flatMap((g) => g.rules);
  return {
    allowed(path: string) {
      let best: Rule | null = null;
      for (const r of rules) {
        if (!matches(r.pattern, path)) continue;
        if (
          !best ||
          r.pattern.length > best.pattern.length ||
          (r.pattern.length === best.pattern.length && r.allow)
        ) {
          best = r;
        }
      }
      return best ? best.allow : true;
    },
  };
}

/** Règles selon le statut HTTP de robots.txt (null = injoignable : on ne crawle pas). */
export function robotsFromResponse(
  res: { status: number; text: string } | null,
  userAgentToken: string,
): RobotsRules {
  if (!res) return DISALLOW_ALL;
  if (res.status >= 500) return DISALLOW_ALL;
  if (res.status >= 400 || res.status < 200) return ALLOW_ALL;
  return parseRobots(res.text, userAgentToken);
}
