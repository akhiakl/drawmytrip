"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { AiNotice, TermsNotice } from "@/components/legal/notices";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenerateTrip, type GeneratedDraft } from "@/hooks/use-generate-trip";
import { useSuggestions } from "@/hooks/use-suggestions";
import {
  preselect,
  writeAiHandoff,
  type GenerateRequest,
  type Pick as Place,
} from "@/lib/ai";
import { GUEST_MAX_CITIES } from "@/lib/trip";
import { cn } from "@/lib/utils";

import { ChatBubble } from "./chat-bubble";
import { DaysStep, DestinationStep, VibeStep } from "./chat-steps";
import { PickStep } from "./pick-step";

/** The three questions; the picker adds scope and picks to the request. */
type Answers = Partial<Omit<GenerateRequest, "scope" | "picks">>;

function DraftingBubble() {
  const t = useTranslations("Chat");
  return (
    <ChatBubble from="atlas">
      <p className="mb-2">{t("drafting")}</p>
      <div aria-hidden className="flex w-56 flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </ChatBubble>
  );
}

function FailureBubble({
  rateLimited,
  onRetry,
}: {
  readonly rateLimited: boolean;
  readonly onRetry: () => void;
}) {
  const t = useTranslations("Chat");
  const retryRef = useRef<HTMLButtonElement>(null);
  // The pace button that sent the request is gone; put focus on the way
  // forward instead of leaving it on the page body.
  useEffect(() => retryRef.current?.focus(), []);
  return (
    <ChatBubble from="atlas">
      <p role="alert">{rateLimited ? t("rateLimited") : t("failed")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          ref={retryRef}
          type="button"
          size="sm"
          variant="brass"
          onClick={onRetry}
        >
          <RotateCcw /> {t("retry")}
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/new">{t("byHand")}</Link>
        </Button>
      </div>
    </ChatBubble>
  );
}

/** Three questions, then the place picker. */
const QUESTIONS = 4;
const SKELETON_CHIPS = [24, 32, 20, 28, 36, 24] as const;

function FindingBubble() {
  const t = useTranslations("Chat");
  return (
    <ChatBubble from="atlas">
      <p className="mb-2">{t("findingPlaces")}</p>
      <div aria-hidden className="flex flex-wrap gap-2">
        {SKELETON_CHIPS.map((width, i) => (
          <Skeleton
            key={i}
            className="h-11 rounded-full"
            style={{ width: `${width / 4}rem` }}
          />
        ))}
      </div>
    </ChatBubble>
  );
}

/** Three short bars, filled up to the open question. */
function ChatProgress({ step }: { readonly step: number }) {
  const t = useTranslations("Chat");
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: QUESTIONS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 w-7 rounded-full bg-line",
              i < step && "bg-brass-strong",
            )}
          />
        ))}
      </div>
      <p className="text-sm text-ink-soft">
        {t("progress", { step, total: QUESTIONS })}
      </p>
    </div>
  );
}

/**
 * Guided three-question chat (destination → days → pace) that makes ONE
 * call to /api/generate, then lands the draft in the editor with the
 * overflow stops as ghost stops: AI drafts, the guest edits.
 */
