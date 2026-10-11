import { PageHeader } from "@/components/common/page-header";
import { MaxGraphArchitecture } from "@/components/architecture-maxgraph/maxgraph-architecture";
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
        description="전체 시스템 구성을 그룹 단위로 펼쳐 보고, 노드를 선택해 의존성과 상세 운영 정보를 확인합니다."
      />
      <MaxGraphArchitecture
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
