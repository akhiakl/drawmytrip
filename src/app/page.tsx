import { getTranslations } from "next-intl/server";

import { LandingCta } from "@/components/landing/landing-cta";
import { TripExperience } from "@/components/trip/trip-experience";
import { siteUrl, webAppJsonLd } from "@/lib/http";
import { SAMPLE_TRIP } from "@/lib/trip";

/**
 * The landing: the immersive demo experience with the sample trip, plus a
 * floating CTA card into every journey (AI chat, manual editor, My Maps).
 */
export default async function Home() {
  const t = await getTranslations();
  const jsonLd = webAppJsonLd({
    name: t("Common.appName"),
    description: t("Metadata.description"),
    url: siteUrl().toString(),
  });
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <TripExperience trip={SAMPLE_TRIP} cta={<LandingCta />} />
    </>
  );
}
