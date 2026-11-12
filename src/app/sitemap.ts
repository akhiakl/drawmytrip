import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/http";

/**
 * The public pages; shared maps are private-by-link. These pages only
 * change with a deploy, so the build time is their last-modified date.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();
  return ["/", "/plan", "/about", "/contact", "/privacy", "/terms"].map((path) => ({
    url: new URL(path, base).toString(),
    lastModified,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
