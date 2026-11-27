import { getRuntimeConfig } from "@drawmytrip/runtime-config/store";
import { getTranslations } from "next-intl/server";

import { LimitsForm } from "@/components/limits-form";

export default async function LimitsPage() {
  const [t, config] = await Promise.all([
    getTranslations("Limits"),
    getRuntimeConfig(),
  ]);
  return (
    <>
      <h1 className="font-display text-3xl text-ink">{t("heading")}</h1>
      <LimitsForm config={config} />
    </>
  );
}
