import { PageHeader } from "@/components/common/page-header";
import { SoftwareView } from "@/components/software/software-view";
import {
  getAssetSoftwareInstallations,
  getSoftware,
  getSoftwareProducts,
  getSoftwareReleases,
  getVmAssets,
} from "@/services/api/infrastructure";

export default async function SoftwarePage() {
  const [software, vms, products, releases, installations] = await Promise.all([
    getSoftware(),
    getVmAssets(),
    getSoftwareProducts(),
    getSoftwareReleases(),
    getAssetSoftwareInstallations(),
  ]);

  return (
    <>
      <PageHeader
        title="Software & EOSL Lifecycle"
        description="3-tier software product catalog, release matching rules, and asset installation lifecycle tracking."
      />
      <SoftwareView
        software={software}
        vms={vms}
        products={products}
        releases={releases}
        installations={installations}
      />
    </>
  );
}
