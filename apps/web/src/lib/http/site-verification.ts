import type { Metadata } from "next";

/**
 * Search-engine ownership tags (Google Search Console, Bing Webmaster
 * Tools), from env so each deployment proves its own domain. Unset means
 * no tag.
 */
export function siteVerification(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata["verification"] {
  const google = env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = env.BING_SITE_VERIFICATION?.trim();
  return {
    ...(google && { google }),
    ...(bing && { other: { "msvalidate.01": bing } }),
  };
}
