import { describe, expect, it } from "vitest";

import { brandIconSvg, MARK } from ".";

describe("brandIconSvg", () => {
  it("draws the D curve, stem and both stops on a tile", () => {
    const svg = brandIconSvg();
    expect(svg).toContain(`d="${MARK.curve}"`);
    expect(svg).toContain(`d="${MARK.stem}"`);
    expect(svg.match(/<circle/g)).toHaveLength(2);
    expect(svg).toContain('<rect width="64" height="64"');
  });

  it("is valid standalone SVG with no scripts", () => {
    const svg = brandIconSvg();
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).not.toMatch(/<script|onload/i);
  });
});
