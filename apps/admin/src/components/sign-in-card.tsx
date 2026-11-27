import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export async function SignInCard({ failed }: Readonly<{ failed: boolean }>) {
  const t = await getTranslations("SignIn");
  return (
    <Card className="w-full max-w-sm">
      <CardContent className="flex flex-col gap-4 p-6">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="font-display text-3xl text-ink">{t("heading")}</h1>
        <p className="text-ink-soft">{t("body")}</p>
        {failed ? (
          <p role="alert" className="text-destructive">
            {t("error")}
          </p>
        ) : null}
        {/* A plain link: the OAuth hop is a full navigation. */}
        <a
          href="/api/auth/login"
          className={cn(buttonVariants({ variant: "brass" }))}
        >
          {t("button")}
        </a>
      </CardContent>
    </Card>
  );
}
