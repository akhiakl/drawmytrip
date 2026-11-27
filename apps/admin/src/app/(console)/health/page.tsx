import { HealthView } from "@/components/health/health-view";
import { loadHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  return <HealthView health={await loadHealth(process.env)} />;
}
