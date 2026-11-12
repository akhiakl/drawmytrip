import { ImageResponse } from "next/og";
import { createTranslator } from "next-intl";

import { DEFAULT_LOCALE } from "@/i18n/config";
import messages from "@/i18n/messages/en.json";
import { SAMPLE_TRIP } from "@/lib/trip";

import { OG_SIZE, OgCard } from "./og-card";

// Image routes render outside the request's i18n context; read the catalog.
const t = createTranslator({
  locale: DEFAULT_LOCALE,
  messages,
  namespace: "Trip.og",
});

export const alt = t("alt");
export const size = OG_SIZE;
export const contentType = "image/png";

/** The site-wide share card: every page without its own image unfurls with this. */
export default function Image() {
  return new ImageResponse(
    <OgCard
      eyebrow={t("eyebrow")}
      title={t("siteTitle")}
      subtitle={t("siteTagline")}
      // No flags: emoji are fetched from a CDN, and this image renders at build.
      stops={SAMPLE_TRIP.cities.map(({ name, ll }) => ({ name, ll }))}
    />,
    size,
  );
}
