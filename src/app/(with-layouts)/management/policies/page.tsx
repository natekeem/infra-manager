import { PageHeader } from "@/components/common/page-header";
import { PolicyManagementView } from "@/components/management/policy-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function PoliciesManagementPage() {
  const policies = await managementRepo.getPolicies();

  return (
    <>
      <PageHeader
        title="Network Policy Management"
        description="Register and manage approved firewall openings, directional flows (ONE_WAY / BIDIRECTIONAL), and policy expiry dates."
      />
      <PolicyManagementView initialPolicies={policies} />
    </>
  );
}
