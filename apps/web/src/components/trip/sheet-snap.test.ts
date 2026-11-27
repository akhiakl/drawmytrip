import { describe, expect, it } from "vitest";

import { nextSnap, snapHeights, visibleHeight } from "./sheet-snap";

const heights = snapHeights({ viewport: 844, sheet: 764, peek: 170 });

describe("snapHeights", () => {
  it("shows the head at peek, 58% at half and the whole sheet at full", () => {
    expect(heights).toEqual({ peek: 170, half: 490, full: 764 });
  });

  it("never lets half drop below peek or above full on short screens", () => {
    expect(snapHeights({ viewport: 400, sheet: 320, peek: 260 })).toEqual({
      peek: 260,
      half: 260,
      full: 320,
    });
  });
});

describe("nextSnap", () => {
  it("settles a slow drag at the nearest height", () => {
    // From half (490 shown) dragged up 200px: 690 is nearest to full.
    expect(nextSnap("half", -200, 0, heights)).toBe("full");
    // Dragged down 100px: 390 is still nearest to half.
    expect(nextSnap("half", 100, 0, heights)).toBe("half");
  });

  it("a flick moves one step in its direction", () => {
    expect(nextSnap("peek", -10, -800, heights)).toBe("half");
    expect(nextSnap("full", 10, 800, heights)).toBe("half");
    expect(nextSnap("peek", 10, 800, heights)).toBe("peek");
    expect(nextSnap("full", -10, -800, heights)).toBe("full");
  });
});

describe("visibleHeight", () => {
  it("is the height shown at a snap, with full counting as half for the map", () => {
    expect(visibleHeight("peek", heights)).toBe(170);
    expect(visibleHeight("full", heights)).toBe(490);
  });
});
