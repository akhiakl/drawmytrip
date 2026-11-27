import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("Common");
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <p className="text-ink-soft">{t("notFound")}</p>
    </main>
  );
}
