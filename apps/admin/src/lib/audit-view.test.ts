// @vitest-environment node
import { describe, expect, it } from "vitest";

import { makeAuditEntry } from "@/test/fixtures/admin";

import { groupAuditByDay, isCron } from "./audit-view";

describe("groupAuditByDay", () => {
  it("groups runs of one UTC day and keeps order", () => {
    const a = makeAuditEntry({ at: Date.parse("2026-11-27T23:00:00Z") });
    const b = makeAuditEntry({ at: Date.parse("2026-11-27T01:00:00Z") });
    const c = makeAuditEntry({ at: Date.parse("2026-11-26T09:00:00Z") });
    expect(groupAuditByDay([a, b, c])).toEqual([
      { day: "2026-11-27", entries: [a, b] },
      { day: "2026-11-26", entries: [c] },
    ]);
    expect(groupAuditByDay([])).toEqual([]);
  });
});

describe("isCron", () => {
  it("tells the daily job from a person", () => {
    expect(isCron("cron")).toBe(true);
    expect(isCron("31401662")).toBe(false);
  });
});
