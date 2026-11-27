import { ICON_SIZES } from "../brand-mark";
import { renderIcon } from "../render-icon";

export const dynamicParams = false;

export function generateStaticParams() {
  return ICON_SIZES.map((size) => ({ size: String(size) }));
}

/** PNG renditions of the brand mark (favicon, Apple touch, PWA). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  return renderIcon(Number((await params).size));
}
