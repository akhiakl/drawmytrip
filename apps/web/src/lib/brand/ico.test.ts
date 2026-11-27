import { describe, expect, it } from "vitest";

import { pngToIco } from ".";

describe("pngToIco", () => {
  const png = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

  it("writes an icon header and entry in front of the PNG bytes", () => {
    const ico = pngToIco(png, 48);
    const view = new DataView(ico.buffer);
    expect([...ico.slice(0, 6)]).toEqual([0, 0, 1, 0, 1, 0]);
    expect(ico[6]).toBe(48);
    expect(ico[7]).toBe(48);
    expect(view.getUint32(14, true)).toBe(png.length);
    expect(view.getUint32(18, true)).toBe(22);
    expect([...ico.slice(22)]).toEqual([...png]);
  });

  it("stores a 256px edge as 0", () => {
    const ico = pngToIco(png, 256);
    expect(ico[6]).toBe(0);
    expect(ico[7]).toBe(0);
  });
});
