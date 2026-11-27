"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import { affiliateLinks } from "@/lib/affiliate";
import { trackEvent } from "@/lib/analytics";
import type { City, StopDates } from "@/lib/trip";

/** Booking links for one stop; renders nothing until an operator sets a provider. */
export function AffiliateBlock({
  city,
  dates,
}: {
  readonly city: City;
  readonly dates?: StopDates;
}) {
  const t = useTranslations("Trip.city.book");
  const links = affiliateLinks(city, dates);
  if (links.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2.5 font-display text-lg font-medium">{t("title")}</h3>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {links.map(({ kind, href }) => (
          <li key={kind}>
            <a
              href={href}
              target="_blank"
              rel="sponsored noopener noreferrer"
              onClick={() => trackEvent("affiliate_click")}
              className="flex min-h-11 items-center justify-between gap-3 px-3.5 py-2 text-[13.5px] font-medium hover:text-brass-text focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brass-text"
            >
              {t(kind, { city: city.name, country: city.country })}
              <ExternalLink aria-hidden className="size-3.5 shrink-0" />
              <span className="sr-only">{t("newTab")}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">{t("disclosure")}</p>
    </div>
  );
}
