/** Where the product lives in production; used when no env says otherwise. */
export const PRODUCTION_SITE_URL = "https://drawmytrip.click";

/**
 * The site's absolute origin, for metadata that must not be relative
 * (canonicals, OG image URLs, sitemap, robots). In order:
 * `NEXT_PUBLIC_SITE_URL` (an optional override), the deployment's own
 * address on a Vercel preview, then the production address in any
 * production build. Local dev falls back to localhost.
 *
 * shortcut: Vercel's `VERCEL_PROJECT_PRODUCTION_URL` is not used. It picks
 * the shortest production domain (a tie here with the vercel.app one) and
 * is absent from builds made with the Vercel CLI, which is how releases deploy.
 */
export function siteUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): URL {
  const candidates = [
    env.NEXT_PUBLIC_SITE_URL,
    env.VERCEL_ENV === "preview" && env.VERCEL_URL
      ? `https://${env.VERCEL_URL}`
      : undefined,
    env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : undefined,
  ];
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    try {
      return new URL(candidate.trim());
    } catch {
      // Malformed values fall through to the next candidate.
    }
  }
  return new URL(`http://localhost:${env.PORT ?? 3000}`);
}
