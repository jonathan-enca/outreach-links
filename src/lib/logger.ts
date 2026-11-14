/**
 * Logger structuré : une ligne JSON par événement (lisible par Vercel et Inngest).
 * Les champs sensibles sont masqués avant écriture : jamais de secret dans les logs.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE =
  /(secret|token|password|passwd|authorization|api[-_]?key|signing|cookie|credential)/i;
const MAX_DEPTH = 5;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[profondeur max]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        SENSITIVE.test(k) ? "[masqué]" : redact(v, depth + 1),
      ]),
    );
  }
  return value;
}

export type LogSink = (line: string, level: LogLevel) => void;

const consoleSink: LogSink = (line, level) => {
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  out(line);
};

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

export function createLogger(
  options: { level?: LogLevel; sink?: LogSink; base?: LogFields; now?: () => Date } = {},
): Logger {
  const min = ORDER[options.level ?? "info"];
  const sink = options.sink ?? consoleSink;
  const now = options.now ?? (() => new Date());
  const base = options.base ?? {};

  const write = (level: LogLevel, message: string, fields?: LogFields) => {
    if (ORDER[level] < min) return;
    const line = JSON.stringify({
      time: now().toISOString(),
      level,
      message,
      ...(redact({ ...base, ...fields }) as LogFields),
    });
    sink(line, level);
  };

  return {
    debug: (m, f) => write("debug", m, f),
    info: (m, f) => write("info", m, f),
    warn: (m, f) => write("warn", m, f),
    error: (m, f) => write("error", m, f),
    child: (fields) => createLogger({ ...options, base: { ...base, ...fields } }),
  };
}

function levelFromEnv(): LogLevel {
  const v = process.env.LOG_LEVEL;
  return v === "debug" || v === "info" || v === "warn" || v === "error" ? v : "info";
}

/** Logger par défaut de l'application. */
export const logger: Logger = createLogger({ level: levelFromEnv() });
