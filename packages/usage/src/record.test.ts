import { beforeEach, describe, expect, it, vi } from "vitest";

const pipe = vi.hoisted(() => ({
  hincrby: vi.fn(),
  hset: vi.fn(),
  expire: vi.fn(),
  hgetall: vi.fn(),
  exec: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn(() => ({ pipeline: () => pipe })) },
}));

import { USAGE_TTL_SECONDS } from "./metrics";
import { readUsage, recordUsage, resetUsageClient } from "./record";
import { makeDailyUsage } from "../test/fixtures";

const NOW = new Date("2026-11-27T10:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  resetUsageClient();
  pipe.exec.mockResolvedValue([]);
});

describe("recordUsage", () => {
  it("batches increments, gauges and the expiry in one pipeline", async () => {
    await recordUsage(
      { ai_generations: 1, ai_prompt_tokens: 320, ai_failures: 0 },
      { ai_rpd_limit: 1000 },
      NOW,
    );
    expect(pipe.hincrby).toHaveBeenCalledTimes(2);
    expect(pipe.hincrby).toHaveBeenCalledWith(
      "usage:2026-11-27",
      "ai_generations",
      1,
    );
    expect(pipe.hincrby).toHaveBeenCalledWith(
      "usage:2026-11-27",
      "ai_prompt_tokens",
      320,
    );
    expect(pipe.hset).toHaveBeenCalledWith("usage:2026-11-27", {
      ai_rpd_limit: 1000,
    });
    expect(pipe.expire).toHaveBeenCalledWith("usage:2026-11-27", USAGE_TTL_SECONDS);
    expect(pipe.exec).toHaveBeenCalledTimes(1);
  });

  it("makes no call when there is nothing to write", async () => {
    await recordUsage({ ai_generations: 0 }, { ai_rpd_limit: Number.NaN }, NOW);
    expect(pipe.exec).not.toHaveBeenCalled();
  });

  it("writes gauges alone", async () => {
    await recordUsage({}, { ai_rpd_remaining: 12 }, NOW);
    expect(pipe.hincrby).not.toHaveBeenCalled();
    expect(pipe.hset).toHaveBeenCalledWith("usage:2026-11-27", {
      ai_rpd_remaining: 12,
    });
  });

  it("swallows a store error", async () => {
    pipe.exec.mockRejectedValue(new Error("down"));
    await expect(recordUsage({ map_views: 1 }, {}, NOW)).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith("[usage] record failed", "Error");
  });

  it("names a non-error rejection by type", async () => {
    pipe.exec.mockRejectedValue("nope");
    await recordUsage({ map_views: 1 }, {}, NOW);
    expect(console.warn).toHaveBeenCalledWith("[usage] record failed", "string");
  });
});

describe("readUsage", () => {
  it("returns the days oldest first with gaps zero-filled", async () => {
    pipe.exec.mockResolvedValue([null, { map_views: "3" }, { ai_generations: 2 }]);
    const days = await readUsage(3, NOW);
    expect(pipe.hgetall.mock.calls.map(([key]) => key)).toEqual([
      "usage:2026-11-25",
      "usage:2026-11-26",
      "usage:2026-11-27",
    ]);
    expect(days).toEqual([
      makeDailyUsage({ date: "2026-11-25" }),
      makeDailyUsage({ date: "2026-11-26", map_views: 3 }),
      makeDailyUsage({ date: "2026-11-27", ai_generations: 2 }),
    ]);
  });

  it("zero-fills when the pipeline returns fewer rows", async () => {
    pipe.exec.mockResolvedValue([]);
    const days = await readUsage(1, NOW);
    expect(days).toEqual([makeDailyUsage({ date: "2026-11-27" })]);
  });
});
