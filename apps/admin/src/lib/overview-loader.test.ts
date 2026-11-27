// @vitest-environment node
import { makeRuntimeConfig } from "@drawmytrip/runtime-config/fixtures";
import { makeDailyUsage } from "@drawmytrip/usage/fixtures";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRuntimeConfig: vi.fn(),
  readUsage: vi.fn(),
  latestSnapshots: vi.fn(),
}));

vi.mock("@drawmytrip/runtime-config/store", () => ({
  getRuntimeConfig: mocks.getRuntimeConfig,
}));
vi.mock("@drawmytrip/usage/record", () => ({ readUsage: mocks.readUsage }));
vi.mock("./collect", () => ({ latestSnapshots: mocks.latestSnapshots }));

import { loadUsageOverview } from "./overview-loader";

describe("loadUsageOverview", () => {
  it("reads twice the range and builds the overview", async () => {
    const now = new Date("2026-11-27T10:00:00Z");
    mocks.getRuntimeConfig.mockResolvedValue(makeRuntimeConfig());
    mocks.readUsage.mockResolvedValue(
      Array.from({ length: 14 }, (_, i) => makeDailyUsage({ date: `d${i}` })),
    );
    mocks.latestSnapshots.mockResolvedValue({});
    const overview = await loadUsageOverview(7, now);
    expect(mocks.readUsage).toHaveBeenCalledWith(14, now);
    expect(overview.range).toBe(7);
    expect(overview.days).toHaveLength(7);
  });
});
