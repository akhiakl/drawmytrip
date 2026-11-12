import { describe, expect, it } from "vitest";

import { pageMetadata } from "./page-metadata";

describe("pageMetadata", () => {
  it("gives a public page its own branded link-preview title and description", async () => {
    const metadata = await pageMetadata("about");

    expect(metadata.title).toBe("How it works");
    expect(metadata.openGraph).toMatchObject({
      title: "How it works · DrawMyTrip",
      description: metadata.description,
      siteName: "DrawMyTrip",
    });
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "/opengraph-image",
        alt: "A DrawMyTrip route map",
        width: 1200,
        height: 630,
      },
    ]);
    expect(metadata.twitter).toMatchObject({ title: "How it works · DrawMyTrip" });
  });
});
