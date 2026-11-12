/**
 * schema.org data for the landing page, as a JSON-LD string: the site
 * (with an alternate name, since the brand is a common phrase) and the
 * free web application it offers.
 */
export function siteJsonLd(site: {
  readonly name: string;
  readonly alternateName: string;
  readonly description: string;
  readonly url: string;
}): string {
  const { name, alternateName, description, url } = site;
  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${url}#website`, name, alternateName, url },
      {
        "@type": "WebApplication",
        name,
        alternateName,
        description,
        url,
        isPartOf: { "@id": `${url}#website` },
        applicationCategory: "TravelApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  });
  // "<" would let a value close the script tag early.
  return json.replace(/</g, String.raw`\u003c`);
}
