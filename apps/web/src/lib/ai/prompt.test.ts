import { describe, expect, it } from "vitest";

import { GUEST_MAX_CITIES } from "@/lib/trip";
import { makeGenerateRequest } from "@/test/fixtures/ai";

import { buildRetryPrompt, buildSystemPrompt, buildUserPrompt } from "./prompt";

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt();

  it("states the guest city ceiling and suggestedExtra overflow rule", () => {
    expect(prompt).toContain(`Between 1 and ${GUEST_MAX_CITIES} cities`);
    expect(prompt).toContain("suggestedExtra");
  });

  it("pins the structural rules the schema will enforce", () => {
    expect(prompt).toContain("legs.length must equal cities.length - 1");
    expect(prompt).toContain("[latitude, longitude]");
    expect(prompt).toContain("Never invent places");
  });

  it("asks for plain writing without dashes or semicolons", () => {
    expect(prompt).toContain("Never use em dashes, en dashes or semicolons");
    expect(prompt).not.toMatch(/[\u2014\u2013]/);
  });
});

describe("buildUserPrompt", () => {
  it("carries all three guided answers", () => {
    const prompt = buildUserPrompt({
      destination: "Portugal",
      days: 10,
      vibe: "relaxed",
    });
    expect(prompt).toContain("Portugal");
    expect(prompt).toContain("10 days");
    expect(prompt).toContain("relaxed");
  });
});

describe("buildUserPrompt picks", () => {
  const picks = [
    { name: "CN Tower", kind: "sight" as const },
    { name: "Kensington Market", kind: "food" as const },
    { name: "Niagara Falls", kind: "daytrip" as const },
  ];

  it("adds nothing without picks", () => {
    expect(buildUserPrompt(makeGenerateRequest())).not.toContain("Use ");
  });

  it("asks for exactly the picked cities in a region", () => {
    const cities = [
      { name: "Vienna", kind: "city" as const },
      { name: "Salzburg", kind: "city" as const },
    ];
    const prompt = buildUserPrompt(
      makeGenerateRequest({ scope: "region", picks: cities }),
    );
    expect(prompt).toContain(
      "Use exactly these cities, ordered into the best route: Vienna, Salzburg.",
    );
  });

  it("places picked sights in the base city and day trips as 0-night stops", () => {
    const prompt = buildUserPrompt(
      makeGenerateRequest({ destination: "Toronto", scope: "city", picks }),
    );
    expect(prompt).toContain("Base the trip in Toronto.");
    expect(prompt).toContain("CN Tower, Kensington Market");
    expect(prompt).toContain(
      "stop with nights 0, right after Toronto: Niagara Falls",
    );
  });

  it("omits the day trip line when none is picked", () => {
    const prompt = buildUserPrompt(
      makeGenerateRequest({ scope: "city", picks: picks.slice(0, 2) }),
    );
    expect(prompt).not.toContain("nights 0");
  });
});

describe("buildRetryPrompt", () => {
  it("feeds validation issues back verbatim", () => {
    const prompt = buildRetryPrompt("cities.0.ll: expected tuple");
    expect(prompt).toContain("cities.0.ll: expected tuple");
    expect(prompt).toContain("corrected JSON");
  });
});
