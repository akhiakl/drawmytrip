import { describe, expect, it } from "vitest";

import { siteJsonLd } from "./json-ld";

const site = {
  name: "DrawMyTrip",
  alternateName: "DrawMyTrip route maps",
  description: "Route maps",
  url: "https://gt.example/",
};

describe("siteJsonLd", () => {
  it("names the site, with an alternate name to tell it apart", () => {
    const [website] = JSON.parse(siteJsonLd(site))["@graph"];

    expect(website).toMatchObject({
      "@type": "WebSite",
      name: "DrawMyTrip",
      alternateName: "DrawMyTrip route maps",
      url: "https://gt.example/",
    });
  });

  it("describes a free travel web application that belongs to the site", () => {
    const [website, app] = JSON.parse(siteJsonLd(site))["@graph"];

    expect(app).toMatchObject({
      "@type": "WebApplication",
      applicationCategory: "TravelApplication",
      offers: { price: "0" },
      isPartOf: { "@id": website["@id"] },
    });
  });

  it("escapes < so a value cannot close the script tag", () => {
    const out = siteJsonLd({ ...site, description: "</script><b>" });

    expect(out).not.toContain("<");
    expect(JSON.parse(out)["@graph"][1].description).toBe("</script><b>");
  });
});
