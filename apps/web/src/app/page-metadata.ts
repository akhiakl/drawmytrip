import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { shareMetadata } from "@/lib/http";

import { OG_SIZE } from "./og-card";

/** Title, description and matching link-preview tags for a public page. */
export async function pageMetadata(
  page: "about" | "plan" | "contact" | "privacy" | "terms",
): Promise<Metadata> {
  const t = await getTranslations();
  const title = t(`Metadata.${page}.title`);
  const description = t(`Metadata.${page}.description`);
  return {
    title,
    description,
    ...shareMetadata({
      title: t("Metadata.titleTemplate").replace("%s", title),
      description,
      siteName: t("Common.appName"),
      // The site-wide card (src/app/opengraph-image.tsx).
      image: { url: "/opengraph-image", alt: t("Trip.og.alt"), ...OG_SIZE },
    }),
  };
}
