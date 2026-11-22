import { ImageResponse } from "next/og";

import { brandIconSvg } from "@/lib/brand";

import { DOTTED_STEM_MIN_SIZE } from "./brand-mark";

const dataUri = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** The brand icon as a PNG of `size` pixels, with a solid stem at small sizes. */
export function renderIcon(size: number): ImageResponse {
  const markDataUri = dataUri(brandIconSvg(size >= DOTTED_STEM_MIN_SIZE));
  return new ImageResponse(
    <img src={markDataUri} width={size} height={size} alt="" />,
    { width: size, height: size },
  );
}
