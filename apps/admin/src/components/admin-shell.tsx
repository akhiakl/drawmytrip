import { getTranslations } from "next-intl/server";

import { AdminNav } from "@/components/admin-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export async function AdminShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-10">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
        <p className="font-display text-xl text-ink">
          {t("Common.appName")}{" "}
          <span className="text-ink-soft">{t("Common.admin")}</span>
        </p>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle label={t("Nav.theme")} />
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="outline" size="sm">
              {t("Nav.signOut")}
            </Button>
          </form>
        </div>
        <AdminNav
          label={t("Nav.label")}
          items={[
            { href: "/usage", label: t("Nav.usage") },
            { href: "/limits", label: t("Nav.limits") },
            { href: "/audit", label: t("Nav.audit") },
          ]}
        />
      </header>
      <main className="flex flex-col gap-4">{children}</main>
    </div>
  );
}
