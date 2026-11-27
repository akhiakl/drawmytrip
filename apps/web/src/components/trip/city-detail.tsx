"use client";

import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUnits } from "@/components/units/units-provider";
import { formatDateSpan, type City, type StopDates } from "@/lib/trip";

import {
  FoodSection,
  ItinerarySection,
  OverviewSection,
  PlannerSection,
  PracticalSection,
} from "./drawer-sections";

const TABS = ["overview", "itinerary", "food", "practical", "planner"] as const;

function BackToRoute({ onBack }: { readonly onBack: () => void }) {
  const t = useTranslations("Trip.panel");
  return (
    <button
      type="button"
      // Focus moves into the stop the guest just opened.
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
      onClick={onBack}
      className="-ml-2 flex min-h-11 w-fit items-center gap-1.5 rounded-full px-2 text-sm text-ink-soft transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
    >
      <ArrowLeft /> {t("back")}
    </button>
  );
}

function Pill({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-sm font-medium text-ink">
      {children}
    </span>
  );
}

/** One stop in depth, shown in the panel in place of the itinerary. */
export function CityDetail({
  city,
  index,
  count,
  dates,
  onBack,
}: {
  readonly city: City;
  readonly index: number;
  readonly count: number;
  /** This stop's stay, for dated trips. */
  readonly dates?: StopDates;
  readonly onBack: () => void;
}) {
  const t = useTranslations("Trip");
  const locale = useLocale();
  const titleId = useId();
  const { money } = useUnits();

  return (
    <article aria-labelledby={titleId} className="flex flex-col gap-4">
      <BackToRoute onBack={onBack} />

      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className={`hero-grad-${index % 5} grid size-14 shrink-0 place-items-center rounded-2xl text-3xl`}
        >
          {city.flag}
        </span>
        <div className="min-w-0">
          <p className="eyebrow">
            {t("city.stopOf", { number: index + 1, count, country: city.country })}
          </p>
          <h2
            id={titleId}
            title={city.name}
            className="truncate font-display text-3xl font-medium tracking-tight"
          >
            {city.name}
          </h2>
        </div>
      </div>
      <p className="flex flex-wrap gap-2">
        <Pill>{t("nights", { count: city.nights })}</Pill>
        <Pill>{t("perDay", { amount: money(city.budget) })}</Pill>
        {dates && <Pill>{formatDateSpan(dates, locale)}</Pill>}
      </p>

      {/* Remount tabs per city so the active tab and planner reset. */}
      <Tabs key={`${city.name}-${index}`} defaultValue="overview">
        <TabsList className="-mx-4 px-4 pr-12 lg:-mx-6 lg:px-6">
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`city.tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="pt-5">
          <TabsContent value="overview">
            <OverviewSection city={city} />
          </TabsContent>
          <TabsContent value="itinerary">
            <ItinerarySection city={city} />
          </TabsContent>
          <TabsContent value="food">
            <FoodSection city={city} />
          </TabsContent>
          <TabsContent value="practical">
            <PracticalSection city={city} dates={dates} />
          </TabsContent>
          <TabsContent value="planner">
            <PlannerSection city={city} />
          </TabsContent>
        </div>
      </Tabs>
    </article>
  );
}
