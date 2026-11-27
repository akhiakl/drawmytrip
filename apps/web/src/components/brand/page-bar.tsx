import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { LogoLink } from "./logo";

/**
 * The bar atop every page off the map. With a `title` it is a task bar
 * (a back-home button, the page's h1, its own actions); without one it
 * carries the logo home.
 */
export function PageBar({
  title,
  children,
}: {
  readonly title?: ReactNode;
  /** Trailing actions, such as 44px icon buttons. */
  readonly children?: ReactNode;
}) {
  const t = useTranslations("Common");
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper">
      <div className="page-container flex h-14 items-center gap-1 lg:h-16">
        {title ? (
          <>
            <Link
              href="/"
              aria-label={t("backHome")}
              className="-ml-2.5 grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft aria-hidden className="size-5" />
            </Link>
            <h1 className="mr-auto min-w-0 truncate font-display text-lg font-medium">
              {title}
            </h1>
          </>
        ) : (
          <LogoLink className="mr-auto flex min-h-11 items-center" />
        )}
        {children}
      </div>
    </header>
  );
}
