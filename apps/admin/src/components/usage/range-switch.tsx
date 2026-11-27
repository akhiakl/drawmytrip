import Link from "next/link";
import { useTranslations } from "next-intl";

import { RANGES, type Range } from "@/lib/range";
import { cn } from "@/lib/utils";

/** A segmented control, so it never reads as a second row of section tabs. */
export function RangeSwitch({ range }: Readonly<{ range: Range }>) {
  const t = useTranslations("Usage");
  return (
    <nav aria-label={t("range")}>
      <ul className="inline-flex rounded-full border border-line bg-secondary p-1">
        {RANGES.map((value) => (
          <li key={value}>
            <Link
              href={`/usage?range=${value}`}
              aria-current={value === range ? "page" : undefined}
              className={cn(
                "inline-flex h-11 items-center rounded-full px-4 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                value === range
                  ? "bg-card-solid font-medium text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {t(`range${value}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
