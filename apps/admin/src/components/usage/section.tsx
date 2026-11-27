import Link from "next/link";

/** A titled band of the page, with an optional "see more" link. */
export function Section({
  id,
  title,
  link,
  className,
  children,
}: Readonly<{
  id: string;
  title: string;
  link?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <section
      aria-labelledby={id}
      className={`flex min-w-0 flex-col gap-3 ${className ?? ""}`}
    >
      <div className="flex items-baseline gap-3">
        <h2 id={id} className="font-display text-xl font-medium text-ink">
          {title}
        </h2>
        {link ? (
          <Link
            href={link.href}
            className="ml-auto inline-flex min-h-11 items-center text-azure-text underline-offset-4 hover:underline"
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
