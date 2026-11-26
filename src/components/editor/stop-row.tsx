"use client";

import {
  CircleAlert,
  GripVertical,
  MoreHorizontal,
  MoveDown,
  MoveUp,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useRef,
  useState,
  type DragEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { City } from "@/lib/trip";
import { cn } from "@/lib/utils";

import { NightsStepper } from "./nights-stepper";
import { StopRowDetails } from "./stop-row-details";
import type { DropSide } from "./use-stop-drag";

/** Inline validation messages for the always-visible fields. */
export type StopRowErrors = { readonly name?: string; readonly nights?: string };

/**
 * One stop as a compact row: grip, flag, name, a nights stepper and a menu
 * (edit details, move, remove). Its identity fields open with the details,
 * and stay open while the stop has no name or a name problem.
 */
export function StopRow({
  city,
  index,
  count,
  expanded,
  onToggleExpand,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragging,
  dropSide = null,
  gripProps,
  active = false,
  errors = {},
}: {
  readonly city: City;
  readonly index: number;
  readonly count: number;
  readonly expanded: boolean;
  readonly onToggleExpand: () => void;
  readonly onChange: (patch: Partial<City>) => void;
  readonly onRemove: () => void;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly draggable: boolean;
  readonly onDragStart: DragEventHandler<HTMLDivElement>;
  readonly onDragOver: DragEventHandler<HTMLDivElement>;
  readonly onDrop: DragEventHandler<HTMLDivElement>;
  readonly onDragEnd: DragEventHandler<HTMLDivElement>;
  readonly dragging: boolean;
  /** Where a dragged stop would land relative to this one. */
  readonly dropSide?: DropSide;
  /** Holding the grip is what makes the row draggable. */
  readonly gripProps?: {
    readonly onPointerDown: PointerEventHandler<HTMLDivElement>;
    readonly onPointerUp: PointerEventHandler<HTMLDivElement>;
  };
  /** The stop being edited, shown on the map. */
  readonly active?: boolean;
  readonly errors?: StopRowErrors;
}) {
  const t = useTranslations("Editor.stop");
  const name = city.name || t("fallbackName");
  const nameErrorId = `stop-${index}-name-error`;
  const nightsErrorId = `stop-${index}-nights-error`;
  const movedFocus = useRef(false);
  const leaveWith = (action: () => void) => {
    movedFocus.current = true;
    action();
  };

  const nightsLabel = t("nights");
  // A blank stop or one with a name problem shows its identity fields.
  // Typing a blank stop's first letter must not fold its fields away, so
  // they stay open until focus leaves them.
  const [typing, setTyping] = useState(false);
  const showDetails = expanded || typing || !city.name || Boolean(errors.name);

  return (
    <Card
      id={`stop-${index}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "relative gap-2 p-1.5 transition-opacity",
        dragging && "opacity-40",
        active && "border-brass-strong",
      )}
    >
      {dropSide && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-4 h-0.5 rounded-full bg-brass-strong",
            dropSide === "before" ? "-top-1.5" : "-bottom-1.5",
          )}
        />
      )}
      <div className="flex items-center gap-1">
        <div
          className="grid h-11 w-7 shrink-0 cursor-grab touch-none place-items-center text-muted-foreground active:cursor-grabbing"
          aria-hidden
          {...gripProps}
        >
          <GripVertical className="size-5" />
        </div>
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-lg"
        >
          {city.flag}
        </span>
        <span
          title={name}
          className="ml-1.5 min-w-0 flex-1 truncate font-display text-lg font-medium"
        >
          {city.name || t("fallbackName")}
        </span>

        <NightsStepper
          nightsId={`stop-${index}-nights`}
          name={name}
          nights={city.nights}
          label={nightsLabel}
          errorId={errors.nights ? nightsErrorId : undefined}
          onChange={(nights) => onChange({ nights })}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id={`stop-${index}-menu`}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("more", { name })}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            // Move and remove place focus themselves (on the moved stop or
            // the next one), so the menu must not pull it back to this row.
            onCloseAutoFocus={(event) => {
              if (!movedFocus.current) return;
              movedFocus.current = false;
              event.preventDefault();
            }}
          >
            <DropdownMenuItem onSelect={onToggleExpand}>
              <Pencil /> {expanded ? t("collapse") : t("expand")}
            </DropdownMenuItem>
            <DropdownMenuItem
              id={`stop-${index}-move-up`}
              disabled={index === 0}
              onSelect={() => leaveWith(onMoveUp)}
            >
              <MoveUp /> {t("moveUp", { name })}
            </DropdownMenuItem>
            <DropdownMenuItem
              id={`stop-${index}-move-down`}
              disabled={index === count - 1}
              onSelect={() => leaveWith(onMoveDown)}
            >
              <MoveDown /> {t("moveDown", { name })}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => leaveWith(onRemove)}
            >
              <Trash2 /> {t("remove", { name })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <FieldError id={nightsErrorId} message={errors.nights} />

      {showDetails && (
        <div
          className="flex flex-col gap-4 px-2.5 pt-2 pb-3"
          onFocus={() => setTyping(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setTyping(false);
          }}
        >
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)]">
            <Field id={`stop-${index}-flag`} label={t("flag")}>
              <Input
                id={`stop-${index}-flag`}
                value={city.flag}
                maxLength={8}
                onChange={(e) => onChange({ flag: e.target.value })}
              />
            </Field>
            <Field id={`stop-${index}-name`} label={t("city")}>
              <Input
                id={`stop-${index}-name`}
                value={city.name}
                maxLength={60}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? nameErrorId : undefined}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </Field>
            <Field
              id={`stop-${index}-country`}
              label={t("country")}
              className="col-span-2 sm:col-span-1"
            >
              <Input
                id={`stop-${index}-country`}
                value={city.country}
                maxLength={60}
                onChange={(e) => onChange({ country: e.target.value })}
              />
            </Field>
          </div>
          <FieldError id={nameErrorId} message={errors.name} />
          {expanded && (
            <StopRowDetails city={city} index={index} onChange={onChange} />
          )}
        </div>
      )}
    </Card>
  );
}

function Field({
  id,
  label,
  className,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function FieldError({
  id,
  message,
}: {
  readonly id: string;
  readonly message?: string;
}) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-1.5 px-2.5 text-sm text-destructive">
      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
