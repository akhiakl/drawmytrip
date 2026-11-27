import { CircleAlert, CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export type CalloutTone = "ok" | "watch" | "critical" | "unknown";

const ICON = {
  ok: CircleCheck,
  watch: TriangleAlert,
  critical: CircleAlert,
  unknown: CircleDashed,
} as const;

const SURFACE = {
  ok: "border-line bg-card-solid",
  watch: "border-brass/40 bg-accent",
  critical: "border-destructive/40 bg-destructive/5",
  unknown: "border-line bg-card-solid",
} as const;

/** A page's one-sentence status: icon, heading, body and a meta line. */
export function StatusCallout({
  tone,
  title,
  body,
  meta,
}: Readonly<{ tone: CalloutTone; title: string; body: string; meta: string }>) {
  const Icon = ICON[tone];
  return (
    <section
      aria-live="polite"
      className={cn("flex gap-4 rounded-2xl border p-5", SURFACE[tone])}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-1 size-6 shrink-0",
          tone === "critical" ? "text-destructive" : "text-brass-text",
        )}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-display text-xl font-medium text-ink lg:text-2xl">
          {title}
        </h2>
        <p className="text-ink">{body}</p>
        <p className="text-[13px] text-ink-soft">{meta}</p>
      </div>
    </section>
  );
}
