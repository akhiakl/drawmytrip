// @vitest-environment node
import { makeRuntimeConfig } from "@drawmytrip/runtime-config/fixtures";
import { describe, expect, it } from "vitest";

import { CONFIG_FIELDS, parseConfigForm } from "./config-form";

const formOf = (
  overrides: Record<string, string> = {},
  { enabled = true, skip }: { enabled?: boolean; skip?: string } = {},
) => {
  const config = makeRuntimeConfig() as unknown as Record<
    string,
    Record<string, unknown>
  >;
  const form = new FormData();
  for (const field of CONFIG_FIELDS) {
    if (field === skip) continue;
    const [section, key] = field.split(".");
    form.set(field, String(config[section][key]));
  }
  if (enabled) form.set("ai.enabled", "on");
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  return form;
};

describe("parseConfigForm", () => {
  it("builds the config from the form", () => {
    const result = parseConfigForm(
      formOf({ "guest.aiPerHour": "8" }, { enabled: false }),
    );
    expect(result).toEqual({
      ok: true,
      config: makeRuntimeConfig({
        guest: { aiPerHour: 8 },
        ai: { enabled: false },
      }),
    });
  });

  it("names every field that is out of range, blank or not a number", () => {
    const result = parseConfigForm(
      formOf({
        "guest.aiPerHour": "999",
        "ai.dailyCap": "",
        "freeTier.vercelCpuHours": "x",
      }),
    );
    expect(result).toEqual({
      ok: false,
      fields: expect.arrayContaining([
        "guest.aiPerHour",
        "ai.dailyCap",
        "freeTier.vercelCpuHours",
      ]),
    });
  });

  it("treats a missing field as invalid", () => {
    expect(parseConfigForm(formOf({}, { skip: "guest.sharesPerHour" }))).toEqual({
      ok: false,
      fields: ["guest.sharesPerHour"],
    });
  });
});
