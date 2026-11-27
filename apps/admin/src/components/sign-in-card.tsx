import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The signed-out screen: the lockup, what this is, and the one way in. */
export async function SignInCard({ failed }: Readonly<{ failed: boolean }>) {
  const t = await getTranslations("SignIn");
  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <Logo className="self-center" />
      <div className="flex flex-col gap-5 rounded-3xl border border-line bg-card-solid p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="font-display text-3xl font-medium text-ink">
            {t("heading")}
          </h1>
          <p className="text-ink-soft">{t("body")}</p>
        </div>
        {failed ? (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive"
          >
            {t("error")}
          </p>
        ) : null}
        {/* A plain link: the OAuth hop is a full navigation. */}
        <a
          href="/api/auth/login"
          className={cn(buttonVariants({ variant: "brass" }), "w-full")}
        >
          {t("button")}
        </a>
      </div>
      <p className="text-center text-[13px] text-ink-soft">{t("foot")}</p>
    </div>
  );
}
