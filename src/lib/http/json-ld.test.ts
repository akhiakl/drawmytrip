import { describe, expect, it } from "vitest";

import { webAppJsonLd } from "./json-ld";

const app = {
  name: "Grand Tour",
  description: "Route maps",
  url: "https://gt.example/",
};

describe("webAppJsonLd", () => {
  it("describes a free travel web application", () => {
    expect(JSON.parse(webAppJsonLd(app))).toMatchObject({
      "@type": "WebApplication",
      name: "Grand Tour",
      url: "https://gt.example/",
      applicationCategory: "TravelApplication",
      offers: { price: "0" },
    });
  });

  it("escapes < so a value cannot close the script tag", () => {
    const out = webAppJsonLd({ ...app, description: "</script><b>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).description).toBe("</script><b>");
  });
});
