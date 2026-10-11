import { getAssetSoftwareInstallations, getNetworkStatuses, getSoftware, getSoftwareLifecyclePhases, getSoftwareReleases, getSops, getVmAssets } from "@/services/api/infrastructure";
import { getResourceTrend } from "@/services/api/metrics";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const [vms, network, software, sops, trend, installations, releases, phases] = await Promise.all([
    getVmAssets(),
    getNetworkStatuses(),
    getSoftware(),
    getSops(),
    getResourceTrend(),
    getAssetSoftwareInstallations(),
    getSoftwareReleases(),
    getSoftwareLifecyclePhases(),
  ]);

  return <DashboardView vms={vms} network={network} software={software} sops={sops} trend={trend} installations={installations} releases={releases} phases={phases} />;
}
