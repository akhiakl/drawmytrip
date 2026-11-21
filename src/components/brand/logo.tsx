import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { BrandMark } from "./brand-mark";

/** The lockup: route D mark and the wordmark, "DrawMy" with an italic azure "Trip". */
export function Logo({ className }: { readonly className?: string }) {
  const t = useTranslations("Common");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark />
      <span className="font-display text-xl leading-none font-medium tracking-tight">
        {t("appNameLead")}
        <em className="font-normal text-azure italic">{t("appNameTail")}</em>
      </span>
    </span>
  );
}
