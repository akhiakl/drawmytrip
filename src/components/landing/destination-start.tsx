import { PenLine, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { planHref } from "@/lib/ai";
import type { CitySearchResult } from "@/lib/geo-search";
import { startCityQuery } from "@/lib/trip";

/**
 * Two ways on from a picked destination: let the AI draft the whole route
 * there, or start the editor with it as the first stop.
 */
export function DestinationStart({
  destination,
  onClear,
}: {
  readonly destination: CitySearchResult;
  readonly onClear: () => void;
}) {
  const t = useTranslations("Landing");
  const place = destination.country
    ? `${destination.name}, ${destination.country}`
    : destination.name;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-12 items-center justify-between gap-2 rounded-lg border border-line bg-card-solid pl-3.5 text-base text-ink">
        <span className="truncate">
          {destination.flag} {place}
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label={t("clearDestination")}
          className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      </div>
      <fieldset className="flex gap-2">
        <legend className="sr-only">{t("startTo", { place })}</legend>
        <Button asChild variant="outline" className="flex-1">
          <Link href={planHref(place)}>
            <Sparkles /> {t("planWithAi")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/new?${startCityQuery(destination)}`}>
            <PenLine /> {t("buildManually")}
          </Link>
        </Button>
      </fieldset>
    </div>
  );
}
