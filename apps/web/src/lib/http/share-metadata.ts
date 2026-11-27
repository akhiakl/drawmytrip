import type { Metadata } from "next";

/**
 * The Open Graph and Twitter tags a link preview reads (WhatsApp, iMessage,
 * X, Slack, LinkedIn). A route's `openGraph` replaces the layout's wholesale,
 * so every page that sets its own title builds the full set here. `./` is
 * the page's own URL. A segment with its own `opengraph-image` file gets the
 * image from it; any other page must pass `image`, because the override
 * also drops the image inherited from the root file.
 */
export function shareMetadata(page: {
  readonly title: string;
  readonly description: string;
  readonly siteName: string;
  readonly image?: {
    readonly url: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
  };
}): Pick<Metadata, "openGraph" | "twitter"> {
  const { title, description, siteName, image } = page;
  const images = image && [image];
  return {
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      url: "./",
      locale: "en_US",
      ...(images && { images }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images && { images }),
    },
  };
}
