"use client";

import type { RuntimeConfig } from "@drawmytrip/runtime-config";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { saveConfigAction, type SaveState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { LimitField } from "./limit-field";

type Section = "guest" | "ai" | "freeTier";
type Unit =
  | "perHour"
  | "perDay"
  | "usd"
  | "gb"
  | "hours"
  | "mb"
  | "events"
  | "commands"
  | "requests";
type FieldName = `${Section}.${string}`;

const valueOf = (config: RuntimeConfig, field: FieldName): number => {
  const [section, key] = field.split(".");
  return (config as unknown as Record<string, Record<string, number>>)[section][key];
};

const SECTIONS: {
  id: Section;
  fields: {
    name: FieldName;
    label: string;
    unit: Unit;
    hint?: string;
    step?: string;
  }[];
}[] = [
  {
    id: "guest",
    fields: [
      { name: "guest.aiPerHour", label: "aiPerHour", unit: "perHour" },
      { name: "guest.sharesPerHour", label: "sharesPerHour", unit: "perHour" },
    ],
  },
  {
    id: "ai",
    fields: [
      {
        name: "ai.dailyCap",
        label: "dailyCap",
        unit: "perDay",
        hint: "dailyCapHint",
      },
      {
        name: "ai.inputUsdPerMTokens",
        label: "inputPrice",
        unit: "usd",
        step: "0.01",
      },
      {
        name: "ai.outputUsdPerMTokens",
        label: "outputPrice",
        unit: "usd",
        step: "0.01",
      },
    ],
  },
  {
    id: "freeTier",
    fields: [
      {
        name: "freeTier.vercelTransferGb",
        label: "vercelTransferGb",
        unit: "gb",
        step: "any",
      },
      {
        name: "freeTier.vercelCpuHours",
        label: "vercelCpuHours",
        unit: "hours",
        step: "any",
      },
      {
        name: "freeTier.vercelAnalyticsEvents",
        label: "vercelAnalyticsEvents",
        unit: "events",
      },
      {
        name: "freeTier.upstashCommands",
        label: "upstashCommands",
        unit: "commands",
      },
      {
        name: "freeTier.upstashStorageMb",
        label: "upstashStorageMb",
        unit: "mb",
        step: "any",
      },
      {
        name: "freeTier.llmRequestsPerDay",
        label: "llmRequestsPerDay",
        unit: "requests",
        hint: "llmRequestsPerDayHint",
      },
    ],
  },
];

/** Settings in titled groups (title and why on the left from `lg`), saved from a sticky bar. */
export function LimitsForm({ config }: Readonly<{ config: RuntimeConfig }>) {
  const t = useTranslations("Limits");
  const k = (key: string) => t(key as "aiPerHour");
  const [state, action, pending] = useActionState<SaveState, FormData>(
    saveConfigAction,
    { status: "idle" },
  );
  useEffect(() => {
    if (state.status === "saved") toast.success(t("saved"));
    if (state.status === "error") toast.error(t("error"));
  }, [state, t]);
  const invalid = state.status === "invalid" ? state.fields : [];

  return (
    <form action={action} className="flex flex-col gap-8" noValidate>
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`limits-${section.id}`}
          className="grid gap-4 lg:grid-cols-3 lg:gap-8"
        >
          <div className="flex flex-col gap-1">
            <h2
              id={`limits-${section.id}`}
              className="font-display text-xl font-medium text-ink"
            >
              {t(section.id)}
            </h2>
            <p className="text-ink-soft">{k(`${section.id}Body`)}</p>
          </div>
          <div className="grid gap-5 rounded-2xl border border-line bg-card-solid p-5 sm:grid-cols-2 lg:col-span-2">
            {section.id === "ai" ? (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <div className="flex min-h-11 items-center gap-3">
                  <Checkbox
                    id="ai.enabled"
                    name="ai.enabled"
                    defaultChecked={config.ai.enabled}
                    aria-describedby="ai.enabled-hint"
                  />
                  <Label htmlFor="ai.enabled">{t("aiEnabled")}</Label>
                </div>
                <p id="ai.enabled-hint" className="text-[13px] text-ink-soft">
                  {t("aiEnabledHint")}
                </p>
              </div>
            ) : null}
            {section.fields.map((field) => (
              <LimitField
                key={field.name}
                name={field.name}
                label={k(field.label)}
                unit={t(`unit.${field.unit}`)}
                hint={field.hint ? k(field.hint) : undefined}
                step={field.step ?? "1"}
                value={valueOf(config, field.name)}
                invalid={invalid.includes(field.name)}
                error={t("fieldError")}
              />
            ))}
          </div>
        </section>
      ))}
      <div className="sticky bottom-20 z-10 flex items-center gap-3 rounded-2xl border border-line bg-card-solid p-3 shadow-soft lg:bottom-6">
        <Button type="submit" variant="brass" disabled={pending}>
          {t("save")}
        </Button>
        {invalid.length > 0 ? (
          <p role="alert" className="text-[13px] text-destructive sm:text-base">
            {t("invalid")}
          </p>
        ) : (
          <p className="min-w-0 flex-1 text-[13px] text-ink-soft sm:text-base">
            {t("propagation")}
          </p>
        )}
      </div>
    </form>
  );
}
