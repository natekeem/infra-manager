import { PageHeader } from "@/components/common/page-header";
import { AssetManagementView } from "@/components/management/asset-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function AssetsManagementPage() {
  const assets = await managementRepo.getAssets();

  return (
    <>
      <PageHeader
        title="Asset Registry"
        description="Register and manage infrastructure assets (VMs, Physical Servers, NAS storage) with CMDB source provenance."
      />
      <AssetManagementView initialAssets={assets} />
    </>
  );
}
