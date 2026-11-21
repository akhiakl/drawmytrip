import { MARK } from "@/lib/brand";

import type { PosterCopy, PosterFonts, PosterTheme } from "./draw-poster";

const MARK_PX = 44;
const GAP = 14;
const TEXT_PX = 34;
const BASELINE = 1284;

/** Draws the route D mark in the poster's theme colors at (x, y), `MARK_PX` square. */
function drawMark(
  ctx: CanvasRenderingContext2D,
  theme: PosterTheme,
  x: number,
  y: number,
) {
  const { curve, stem, start, end } = MARK;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(MARK_PX / MARK.size, MARK_PX / MARK.size);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = theme.brass;
  ctx.lineWidth = MARK.curveWidth;
  ctx.stroke(new Path2D(curve));

  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = MARK.stemWidth;
  ctx.setLineDash(MARK.stemDots.split(" ").map(Number));
  ctx.stroke(new Path2D(stem));
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(start.cx, start.cy, start.r, 0, Math.PI * 2);
  ctx.fillStyle = theme.paper;
  ctx.fill();
  ctx.lineWidth = MARK.ringWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(end.cx, end.cy, end.r, 0, Math.PI * 2);
  ctx.fillStyle = theme.ink;
  ctx.fill();
  ctx.restore();
}

/** The poster's signature: mark and wordmark centred, the site address below. */
export function drawBrandLockup(
  ctx: CanvasRenderingContext2D,
  theme: PosterTheme,
  fonts: PosterFonts,
  copy: PosterCopy,
) {
  const width = 1080;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.font = `500 ${TEXT_PX}px ${fonts.display}`;
  const leadWidth = ctx.measureText(copy.brandLead).width;
  const tailFont = `italic 400 ${TEXT_PX}px ${fonts.display}`;
  const lead = ctx.font;
  ctx.font = tailFont;
  const tailWidth = ctx.measureText(copy.brandTail).width;

  const total = MARK_PX + GAP + leadWidth + tailWidth;
  const x = (width - total) / 2;
  drawMark(ctx, theme, x, BASELINE - 36);

  const textX = x + MARK_PX + GAP;
  ctx.fillStyle = theme.ink;
  ctx.font = lead;
  ctx.fillText(copy.brandLead, textX, BASELINE);
  ctx.fillStyle = theme.azure;
  ctx.font = tailFont;
  ctx.fillText(copy.brandTail, textX + leadWidth, BASELINE);

  ctx.textAlign = "center";
  ctx.fillStyle = theme.inkSoft;
  ctx.font = `400 22px ${fonts.sans}`;
  ctx.fillText(copy.host, width / 2, 1322);
}
