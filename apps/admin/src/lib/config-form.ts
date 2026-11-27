import { RuntimeConfigSchema, type RuntimeConfig } from "@drawmytrip/runtime-config";

/** Form field names, one per numeric config leaf, as `section.key`. */
export const CONFIG_FIELDS = [
  "guest.aiPerHour",
  "guest.sharesPerHour",
  "ai.dailyCap",
  "ai.inputUsdPerMTokens",
  "ai.outputUsdPerMTokens",
  "freeTier.vercelTransferGb",
  "freeTier.vercelCpuHours",
  "freeTier.vercelAnalyticsEvents",
  "freeTier.upstashCommands",
  "freeTier.upstashStorageMb",
  "freeTier.llmRequestsPerDay",
] as const;

export type ConfigParse =
  { ok: true; config: RuntimeConfig } | { ok: false; fields: string[] };

function number(form: FormData, name: string): number {
  const raw = form.get(name);
  return typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
}

/** Form data to a validated config, or the names of the fields to fix. */
export function parseConfigForm(form: FormData): ConfigParse {
  const draft: Record<string, Record<string, number | boolean>> = {
    guest: {},
    ai: { enabled: form.get("ai.enabled") === "on" },
    freeTier: {},
  };
  for (const field of CONFIG_FIELDS) {
    const [section, key] = field.split(".");
    draft[section][key] = number(form, field);
  }
  const parsed = RuntimeConfigSchema.safeParse(draft);
  if (parsed.success) return { ok: true, config: parsed.data };
  const fields = new Set(
    parsed.error.issues.map((issue) => issue.path.slice(0, 2).join(".")),
  );
  return { ok: false, fields: [...fields] };
}
