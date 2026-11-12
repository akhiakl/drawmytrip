import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";

import { TripExperience } from "@/components/trip/trip-experience";
import { emit } from "@/lib/logging";
import { tripStats } from "@/lib/trip";
import { getTrip, incrViews } from "@/lib/trip/service";

type Params = { id: string };

// generateMetadata and the page component both need the trip; React's
// per-request cache dedupes the underlying GETEX to a single Redis call.
const loadTrip = cache((id: string) => getTrip(id));

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const trip = await loadTrip(id);
  const t = await getTranslations("Metadata.shared");
  // Shared maps are private-by-link: unfurl them, never index them.
  if (!trip) return { title: t("notFound"), robots: { index: false } };

  const stats = tripStats(trip);
  const description = t("description", {
    cities: stats.cities,
    nights: stats.nights,
    countries: stats.countries,
  });
  // A route's openGraph replaces the layout's wholesale, so repeat siteName.
  return {
    title: trip.title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: `/t/${id}` },
    openGraph: {
      type: "website",
      siteName: (await getTranslations("Common"))("appName"),
      title: trip.title,
      description,
      url: `/t/${id}`,
    },
    twitter: { card: "summary_large_image", title: trip.title, description },
  };
}

export default async function SharedTripPage({
  params,
}: {
  readonly params: Promise<Params>;
}) {
  const { id } = await params;
  const trip = await loadTrip(id);
  if (!trip) {
    emit("warn", "trip not found", { route: "/t/[id]", status: 404 });
    notFound();
  }

  const views = await incrViews(id);
  emit("info", "trip viewed", { route: "/t/[id]" });

  return <TripExperience trip={trip} actions="shared" shareId={id} views={views} />;
}
