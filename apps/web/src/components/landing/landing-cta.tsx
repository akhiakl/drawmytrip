"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CitySearch } from "@/components/editor/city-search";
import { useMounted } from "@/hooks/use-mounted";
import type { CitySearchResult } from "@/lib/geo-search";
import { listLocalTrips } from "@/lib/trip";

import { DestinationStart } from "./destination-start";
import { WelcomeBack } from "./welcome-back";

/**
 * The landing's intro above the example route: pick up a saved map
 * (returning visitors) or name a destination first. Plan with AI and
 * Build a route sit in the action bar; the sample route stays below as
 * inspiration.
 */
export function LandingCta() {
  const t = useTranslations("Landing");
  // Saved maps live in this browser only; read them after mount so the
  // server and first client render agree.
  const trips = useMounted() ? listLocalTrips() : [];
  const [destination, setDestination] = useState<CitySearchResult | null>(null);
  const returning = trips.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {returning && <WelcomeBack latest={trips[0]} />}

      {destination ? (
        <DestinationStart
          destination={destination}
          onClear={() => setDestination(null)}
        />
      ) : (
        <CitySearch
          onSelect={setDestination}
          label={t("searchLabel")}
          placeholder={
            returning ? t("searchPlaceholderReturning") : t("searchPlaceholder")
          }
        />
      )}

      <h1 className="text-base font-medium text-ink">{t("heading")}</h1>
      <p className="-mt-1 text-base text-ink">{t("tagline")}</p>

      <Link
        href="/about"
        className="inline-flex min-h-11 w-fit items-center gap-1 rounded-sm text-sm text-ink-soft underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("howItWorks")} <ArrowRight aria-hidden className="size-3" />
      </Link>
    </div>
  );
}
