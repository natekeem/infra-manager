import { PageHeader } from "@/components/common/page-header";
import { RelationManagementView } from "@/components/management/relation-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function RelationsManagementPage() {
  const [relations, assets, groups, clusters] = await Promise.all([
    managementRepo.getRelations(),
    managementRepo.getAssets(),
    managementRepo.getTopologyGroups(),
    managementRepo.getClusters(),
  ]);

  return (
    <>
      <PageHeader
        title="아키텍처 연결 관계 레지스트리"
        description="방화벽 오픈 정책과 독립적으로 논리적 아키텍처 의존성(SERVICE, DATABASE, STORAGE, MONITORING, MANAGEMENT)을 등록하고 관리합니다."
      />
      <RelationManagementView
        initialRelations={relations}
        availableAssets={assets}
        availableGroups={groups}
        availableClusters={clusters}
      />
    </>
  );
}
