"use client";

import {
  ChartColumn,
  LayoutDashboard,
  ScrollText,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ICONS = {
  overview: LayoutDashboard,
  usage: ChartColumn,
  limits: SlidersHorizontal,
  audit: ScrollText,
} as const;

export type NavId = keyof typeof ICONS;

const HREF: Record<NavId, string> = {
  overview: "/",
  usage: "/usage",
  limits: "/limits",
  audit: "/audit",
};

const isCurrent = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

/**
 * The four sections: a vertical list in the desktop sidebar, a bottom tab
 * bar in the thumb zone on phones.
 */
export function NavLinks({
  label,
  items,
  variant,
}: Readonly<{
  label: string;
  items: { id: NavId; label: string }[];
  variant: "side" | "tabs";
}>) {
  const pathname = usePathname();
  const tabs = variant === "tabs";
  return (
    <nav aria-label={label}>
      <ul className={tabs ? "grid grid-cols-4" : "flex flex-col gap-1"}>
        {items.map((item) => {
          const Icon = ICONS[item.id];
          const current = isCurrent(pathname, HREF[item.id]);
          return (
            <li key={item.id}>
              <Link
                href={HREF[item.id]}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  tabs
                    ? "flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-medium"
                    : "flex h-11 items-center gap-3 rounded-xl px-3 text-base",
                  current ? "text-ink" : "text-ink-soft hover:text-ink",
                  current && !tabs && "bg-secondary font-medium",
                )}
              >
                <span
                  className={cn(
                    "grid place-items-center",
                    tabs && "h-7 w-12 rounded-full",
                    tabs && current && "bg-accent",
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn("size-5", current && "text-brass-text")}
                  />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
