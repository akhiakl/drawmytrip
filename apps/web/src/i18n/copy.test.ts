import { describe, expect, it } from "vitest";

import { SAMPLE_TRIP } from "@/lib/trip";

import messages from "./messages/en.json";

// Plain copy: no em dashes, en dashes or semicolons in anything visitors read.
const DASHES_AND_SEMICOLONS = /[—–;]/;

describe("site copy", () => {
  it("has no em dashes, en dashes or semicolons in any message", () => {
    expect(JSON.stringify(messages)).not.toMatch(DASHES_AND_SEMICOLONS);
  });

  it("has none in the example route shown on the landing page", () => {
    expect(JSON.stringify(SAMPLE_TRIP)).not.toMatch(DASHES_AND_SEMICOLONS);
  });
});
