/** Eyebrow, the page's h1, an optional line under it, and trailing actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: Readonly<{
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display text-3xl font-medium text-ink lg:text-4xl">
          {title}
        </h1>
        {description ? <div className="text-ink-soft">{description}</div> : null}
      </div>
      {actions ? <div className="sm:ml-auto">{actions}</div> : null}
    </div>
  );
}
