"use client";

import type { RuntimeConfig } from "@drawmytrip/runtime-config";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { saveConfigAction, type SaveState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NumericKey = Parameters<typeof valueOf>[1];

const valueOf = (
  config: RuntimeConfig,
  field: `${"guest" | "ai" | "freeTier"}.${string}`,
): number => {
  const [section, key] = field.split(".");
  return (config as unknown as Record<string, Record<string, number>>)[section][key];
};

const SECTIONS: {
  title: "guest" | "ai" | "freeTier";
  fields: { name: NumericKey; label: string; step?: string }[];
}[] = [
  {
    title: "guest",
    fields: [
      { name: "guest.aiPerHour", label: "aiPerHour" },
      { name: "guest.sharesPerHour", label: "sharesPerHour" },
    ],
  },
  {
    title: "ai",
    fields: [
      { name: "ai.dailyCap", label: "dailyCap" },
      { name: "ai.inputUsdPerMTokens", label: "inputPrice", step: "0.01" },
      { name: "ai.outputUsdPerMTokens", label: "outputPrice", step: "0.01" },
    ],
  },
  {
    title: "freeTier",
    fields: [
      { name: "freeTier.vercelTransferGb", label: "vercelTransferGb", step: "any" },
      { name: "freeTier.vercelCpuHours", label: "vercelCpuHours", step: "any" },
      { name: "freeTier.vercelAnalyticsEvents", label: "vercelAnalyticsEvents" },
      { name: "freeTier.upstashCommands", label: "upstashCommands" },
      { name: "freeTier.upstashStorageMb", label: "upstashStorageMb", step: "any" },
      { name: "freeTier.llmRequestsPerDay", label: "llmRequestsPerDay" },
    ],
  },
];

export function LimitsForm({ config }: Readonly<{ config: RuntimeConfig }>) {
  const t = useTranslations("Limits");
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
    <form action={action} className="flex flex-col gap-4" noValidate>
      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="font-display text-xl">
              {t(section.title)}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {section.title === "ai" ? (
              <div className="flex min-h-11 items-center gap-3 sm:col-span-2">
                <Checkbox
                  id="ai.enabled"
                  name="ai.enabled"
                  defaultChecked={config.ai.enabled}
                />
                <Label htmlFor="ai.enabled">{t("aiEnabled")}</Label>
              </div>
            ) : null}
            {section.fields.map((field) => {
              const bad = invalid.includes(field.name);
              return (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>{t(field.label as "aiPerHour")}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    inputMode="decimal"
                    step={field.step ?? "1"}
                    defaultValue={valueOf(config, field.name)}
                    aria-invalid={bad || undefined}
                    aria-describedby={bad ? `${field.name}-error` : undefined}
                  />
                  {bad ? (
                    <p id={`${field.name}-error`} className="text-destructive">
                      {t("fieldError")}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
      {invalid.length > 0 ? (
        <p role="alert" className="text-destructive">
          {t("invalid")}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="brass" disabled={pending}>
          {t("save")}
        </Button>
        <p className="text-ink-soft">{t("propagation")}</p>
      </div>
    </form>
  );
}
