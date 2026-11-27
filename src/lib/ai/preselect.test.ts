import { describe, expect, it } from "vitest";

import { makeCandidate, makeSuggestions } from "@/test/fixtures/suggest";

import { preselect } from "./preselect";

const manyPlaces = (n: number) =>
  Array.from({ length: n }, (_, i) => makeCandidate({ name: `Sight ${i}` }));

describe("preselect region", () => {
  const cities = ["A", "B", "C", "D", "E", "F", "G", "H"].map((name) =>
    makeCandidate({ name, kind: "city" }),
  );
  const region = makeSuggestions("region", { candidates: cities });

  it.each([
    [7, "relaxed", 2],
    [7, "balanced", 2],
    [7, "packed", 4],
    [14, "balanced", 5],
    [30, "packed", 5],
    [2, "relaxed", 1],
  ] as const)("%i days %s picks %i cities", (days, vibe, count) => {
    expect(preselect(region, days, vibe)).toHaveLength(count);
  });

  it("takes the top ranked cities in order", () => {
    expect(preselect(region, 7, "packed").map((p) => p.name)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
  });

  it("never picks more than exist", () => {
    const small = makeSuggestions("region", { candidates: cities.slice(0, 3) });
    expect(preselect(small, 30, "packed")).toHaveLength(3);
  });
});

describe("preselect city", () => {
  const trip = (n: number) =>
    makeSuggestions("city", {
      candidates: [
        ...manyPlaces(n),
        makeCandidate({ name: "Niagara", kind: "daytrip" }),
      ],
    });

  it.each([
    [2, "relaxed", 3],
    [5, "balanced", 10],
    [7, "packed", 12],
    [30, "packed", 12],
  ] as const)("%i days %s picks %i places", (days, vibe, count) => {
    expect(preselect(trip(15), days, vibe)).toHaveLength(count);
  });

  it("adds the first day trip only for stays of four days or more", () => {
    expect(
      preselect(trip(15), 3, "balanced").some((p) => p.kind === "daytrip"),
    ).toBe(false);
    const picks = preselect(trip(15), 4, "balanced");
    expect(picks.at(-1)).toEqual({ name: "Niagara", kind: "daytrip" });
    expect(picks).toHaveLength(8);
  });

  it("never picks more than exist", () => {
    expect(preselect(trip(2), 10, "packed")).toHaveLength(3);
  });

  it("returns names and kinds only", () => {
    expect(Object.keys(preselect(trip(5), 5, "balanced")[0]).sort()).toEqual([
      "kind",
      "name",
    ]);
  });
});