export function AiChat({
  initialDestination,
}: {
  /** From the landing's destination search: the first question is answered. */
  readonly initialDestination?: string;
}) {
  const router = useRouter();
  const t = useTranslations("Chat");
  const vibes = useTranslations("Vibes");
  const [answers, setAnswers] = useState<Answers>({
    destination: initialDestination,
  });
  /** What was sent: kept so a retry resends the same picks. */
  const [request, setRequest] = useState<GenerateRequest | null>(null);

  const onDrafted = (
    { trip, suggestedExtra }: GeneratedDraft,
    drafted: GenerateRequest,
  ) => {
    writeAiHandoff(
      { title: trip.title, cities: trip.cities, legs: trip.legs, suggestedExtra },
      drafted,
    );
    router.push("/new?from=ai");
  };
  const { generate, status } = useGenerateTrip({ onDrafted });
  const suggestions = useSuggestions();
  const { load } = suggestions;

  const { destination, days, vibe } = answers;
  const send = (next: GenerateRequest) => {
    setRequest(next);
    void generate(next);
  };

  // Places load while the guest answers the next two questions.
  useEffect(() => {
    if (destination) void load(destination);
  }, [destination, load]);

  // No suggestions to pick from: build the trip the way it always was.
  const fallback = destination && days && vibe && !request;
  const fallbackRequest: GenerateRequest | null =
    fallback && suggestions.status === "failed" ? { destination, days, vibe } : null;
  const fallbackSent = useRef(false);
  useEffect(() => {
    if (!fallbackRequest || fallbackSent.current) return;
    fallbackSent.current = true;
    void generate(fallbackRequest);
  });

  const initialPicks = useMemo(
    () =>
      suggestions.suggestions && days && vibe
        ? preselect(suggestions.suggestions, days, vibe)
        : [],
    [suggestions.suggestions, days, vibe],
  );
  const ready = suggestions.status === "ready" ? suggestions.suggestions : null;
  const choosing = fallback && suggestions.status !== "failed";

  const build = (picks: Place[]) => {
    if (!destination || !days || !vibe || !ready) return;
    send({ destination, days, vibe, scope: ready.scope, picks });
  };
  const surprise = () => {
    if (destination && days && vibe) send({ destination, days, vibe });
  };

  // Questions are answered in order, so the answers so far give the step.
  const step = Math.min(
    [destination, days, vibe].filter(Boolean).length + 1,
    QUESTIONS,
  );

  return (
    <div className="flex flex-col gap-4">
      <ChatProgress step={step} />
      <AiNotice />
      <div aria-live="polite" className="flex flex-col gap-3">
        <ChatBubble from="atlas">{t("askDestination")}</ChatBubble>
        {destination && <ChatBubble from="guest">{destination}</ChatBubble>}

        {destination && <ChatBubble from="atlas">{t("askDays")}</ChatBubble>}
        {days && <ChatBubble from="guest">{t("answerDays", { days })}</ChatBubble>}

        {days && <ChatBubble from="atlas">{t("askPace")}</ChatBubble>}
        {vibe && <ChatBubble from="guest">{vibes(`${vibe}.label`)}</ChatBubble>}

        {choosing && !ready && <FindingBubble />}
        {choosing && ready && (
          <ChatBubble from="atlas">
            {ready.scope === "region"
              ? t("askPicksRegion", { max: GUEST_MAX_CITIES })
              : t("askPicksCity", { destination })}
          </ChatBubble>
        )}
        {request?.picks && (
          <ChatBubble from="guest">
            {t("answerPicks", { count: request.picks.length })}
          </ChatBubble>
        )}
        {request && !request.picks && suggestions.status === "ready" && (
          <ChatBubble from="guest">{t("answerSurprise")}</ChatBubble>
        )}

        {status === "drafting" && <DraftingBubble />}
        {(status === "rate_limited" || status === "failed") && (
          <FailureBubble
            rateLimited={status === "rate_limited"}
            onRetry={() => {
              const again = request ?? fallbackRequest;
              if (again) void generate(again);
            }}
          />
        )}
      </div>

      {!destination && (
        <DestinationStep onAnswer={(value) => setAnswers({ destination: value })} />
      )}
      {destination && !days && (
        <DaysStep onAnswer={(value) => setAnswers({ ...answers, days: value })} />
      )}
      {days && !vibe && (
        <>
          <VibeStep onAnswer={(value) => setAnswers({ ...answers, vibe: value })} />
          <TermsNotice action="drafting" />
        </>
      )}
      {choosing && ready && (
        <PickStep
          suggestions={ready}
          initial={initialPicks}
          onBuild={build}
          onSurprise={surprise}
        />
      )}
    </div>
  );
}
