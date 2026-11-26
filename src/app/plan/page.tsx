import { getTranslations } from "next-intl/server";

import { pageMetadata } from "@/app/page-metadata";
import { AiChat } from "@/components/ai/ai-chat";
import { PageBar } from "@/components/brand/page-bar";
import { destinationFromParam } from "@/lib/ai";

export const generateMetadata = () => pageMetadata("plan");

export default async function PlanPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { destination } = await searchParams;
  const t = await getTranslations("Plan");
  return (
    <div className="flex min-h-dvh flex-col">
      <PageBar title={t("title")} />
      <main className="page-container flex max-w-2xl flex-1 flex-col gap-6 py-6 lg:py-12">
        <p className="text-ink-soft">{t("lede")}</p>
        <AiChat initialDestination={destinationFromParam(destination)} />
      </main>
    </div>
  );
}
