import { makeRuntimeConfig } from "@drawmytrip/runtime-config/fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAuditEntry } from "@/test/fixtures/admin";

const pipe = vi.hoisted(() => ({ lpush: vi.fn(), ltrim: vi.fn(), exec: vi.fn() }));
const lrange = vi.hoisted(() => vi.fn());

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn(() => ({ pipeline: () => pipe, lrange })) },
}));

import { AUDIT_KEY, appendAudit, configDiff, readAudit } from "./audit";
import { resetRedisClient } from "./redis";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  resetRedisClient();
  pipe.exec.mockResolvedValue([]);
});

describe("appendAudit", () => {
  it("pushes and trims in one pipeline", async () => {
    const entry = makeAuditEntry();
    await appendAudit(entry);
    expect(pipe.lpush).toHaveBeenCalledWith(AUDIT_KEY, entry);
    expect(pipe.ltrim).toHaveBeenCalledWith(AUDIT_KEY, 0, 999);
    expect(pipe.exec).toHaveBeenCalledOnce();
  });

  it("never throws", async () => {
    pipe.exec.mockRejectedValue(new Error("down"));
    await expect(appendAudit(makeAuditEntry())).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith("[admin] audit write failed", "Error");
  });

  it("names a non-error rejection by type", async () => {
    pipe.exec.mockRejectedValue("nope");
    await appendAudit(makeAuditEntry());
    expect(console.warn).toHaveBeenCalledWith(
      "[admin] audit write failed",
      "string",
    );
  });
});

describe("readAudit", () => {
  it("returns parsed rows newest first and skips ones that do not parse", async () => {
    const good = makeAuditEntry({
      action: "config_saved",
      detail: "guest.aiPerHour: 5 → 8",
    });
    lrange.mockResolvedValue([good, { at: "yesterday" }, makeAuditEntry()]);
    expect(await readAudit(50)).toEqual([good, makeAuditEntry()]);
    expect(lrange).toHaveBeenCalledWith(AUDIT_KEY, 0, 49);
  });

  it("reads 100 rows by default", async () => {
    lrange.mockResolvedValue([]);
    await readAudit();
    expect(lrange).toHaveBeenCalledWith(AUDIT_KEY, 0, 99);
  });
});

describe("configDiff", () => {
  it("lists changed leaves only", () => {
    const before = makeRuntimeConfig();
    const after = makeRuntimeConfig({
      guest: { aiPerHour: 8 },
      ai: { enabled: false },
    });
    expect(configDiff(before, after)).toBe(
      "guest.aiPerHour: 5 → 8; ai.enabled: true → false",
    );
  });

  it("says so when nothing changed", () => {
    expect(configDiff(makeRuntimeConfig(), makeRuntimeConfig())).toBe("no changes");
  });
});
