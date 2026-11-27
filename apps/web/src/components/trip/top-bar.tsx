"use client";

import { Map, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Logo } from "@/components/brand/logo";
import { UnitsButton } from "@/components/units/units-button";
import { useMounted } from "@/hooks/use-mounted";

const ICON_BUTTON =
  "grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-5";

function ThemeToggle() {
  const t = useTranslations("Theme");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? t("toLight") : t("toDark")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={ICON_BUTTON}
    >
      {isDark ? <Sun /> : <Moon />}
    </button>
  );
}

/**
 * The bar above the map: home (the logo), My maps, display units and
 * theme. A solid floating bar on phones, the top of the side card on
 * desktop.
 */
export function TopBar({ showMyMaps }: { readonly showMyMaps: boolean }) {
  const t = useTranslations("Trip.actions");
  return (
    <header className="flex h-14 items-center gap-1 rounded-2xl border border-line bg-sheet pr-1.5 pl-3 shadow-soft lg:h-16 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-5 lg:pt-3 lg:shadow-none">
      <Link
        href="/"
        className="mr-auto flex min-h-11 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Logo className="text-lg" />
      </Link>
      {showMyMaps && (
        <Link href="/maps" aria-label={t("myMaps")} className={ICON_BUTTON}>
          <Map />
        </Link>
      )}
      <UnitsButton />
      <ThemeToggle />
    </header>
  );
}
