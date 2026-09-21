import { PageHeader } from "@/components/common/page-header";
import { BatchImportView } from "@/components/management/batch-import-view";

export default function BatchImportPage() {
  return (
    <>
      <PageHeader
        title="Batch Data Ingestion & Import"
        description="Paste normalized infrastructure datasets (JSON), validate schema constraints, perform dry-run verification, and ingest records."
      />
      <BatchImportView />
    </>
  );
}
