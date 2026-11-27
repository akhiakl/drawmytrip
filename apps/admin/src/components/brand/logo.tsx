import Link from "next/link";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { BrandMark } from "./brand-mark";

/** The site's lockup (mark, "DrawMy" and an italic azure "Trip") tagged Admin. */
export function Logo({ className }: Readonly<{ className?: string }>) {
  const t = useTranslations("Common");
  return (
    <span className={cn("inline-flex items-center gap-[0.4em] text-xl", className)}>
      <BrandMark className="size-[1.6em]" />
      <span className="font-display leading-none font-medium tracking-tight text-ink">
        {t("appNameLead")}
        <em className="font-normal text-azure-text italic">{t("appNameTail")}</em>
      </span>{" "}
      <span className="rounded-full border border-line px-2 py-0.5 font-sans text-[13px] leading-none font-medium text-brass-text">
        {t("admin")}
      </span>
    </span>
  );
}

/** The lockup as a link to the Overview. */
export function LogoLink({ className }: Readonly<{ className?: string }>) {
  return (
    <Link
      href="/"
      className={cn(
        "flex min-h-11 w-fit items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Logo />
    </Link>
  );
}
