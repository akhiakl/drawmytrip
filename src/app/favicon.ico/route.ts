import { pngToIco } from "@/lib/brand";

import { FAVICON_SIZE } from "../icons/brand-mark";
import { renderIcon } from "../icons/render-icon";

export const dynamic = "force-static";

/** The default favicon path crawlers and old browsers request: a 48px icon. */
export async function GET() {
  const png = new Uint8Array(await renderIcon(FAVICON_SIZE).arrayBuffer());
  return new Response(pngToIco(png, FAVICON_SIZE), {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
