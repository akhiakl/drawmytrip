import { describe, expect, it } from "vitest";

import { BRAND_COLORS, brandIconSvg, brandMarkSvg, MARK } from "./mark";

describe("brandMarkSvg", () => {
  it("draws the D curve, a dotted stem and both stops", () => {
    const svg = brandMarkSvg(BRAND_COLORS.light);
    expect(svg).toContain(`d="${MARK.curve}"`);
    expect(svg).toContain(`stroke-dasharray="${MARK.stemDots}"`);
    expect(svg.match(/<circle/g)).toHaveLength(2);
  });

  it("draws a solid stem for small sizes", () => {
    expect(brandMarkSvg(BRAND_COLORS.light, false)).not.toContain(
      "stroke-dasharray",
    );
  });

  it("uses the dark palette on request", () => {
    expect(brandMarkSvg(BRAND_COLORS.dark)).toContain(BRAND_COLORS.dark.brass);
  });
});

describe("brandIconSvg", () => {
  it("is the mark on a tile, dotted by default and with no scripts", () => {
    const svg = brandIconSvg();
    expect(svg).toContain('<rect width="64" height="64"');
    expect(svg).toContain("stroke-dasharray");
    expect(svg).not.toMatch(/<script|onload/i);
    expect(brandIconSvg(false)).not.toContain("stroke-dasharray");
  });
});
