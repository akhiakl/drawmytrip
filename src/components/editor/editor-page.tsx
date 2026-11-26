"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageLoading } from "@/components/page-loading";
import { ShareDialog } from "@/components/share/share-dialog";
import type { MapInsets } from "@/components/trip/fit-padding";
import { PanelShell } from "@/components/trip/panel-shell";
import type { SheetSnap } from "@/components/trip/sheet-snap";
import { UpsellModal } from "@/components/upsell/upsell-modal";
import type { GeneratedDraft } from "@/hooks/use-generate-trip";
import { useMounted } from "@/hooks/use-mounted";
import { useShareTrip } from "@/hooks/use-share-trip";
import { clearAiHandoff, redraftDefaults, type GenerateRequest } from "@/lib/ai";
import {
  addCity,
  canAddCity,
  draftFromTrip,
  draftIssues,
  draftToTrip,
  getLocalTrip,
  indexAfterMove,
  indexAfterRemove,
  insertCityAt,
  isShareable,
  moveCity,
  removeCityAt,
  saveLocalTrip,
  tripFingerprint,
  updateCityAt,
  updateLegAt,
  updateStartDate,
  updateTitle,
  type City,
  type DraftIssues,
  type Leg,
  type Trip,
} from "@/lib/trip";

import { AddStopDialog } from "./add-stop-dialog";
import {
  EditorActions,
  EditorSheetHead,
  EditorTopBar,
  EditorTripFields,
  TRIP_START_INPUT_ID,
  TRIP_TITLE_INPUT_ID,
} from "./editor-header";
import { EditorMapPreview } from "./editor-map-preview";
import { resolveInitialState } from "./initial-draft";
import { RedraftCard } from "./redraft-card";
import { StopList } from "./stop-list";
import { useDraftHistory } from "./use-draft-history";

const AUTOSAVE_DEBOUNCE_MS = 600;

/** The input id for an issue key, for fields the editor always shows. */
function fieldIdFor(key: string): string | null {
  if (key === "title") return TRIP_TITLE_INPUT_ID;
  if (key === "startDate") return TRIP_START_INPUT_ID;
  const match = /^cities\.(\d+)\.(name|nights)$/.exec(key);
  return match ? `stop-${match[1]}-${match[2]}` : null;
}

/** Undo group for an edit to one stop's or leg's fields, e.g. "city-2-name". */
const fieldGroup = (kind: string, index: number, patch: object) =>
  `${kind}-${index}-${Object.keys(patch)
    .sort((a, b) => a.localeCompare(b))
    .join(",")}`;

function focusFirstIssue(issues: DraftIssues) {
  for (const key of Object.keys(issues)) {
    const id = fieldIdFor(key);
    const field = id ? document.getElementById(id) : null;
    if (field) {
      field.focus();
      return;
    }
  }
}

/**
 * The draft comes from localStorage or the AI handoff, which only exist in
 * the browser — resolve it after mount so server and client HTML agree.
 */
export function EditorPage() {
  return useMounted() ? <EditorWorkspace /> : <PageLoading />;
}

function EditorWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("Editor");
  const stops = useTranslations("Editor.stops");
  const stopCopy = useTranslations("Editor.stop");
  // Resolved once: later URL changes (the autosave's ?remix= replace) must
  // not re-read storage or the already-consumed AI handoff.
  const [initial] = useState(() => resolveInitialState(searchParams));

  const { draft, update, undo, redo, canUndo, canRedo } = useDraftHistory(
    initial.draft,
  );
  const [localId, setLocalId] = useState(initial.localId);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [createdAt] = useState(initial.createdAt);
  const [ghostNames, setGhostNames] = useState(initial.ghostNames);
  const [request, setRequest] = useState(initial.request);
  // The stop being edited (focused in the list or picked on the map).
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [insets, setInsets] = useState<MapInsets>({});
  const [addOpen, setAddOpen] = useState(false);

  // The AI draft is now in state; consume the handoff so a later visit to
  // /new?from=ai starts blank. Cleared here, not while rendering (see
  // readAiHandoff).
  useEffect(() => {
    if (searchParams.get("from") === "ai") clearAiHandoff();
  }, [searchParams]);

  const { share, sharing, shareId, sharedTitle, dialogOpen, setDialogOpen } =
    useShareTrip({
      onCityLimit: () => setUpsellOpen(true),
    });

  // Saves the trip locally, adopting the new id (and URL) on first save.
  const persist = useCallback(
    (trip: Trip): string => {
      const id = saveLocalTrip(trip, localId ?? undefined);
      if (!localId) {
        setLocalId(id);
        router.replace(`/new?remix=${id}`, { scroll: false });
      }
      return id;
    },
    [localId, router],
  );

  useEffect(() => {
    if (!isShareable(draft)) return;
    const trip = draftToTrip(draft, createdAt);
    if (!trip) return;

    const timer = setTimeout(() => persist(trip), AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, createdAt, persist]);

  const issues = draftIssues(draft);
  const lastShare = localId ? getLocalTrip(localId)?.shared : undefined;
  const currentTrip = draftToTrip(draft, createdAt);
  const shareStale =
    lastShare !== undefined &&
    currentTrip !== null &&
    tripFingerprint(currentTrip) !== lastShare.fingerprint;

  const handleRedraft = (
    { trip, suggestedExtra }: GeneratedDraft,
    next: GenerateRequest,
  ) => {
    update((d) => ({ ...draftFromTrip(trip), startDate: d.startDate }));
    setGhostNames(suggestedExtra);
    setRequest(next);
    toast.success(t("redrafted"));
  };

  const handleMove = (from: number, to: number) => {
    update((d) => moveCity(d, from, to));
    setActiveIndex((i) => (i === null ? null : indexAfterMove(i, from, to)));
  };

  // The toast's Undo puts the stop back where it was, as a new history
  // step, so it still works after later edits (Ctrl+Z steps back in order).
  const handleRemove = (index: number) => {
    const city = draft.cities[index];
    update((d) => removeCityAt(d, index));
    setActiveIndex((i) => (i === null ? null : indexAfterRemove(i, index)));
    toast(stops("removed", { name: city.name || stopCopy("fallbackName") }), {
      action: {
        label: t("undo"),
        onClick: () => update((d) => insertCityAt(d, index, city)),
      },
    });
  };

  // A stop picked on the map raises the sheet and scrolls its row into view.
  const selectFromMap = (index: number) => {
    setActiveIndex(index);
    setSnap((current) => (current === "peek" ? "half" : current));
    document.getElementById(`stop-${index}`)?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  const handleShare = () => {
    if (Object.keys(issues).length > 0) {
      // A lowered sheet is inert, so raise it before focusing a stop field.
      setSnap((current) => (current === "peek" ? "half" : current));
      requestAnimationFrame(() => focusFirstIssue(issues));
      toast.error(t("fixBeforeShare"));
      return;
    }
    const trip = draftToTrip(draft, createdAt);
    // Save first so the share is recorded against exactly what was shared.
    if (trip) void share(trip, persist(trip));
  };

  const issueText = (key?: DraftIssues[string]) => key && t(`issues.${key}`);

  return (
    <div className="relative isolate h-dvh w-full overflow-hidden">
      <PanelShell
        label={t("sheetLabel")}
        snap={snap}
        onSnapChange={setSnap}
        bodyId="editor-stops"
        onInsetsChange={setInsets}
        topBar={
          <EditorTopBar
            title={draft.title}
            onTitleChange={(title) => update((d) => updateTitle(d, title), "title")}
            titleError={issueText(issues.title)}
            history={{ canUndo, canRedo, onUndo: undo, onRedo: redo }}
          />
        }
        head={
          <EditorSheetHead
            count={draft.cities.length}
            titleError={issueText(issues.title)}
          />
        }
        footer={
          <EditorActions
            onAdd={() =>
              canAddCity(draft) ? setAddOpen(true) : setUpsellOpen(true)
            }
            onShare={handleShare}
            canShare={isShareable(draft)}
            sharing={sharing}
          />
        }
      >
        <div className="flex flex-col gap-5 px-4 pt-1 lg:px-6">
          <EditorTripFields
            shareStale={shareStale}
            startDate={draft.startDate ?? ""}
            onStartDateChange={(value) =>
              update((d) => updateStartDate(d, value), "startDate")
            }
            startDateError={issueText(issues.startDate)}
          />
          <StopList
            cities={draft.cities}
            keys={draft.keys}
            legs={draft.legs}
            canAddCity={canAddCity(draft)}
            onLimitReached={() => setUpsellOpen(true)}
            issues={issues}
            onRemoveCity={handleRemove}
            onMoveCity={handleMove}
            activeIndex={activeIndex}
            onActivate={setActiveIndex}
            onUpdateCity={(index, patch) =>
              update(
                (d) => updateCityAt(d, index, patch),
                fieldGroup("city", index, patch),
              )
            }
            onUpdateLeg={(index, patch: Partial<Leg>) =>
              update(
                (d) => updateLegAt(d, index, patch),
                fieldGroup("leg", index, patch),
              )
            }
          />
          {draft.cities.length > 0 && (
            <RedraftCard
              key={JSON.stringify(request)}
              defaults={redraftDefaults(draft, request)}
              onDrafted={handleRedraft}
            />
          )}
        </div>
      </PanelShell>

      <main aria-label={t("mapLabel")} className="absolute inset-0 z-0">
        <EditorMapPreview
          draft={draft}
          ghostNames={ghostNames}
          onGhostSelect={() => setUpsellOpen(true)}
          selectedIndex={activeIndex}
          onCitySelect={selectFromMap}
          insets={insets}
        />
      </main>

      <AddStopDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        count={draft.cities.length}
        onAdd={(city: City) => update((d) => addCity(d, city))}
      />
      <ShareDialog
        shareId={shareId}
        title={sharedTitle}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <UpsellModal open={upsellOpen} onOpenChange={setUpsellOpen} />
    </div>
  );
}
