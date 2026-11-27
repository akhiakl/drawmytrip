import Link from "next/link";
import { useTranslations } from "next-intl";

import { RANGES, type Range } from "@/lib/range";
import { cn } from "@/lib/utils";

export function RangeSwitch({ range }: Readonly<{ range: Range }>) {
  const t = useTranslations("Usage");
  return (
    <nav aria-label={t("range")} className="flex gap-2">
      {RANGES.map((value) => (
        <Link
          key={value}
          href={`/usage?range=${value}`}
          aria-current={value === range ? "page" : undefined}
          className={cn(
            "inline-flex h-11 items-center rounded-full border px-4",
            value === range
              ? "border-brass-strong bg-card-solid text-ink"
              : "border-line text-ink-soft hover:text-ink",
          )}
        >
          {t(`range${value}`)}
        </Link>
      ))}
    </nav>
  );
}
