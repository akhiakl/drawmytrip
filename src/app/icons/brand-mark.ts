import { brandIconSvg } from "@/lib/brand";

/** The app icon as SVG text (see `brandIconSvg`). */
export const BRAND_MARK_SVG = brandIconSvg();

/** Raster sizes served at `/icons/{size}`: favicon, Apple touch, PWA. */
export const ICON_SIZES = [32, 180, 192, 512] as const;
