"use client";

import { Compass, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { PageBar } from "@/components/brand/page-bar";
import { downloadFile } from "@/components/download-file";
import { ShareDialog } from "@/components/share/share-dialog";
import { Button } from "@/components/ui/button";
import { UpsellModal } from "@/components/upsell/upsell-modal";
import { useMounted } from "@/hooks/use-mounted";
import { useShareTrip } from "@/hooks/use-share-trip";
import {
  deleteLocalTrip,
  duplicateLocalTrip,
  importLocalTrip,
  listLocalTrips,
  serializeTripFile,
  tripFileSlug,
  type LocalTripRecord,
  type Trip,
} from "@/lib/trip";
import { cn } from "@/lib/utils";

import { ImportTripButton } from "./import-trip-button";
import { TripCard } from "./trip-card";

/** Start a new map (outline) or plan one with AI (the screen's brass). */
function MapsActions({ className }: { readonly className?: string }) {
  const t = useTranslations("Maps");
  return (
    <div className={cn("flex gap-2.5", className)}>
      <Button asChild variant="outline" className="flex-1 lg:flex-none">
        <Link href="/new">
          <Plus /> {t("newMap")}
        </Link>
      </Button>
      <Button asChild variant="brass" className="flex-1 lg:flex-none">
        <Link href="/plan">
          <Sparkles /> {t("planWithAi")}
        </Link>
      </Button>
    </div>
  );
}

export function MapsPage() {
  const mounted = useMounted();
  const t = useTranslations("Maps");
  // Bumped to force a fresh `listLocalTrips()` read after a delete — the
  // store has no subscription mechanism, so this is a manual invalidation.
  const [, forceRefresh] = useState(0);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);

  const records: LocalTripRecord[] = mounted ? listLocalTrips() : [];

  const { share, shareId, sharedTitle, dialogOpen, setDialogOpen } = useShareTrip({
    onCityLimit: () => setUpsellOpen(true),
    onShared: () => refresh(),
  });

  const handleShare = async (record: LocalTripRecord) => {
    setSharingId(record.id);
    await share(record.trip, record.id);
    setSharingId(null);
  };

  const refresh = () => forceRefresh((key) => key + 1);

  const handleDelete = (id: string) => {
    deleteLocalTrip(id);
    refresh();
  };

  const handleDuplicate = (record: LocalTripRecord) => {
    duplicateLocalTrip(record.id);
    refresh();
  };

  const handleExport = ({ trip }: LocalTripRecord) =>
    downloadFile(
      `${tripFileSlug(trip.title)}.grand-tour.json`,
      serializeTripFile(trip),
      "application/json",
    );

  const handleImport = (trip: Trip) => {
    importLocalTrip(trip);
    refresh();
    toast.success(t("imported", { title: trip.title }));
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <PageBar title={t("title")}>
        <ImportTripButton onImport={handleImport} />
      </PageBar>
      <main className="page-container flex flex-1 flex-col gap-6 pt-4 pb-28 lg:pt-8 lg:pb-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-ink-soft">{t("device")}</p>
          {/* Phones keep these in the thumb zone; desktop puts them here. */}
          <MapsActions className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:border-0 lg:bg-transparent lg:p-0" />
        </div>

        {mounted && records.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-5 text-center">
            <Compass aria-hidden className="size-12 text-brass-text" />
            <p className="max-w-[40ch] text-lead text-ink-soft">{t("empty")}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          {records.map((record) => (
            <TripCard
              key={record.id}
              record={record}
              sharing={sharingId === record.id}
              onShare={() => void handleShare(record)}
              onDuplicate={() => handleDuplicate(record)}
              onExport={() => handleExport(record)}
              onDelete={() => handleDelete(record.id)}
            />
          ))}
        </div>
      </main>

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
