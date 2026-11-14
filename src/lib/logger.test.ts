import { describe, expect, it } from "vitest";
import { createLogger, type LogLevel } from "./logger";

function capture(level?: LogLevel) {
  const lines: string[] = [];
  const log = createLogger({
    level,
    sink: (l) => lines.push(l),
    now: () => new Date("2026-11-14T10:00:00Z"),
  });
  return { lines, log };
}

describe("logger", () => {
  it("écrit une ligne JSON structurée", () => {
    const { lines, log } = capture();
    log.info("bonjour", { workspaceId: "w1" });
    expect(JSON.parse(lines[0])).toEqual({
      time: "2026-11-14T10:00:00.000Z",
      level: "info",
      message: "bonjour",
      workspaceId: "w1",
    });
  });

  it("filtre sous le niveau minimal", () => {
    const { lines, log } = capture("warn");
    log.info("ignoré");
    log.warn("gardé");
    expect(lines).toHaveLength(1);
  });

  it("masque les champs sensibles, y compris imbriqués", () => {
    const { lines, log } = capture();
    log.info("x", { apiKey: "abc", nested: { Authorization: "Bearer zzz", ok: 1 } });
    expect(lines[0]).not.toContain("abc");
    expect(lines[0]).not.toContain("zzz");
    expect(JSON.parse(lines[0]).nested.ok).toBe(1);
  });

  it("child ajoute un contexte", () => {
    const { lines, log } = capture();
    log.child({ job: "health" }).info("go");
    expect(JSON.parse(lines[0]).job).toBe("health");
  });

  it("sérialise les erreurs", () => {
    const { lines, log } = capture();
    log.error("boom", { err: new Error("oups") });
    expect(JSON.parse(lines[0]).err.message).toBe("oups");
  });
});
