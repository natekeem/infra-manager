# Software Catalog Import

Management → Software Catalog provides a client-side CSV/JSON flow:

```text
Upload → Parse → Normalize → Dry Run → Diff → Apply
```

Required columns are `productName` and `version`. Optional columns are `vendor`, `category`, `releaseDate`, `supportEndDate`, `securitySupportEndDate`, `extendedSupportEndDate` and `eoslDate`. Dates use `YYYY-MM-DD`.

Dry Run reports New, Changed, Unchanged, Missing and validation errors. Changes compare lifecycle fields, including EOSL. Apply creates or updates rows and marks missing releases `STALE`; it does not delete them. Production persistence should wrap catalog changes, `SoftwareCatalogImportBatch`, and `SoftwareReleaseLifecycleHistory` inserts in one MySQL transaction.

XLSX is intentionally deferred: the current stack has no parser and CSV/JSON satisfies the required import path without introducing another dependency.
