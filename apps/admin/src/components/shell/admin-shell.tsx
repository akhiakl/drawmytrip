import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LogoLink } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

import { NavLinks, type NavId } from "./nav-links";

const SECTIONS: NavId[] = ["overview", "usage", "limits", "audit"];

/**
 * Phones: a solid top bar, the page, and a fixed tab bar in the thumb zone.
 * From `lg`: a sticky sidebar with the lockup, sections and account actions.
 */
export async function AdminShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations("Nav");
  const items = SECTIONS.map((id) => ({ id, label: t(id) }));
  const signOut = (
    <form action="/api/auth/logout" method="post">
      <Button type="submit" variant="outline" size="icon" aria-label={t("signOut")}>
        <LogOut aria-hidden />
      </Button>
    </form>
  );

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-paper px-4 lg:hidden">
        <LogoLink className="mr-auto" />
        <ThemeToggle label={t("theme")} />
        {signOut}
      </header>

      <aside className="hidden w-64 shrink-0 border-r border-line bg-sheet lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-8 px-4 py-6">
          <LogoLink className="px-2" />
          <NavLinks label={t("label")} items={items} variant="side" />
          <div className="mt-auto flex items-center gap-2 border-t border-line px-1 pt-4">
            <ThemeToggle label={t("theme")} />
            <form action="/api/auth/logout" method="post" className="flex-1">
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start px-3"
              >
                <LogOut aria-hidden />
                {t("signOut")}
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <main className="enter mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-6 px-4 pt-6 pb-28 lg:px-10 lg:pt-10 lg:pb-12">
        {children}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card-solid pb-[env(safe-area-inset-bottom)] lg:hidden">
        <NavLinks label={t("label")} items={items} variant="tabs" />
      </div>
    </div>
  );
}
