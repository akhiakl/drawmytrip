import { describe, expect, it } from "vitest";

import { makeCandidate, makeSuggestions } from "@/test/fixtures/suggest";

import { SuggestionsSchema, SuggestRequestSchema } from "./suggest-schema";

describe("SuggestRequestSchema", () => {
  it("takes a destination of the generator's length", () => {
    expect(SuggestRequestSchema.safeParse({ destination: "Toronto" }).success).toBe(
      true,
    );
    expect(SuggestRequestSchema.safeParse({ destination: "x" }).success).toBe(false);
    expect(
      SuggestRequestSchema.safeParse({ destination: "x".repeat(121) }).success,
    ).toBe(false);
  });
});

describe("SuggestionsSchema", () => {
  it("accepts a city-scope list with mixed kinds", () => {
    expect(SuggestionsSchema.safeParse(makeSuggestions("city")).success).toBe(true);
  });

  it("accepts a region list of only cities", () => {
    expect(SuggestionsSchema.safeParse(makeSuggestions("region")).success).toBe(
      true,
    );
  });

  it("rejects a region list that holds a sight", () => {
    const bad = makeSuggestions("region", {
      candidates: [
        makeCandidate({ kind: "city" }),
        makeCandidate({ name: "B", kind: "city" }),
        makeCandidate({ name: "C", kind: "sight" }),
      ],
    });
    expect(SuggestionsSchema.safeParse(bad).success).toBe(false);
  });

  it("drops names that repeat ignoring case, keeping the first", () => {
    const dup = makeSuggestions("city", {
      candidates: [
        makeCandidate({ name: "CN Tower" }),
        makeCandidate({ name: "cn tower", kind: "gem" }),
        makeCandidate({ name: "Distillery District" }),
        makeCandidate({ name: "Kensington Market" }),
      ],
    });
    const parsed = SuggestionsSchema.parse(dup);
    expect(parsed.candidates.map((c) => c.name)).toEqual([
      "CN Tower",
      "Distillery District",
      "Kensington Market",
    ]);
  });

  it("rejects lists with fewer than three distinct candidates", () => {
    const thin = makeSuggestions("city", {
      candidates: [
        makeCandidate(),
        makeCandidate({ name: "cn tower" }),
        makeCandidate({ name: "Other" }),
      ],
    });
    expect(SuggestionsSchema.safeParse(thin).success).toBe(false);
  });

  it("caps the list at twenty", () => {
    const many = makeSuggestions("city", {
      candidates: Array.from({ length: 21 }, (_, i) =>
        makeCandidate({ name: `P${i}` }),
      ),
    });
    expect(SuggestionsSchema.safeParse(many).success).toBe(false);
  });
});
