import { describe, expect, it } from "vitest";
import { checkDomainAuth } from "./domain-auth";

const dnsOf =
  (records: Record<string, string[]>, failing: string[] = []) =>
  async (name: string) => {
    if (failing.includes(name)) throw Object.assign(new Error("délai"), { code: "ETIMEOUT" });
    const r = records[name];
    if (!r) throw Object.assign(new Error("rien"), { code: "ENODATA" });
    return r.map((x) => [x]);
  };

describe("contrôles anti-spam du domaine d'envoi", () => {
  it("SPF, DKIM (sélecteur courant) et DMARC présents", async () => {
    const r = await checkDomainAuth(
      "www.Site.fr",
      dnsOf({
        "site.fr": ["google-site-verification=x", "v=spf1 include:_spf.google.com ~all"],
        "_dmarc.site.fr": ["v=DMARC1; p=none"],
        "google._domainkey.site.fr": ["v=DKIM1; k=rsa; p=MIIB"],
      }),
    );
    expect(r).toEqual({ spf: "ok", dkim: "ok", dmarc: "ok" });
  });
  it("absents : SPF et DMARC « absent », DKIM « inconnu » (sélecteur non devinable)", async () => {
    expect(await checkDomainAuth("site.fr", dnsOf({}))).toEqual({
      spf: "absent",
      dkim: "inconnu",
      dmarc: "absent",
    });
  });
  it("panne DNS : inconnu, jamais « absent »", async () => {
    const r = await checkDomainAuth("site.fr", dnsOf({}, ["site.fr", "_dmarc.site.fr"]));
    expect(r.spf).toBe("inconnu");
    expect(r.dmarc).toBe("inconnu");
  });
});
