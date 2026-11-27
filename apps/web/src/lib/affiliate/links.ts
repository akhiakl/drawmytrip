import type { City, StopDates } from "@/lib/trip";

export type AffiliateKind = "stay" | "activity" | "esim" | "insurance";

/** Operator-supplied affiliate URLs; `{city}`, `{country}`, `{checkin}`, `{checkout}` are filled in. */
export type AffiliateTemplates = Partial<Record<AffiliateKind, string>>;

export interface AffiliateLink {
  kind: AffiliateKind;
  href: string;
}

/** Display order of the links. */
const KINDS: readonly AffiliateKind[] = ["stay", "activity", "esim", "insurance"];

// Read statically so Next inlines them into the client bundle. The ids in
// these URLs are public by nature (they ride in every outbound link).
const ENV_TEMPLATES: AffiliateTemplates = {
  stay: process.env.NEXT_PUBLIC_AFFILIATE_STAY_URL,
  activity: process.env.NEXT_PUBLIC_AFFILIATE_ACTIVITY_URL,
  esim: process.env.NEXT_PUBLIC_AFFILIATE_ESIM_URL,
  insurance: process.env.NEXT_PUBLIC_AFFILIATE_INSURANCE_URL,
};

/**
 * Affiliate links for one stop, from the operator's URL templates. Only
 * `https` templates are used and values are encoded, so trip text can
 * never change a link's host or add parameters.
 * shortcut: undated trips send empty check-in/out values, upgrade if a partner rejects that.
 */
export function affiliateLinks(
  city: City,
  dates?: StopDates,
  templates: AffiliateTemplates = ENV_TEMPLATES,
): AffiliateLink[] {
  const values: Record<string, string> = {
    city: city.name,
    country: city.country,
    checkin: dates?.arrive ?? "",
    checkout: dates?.depart ?? "",
  };
  return KINDS.flatMap((kind) => {
    const template = templates[kind]?.trim();
    if (!template?.startsWith("https://")) return [];
    const href = template.replace(/\{(\w+)\}/g, (match, key: string) =>
      key in values ? encodeURIComponent(values[key]) : match,
    );
    return [{ kind, href }];
  });
}
