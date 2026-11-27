import { getTranslations } from "next-intl/server";

import { OffTheMap } from "@/components/off-the-map";
import { SHARE_TTL_DAYS } from "@/lib/trip";

export default async function SharedTripNotFound() {
  const t = await getTranslations("Errors.expired");
  return (
    <OffTheMap
      eyebrow={t("eyebrow")}
      title={t("title")}
      action={{ href: "/new", label: t("action") }}
      secondary={{ href: "/", label: t("home") }}
    >
      {t("body", { days: SHARE_TTL_DAYS })}
    </OffTheMap>
  );
}
