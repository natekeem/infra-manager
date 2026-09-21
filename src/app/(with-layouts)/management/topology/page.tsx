import { PageHeader } from "@/components/common/page-header";
import { TopologyManagementView } from "@/components/management/topology-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function TopologyManagementPage() {
  const assets = await managementRepo.getAssets();

  return (
    <>
      <PageHeader
        title="Topology & Service Mapping"
        description="Configure logical services, map infrastructure assets to functional tiers, and declare upstream/external dependencies."
      />
      <TopologyManagementView initialAssets={assets} />
    </>
  );
}
