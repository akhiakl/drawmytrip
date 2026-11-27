"use client";

import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  Loader2,
  Plus,
  Redo2,
  RefreshCw,
  Share2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GUEST_MAX_CITIES } from "@/lib/trip";

import { ADD_STOP_BUTTON_ID } from "./add-stop-dialog";

export const TRIP_TITLE_INPUT_ID = "trip-title";
export const TRIP_START_INPUT_ID = "trip-start-date";

const ICON_BUTTON =
  "grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 [&_svg]:size-5";

function FieldError({
  id,
  message,
}: {
  readonly id: string;
  readonly message: string;
}) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm text-destructive">
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/** The bar over the map: back to My maps, the trip title, undo and redo. */
export function EditorTopBar({
  title,
  onTitleChange,
  titleError,
  history,
}: {
  readonly title: string;
  readonly onTitleChange: (title: string) => void;
  readonly titleError?: string;
  readonly history: {
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    readonly onUndo: () => void;
    readonly onRedo: () => void;
  };
}) {
  const t = useTranslations("Editor");
  return (
    <header className="flex h-14 items-center gap-0.5 rounded-2xl border border-line bg-sheet px-1.5 shadow-soft lg:h-16 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-4 lg:pt-3 lg:shadow-none">
      <Link href="/maps" aria-label={t("backToMaps")} className={ICON_BUTTON}>
        <ArrowLeft />
      </Link>
      <Input
        id={TRIP_TITLE_INPUT_ID}
        aria-label={t("titleLabel")}
        aria-invalid={titleError ? true : undefined}
        aria-describedby={titleError ? "trip-title-error" : undefined}
        value={title}
        maxLength={80}
        onChange={(e) => onTitleChange(e.target.value)}
        className="h-11 min-w-0 flex-1 border-0 bg-transparent px-1.5 font-display text-lg font-medium shadow-none aria-invalid:ring-2 aria-invalid:ring-destructive"
      />
      <button
        type="button"
        aria-label={t("undo")}
        title={t("undoHint")}
        aria-keyshortcuts="Control+Z Meta+Z"
        disabled={!history.canUndo}
        onClick={history.onUndo}
        className={ICON_BUTTON}
      >
        <Undo2 />
      </button>
      <button
        type="button"
        aria-label={t("redo")}
        title={t("redoHint")}
        aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
        disabled={!history.canRedo}
        onClick={history.onRedo}
        className={ICON_BUTTON}
      >
        <Redo2 />
      </button>
    </header>
  );
}

/** Optional first day: dates the itinerary and unlocks calendar export. */
function StartDateField({
  value,
  onChange,
  error,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
}) {
  const t = useTranslations("Editor");
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5">
        <label
          htmlFor={TRIP_START_INPUT_ID}
          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-ink"
        >
          <CalendarDays className="size-4 text-brass-text" aria-hidden />
          {t("startsLabel")}
        </label>
        <Input
          id={TRIP_START_INPUT_ID}
          type="date"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "trip-start-error" : "trip-start-hint"}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 min-w-0 flex-1"
        />
      </div>
      {error ? (
        <FieldError id="trip-start-error" message={error} />
      ) : (
        <span id="trip-start-hint" className="text-sm text-ink-soft">
          {t("startsHint")}
        </span>
      )}
    </div>
  );
}

/** Top of the editor sheet (all the peek height shows): the stop count. */
export function EditorSheetHead({
  count,
  titleError,
}: {
  readonly count: number;
  readonly titleError?: string;
}) {
  const t = useTranslations("Editor");
  return (
    <header className="flex flex-col gap-2 px-4 pt-1 pb-3 lg:px-6 lg:pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-medium">{t("stops.heading")}</h2>
        <span className="eyebrow">
          {t("stops.counter", { count, max: GUEST_MAX_CITIES })}
        </span>
      </div>
      {titleError && <FieldError id="trip-title-error" message={titleError} />}
    </header>
  );
}

/** Trip-wide fields above the stops: the share status and start date. */
export function EditorTripFields({
  shareStale,
  startDate,
  onStartDateChange,
  startDateError,
}: {
  /** Edited since its last share: the link still shows the older version. */
  readonly shareStale?: boolean;
  readonly startDate: string;
  readonly onStartDateChange: (value: string) => void;
  readonly startDateError?: string;
}) {
  const t = useTranslations("Editor");
  return (
    <div className="flex flex-col gap-3">
      {shareStale && (
        <p className="flex items-center gap-1.5 text-sm text-brass-text">
          <RefreshCw className="size-4 shrink-0" aria-hidden />
          {t("shareStale")}
        </p>
      )}
      <StartDateField
        value={startDate}
        onChange={onStartDateChange}
        error={startDateError}
      />
    </div>
  );
}

/** The action bar: add a stop, and share (the one brass action). */
export function EditorActions({
  onAdd,
  onShare,
  canShare,
  sharing,
}: {
  readonly onAdd: () => void;
  readonly onShare: () => void;
  readonly canShare: boolean;
  readonly sharing: boolean;
}) {
  const t = useTranslations("Editor");
  return (
    <div className="flex gap-2.5">
      <Button
        id={ADD_STOP_BUTTON_ID}
        type="button"
        variant="outline"
        className="flex-1"
        onClick={onAdd}
      >
        <Plus /> {t("stops.add")}
      </Button>
      <Button
        type="button"
        variant="brass"
        className="flex-1"
        disabled={!canShare || sharing}
        onClick={onShare}
      >
        {sharing ? <Loader2 className="animate-spin" /> : <Share2 />}
        {t("share")}
      </Button>
    </div>
  );
}
