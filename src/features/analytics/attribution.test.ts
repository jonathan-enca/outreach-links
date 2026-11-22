import { describe, expect, it } from "vitest";
import { attributionFromRequest, parseAttribution } from "./attribution";

const url = (s: string) => new URL(`https://exemple.fr${s}`);

describe("source de la première visite", () => {
  it("garde les UTM et la page d'arrivée", () => {
    const a = attributionFromRequest(
      url("/blog/article?utm_source=blog&utm_content=mon-article"),
      null,
      "exemple.fr",
    );
    expect(a).toMatchObject({
      utm_source: "blog",
      utm_content: "mon-article",
      landing_path: "/blog/article",
    });
  });

  it("garde le site d'origine s'il est externe, pas le nôtre", () => {
    expect(
      attributionFromRequest(url("/"), "https://www.google.com/search?q=x", "exemple.fr"),
    ).toMatchObject({ referrer_host: "google.com" });
    expect(attributionFromRequest(url("/"), "https://exemple.fr/a", "exemple.fr")).toBeNull();
  });

  it("ne retient rien d'un accès direct", () => {
    expect(attributionFromRequest(url("/"), null, "exemple.fr")).toBeNull();
  });

  it("tronque les valeurs trop longues et rejette un cookie falsifié", () => {
    const a = attributionFromRequest(url(`/?utm_source=${"x".repeat(500)}`), null, "exemple.fr");
    expect(a?.utm_source).toHaveLength(100);
    expect(parseAttribution("pas du json")).toBeNull();
    expect(parseAttribution(JSON.stringify({ utm_source: 42 }))).toBeNull();
    expect(parseAttribution(undefined)).toBeNull();
  });
});
