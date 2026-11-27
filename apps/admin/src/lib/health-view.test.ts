import { makeServiceCheck } from "@drawmytrip/health/fixtures";
import { describe, expect, it } from "vitest";

import { detailMessage, healthHeadline, isKnownService } from "./health-view";

const groups = (site = [makeServiceCheck()], admin = [makeServiceCheck()]) => ({
  checkedAt: 0,
  site,
  admin,
});

describe("healthHeadline", () => {
  it("is ok when every check answers", () => {
    expect(healthHeadline(groups())).toEqual({ tone: "ok", count: 0 });
  });

  it("asks to finish setup when settings are missing", () => {
    expect(
      healthHeadline(groups([makeServiceCheck({ status: "not_configured" })])),
    ).toEqual({ tone: "watch", count: 1 });
  });

  it("puts a down service ahead of missing settings", () => {
    expect(
      healthHeadline(
        groups(
          [makeServiceCheck({ status: "down" })],
          [
            makeServiceCheck({ status: "down" }),
            makeServiceCheck({ status: "not_configured" }),
          ],
        ),
      ),
    ).toEqual({ tone: "critical", count: 2 });
  });
});

describe("detailMessage", () => {
  const down = (detail?: string) =>
    detailMessage(makeServiceCheck({ status: "down", detail }));

  it("explains only failures", () => {
    expect(detailMessage(makeServiceCheck())).toBeNull();
  });

  it("maps each fixed code", () => {
    expect(down("http_503")).toEqual({ key: "httpStatus", code: "503" });
    expect(down("timeout")).toEqual({ key: "timeout" });
    expect(down("model_missing")).toEqual({ key: "modelMissing" });
    expect(down("invalid_reply")).toEqual({ key: "invalidReply" });
    expect(down("error")).toEqual({ key: "unreachable" });
    expect(down()).toEqual({ key: "unreachable" });
  });
});

describe("isKnownService", () => {
  it("knows the services with copy, not new ones", () => {
    expect(isKnownService("redis")).toBe(true);
    expect(isKnownService("new_thing")).toBe(false);
  });
});
