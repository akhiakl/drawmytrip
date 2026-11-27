"use client";

import { m, useDragControls, type PanInfo } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

import type { MapInsets } from "./fit-padding";
import { nextSnap, snapHeights, visibleHeight, type SheetSnap } from "./sheet-snap";

/** Where the handle sends a tap: peek opens to half, anything else lowers. */
const TAP_NEXT: Record<SheetSnap, SheetSnap> = {
  peek: "half",
  half: "peek",
  full: "half",
};

type Size = {
  viewport: number;
  sheet: number;
  head: number;
  bar: number;
  topBar: number;
  right: number;
};

/**
 * The trip panel's frame. Phones: a floating top bar, a sheet over the
 * map that rests at three heights (peek shows the head, half, full) and a
 * fixed action bar in the thumb zone. Desktop (`lg`): the same three
 * parts stacked in one 440px side card. `onInsetsChange` reports the map
 * area covered, so fits and focus pans stay clear of it.
 */
export function PanelShell({
  label,
  topBar,
  head,
  footer,
  bodyId,
  snap,
  onSnapChange,
  onInsetsChange,
  children,
}: {
  readonly label: string;
  readonly topBar: ReactNode;
  readonly head: ReactNode;
  readonly footer: ReactNode;
  readonly bodyId: string;
  readonly snap: SheetSnap;
  readonly onSnapChange: (snap: SheetSnap) => void;
  readonly onInsetsChange: (insets: MapInsets) => void;
  readonly children: ReactNode;
}) {
  const t = useTranslations("Trip.panel");
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const dragControls = useDragControls();
  const cardRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  // No slide until the first measure, so the sheet doesn't animate in.
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState<Size>({
    viewport: 0,
    sheet: 0,
    head: 0,
    bar: 0,
    topBar: 0,
    right: 0,
  });
  const heights = snapHeights({
    viewport: size.viewport,
    sheet: size.sheet,
    peek: size.head + size.bar,
  });
  const offset = heights.full - heights[snap];
  useLayoutEffect(() => {
    const parts = [cardRef, topBarRef, sheetRef, headRef, barRef].map(
      (r) => r.current,
    );
    const [card, top, sheet, headEl, bar] = parts;
    if (!card || !top || !sheet || !headEl || !bar) return;
    const measure = () =>
      setSize({
        viewport: window.innerHeight,
        sheet: sheet.offsetHeight,
        head: headEl.offsetTop + headEl.offsetHeight,
        bar: bar.offsetHeight,
        topBar: Math.round(top.getBoundingClientRect().bottom),
        // Desktop: the card's right edge, in viewport px.
        right: Math.round(card.getBoundingClientRect().right),
      });
    measure();
    const frame = requestAnimationFrame(() => setReady(true));
    const observer = new ResizeObserver(measure);
    for (const el of [card, top, sheet, headEl, bar]) observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const shown = visibleHeight(snap, heights);
  useEffect(() => {
    if (isDesktop) onInsetsChange({ left: size.right });
    else onInsetsChange({ top: size.topBar, bottom: shown });
  }, [isDesktop, size.right, size.topBar, shown, onInsetsChange]);

  const onDragEnd = (_: unknown, { offset: drag, velocity }: PanInfo) => {
    // The drag springs back to its origin while the resting position
    // (a plain CSS transform below) slides to the new snap.
    const next = nextSnap(snap, drag.y, velocity.y, heights);
    if (next !== snap) onSnapChange(next);
  };

  return (
    // Phones: no box of its own, so the bars can be fixed to the screen.
    <div
      ref={cardRef}
      className="contents lg:fixed lg:top-4 lg:bottom-4 lg:left-4 lg:z-40 lg:flex lg:w-(--card-w) lg:flex-col lg:overflow-hidden lg:rounded-3xl lg:border lg:border-line lg:bg-sheet lg:shadow-soft"
    >
      <div
        ref={topBarRef}
        className="fixed inset-x-3 top-3 z-50 lg:static lg:shrink-0"
      >
        {topBar}
      </div>
      {/* Resting height is a CSS transform (it works before the lazy
          motion features load, and reduced motion drops its transition);
          the motion layer inside only carries a drag. */}
      <div
        ref={sheetRef}
        style={isDesktop ? undefined : { transform: `translateY(${offset}px)` }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 h-[calc(100dvh-5rem)] lg:static lg:h-auto lg:min-h-0 lg:flex-1 lg:transform-none!",
          ready && "transition-transform duration-300 ease-atlas",
        )}
      >
        <m.section
          aria-label={label}
          drag={isDesktop ? false : "y"}
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{
            top: -offset,
            bottom: heights.full - heights.peek - offset,
          }}
          dragElastic={0.06}
          dragMomentum={false}
          dragSnapToOrigin
          onDragStart={() => (dragged.current = true)}
          onDragEnd={onDragEnd}
          className="flex h-full flex-col rounded-t-3xl border-t border-line bg-sheet shadow-sheet lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:transform-none!"
        >
          <div
            ref={headRef}
            className="shrink-0 touch-pan-x lg:touch-auto"
            onPointerDown={(event) => {
              if (!isDesktop) dragControls.start(event);
            }}
          >
            <button
              type="button"
              aria-expanded={snap !== "peek"}
              aria-controls={bodyId}
              aria-label={snap === "peek" ? t("expandSheet") : t("collapseSheet")}
              onClick={() => {
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                onSnapChange(TAP_NEXT[snap]);
              }}
              className="flex h-6 w-full touch-none items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset lg:hidden"
            >
              <span aria-hidden className="h-1.5 w-10 rounded-full bg-ink-soft/35" />
            </button>
            {head}
          </div>
          <div
            id={bodyId}
            inert={!isDesktop && snap === "peek"}
            // The sheet slides down rather than shrinking, so pad the part
            // below the screen and the action bar to keep every row reachable.
            style={isDesktop ? undefined : { paddingBottom: offset + size.bar + 16 }}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:pb-6"
          >
            {children}
          </div>
        </m.section>
      </div>
      <div
        ref={barRef}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-sheet px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:shrink-0 lg:px-6 lg:pt-4 lg:pb-5"
      >
        {footer}
      </div>
    </div>
  );
}
