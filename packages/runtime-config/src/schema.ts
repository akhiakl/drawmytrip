import * as z from "zod";

/** Hard ceilings: a typo in the admin can never open the API wide. */
export const CONFIG_BOUNDS = {
  aiPerHour: { min: 1, max: 60 },
  sharesPerHour: { min: 1, max: 120 },
  /** 0 means no cap. */
  dailyCap: { min: 0, max: 10_000 },
  usdPerMTokens: { min: 0, max: 100 },
} as const;

export const RuntimeConfigSchema = z.object({
  guest: z.object({
    aiPerHour: z
      .number()
      .int()
      .min(CONFIG_BOUNDS.aiPerHour.min)
      .max(CONFIG_BOUNDS.aiPerHour.max),
    sharesPerHour: z
      .number()
      .int()
      .min(CONFIG_BOUNDS.sharesPerHour.min)
      .max(CONFIG_BOUNDS.sharesPerHour.max),
  }),
  ai: z.object({
    enabled: z.boolean(),
    dailyCap: z
      .number()
      .int()
      .min(CONFIG_BOUNDS.dailyCap.min)
      .max(CONFIG_BOUNDS.dailyCap.max),
    inputUsdPerMTokens: z
      .number()
      .min(CONFIG_BOUNDS.usdPerMTokens.min)
      .max(CONFIG_BOUNDS.usdPerMTokens.max),
    outputUsdPerMTokens: z
      .number()
      .min(CONFIG_BOUNDS.usdPerMTokens.min)
      .max(CONFIG_BOUNDS.usdPerMTokens.max),
  }),
  freeTier: z.object({
    vercelTransferGb: z.number().positive(),
    vercelCpuHours: z.number().positive(),
    vercelAnalyticsEvents: z.number().int().positive(),
    upstashCommands: z.number().int().positive(),
    upstashStorageMb: z.number().positive(),
    /** 0 means read the limit from the provider's headers only. */
    llmRequestsPerDay: z.number().int().min(0),
  }),
});
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

/** Today's guest budgets and the Vercel Hobby and Upstash free limits (2026-11-27). */
export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  guest: { aiPerHour: 5, sharesPerHour: 10 },
  ai: { enabled: true, dailyCap: 0, inputUsdPerMTokens: 0, outputUsdPerMTokens: 0 },
  freeTier: {
    vercelTransferGb: 100,
    vercelCpuHours: 4,
    vercelAnalyticsEvents: 50_000,
    upstashCommands: 500_000,
    upstashStorageMb: 256,
    llmRequestsPerDay: 0,
  },
};
