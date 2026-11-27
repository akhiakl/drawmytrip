import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/brand/brand-mark";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("Common");
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <BrandMark className="size-14" />
        <h1 className="font-display text-3xl font-medium text-ink">
          {t("notFoundHeading")}
        </h1>
        <p className="text-ink-soft">{t("notFoundBody")}</p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          {t("backToOverview")}
        </Link>
      </div>
    </main>
  );
}
