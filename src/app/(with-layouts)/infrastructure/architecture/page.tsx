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
        title="Architecture"
        description="전체 구성에서 필요한 그룹을 펼치고 Dependency에서 자산·그룹·클러스터의 의존성과 장애 영향 범위를 확인합니다."
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
