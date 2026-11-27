import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { BRAND_COLORS, brandIconSvg, brandMarkSvg } from ".";

const file = (name: string) =>
  readFileSync(join(process.cwd(), "public/brand", name), "utf8");

describe("exported brand files", () => {
  it("match the generators, so the files never drift from the code", () => {
    expect(file("mark-light.svg")).toBe(brandMarkSvg(BRAND_COLORS.light));
    expect(file("mark-dark.svg")).toBe(brandMarkSvg(BRAND_COLORS.dark));
    expect(file("icon.svg")).toBe(brandIconSvg());
  });
});
