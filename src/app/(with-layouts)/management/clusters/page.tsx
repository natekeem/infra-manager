import { PageHeader } from "@/components/common/page-header";
import { ClusterManagementView } from "@/components/management/cluster-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function ClustersManagementPage() {
  const [clusters, assets] = await Promise.all([
    managementRepo.getClusters(),
    managementRepo.getAssets(),
  ]);

  return (
    <>
      <PageHeader
        title="고가용성 클러스터 레지스트리"
        description="논리적 고가용성 클러스터(MSCS, Kubernetes, Oracle RAC)의 Virtual IP 및 Active/Passive 멤버 노드를 등록하고 관리합니다."
      />
      <ClusterManagementView initialClusters={clusters} availableAssets={assets} />
    </>
  );
}
