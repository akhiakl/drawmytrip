import { ImageResponse } from "next/og";

import { brandIconSvg } from "@/lib/brand";

import { DOTTED_STEM_MIN_SIZE, ICON_SIZES } from "../brand-mark";

export const dynamicParams = false;

export function generateStaticParams() {
  return ICON_SIZES.map((size) => ({ size: String(size) }));
}

const dataUri = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** PNG renditions of the brand mark (favicon fallback, Apple touch, PWA). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const size = Number((await params).size);
  const markDataUri = dataUri(brandIconSvg(size >= DOTTED_STEM_MIN_SIZE));
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element -- satori renders <img>, not next/image
    <img src={markDataUri} width={size} height={size} alt="" />,
    { width: size, height: size },
  );
}
