import { makeProjector, type LatLng } from "@/lib/trip";

/** 1200x630 is the size WhatsApp, iMessage, X, Slack and LinkedIn all crop to. */
export const OG_SIZE = { width: 1200, height: 630 };

// next/og renders outside the theme system, so the light tokens live here.
export const OG_PALETTE = {
  paper: "#f5f1e8",
  ink: "#16233a",
  inkSoft: "#4a5568",
  brass: "#b98a2f",
};

type Stop = { name: string; flag?: string; ll: readonly [number, number] };

/**
 * The shared share-card layout: eyebrow, title, subtitle and a route sketch.
 * City labels are plain HTML (Satori has no SVG <text>), placed absolutely at
 * their projected coordinates inside a relatively-positioned box.
 */
export function OgCard({
  eyebrow,
  title,
  subtitle,
  stops,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  readonly stops: readonly Stop[];
}) {
  const box = { width: 1072, height: 300, padding: 50 };
  const project = makeProjector(
    stops.map((s) => s.ll as LatLng),
    box,
  );
  const points = stops.map((s) => project(s.ll as LatLng));
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: OG_PALETTE.paper,
        padding: "56px 64px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: OG_PALETTE.brass,
            fontWeight: 600,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 58,
            color: OG_PALETTE.ink,
            fontWeight: 600,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: OG_PALETTE.inkSoft }}>
          {subtitle}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          position: "relative",
          width: box.width,
          height: box.height,
          marginTop: 24,
        }}
      >
        <svg
          aria-hidden
          width={box.width}
          height={box.height}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          <path
            d={pathD}
            stroke={OG_PALETTE.brass}
            strokeWidth={3}
            strokeDasharray="10 8"
            fill="none"
          />
          {points.map((p, i) => (
            <circle
              key={stops[i].name + i}
              cx={p.x}
              cy={p.y}
              r={8}
              fill={OG_PALETTE.paper}
              stroke={OG_PALETTE.brass}
              strokeWidth={4}
            />
          ))}
        </svg>
        {points.map((p, i) => (
          <div
            key={stops[i].name + i}
            style={{
              display: "flex",
              position: "absolute",
              left: Math.max(0, p.x - 70),
              top: Math.max(0, p.y - 42),
              width: 140,
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 600,
              color: OG_PALETTE.ink,
            }}
          >
            {stops[i].flag ? `${stops[i].flag} ${stops[i].name}` : stops[i].name}
          </div>
        ))}
      </div>
    </div>
  );
}
