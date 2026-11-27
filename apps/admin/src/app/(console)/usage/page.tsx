import { UsageView } from "@/components/usage/usage-view";
import { loadUsageOverview } from "@/lib/overview-loader";
import { parseRange } from "@/lib/range";

export default async function UsagePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ range?: string }> }>) {
  const { range } = await searchParams;
  return <UsageView overview={await loadUsageOverview(parseRange(range))} />;
}
