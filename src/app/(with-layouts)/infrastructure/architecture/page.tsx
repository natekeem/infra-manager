import { PageHeader } from "@/components/common/page-header";
import { ArchitectureCanvas } from "@/components/topology/architecture-canvas";
import {
  getClusters,
  getNasAssets,
  getNetworkStatuses,
  getSoftware,
  getSoftwareProducts,
  getSoftwareReleases,
  getSops,
  getVmAssets,
} from "@/services/api/infrastructure";

export default async function ArchitecturePage() {
  const [
    vms,
    statuses,
    software,
    sops,
    clusters,
    nasAssets,
    softwareReleases,
    softwareProducts,
  ] = await Promise.all([
    getVmAssets(),
    getNetworkStatuses(),
    getSoftware(),
    getSops(),
    getClusters(),
    getNasAssets(),
    getSoftwareReleases(),
    getSoftwareProducts(),
  ]);

  return (
    <>
      <PageHeader
        title="Live Architecture"
        description="Default view is intentionally grouped. Drill into a tier only when VM-level detail is required."
      />
      <ArchitectureCanvas
        vms={vms}
        statuses={statuses}
        software={software}
        sops={sops}
        clusters={clusters}
        nasAssets={nasAssets}
        softwareReleases={softwareReleases}
        softwareProducts={softwareProducts}
      />
    </>
  );
}

