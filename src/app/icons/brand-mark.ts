import { brandIconSvg } from "@/lib/brand";

/** The app icon as SVG text (see `brandIconSvg`). */
export const BRAND_MARK_SVG = brandIconSvg();

/** Raster sizes served at `/icons/{size}`: favicon, Apple touch, PWA. */
export const ICON_SIZES = [32, 48, 96, 180, 192, 512] as const;

/** Search engines want a favicon that is a multiple of 48px square. */
export const FAVICON_SIZE = 48;

/** Below this size the stem's dots would blur, so the icon draws a solid stem. */
export const DOTTED_STEM_MIN_SIZE = 64;
