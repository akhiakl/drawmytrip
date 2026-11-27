"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SuggestionsSchema, type Suggestions } from "@/lib/ai";

export type SuggestionsStatus = "idle" | "loading" | "ready" | "failed";

interface State {
  status: SuggestionsStatus;
  suggestions: Suggestions | null;
}

/**
 * Fetches ranked places for a destination from /api/suggest. Any failure
 * (rate limit, upstream, bad body) reads as "failed": the chat then builds
 * the trip the way it always did, so suggestions are never a blocker. A new
 * load or an unmount cancels the one in flight.
 */
export function useSuggestions() {
  const [state, setState] = useState<State>({ status: "idle", suggestions: null });
  const inFlight = useRef<AbortController | null>(null);

  const load = useCallback(async (destination: string) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setState({ status: "loading", suggestions: null });

    const finish = (next: State) => {
      if (!controller.signal.aborted) setState(next);
    };
    try {
      const response = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination }),
        signal: controller.signal,
      });
      if (!response.ok) return finish({ status: "failed", suggestions: null });
      const parsed = SuggestionsSchema.safeParse(await response.json());
      finish(
        parsed.success
          ? { status: "ready", suggestions: parsed.data }
          : { status: "failed", suggestions: null },
      );
    } catch {
      finish({ status: "failed", suggestions: null });
    }
  }, []);

  useEffect(() => () => inFlight.current?.abort(), []);

  return { ...state, load };
}
