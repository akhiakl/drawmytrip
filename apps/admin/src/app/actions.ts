"use server";

import { saveRuntimeConfig } from "@drawmytrip/runtime-config/store";
import { revalidatePath } from "next/cache";

import { appendAudit, configDiff } from "@/lib/audit";
import { parseConfigForm } from "@/lib/config-form";
import { requireAdmin } from "@/lib/require-admin";

export type SaveState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "invalid"; fields: string[] }
  | { status: "error" };

export async function saveConfigAction(
  _previous: SaveState,
  form: FormData,
): Promise<SaveState> {
  const admin = await requireAdmin();
  const parsed = parseConfigForm(form);
  if (!parsed.ok) return { status: "invalid", fields: parsed.fields };
  try {
    const previous = await saveRuntimeConfig(parsed.config);
    await appendAudit({
      at: Date.now(),
      actor: String(admin.githubId),
      action: "config_saved",
      detail: configDiff(previous, parsed.config),
    });
  } catch {
    return { status: "error" };
  }
  revalidatePath("/limits");
  revalidatePath("/usage");
  revalidatePath("/");
  return { status: "saved" };
}
