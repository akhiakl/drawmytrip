import "server-only";

import { Redis } from "@upstash/redis";

import {
  DEFAULT_RUNTIME_CONFIG,
  RuntimeConfigSchema,
  type RuntimeConfig,
} from "./schema";

export const RUNTIME_CONFIG_KEY = "cfg:runtime";
export const CONFIG_CACHE_MS = 60_000;

let client: Redis | null = null;
const redis = (): Redis => (client ??= Redis.fromEnv());

let cache: { value: RuntimeConfig; expiresAt: number } | null = null;

/** Test helper. */
export function resetRuntimeConfigCache(): void {
  cache = null;
  client = null;
}

function parseStored(raw: unknown): RuntimeConfig | null {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const parsed = RuntimeConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The stored config, or null when missing or invalid. Throws on store errors. */
async function readStored(): Promise<RuntimeConfig | null> {
  const raw = await redis().get<unknown>(RUNTIME_CONFIG_KEY);
  if (raw === null || raw === undefined) return null;
  const config = parseStored(raw);
  if (!config)
    console.warn("[runtime-config] stored value is invalid, using defaults");
  return config;
}

/**
 * The live config, cached per instance for 60 s. A missing, invalid or
 * unreachable value gives the defaults. Never throws.
 */
export async function getRuntimeConfig(now = Date.now()): Promise<RuntimeConfig> {
  if (cache && cache.expiresAt > now) return cache.value;
  let value = DEFAULT_RUNTIME_CONFIG;
  try {
    value = (await readStored()) ?? DEFAULT_RUNTIME_CONFIG;
  } catch (error) {
    console.warn(
      "[runtime-config] read failed, using defaults",
      error instanceof Error ? error.name : typeof error,
    );
  }
  cache = { value, expiresAt: now + CONFIG_CACHE_MS };
  return value;
}

/**
 * Validates and writes the config, refreshes this instance's cache and
 * returns the previous value (the defaults when none was stored). Throws
 * on invalid input or a store error.
 */
export async function saveRuntimeConfig(
  next: RuntimeConfig,
): Promise<RuntimeConfig> {
  const valid = RuntimeConfigSchema.parse(next);
  const previous = (await readStored()) ?? DEFAULT_RUNTIME_CONFIG;
  await redis().set(RUNTIME_CONFIG_KEY, valid);
  cache = { value: valid, expiresAt: Date.now() + CONFIG_CACHE_MS };
  return previous;
}
