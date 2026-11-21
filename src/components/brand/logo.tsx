import Link from "next/link";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { BrandMark } from "./brand-mark";

/**
 * The lockup: route D mark and the wordmark, "DrawMy" with an italic azure
 * "Trip". It scales with font size, so set one (`text-base`) to shrink it.
 */
export function Logo({ className }: { readonly className?: string }) {
  const t = useTranslations("Common");
  return (
    <span className={cn("inline-flex items-center gap-[0.4em] text-xl", className)}>
      <BrandMark className="size-[1.6em]" />
      <span className="font-display leading-none font-medium tracking-tight">
        {t("appNameLead")}
        <em className="font-normal text-azure-text italic">{t("appNameTail")}</em>
      </span>
    </span>
  );
}

/** The lockup as a link home, the brand's one fixed place on every page. */
export function LogoLink({ className }: { readonly className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Logo />
    </Link>
  );
}
