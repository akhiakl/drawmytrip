import { describe, expect, it } from "vitest";

import { shareMetadata } from "./share-metadata";

describe("shareMetadata", () => {
  it("repeats the title and description for Open Graph and a large Twitter card", () => {
    const result = shareMetadata({
      title: "How it works · Grand Tour",
      description: "Draw a route.",
      siteName: "Grand Tour",
    });

    expect(result.openGraph).toMatchObject({
      type: "website",
      siteName: "Grand Tour",
      title: "How it works · Grand Tour",
      description: "Draw a route.",
      url: "./",
    });
    expect(result.twitter).toEqual({
      card: "summary_large_image",
      title: "How it works · Grand Tour",
      description: "Draw a route.",
    });
  });

  it("carries an explicit share image to both Open Graph and Twitter", () => {
    const image = {
      url: "/opengraph-image",
      alt: "A map",
      width: 1200,
      height: 630,
    };
    const result = shareMetadata({
      title: "How it works",
      description: "Draw a route.",
      siteName: "Grand Tour",
      image,
    });

    expect(result.openGraph?.images).toEqual([image]);
    expect(result.twitter?.images).toEqual([image]);
  });
});
