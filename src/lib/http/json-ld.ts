/** schema.org WebApplication data for the landing page, as a JSON-LD string. */
export function webAppJsonLd(app: {
  readonly name: string;
  readonly description: string;
  readonly url: string;
}): string {
  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: app.name,
    description: app.description,
    url: app.url,
    applicationCategory: "TravelApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  });
  // "<" would let a value close the script tag early.
  return json.replace(/</g, String.raw`\u003c`);
}
