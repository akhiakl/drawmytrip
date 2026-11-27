import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn(() => redisMock) },
}));

import { DEFAULT_RUNTIME_CONFIG } from "./schema";
import {
  CONFIG_CACHE_MS,
  RUNTIME_CONFIG_KEY,
  getRuntimeConfig,
  resetRuntimeConfigCache,
  saveRuntimeConfig,
} from "./store";
import { makeRuntimeConfig } from "../test/fixtures";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  resetRuntimeConfigCache();
});

afterEach(() => vi.restoreAllMocks());

describe("getRuntimeConfig", () => {
  it("gives the defaults when nothing is stored", async () => {
    redisMock.get.mockResolvedValue(null);
    expect(await getRuntimeConfig(1000)).toEqual(DEFAULT_RUNTIME_CONFIG);
    expect(redisMock.get).toHaveBeenCalledWith(RUNTIME_CONFIG_KEY);
  });

  it("returns the stored value", async () => {
    const stored = makeRuntimeConfig({ guest: { aiPerHour: 9 } });
    redisMock.get.mockResolvedValue(stored);
    expect(await getRuntimeConfig(1000)).toEqual(stored);
  });

  it("parses a stored JSON string", async () => {
    const stored = makeRuntimeConfig({ ai: { enabled: false } });
    redisMock.get.mockResolvedValue(JSON.stringify(stored));
    expect(await getRuntimeConfig(1000)).toEqual(stored);
  });

  it("falls back and warns on invalid JSON text", async () => {
    redisMock.get.mockResolvedValue("{not json");
    expect(await getRuntimeConfig(1000)).toEqual(DEFAULT_RUNTIME_CONFIG);
    expect(console.warn).toHaveBeenCalled();
  });

  it("falls back and warns on a value that fails the schema", async () => {
    redisMock.get.mockResolvedValue({ guest: { aiPerHour: 9999 } });
    expect(await getRuntimeConfig(1000)).toEqual(DEFAULT_RUNTIME_CONFIG);
    expect(console.warn).toHaveBeenCalled();
  });

  it("falls back and warns when the store fails", async () => {
    redisMock.get.mockRejectedValue(new Error("boom"));
    expect(await getRuntimeConfig(1000)).toEqual(DEFAULT_RUNTIME_CONFIG);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("read failed"),
      "Error",
    );
  });

  it("reports a non-error rejection by its type", async () => {
    redisMock.get.mockRejectedValue("nope");
    await getRuntimeConfig(1000);
    expect(console.warn).toHaveBeenCalledWith(expect.any(String), "string");
  });

  it("reads once per cache window, then again after it", async () => {
    redisMock.get.mockResolvedValue(null);
    await getRuntimeConfig(1000);
    await getRuntimeConfig(1000 + CONFIG_CACHE_MS - 1);
    expect(redisMock.get).toHaveBeenCalledTimes(1);
    await getRuntimeConfig(1000 + CONFIG_CACHE_MS);
    expect(redisMock.get).toHaveBeenCalledTimes(2);
  });
});

describe("saveRuntimeConfig", () => {
  it("rejects invalid input before touching the store", async () => {
    const bad = makeRuntimeConfig({ guest: { aiPerHour: 0 } });
    await expect(saveRuntimeConfig(bad)).rejects.toThrow();
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it("writes, returns the previous value and refreshes the cache", async () => {
    const previous = makeRuntimeConfig({ guest: { aiPerHour: 7 } });
    const next = makeRuntimeConfig({ guest: { aiPerHour: 8 } });
    redisMock.get.mockResolvedValue(previous);

    expect(await saveRuntimeConfig(next)).toEqual(previous);
    expect(redisMock.set).toHaveBeenCalledWith(RUNTIME_CONFIG_KEY, next);

    redisMock.get.mockClear();
    expect(await getRuntimeConfig()).toEqual(next);
    expect(redisMock.get).not.toHaveBeenCalled();
  });

  it("returns the defaults as previous when nothing was stored", async () => {
    redisMock.get.mockResolvedValue(null);
    expect(await saveRuntimeConfig(makeRuntimeConfig())).toEqual(
      DEFAULT_RUNTIME_CONFIG,
    );
  });

  it("surfaces a store error", async () => {
    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockRejectedValue(new Error("down"));
    await expect(saveRuntimeConfig(makeRuntimeConfig())).rejects.toThrow("down");
  });
});
