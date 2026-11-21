import { describe, expect, it } from "vitest";

import { makeCity } from "@/test/fixtures/trip";

import { affiliateLinks, type AffiliateTemplates } from ".";

const templates: AffiliateTemplates = {
  stay: "https://stays.test/s?q={city}&in={checkin}&out={checkout}&tag=dmt-stay",
  activity: "https://acts.test/s?q={city}&tag=dmt-act",
  esim: "https://esim.test/{country}?tag=dmt-esim",
  insurance: "https://cover.test/quote?tag=dmt-ins",
};

describe("affiliateLinks", () => {
  it("returns nothing when no provider is configured", () => {
    expect(affiliateLinks(makeCity(), undefined, {})).toEqual([]);
  });

  it("fills a stop's details into each template, in a fixed order", () => {
    const links = affiliateLinks(
      makeCity(),
      { arrive: "2026-05-01", depart: "2026-05-04" },
      templates,
    );
    expect(links.map((l) => l.kind)).toEqual([
      "stay",
      "activity",
      "esim",
      "insurance",
    ]);
    expect(links[0].href).toBe(
      "https://stays.test/s?q=Vienna&in=2026-05-01&out=2026-05-04&tag=dmt-stay",
    );
    expect(links[2].href).toBe("https://esim.test/Austria?tag=dmt-esim");
  });

  it("leaves dates empty for an undated trip", () => {
    const [stay] = affiliateLinks(makeCity(), undefined, { stay: templates.stay });
    expect(stay.href).toBe("https://stays.test/s?q=Vienna&in=&out=&tag=dmt-stay");
  });

  it("encodes names so they cannot break out of the query", () => {
    const city = makeCity({ name: "São Paulo & Co/#1", country: "Brazil" });
    const [act] = affiliateLinks(city, undefined, { activity: templates.activity });
    expect(act.href).toBe(
      "https://acts.test/s?q=S%C3%A3o%20Paulo%20%26%20Co%2F%231&tag=dmt-act",
    );
  });

  it("ignores a template that is not https", () => {
    const bad = {
      stay: "http://stays.test/?q={city}",
      activity: "javascript:alert(1)",
    };
    expect(affiliateLinks(makeCity(), undefined, bad)).toEqual([]);
  });

  it("only shows the blocks the operator configured", () => {
    const links = affiliateLinks(makeCity(), undefined, {
      insurance: templates.insurance,
    });
    expect(links).toEqual([
      { kind: "insurance", href: "https://cover.test/quote?tag=dmt-ins" },
    ]);
  });
});
