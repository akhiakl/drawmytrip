import { afterEach, describe, expect, it, vi } from "vitest";

import { makePhotonFeature, makePhotonResponse } from "@/test/fixtures/geo-search";

import { locatePlace } from "./verify";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
afterEach(() => fetchMock.mockReset());

const respond = (body: unknown, ok = true) =>
  fetchMock.mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  });

const tower = {
  name: "CN Tower",
  ll: [43.6426, -79.3871] as [number, number],
  radiusKm: 15,
};

describe("locatePlace", () => {
  it("returns Photon's coordinates for a hit inside the radius", async () => {
    respond(
      makePhotonResponse([
        makePhotonFeature({ name: "CN Tower" }, [-79.3865, 43.6429]),
      ]),
    );
    expect(await locatePlace(tower)).toEqual([43.6429, -79.3865]);
  });

  it("skips a hit outside the radius and takes a later one inside it", async () => {
    respond(
      makePhotonResponse([
        makePhotonFeature({ name: "CN Tower" }, [-122.4, 37.8]),
        makePhotonFeature({ name: "CN Tower" }, [-79.39, 43.64]),
      ]),
    );
    expect(await locatePlace(tower)).toEqual([43.64, -79.39]);
  });

  it("returns null when nothing is close enough", async () => {
    respond(makePhotonResponse([makePhotonFeature({}, [16.37, 48.2])]));
    expect(await locatePlace(tower)).toBeNull();
  });

  it("biases the search to the claimed spot and sends a User-Agent", async () => {
    respond(makePhotonResponse([]));
    await locatePlace(tower);
    const [url, init] = fetchMock.mock.calls[0];
    const params = (url as URL).searchParams;
    expect(params.get("q")).toBe("CN Tower");
    expect(params.get("lat")).toBe("43.6426");
    expect(params.get("lon")).toBe("-79.3871");
    expect(params.getAll("layer")).toEqual([]);
    expect(init.headers["User-Agent"]).toContain("DrawMyTrip");
  });

  it("restricts cities to settlement layers", async () => {
    respond(makePhotonResponse([]));
    await locatePlace({ ...tower, settlement: true });
    expect((fetchMock.mock.calls[0][0] as URL).searchParams.getAll("layer")).toEqual(
      ["city", "locality"],
    );
  });

  it("returns null on an HTTP error, a network error or a bad body", async () => {
    respond({}, false);
    expect(await locatePlace(tower)).toBeNull();
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(await locatePlace(tower)).toBeNull();
    respond({ features: "nope" });
    expect(await locatePlace(tower)).toBeNull();
  });

  it("ignores features that don't parse", async () => {
    respond({ features: [{ bad: true }] });
    expect(await locatePlace(tower)).toBeNull();
  });
});
