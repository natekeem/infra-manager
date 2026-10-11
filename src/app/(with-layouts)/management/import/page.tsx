import { PageHeader } from "@/components/common/page-header";
import { BatchImportView } from "@/components/management/batch-import-view";

export default function BatchImportPage() {
  return (
    <>
      <PageHeader
        title="일괄 데이터 검증 및 가져오기"
        description="정규화된 인프라 데이터셋(JSON)을 붙여넣고, 스키마 제약 조건을 검증하여 레코드를 반영합니다."
      />
      <BatchImportView />
    </>
  );
}
