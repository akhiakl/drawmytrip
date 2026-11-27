import { OverviewView } from "@/components/overview/overview-view";
import { readAudit } from "@/lib/audit";
import { loadUsageOverview } from "@/lib/overview-loader";

export default async function OverviewPage() {
  const [overview, activity] = await Promise.all([
    loadUsageOverview(30),
    readAudit(5),
  ]);
  return <OverviewView overview={overview} activity={activity} />;
}
