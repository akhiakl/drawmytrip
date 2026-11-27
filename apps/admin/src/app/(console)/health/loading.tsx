import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/shell/page-header";

export default async function HealthLoading() {
  const t = await getTranslations("Health");
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("heading")} />
      <p
        role="status"
        className="rounded-2xl border border-dashed border-line p-6 text-center text-ink-soft"
      >
        {t("checking")}
      </p>
    </>
  );
}
