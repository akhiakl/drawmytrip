// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeFocusLine } from "@/test/fixtures/admin";

import { collectVercel, parseFocus } from "./vercel";

const now = new Date("2026-11-27T04:00:00Z");
const jsonl = (...lines: object[]) => lines.map((l) => JSON.stringify(l)).join("\n");
const fetchMock = vi.fn();

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("parseFocus", () => {
  it("sums lines per day and metric, converting units", () => {
    const daily = parseFocus(
      jsonl(
        makeFocusLine(),
        makeFocusLine({ ConsumedQuantity: 500, ConsumedUnit: "MB" }),
        makeFocusLine({
          ServiceName: "Fluid Active CPU",
          ConsumedQuantity: 3600,
          ConsumedUnit: "Seconds",
        }),
        makeFocusLine({
          ServiceName: "Web Analytics Events",
          ConsumedQuantity: 40,
          ConsumedUnit: "Events",
          ChargePeriodStart: "2026-11-25T00:00:00Z",
        }),
      ),
    );
    expect(daily).toEqual([
      { date: "2026-11-25", values: { analytics_events: 40 } },
      { date: "2026-11-26", values: { transfer_gb: 2, cpu_hours: 1 } },
    ]);
  });

  it("skips blank, broken and unknown lines", () => {
    const body = `\nnot json\n${jsonl(
      makeFocusLine({ ServiceName: "Image Optimization" }),
      makeFocusLine({ ConsumedQuantity: "x" }),
      makeFocusLine({ ChargePeriodStart: "soon" }),
    )}`;
    expect(parseFocus(body)).toEqual([]);
  });

  it("keeps unknown units as given", () => {
    expect(
      parseFocus(jsonl(makeFocusLine({ ConsumedUnit: "parsecs" })))[0].values,
    ).toEqual({ transfer_gb: 1.5 });
  });
});

describe("collectVercel", () => {
  it("is not_configured without a token", async () => {
    expect((await collectVercel({}, now)).status).toBe("not_configured");
  });

  it("fetches the month so far with the team id", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(new Response(jsonl(makeFocusLine())));
    const snap = await collectVercel(
      { VERCEL_API_TOKEN: "t", VERCEL_TEAM_ID: "team_1" },
      now,
    );
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("from")).toBe("2026-11-01T00:00:00.000Z");
    expect(url.searchParams.get("teamId")).toBe("team_1");
    expect(snap).toMatchObject({ status: "ok", provider: "vercel" });
    expect(snap.daily).toHaveLength(1);
  });

  it("is unavailable on an error status or a network failure", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(new Response("no", { status: 403 }));
    expect((await collectVercel({ VERCEL_API_TOKEN: "t" }, now)).status).toBe(
      "unavailable",
    );
    fetchMock.mockRejectedValueOnce(new Error("down"));
    expect((await collectVercel({ VERCEL_API_TOKEN: "t" }, now)).status).toBe(
      "unavailable",
    );
  });
});
