import { PageHeader } from "@/components/common/page-header";
import { SopManagementView } from "@/components/management/sop-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function SopManagementPage() {
  const [sops, assets, topologyGroups] = await Promise.all([
    managementRepo.getSops(),
    managementRepo.getAssets(),
    managementRepo.getTopologyGroups(),
  ]);

  return (
    <>
      <PageHeader
        title="SOP 레지스트리 관리"
        description="운영 절차서, 비상 복구 프로시저를 유지 관리하고 대상 VM 및 서비스에 매핑합니다."
      />
      <SopManagementView
        initialSops={sops}
        availableAssets={assets}
        availableGroups={topologyGroups}
      />
    </>
  );
}
