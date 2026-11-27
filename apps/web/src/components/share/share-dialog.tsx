"use client";

import { CalendarPlus, Check, Copy, ImageIcon, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { TermsNotice } from "@/components/legal/notices";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/hooks/use-mounted";
import { SHARE_TTL_DAYS } from "@/lib/trip";

function ShareShortcut({
  icon,
  label,
  hint,
  onClick,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly hint: string;
  readonly onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-card-solid px-3 text-left transition-colors outline-none hover:border-brass focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-brass-text"
      >
        {icon}
        <span className="flex flex-col">
          <span className="font-medium text-ink">{label}</span>
          <span className="text-sm text-ink-soft">{hint}</span>
        </span>
      </button>
    </li>
  );
}

/**
 * Shown after a successful share: the copyable `/t/{id}` link, plus the
 * device's own share sheet where the browser offers one (mostly mobile),
 * and shortcuts to a poster or calendar when the caller offers them.
 */
export function ShareDialog({
  shareId,
  title,
  open,
  onOpenChange,
  onPoster,
  onCalendar,
}: {
  readonly shareId: string | null;
  /** The trip title, offered to the share sheet alongside the link. */
  readonly title?: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Opens the poster maker; this dialog closes first. */
  readonly onPoster?: () => void;
  /** Downloads the trip calendar; only when the trip has dates. */
  readonly onCalendar?: () => void;
}) {
  const t = useTranslations("Share");
  const [copied, setCopied] = useState(false);
  const canNativeShare = useMounted() && typeof navigator.share === "function";
  const url =
    shareId && typeof window !== "undefined"
      ? `${window.location.origin}/t/${shareId}`
      : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("copiedToast"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const nativeShare = async () => {
    if (!url) return;
    // A dismissed sheet rejects with AbortError; nothing to report.
    await navigator.share({ url, title }).catch(() => undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <p className="eyebrow">{t("eyebrow")}</p>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { days: SHARE_TTL_DAYS })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            readOnly
            name="share-url"
            value={url}
            onFocus={(e) => e.target.select()}
          />
          <Button type="button" variant="brass" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? t("copied") : t("copy")}
          </Button>
        </div>
        {canNativeShare && (
          <Button type="button" variant="outline" onClick={nativeShare}>
            <Share2 /> {t("nativeShare")}
          </Button>
        )}
        {(onPoster || onCalendar) && (
          <ul aria-label={t("more")} className="flex flex-col gap-2">
            {onPoster && (
              <ShareShortcut
                icon={<ImageIcon />}
                label={t("poster")}
                hint={t("posterHint")}
                onClick={() => {
                  onOpenChange(false);
                  onPoster();
                }}
              />
            )}
            {onCalendar && (
              <ShareShortcut
                icon={<CalendarPlus />}
                label={t("calendar")}
                hint={t("calendarHint")}
                onClick={onCalendar}
              />
            )}
          </ul>
        )}
        <TermsNotice action="sharing" />
      </DialogContent>
    </Dialog>
  );
}
