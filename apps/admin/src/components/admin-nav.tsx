"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function AdminNav({
  label,
  items,
}: Readonly<{ label: string; items: { href: string; label: string }[] }>) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex w-full gap-2">
      {items.map((item) => {
        const current = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-11 items-center rounded-full border px-4 text-base",
              current
                ? "border-brass-strong bg-card-solid text-ink"
                : "border-line text-ink-soft hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
