import { PageHeader } from "@/components/common/page-header";
import { SopManagementView } from "@/components/management/sop-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function SopManagementPage() {
  const sops = await managementRepo.getSops();

  return (
    <>
      <PageHeader
        title="SOP Registry Management"
        description="Maintain operational runbooks, emergency recovery procedures, and map them to targeted virtual machines and services."
      />
      <SopManagementView initialSops={sops} />
    </>
  );
}
