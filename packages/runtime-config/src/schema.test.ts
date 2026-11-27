import { describe, expect, it } from "vitest";

import {
  CONFIG_BOUNDS,
  DEFAULT_RUNTIME_CONFIG,
  RuntimeConfigSchema,
} from "./schema";
import { makeRuntimeConfig } from "../test/fixtures";

describe("RuntimeConfigSchema", () => {
  it("accepts the defaults", () => {
    expect(RuntimeConfigSchema.parse(DEFAULT_RUNTIME_CONFIG)).toEqual(
      DEFAULT_RUNTIME_CONFIG,
    );
  });

  it.each([
    [
      "guest.aiPerHour below min",
      { guest: { aiPerHour: CONFIG_BOUNDS.aiPerHour.min - 1 } },
    ],
    [
      "guest.aiPerHour above max",
      { guest: { aiPerHour: CONFIG_BOUNDS.aiPerHour.max + 1 } },
    ],
    [
      "guest.sharesPerHour above max",
      { guest: { sharesPerHour: CONFIG_BOUNDS.sharesPerHour.max + 1 } },
    ],
    ["ai.dailyCap below 0", { ai: { dailyCap: -1 } }],
    ["ai.dailyCap above max", { ai: { dailyCap: CONFIG_BOUNDS.dailyCap.max + 1 } }],
    [
      "ai price above max",
      { ai: { inputUsdPerMTokens: CONFIG_BOUNDS.usdPerMTokens.max + 1 } },
    ],
    ["ai price negative", { ai: { outputUsdPerMTokens: -0.1 } }],
    ["fractional limit", { guest: { aiPerHour: 2.5 } }],
    ["zero free-tier limit", { freeTier: { upstashCommands: 0 } }],
    ["negative provider limit", { freeTier: { llmRequestsPerDay: -1 } }],
  ])("rejects %s", (_name, overrides) => {
    expect(RuntimeConfigSchema.safeParse(makeRuntimeConfig(overrides)).success).toBe(
      false,
    );
  });

  it("accepts values on the bounds", () => {
    const config = makeRuntimeConfig({
      guest: {
        aiPerHour: CONFIG_BOUNDS.aiPerHour.max,
        sharesPerHour: CONFIG_BOUNDS.sharesPerHour.min,
      },
      ai: { dailyCap: CONFIG_BOUNDS.dailyCap.max },
    });
    expect(RuntimeConfigSchema.safeParse(config).success).toBe(true);
  });
});
