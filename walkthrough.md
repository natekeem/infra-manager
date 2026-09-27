# Company Software Lifecycle Catalog Walkthrough

## 1. 변경된 Data Model

- Existing `SoftwareProduct`, `SoftwareRelease`, `AssetSoftwareInstallation` were extended rather than duplicated.
- Added `SoftwareLifecyclePhase`, `SoftwareProductAlias`, `ProjectSoftwareScope`, `SoftwareCatalogImportBatch`, and `SoftwareReleaseLifecycleHistory`.
- `SoftwareRelease.status` remains compatibility-only. Runtime UI state comes from `deriveLifecycleStatus(eoslDate, getAppNow())`.
- Added optional successor, catalog status/freshness, security support, extended support, match status and candidate IDs.

## 2. Global Catalog 구조

`SoftwareProduct → SoftwareRelease → optional SoftwareLifecyclePhase` is the company-wide master. Catalog rows are not limited to RPA. Missing phase/date data stays null/unknown and is not inferred.

## 3. Project Software Scope 구조

`ProjectSoftwareScope` references a Global Product by ID. Project-used products are `manual/planned scope UNION discovered asset installations`. Mock uses generic `projectGroupId = "rpa"`; lifecycle logic contains no RPA-specific branch.

## 4. Catalog Import 구조

Management → Software Catalog exposes CSV/JSON Upload → Normalize → Dry Run → Diff → Apply. The pure import service detects New/Changed/Unchanged/Missing, including EOSL changes. Missing releases become `STALE`, not deleted. A terminal contract check produced `new=1`, `changed=1`, `changed field=eoslDate`, `errors=0`.

## 5. Lifecycle Timeline 구현 방법

`EoslTimelineChart` renders explicit Active/Security/Extended phases, neutral known ranges, EOSL markers, installed-asset counts and a TODAY reference using the shared app clock. It is reused by Dashboard, Lifecycle and the right Drawer. Releases without phases render without failure.

## 6. Version Centering 구현 방법

`getCenteredReleaseWindow()` takes the selected release index and a default seven-row window. Browser QA selected Telegraf 1.24 from ten releases and rendered `1.21, 1.22, 1.23, 1.24, 1.25, 1.26, 1.27`, placing the selection in the center. “모든 버전 보기” expands all ten.

## 7. Product / Version Matching 구조

Canonical exact name and explicit Alias rules (`EXACT`, `CONTAINS`, `REGEX`) establish one product candidate. Existing exact/prefix/regex/range rules then resolve one release. Zero or multiple matches remain unresolved; no fuzzy guess or lifecycle estimate occurs.

## 8. Unmapped / Ambiguous 처리

Lifecycle → Catalog Review visibly contains both states. Operators explicitly choose Product and Release, can create an alias plus map a product, map a release, or open Create Release. A successful explicit release selection updates match/lifecycle fields in mock state; unresolved rows stay visible.

## 9. MySQL Repository 변경

Added real loaders for Products, Releases, Lifecycle Phases, Product Aliases, Asset Installations, Project Scope, Import Batches, and Lifecycle History. `DATA_SOURCE=mysql` now selects these loaders in the infrastructure adapter; UI props remain source-agnostic. `db/schema.sql` extends the existing compatible table names and adds the five catalog tables.

## 10. Dashboard 변경

The card is now `Project Software Lifecycle`. It uses only project asset installations, aggregates duplicate installations by Release, orders risk first, and renders at most eight rows. Browser QA showed Java OpenJDK 17 once with `2 assets`.

## 11. Software 페이지 변경

Default tabs are In Use, By Asset, Lifecycle and Company Catalog. Company Catalog includes search, vendor/category/lifecycle/catalog filters and 50/100 pagination. Product/Release clicks open the existing 460px right Drawer with project scope, centered timeline, dates, impact, installed assets, successor-ready data and lifecycle history.

## 12. Mock Data 개수

- 21 Products
- 61 Releases
- 13 Asset installations
- 10 matched project-used Releases
- 1 explicit UNMAPPED installation
- 1 explicit AMBIGUOUS installation
- complete phase examples and EOSL-only/known-range releases

## 13. npm build 결과

`npm run build` passed with all application routes generated. A final result is recorded after the last source edit below.

## 14. TypeScript 결과

`npx tsc --noEmit` passed. MySQL repository loaders compile without requiring a live database connection.

## 15. Browser QA and remaining TODO

Verified on the running mock application:

- In Use, By Asset, Lifecycle and Company Catalog render correctly.
- TODAY line and support phase colors render in the compact theme.
- Right Drawer leaves the left navigation unobstructed.
- Telegraf selected-version centering and Show All work.
- Dashboard uses Release aggregation and correct asset counts.
- VM Drawer displays detected version, Catalog Release, derived EOSL/remaining/match status; OS Catalog match takes precedence over legacy VM EOSL.
- UNMAPPED and AMBIGUOUS review controls are visible.
- Management page displays the CSV/JSON Dry Run/Diff import flow.
- Architecture still exposes 오버뷰/전체보기, group/environment filters, layout editing, automatic layout and curved connections.

Remaining production tasks:

- Apply the schema changes to a staging MySQL database and verify real row counts/foreign keys.
- Add transactional write endpoints for catalog Apply, audit batch/history inserts, aliases and review mappings. Current mock interactions are intentionally in-memory.
- Add XLSX only if the company source cannot export CSV/JSON; no new parser dependency was added.
- Map the actual company export column names and run owner reconciliation before production activation.
- Global header search remains out of this EOSL scope.
