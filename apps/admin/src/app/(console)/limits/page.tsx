import { getRuntimeConfig } from "@drawmytrip/runtime-config/store";
import { getTranslations } from "next-intl/server";

import { LimitsForm } from "@/components/limits/limits-form";
import { PageHeader } from "@/components/shell/page-header";

export default async function LimitsPage() {
  const [t, config] = await Promise.all([
    getTranslations("Limits"),
    getRuntimeConfig(),
  ]);
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("heading")} />
      <LimitsForm config={config} />
    </>
  );
}
