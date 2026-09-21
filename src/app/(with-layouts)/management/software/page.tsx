import { PageHeader } from "@/components/common/page-header";
import { SoftwareManagementView } from "@/components/management/software-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function SoftwareManagementPage() {
  const [products, releases] = await Promise.all([
    managementRepo.getProducts(),
    managementRepo.getReleases(),
  ]);

  return (
    <>
      <PageHeader
        title="Software Catalog Management"
        description="Maintain software products, release lifecycle definitions, and version match rules (exact, prefix, regex, range)."
      />
      <SoftwareManagementView initialProducts={products} initialReleases={releases} />
    </>
  );
}
