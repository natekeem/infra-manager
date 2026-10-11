import { PageHeader } from "@/components/common/page-header";
import { TopologyManagementView } from "@/components/management/topology-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function TopologyManagementPage() {
  const groups = await managementRepo.getTopologyGroups();

  return (
    <>
      <PageHeader
        title="토폴로지 그룹 레지스트리"
        description="인프라를 다계층 토폴로지 그룹(SYSTEM, DOMAIN, ENVIRONMENT, STACK, CLUSTER, RUNTIME)으로 프로젝트 그룹별 구성합니다."
      />
      <TopologyManagementView initialGroups={groups} />
    </>
  );
}
