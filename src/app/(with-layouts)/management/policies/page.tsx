import { PageHeader } from "@/components/common/page-header";
import { PolicyManagementView } from "@/components/management/policy-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function PoliciesManagementPage() {
  const [policies, assets] = await Promise.all([
    managementRepo.getPolicies(),
    managementRepo.getAssets(),
  ]);

  return (
    <>
      <PageHeader
        title="네트워크 정책 관리"
        description="승인된 방화벽 오픈, 방향별 흐름(ONE_WAY / BIDIRECTIONAL) 및 정책 만료일을 등록하고 관리합니다."
      />
      <PolicyManagementView initialPolicies={policies} availableAssets={assets} />
    </>
  );
}
