"use client";

import { Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/hooks/use-mounted";
import {
  packingList,
  readTripTools,
  type PackingItem as SuggestedItem,
  TRIP_TOOLS_LIMITS,
  writeTripTools,
  type Trip,
  type TripToolsScope,
  type TripToolsState,
} from "@/lib/trip";
import { cn } from "@/lib/utils";

import type { ToolId } from "./panel-actions";

function ToolSection({
  open,
  title,
  children,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section hidden={!open} aria-label={title} className="flex flex-col gap-3">
      {children}
    </section>
  );
}

function PackingItem({
  item,
  checked,
  onToggle,
  onRemove,
}: {
  readonly item: string;
  readonly checked: boolean;
  readonly onToggle: () => void;
  readonly onRemove: () => void;
}) {
  const t = useTranslations("Trip.tools");
  // useId, not the list index: the tools render in more than one place, and
  // a repeated id would leave every copy's checkbox without its label.
  const id = useId();
  return (
    <li className="flex min-h-12 items-center gap-3 text-base">
      <Checkbox
        id={id}
        aria-label={item}
        checked={checked}
        onCheckedChange={onToggle}
      />
      <label
        htmlFor={id}
        className={cn(
          "flex-1 cursor-pointer py-2.5",
          checked && "text-muted-foreground line-through",
        )}
      >
        {item}
      </label>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("removeItem", { item })}
        className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft outline-none hover:bg-secondary hover:text-ink focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
      >
        <X />
      </button>
    </li>
  );
}

function AddItemForm({ onAdd }: { readonly onAdd: (item: string) => void }) {
  const t = useTranslations("Trip.tools");
  const [value, setValue] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) onAdd(value.trim());
        setValue("");
      }}
    >
      <Input
        name="item"
        aria-label={t("addItem")}
        placeholder={t("addItemPlaceholder")}
        maxLength={80}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        type="submit"
        aria-label={t("addItemButton")}
        className="grid size-12 shrink-0 place-items-center rounded-lg border border-line bg-card-solid text-ink outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-5"
      >
        <Plus />
      </button>
    </form>
  );
}

type ToolsProps = {
  readonly trip: Trip;
  readonly scope: TripToolsScope;
  readonly active: ToolId | null;
};

/**
 * Packing checklist (shaped by the trip, plus the viewer's own items) and
 * notes, saved per trip in this browser. Both stay mounted (hidden when
 * inactive) so ticks and text survive switching back to the route. Saved
 * state lives in localStorage, so the body renders after mount only.
 */
export function TripTools(props: ToolsProps) {
  return useMounted() ? (
    <ToolsBody key={JSON.stringify(props.scope)} {...props} />
  ) : null;
}

/** A checklist row: a suggested item (translated) or one the viewer added. */
type ChecklistItem = { id: string; label: string };

const customId = (text: string) => `custom:${text}`;

function useSuggestedLabel() {
  const t = useTranslations("Trip.packing");
  const list = new Intl.ListFormat(useLocale(), {
    style: "long",
    type: "conjunction",
  });
  return (item: SuggestedItem) =>
    item.key === "adapter"
      ? t("adapter", { type: item.type, countries: list.format(item.countries) })
      : t(item.key);
}

function ToolsBody({ trip, scope, active }: ToolsProps) {
  const t = useTranslations("Trip.tools");
  const label = useSuggestedLabel();
  const [state, setState] = useState<TripToolsState>(() => readTripTools(scope));
  const suggested = useMemo(() => packingList(trip), [trip]);
  const hidden = new Set(state.hidden);
  const hiddenCount = suggested.filter((item) => hidden.has(item.id)).length;
  const items: ChecklistItem[] = [
    ...suggested
      .filter((item) => !hidden.has(item.id))
      .map((item) => ({ id: item.id, label: label(item) })),
    ...state.custom.map((text) => ({ id: customId(text), label: text })),
  ];
  const checked = new Set(state.checked);

  const update = (patch: Partial<TripToolsState>) => {
    const next = { ...state, ...patch };
    setState(next);
    writeTripTools(scope, next);
  };

  const toggle = (id: string) =>
    update({
      checked: checked.has(id)
        ? state.checked.filter((c) => c !== id)
        : [...state.checked, id],
    });

  const addItem = (text: string) => {
    if (
      state.custom.includes(text) ||
      state.custom.length >= TRIP_TOOLS_LIMITS.customItems
    )
      return;
    update({ custom: [...state.custom, text] });
  };

  // Own items are deleted; suggestions are hidden so they can come back.
  const removeItem = (id: string) =>
    update({
      custom: state.custom.filter((text) => customId(text) !== id),
      hidden: id.startsWith("custom:") ? state.hidden : [...state.hidden, id],
      checked: state.checked.filter((c) => c !== id),
    });

  const done = items.filter((item) => checked.has(item.id)).length;
  const progress = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <>
      <ToolSection open={active === "packing"} title={t("packingTitle")}>
        <progress
          aria-label={t("packed")}
          value={progress}
          max={100}
          className="h-1 w-full appearance-none overflow-hidden rounded-full bg-secondary [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-brass [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-brass"
        />
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <PackingItem
              key={item.id}
              item={item.label}
              checked={checked.has(item.id)}
              onToggle={() => toggle(item.id)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </ul>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => update({ hidden: [] })}
            className="min-h-11 w-fit rounded text-sm text-brass-text underline underline-offset-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("restoreSuggestions", { count: hiddenCount })}
          </button>
        )}
        <AddItemForm onAdd={addItem} />
      </ToolSection>

      <ToolSection open={active === "notes"} title={t("notesTitle")}>
        <textarea
          name="notes"
          aria-label={t("notesTitle")}
          value={state.notes}
          maxLength={TRIP_TOOLS_LIMITS.notesLength}
          onChange={(event) => update({ notes: event.target.value })}
          placeholder={t("notesPlaceholder")}
          className="min-h-48 w-full resize-y rounded-lg border border-input bg-card-solid p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-sm text-ink-soft">{t("notesPrivacy")}</p>
      </ToolSection>
    </>
  );
}
