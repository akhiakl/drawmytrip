import { describe, expect, it } from "vitest";

import { buildSuggestSystemPrompt, buildSuggestUserPrompt } from "./suggest-prompt";

describe("suggest prompts", () => {
  it("states both scopes, the kinds and the candidate caps", () => {
    const prompt = buildSuggestSystemPrompt();
    expect(prompt).toContain("scope is city when the input names one city");
    expect(prompt).toContain("8 to 12 candidates, all kind city");
    expect(prompt).toContain("daytrip");
    expect(prompt).toContain("Never invent places");
  });

  it("passes the destination through", () => {
    expect(buildSuggestUserPrompt({ destination: "Toronto" })).toBe(
      "Destination: Toronto",
    );
  });
});
