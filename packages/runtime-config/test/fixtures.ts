import { DEFAULT_RUNTIME_CONFIG, type RuntimeConfig } from "../src/schema";

/** Defaults with shallow section overrides for unit tests. */
export const makeRuntimeConfig = (
  overrides: {
    [K in keyof RuntimeConfig]?: Partial<RuntimeConfig[K]>;
  } = {},
): RuntimeConfig => ({
  guest: { ...DEFAULT_RUNTIME_CONFIG.guest, ...overrides.guest },
  ai: { ...DEFAULT_RUNTIME_CONFIG.ai, ...overrides.ai },
  freeTier: { ...DEFAULT_RUNTIME_CONFIG.freeTier, ...overrides.freeTier },
});
