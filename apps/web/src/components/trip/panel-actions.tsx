"use client";

import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ImageDown,
  Map,
  Navigation,
  Pencil,
  Plus,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { Trip } from "@/lib/trip";

/**
 * Which page hosts the experience. "demo" (`/`): the example route, with
 * the landing's ways in as its main actions. "shared" (`/t/[id]`): copy it
 * to edit. "own" (`/maps/[id]`): edit in place or share it.
 */
export type ExperienceVariant = "demo" | "shared" | "own";

export type ToolId = "packing" | "notes";

/** The action bar: the one main action (brass) and at most one other. */
export function PrimaryActions({
  variant,
  onEditRoute,
  onShare,
  sharing,
}: {
  readonly variant: ExperienceVariant;
  readonly onEditRoute: () => void;
  readonly onShare?: () => void;
  readonly sharing?: boolean;
}) {
  const t = useTranslations("Trip.actions");

  if (variant === "shared") {
    return (
      <Button variant="brass" className="w-full" onClick={onEditRoute}>
        <Pencil /> {t("remix")}
      </Button>
    );
  }

  if (variant === "own") {
    return (
      <div className="flex gap-2.5">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onShare}
          disabled={sharing}
        >
          <Share2 /> {sharing ? t("sharing") : t("share")}
        </Button>
        <Button variant="brass" className="flex-1" onClick={onEditRoute}>
          <Pencil /> {t("edit")}
        </Button>
      </div>
    );
  }

  return (
    <fieldset className="flex gap-2.5">
      <legend className="sr-only">{t("startOwn")}</legend>
      <Button asChild variant="outline" className="flex-1">
        <Link href="/new">{t("buildRoute")}</Link>
      </Button>
      <Button asChild variant="brass" className="flex-1">
        <Link href="/plan">
          <Sparkles /> {t("planWithAi")}
        </Link>
      </Button>
    </fieldset>
  );
}

/** Stops view: step to the previous or next stop from the thumb zone. */
export function StopPager({
  trip,
  index,
  onSelect,
}: {
  readonly trip: Trip;
  readonly index: number;
  readonly onSelect: (index: number) => void;
}) {
  const t = useTranslations("Trip.actions");
  const prev = trip.cities[index - 1];
  const next = trip.cities[index + 1];
  return (
    <nav aria-label={t("stopPager")} className="flex gap-2.5">
      <Button
        variant="outline"
        className="min-w-0 flex-1"
        disabled={!prev}
        aria-label={prev ? t("prevStop", { city: prev.name }) : undefined}
        onClick={() => onSelect(index - 1)}
      >
        <ChevronLeft /> <span className="truncate">{prev?.name ?? t("first")}</span>
      </Button>
      <Button
        variant="outline"
        className="min-w-0 flex-1"
        disabled={!next}
        aria-label={next ? t("nextStop", { city: next.name }) : undefined}
        onClick={() => onSelect(index + 1)}
      >
        <span className="truncate">{next?.name ?? t("last")}</span> <ChevronRight />
      </Button>
    </nav>
  );
}

const ROW_CLASS =
  "flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left text-base text-ink transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-brass-text";

function ToolRow({
  icon,
  label,
  onClick,
  href,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly onClick?: () => void;
  readonly href?: string;
}) {
  return (
    <li>
      {href ? (
        <Link href={href} className={ROW_CLASS}>
          {icon}
          {label}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={ROW_CLASS}>
          {icon}
          {label}
        </button>
      )}
    </li>
  );
}

/** Tools view: everything you can do with the route besides reading it. */
export function ToolList({
  variant,
  onPoster,
  onCalendar,
  onNavigate,
  onEditRoute,
}: {
  readonly variant: ExperienceVariant;
  readonly onPoster: () => void;
  /** Present for dated trips: downloads the stops as calendar events. */
  readonly onCalendar?: () => void;
  /** Opens the route in a maps app (Google Maps directions). */
  readonly onNavigate: () => void;
  readonly onEditRoute: () => void;
}) {
  const t = useTranslations("Trip.actions");
  return (
    <nav aria-label={t("tools")}>
      <ul className="divide-y divide-line">
        {variant === "demo" && (
          <ToolRow icon={<Pencil />} label={t("customize")} onClick={onEditRoute} />
        )}
        <ToolRow icon={<ImageDown />} label={t("poster")} onClick={onPoster} />
        {onCalendar && (
          <ToolRow
            icon={<CalendarPlus />}
            label={t("calendar")}
            onClick={onCalendar}
          />
        )}
        {variant !== "demo" && (
          <ToolRow
            icon={<Navigation />}
            label={t("navigate")}
            onClick={onNavigate}
          />
        )}
        {variant === "shared" ? (
          <ToolRow icon={<Plus />} label={t("createOwn")} href="/new" />
        ) : (
          <ToolRow icon={<Map />} label={t("myMaps")} href="/maps" />
        )}
      </ul>
    </nav>
  );
}
