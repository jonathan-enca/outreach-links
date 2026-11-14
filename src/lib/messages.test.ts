import { describe, expect, it } from "vitest";
import { t } from "./messages";

describe("messages", () => {
  it("expose les chaînes françaises", () => {
    expect(t.home.title.length).toBeGreaterThan(0);
  });
});
