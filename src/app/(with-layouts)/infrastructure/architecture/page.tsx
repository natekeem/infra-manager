import { PageHeader } from "@/components/common/page-header";
import { ArchitectureCanvas } from "@/components/topology/architecture-canvas";
import {
  getClusters,
  getNasAssets,
  getNetworkStatuses,
  getRelations,
  getSoftware,
  getSoftwareProducts,
  getSoftwareReleases,
  getSops,
  getTopologyGroups,
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
    relations,
    topologyGroups,
  ] = await Promise.all([
    getVmAssets(),
    getNetworkStatuses(),
    getSoftware(),
    getSops(),
    getClusters(),
    getNasAssets(),
    getSoftwareReleases(),
    getSoftwareProducts(),
    getRelations(),
    getTopologyGroups(),
  ]);

  return (
    <>
      <PageHeader
        title="Live Architecture"
        description="오버뷰에서 구성을 요약하고 전체보기에서 개별 자산을 확인합니다. 환경과 그룹을 선택해 범위를 좁힐 수 있습니다."
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
        relations={relations}
        topologyGroups={topologyGroups}
      />
    </>
  );
}
