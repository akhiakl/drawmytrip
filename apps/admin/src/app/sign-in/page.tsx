import { SignInCard } from "@/components/sign-in-card";

export default async function SignInPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string }> }>) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <SignInCard failed={error === "1"} />
    </main>
  );
}
