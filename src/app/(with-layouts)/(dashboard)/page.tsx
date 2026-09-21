import { getNetworkStatuses, getSoftware, getSops, getVmAssets } from "@/services/api/infrastructure";
import { getResourceTrend } from "@/services/api/metrics";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const [vms, network, software, sops, trend] = await Promise.all([
    getVmAssets(),
    getNetworkStatuses(),
    getSoftware(),
    getSops(),
    getResourceTrend(),
  ]);

  return <DashboardView vms={vms} network={network} software={software} sops={sops} trend={trend} />;
}
