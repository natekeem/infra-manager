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
        title="소프트웨어 카탈로그 관리"
        description="소프트웨어 제품, 릴리스 수명주기 정의 및 버전 매칭 규칙(정확, 접두어, 정규식, 범위)을 관리합니다."
      />
      <SoftwareManagementView initialProducts={products} initialReleases={releases} />
    </>
  );
}
