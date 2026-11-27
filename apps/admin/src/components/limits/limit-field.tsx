import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A labelled number input with its unit inside the box and an optional hint. */
export function LimitField({
  name,
  label,
  unit,
  hint,
  step,
  value,
  invalid,
  error,
}: Readonly<{
  name: string;
  label: string;
  unit: string;
  hint?: string;
  step: string;
  value: number;
  invalid: boolean;
  error: string;
}>) {
  const described = [hint ? `${name}-hint` : null, invalid ? `${name}-error` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type="number"
          inputMode="decimal"
          step={step}
          defaultValue={value}
          aria-invalid={invalid || undefined}
          aria-describedby={described || undefined}
          className="pr-24 tabular-nums"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-ink-soft"
        >
          {unit}
        </span>
      </div>
      {hint ? (
        <p id={`${name}-hint`} className="text-[13px] text-ink-soft">
          {hint}
        </p>
      ) : null}
      {invalid ? (
        <p id={`${name}-error`} className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
