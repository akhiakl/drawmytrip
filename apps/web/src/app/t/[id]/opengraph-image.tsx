import { ImageResponse } from "next/og";
import { createTranslator } from "next-intl";

import { OG_PALETTE as PALETTE, OG_SIZE, OgCard } from "@/app/og-card";
import { DEFAULT_LOCALE } from "@/i18n/config";
import messages from "@/i18n/messages/en.json";
import { tripStats } from "@/lib/trip";
import { getTrip } from "@/lib/trip/service";

// Image routes render outside the request's i18n context; read the catalog.
const t = createTranslator({
  locale: DEFAULT_LOCALE,
  messages,
  namespace: "Trip.og",
});

export const alt = t("alt");
export const size = OG_SIZE;
export const contentType = "image/png";

function fallbackImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: PALETTE.paper,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 26,
          color: PALETTE.brass,
        }}
      >
        {t("eyebrow")}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 48,
          color: PALETTE.ink,
          fontWeight: 600,
        }}
      >
        {t("expired")}
      </div>
    </div>,
    size,
  );
}

export default async function Image({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) return fallbackImage();

  const stats = tripStats(trip);
  return new ImageResponse(
    <OgCard
      eyebrow={t("eyebrow")}
      title={trip.title}
      subtitle={t("summary", {
        cities: stats.cities,
        nights: stats.nights,
        countries: stats.countries,
      })}
      stops={trip.cities}
    />,
    size,
  );
}
