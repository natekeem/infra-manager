import { PageHeader } from "@/components/common/page-header";
import { SoftwareView } from "@/components/software/software-view";
import {
  getAssetSoftwareInstallations,
  getProjectSoftwareScopes,
  getSoftware,
  getSoftwareCatalogImportBatches,
  getSoftwareLifecycleHistory,
  getSoftwareLifecyclePhases,
  getSoftwareProducts,
  getSoftwareReleases,
  getVmAssets,
} from "@/services/api/infrastructure";

export default async function SoftwarePage() {
  const [software, vms, products, releases, installations, phases, scopes, history, importBatches] = await Promise.all([
    getSoftware(),
    getVmAssets(),
    getSoftwareProducts(),
    getSoftwareReleases(),
    getAssetSoftwareInstallations(),
    getSoftwareLifecyclePhases(),
    getProjectSoftwareScopes(),
    getSoftwareLifecycleHistory(),
    getSoftwareCatalogImportBatches(),
  ]);

  return (
    <>
      <PageHeader
        title="소프트웨어 및 EOSL 수명주기"
        description="3계층 소프트웨어 제품 카탈로그, 릴리스 매칭 규칙 및 자산 설치 수명주기를 추적합니다."
      />
      <SoftwareView
        software={software}
        vms={vms}
        products={products}
        releases={releases}
        installations={installations}
        phases={phases}
        scopes={scopes}
        history={history}
        importBatches={importBatches}
      />
    </>
  );
}
