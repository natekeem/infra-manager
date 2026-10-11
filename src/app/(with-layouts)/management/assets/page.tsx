import { PageHeader } from "@/components/common/page-header";
import { AssetManagementView } from "@/components/management/asset-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function AssetsManagementPage() {
  const assets = await managementRepo.getAssets();

  return (
    <>
      <PageHeader
        title="자산 레지스트리"
        description="인프라 자산(VM, 물리 서버, NAS 스토리지)을 CMDB 기반으로 등록 및 관리합니다."
      />
      <AssetManagementView initialAssets={assets} />
    </>
  );
}
