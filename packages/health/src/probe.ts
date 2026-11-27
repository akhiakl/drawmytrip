import type { ServiceCheck } from "./schema";

export const PROBE_TIMEOUT_MS = 4000;

/** What a probe body reports: reachable or not, with an optional code. */
export interface ProbeOutcome {
  ok: boolean;
  detail?: string;
}

/**
 * Runs one live check, timing it. A throw is `down` with `error` (or
 * `timeout` when the abort signal fired); nothing upstream leaks into the
 * report beyond the probe's own fixed codes.
 */
export async function probe(
  id: string,
  run: (signal: AbortSignal) => Promise<ProbeOutcome>,
  timeoutMs = PROBE_TIMEOUT_MS,
  now: () => number = Date.now,
): Promise<ServiceCheck> {
  const signal = AbortSignal.timeout(timeoutMs);
  const startedAt = now();
  let outcome: ProbeOutcome;
  try {
    outcome = await run(signal);
  } catch {
    outcome = { ok: false, detail: signal.aborted ? "timeout" : "error" };
  }
  return {
    id,
    status: outcome.ok ? "up" : "down",
    latencyMs: Math.max(0, Math.round(now() - startedAt)),
    ...(outcome.detail ? { detail: outcome.detail } : {}),
  };
}

/** A GET that counts any 2xx as up and reports other answers as `http_<status>`. */
export async function httpOutcome(
  url: string,
  signal: AbortSignal,
  headers: Record<string, string> = {},
): Promise<ProbeOutcome> {
  const response = await fetch(url, {
    headers: { accept: "application/json", ...headers },
    signal,
    cache: "no-store",
  });
  return response.ok ? { ok: true } : { ok: false, detail: `http_${response.status}` };
}

/** A service whose settings are checked but which is not pinged. */
export const settingsCheck = (id: string, present: boolean): ServiceCheck => ({
  id,
  status: present ? "configured" : "not_configured",
});

export const notConfigured = (id: string): ServiceCheck => ({
  id,
  status: "not_configured",
});
