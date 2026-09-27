# Company Software Catalog

The Catalog stores all company lifecycle products and releases, not only software used by RPA. Product/release identity is global; projects reference it through `ProjectSoftwareScope`.

Catalog state is `ACTIVE`, `STALE` or `RETIRED`. An import omission changes an existing item to `STALE`; it never deletes the item automatically. `lastCatalogSeenAt` and `SoftwareCatalogImportBatch` expose freshness without per-row source paths.

Project-used software is:

```text
manual or planned ProjectSoftwareScope
UNION
products discovered in AssetSoftwareInstallation
```

An optional `successorReleaseId` supports an explicitly maintained successor. The application never calculates a recommendation from version order.

Mock mode includes more than 20 products and 50 releases while only a subset is installed or scoped to the RPA project. MySQL mode reads the same domain contracts through `src/services/server/repository.ts`.
