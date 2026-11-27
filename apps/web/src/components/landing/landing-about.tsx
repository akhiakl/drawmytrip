import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { GUEST_MAX_CITIES, SHARE_TTL_DAYS } from "@/lib/trip";

const linkClass =
  "underline underline-offset-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring rounded-sm outline-none";

const plan = (chunks: ReactNode) => (
  <Link href="/plan" className={linkClass}>
    {chunks}
  </Link>
);
const build = (chunks: ReactNode) => (
  <Link href="/new" className={linkClass}>
    {chunks}
  </Link>
);
const how = (chunks: ReactNode) => (
  <Link href="/about" className={linkClass}>
    {chunks}
  </Link>
);
const osm = (chunks: ReactNode) => (
  <a
    href="https://www.openstreetmap.org/copyright"
    target="_blank"
    rel="noopener noreferrer"
    className={linkClass}
  >
    {chunks}
  </a>
);

/**
 * Plain-language text under the example route: what the product does,
 * with links to its main pages. It is the page's readable content for
 * visitors and search engines, as the rest of the landing is a map.
 */
export function LandingAbout() {
  const t = useTranslations("Landing.about");
  return (
    <section className="flex flex-col gap-2 text-[13.5px] leading-relaxed text-ink-soft">
      <h2 className="font-display text-lg font-medium text-ink">{t("title")}</h2>
      <p>{t.rich("plan", { plan, build })}</p>
      <p>{t("ai")}</p>
      <p>{t.rich("share", { max: GUEST_MAX_CITIES, days: SHARE_TTL_DAYS, how })}</p>
      <p>{t.rich("credit", { osm })}</p>
    </section>
  );
}
