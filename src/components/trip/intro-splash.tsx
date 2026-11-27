"use client";

import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/** How long the splash holds before lifting; the route draws right after. */
export const INTRO_HOLD_MS = 1900;

export function IntroSplash({
  title,
  eyebrow,
  route,
}: {
  readonly title: string;
  readonly eyebrow: string;
  readonly route: string;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHidden(true), INTRO_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-[90] grid place-items-center bg-paper transition-[opacity,visibility] duration-700",
        hidden && "invisible opacity-0",
      )}
    >
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <Logo className="mb-5 text-2xl" />
        <p className="eyebrow">{eyebrow}</p>
        <p className="font-display text-5xl font-normal tracking-tight sm:text-7xl">
          {title}
        </p>
        <p className="text-[15px] text-muted-foreground">{route}</p>
      </div>
    </div>
  );
}
