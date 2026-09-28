# Company Software Lifecycle Catalog Walkthrough

> Architecture UX 2차 안정화 기록은 문서 하단의 `Architecture UX 2차 재설계` 절을 참조한다.

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

---

# Architecture / Dependency / ELK Auto Layout

## 1. Existing layout analysis (before implementation)

The existing Architecture canvas has two builders inside `architecture-canvas.tsx`. `buildOverview()` creates eight RPA-specific aggregate cards with fixed `x/y` coordinates and hardcoded Memory, Foundry, Common, Portal, APM, QA, DEV, and Common Function buckets. `buildAssets()` groups assets by a hardcoded domain order and places them with row/column arithmetic (`x = 80 + column * 260`, `y = lane + row * 150`); clusters and NAS use similar fixed-grid coordinates. Edges select four-way React Flow handles from the relative node centers, but their paths are not produced by a graph layout engine.

Manual positions are stored in `localStorage` under a versioned key containing project, view mode, environment, and selected group. Drag stop and edit completion snap positions to a 20px grid. Edge handle overrides are stored separately per project. The current “automatic layout” action only removes the saved manual override and returns to the fixed coordinates; it does not recalculate a relationship-aware layout.

The replacement will keep the React Flow node cards, right-side VM/connection/cluster/NAS/software drawers, policy/actual overlays, Probe Flow, Issues Only, relation filters, and 20px manual correction workflow. Graph construction will move to semantic Overview and Dependency adapters, deterministic ordering and traversal; coordinates will come from an isolated ELK layered engine with a deterministic grid fallback. Layout sizes will use the same explicit dimensions as the rendered cards, and Overview/Dependency manual positions will be isolated by project, view, scope, and entity ID.

## 2. ELK selection and dependency

Added `elkjs@0.12.0`. ELK Layered supports hierarchy-aware deterministic placement and orthogonal routing without adding a second service or any AI coordinate generation. The existing Next.js deployment and React Flow rendering remain unchanged.

## 3. Semantic layout pipeline

The new modules under `src/architecture/layout/` separate graph meaning from coordinates: shared types and dimensions, stable presets and relation priorities, semantic entity/group membership, Overview scope projection, cycle-safe Dependency traversal, and the cached ELK adapter. The adapter returns deterministic positions and routed bend points; a deterministic simple grid is the error fallback.

## 4. Overview layout and drill-down

The root is derived from parentless `TopologyGroup` rows. Double-click or the explicit Drill down action moves through registered child groups on the same canvas; leaf groups render matching assets, clusters and NAS. Breadcrumbs navigate directly to any ancestor. The layout code contains no Memory/Foundry/Common branching or RPA domain coordinate constants.

## 5. Dependency view and traversal

The operator views are now exactly Overview and Dependency. Dependency search covers IDs, hostnames, IPs, asset names, group names, cluster names and services through catalog aliases. Impact, Dependencies and Both are computed by deterministic BFS with a visited set at depth 1/2/3/All; the default is Both/2. Group-source relations are expanded to relevant AP/workload members without mutating the original relation records.

## 6. Impact, SOP, Policy/Actual and EOSL

Blast-radius metrics are calculated from the active mock graph and de-duplicated impacted assets. Related policies and failed Actual links stay joined evidence rather than new architecture relations. SOP mappings use `relatedVmIds`; EOSL risk uses installed software records. TCP DOWN is presented through the existing connectivity state and is never relabeled as a firewall block. Dependency node clicks open the right 460px drawer with Overview, Impact, Network, Software and SOP tabs.

## 7. Manual layout, grid snap and routing

ELK is the default. Manual Edit enables drag and relation handles; drag stop rounds both axes to the 20px grid. Storage keys contain project, view and scope, while entity IDs remain the per-node keys. Auto Layout clears only the current scope override, recalculates ELK and refits after the asynchronous result arrives. Node DOM dimensions and ELK dimensions share `NODE_DIMENSIONS`. Edge labels default OFF; ELK orthogonal bend points are rendered by the custom edge.

## 8. Performance and automated validation

`npm run validate:architecture` exercised 60 assets and 120 relations, including a cyclic graph. Final result: 60 positioned nodes, 120 routed edges, finite traversal, 271 ms on this workstation. ELK results are cached by direction, scope and stable sorted graph identity.

## 9. Build and TypeScript

- `npx tsc --noEmit`: passed after the final source changes.
- `npm run build`: passed after the final implementation with all 21 routes generated.
- `git diff --check`: passed (Windows line-ending notices only).

## 10. Browser QA

Verified in `DATA_SOURCE=mock` on the live Next.js page:

- RPA top Overview renders registered root groups with relationship-driven placement and Labels OFF.
- A360 → PROD → MEMORY drill-down and clickable breadcrumbs work in one canvas.
- MEMORY leaf shows AP assets, MSSQL cluster, DB members and NAS with no measured node overlap.
- MSSQL Dependency Both/Depth 2 renders the selected cluster, three direct AP dependents and Portal Backend impact chain.
- NAS Impact renders the same three direct Memory AP dependents.
- Portal Backend Dependencies renders DBaaS plus Memory/Foundry/Common groups and their downstream cluster/NAS dependencies.
- Impact/Dependencies/Both and Depth 1/2/All changed the visible graph deterministically.
- Monitoring is OFF by default; Labels OFF produced no edge labels and ON rendered all visible protocol/port labels.
- Policy/Actual and Probe Flow controls remain available.
- Manual drag stored a snapped `x=760, y=540` position; Auto Layout replaced it with the ELK position and refit.
- Dependency right drawer exposes Overview, Impact, Network, Software and SOP tabs without covering the left sidebar.
- At 390×844 the existing fixed admin sidebar and right drawer remain structurally separate; the dense console remains horizontally scrollable at this legacy mobile shell breakpoint.

## 11. Remaining TODO

- Global header search remains outside Architecture scope.
- Production MySQL/Influx mapping still follows the existing adapter migration plan; this task intentionally validated mock mode only.
- The fixed-width global admin shell is horizontally scrollable on phone-width viewports. A repository-wide responsive sidebar redesign was not introduced because it is outside this Architecture scope and prohibited by the UI freeze rules.

---

# Architecture UX 2차 재설계

## 1–6. 전체 구성과 compound group

- 기존 문제는 `scopeId`가 캔버스 entity set을 교체해 전체 context를 없애고, Dependency도 별도 subset graph를 생성한 데 있었다.
- `scopeId`와 breadcrumb/Back을 제거하고 `expandedGroupIds: Set<string>`로 독립적인 다중 expand/collapse를 구현했다.
- 초기 화면은 top-level group만 collapsed 상태로 유지한다. `+ / −`, double-click, Collapse all, Expand one level이 같은 상태 모델을 사용한다.
- Expanded group은 `parentId`와 `extent="parent"`를 쓰는 실제 React Flow parent다. leaf asset/cluster/NAS는 parent-relative coordinate를 사용한다.
- `compound-layout.ts`는 nested child scope를 먼저 ELK로 배치하고 측정된 group width/height를 상위 ELK node로 전달하는 bottom-up two-pass layout을 사용한다.

## 7–9. Dependency focus

- Dependency는 전체 topology의 위치와 expanded state를 공유하는 highlight mode다. traversal의 `both` BFS 결과는 node subset이 아니라 side/depth metadata로 사용한다.
- Selected/direct/depth 2/depth 3/unrelated opacity는 각각 100/100/85/65/15% 기준이며, collapsed group은 내부 관련 asset 수 badge를 표시한다.
- Impact/Dependencies/Both segment를 제거하고 `영향 대상`, `필요 자원` legend와 `연결 범위` select만 제공한다.

## 10–16. Edge, layout trigger, handle 안정화

- `FlowEdge`는 과거 ELK `routedPoints` 대신 항상 현재 `sourceX/sourceY/targetX/targetY`로 SmoothStep path를 만든다. drag와 parent 이동 중 endpoint가 handle을 실시간 추적한다.
- 레이아웃 fingerprint는 project/environment, visible node hierarchy, expanded IDs, explicit revision만 포함한다. Relation/Overlay/Label/Flow/selection/filter 변경은 ELK나 fitView를 호출하지 않는다.
- ReactFlow의 변경형 `key`와 implicit `fitView` prop을 제거했다. Fit은 최초/expand-collapse/Auto Layout과 명시 Fit 버튼에서만 실행한다.
- 한 side에 source/target handle을 겹치던 구조를 단일 `t/b/l/r` Loose handle로 교체했다. v2 localStorage는 suffix를 제거해 v3로 migrate하며, invalid ID는 fallback 처리한다.
- Relation 생성은 `currentRelations`와 handle map만 갱신한다. live node position과 manual layout은 보존된다.

## 17–20. 검증과 남은 TODO

- `npm run validate:architecture`: 60 nodes / 120 edges / cycle-safe traversal 통과.
- `npx tsc --noEmit`: 통과.
- `npm run build`: Next.js 21개 route 생성까지 통과.
- Browser QA: top-level collapsed 초기 화면, A360 → PROD → Memory와 Foundry 동시 expand, Memory collapse, Dependency 전환/DB 선택/나머지 dim, collapsed group related badge, Flow/Labels/Policy control, 빈 canvas focus clear, right Drawer를 확인했다.
- Drag QA: AP01을 이동한 뒤 node bounding box와 연결된 3개 SVG path가 모두 변경되어 endpoint 실시간 추적을 확인했다.
- Relation QA: AP01 → DB02를 새로 연결한 뒤 `changedNodes=[]`, viewport transform 동일, 새 edge 1개를 확인했다. Relation 추가로 layout/viewport reset이 발생하지 않았다.
- Layout reset QA: Labels와 Policy/Actual toggle 전후 viewport transform이 각각 완전히 동일했다.
- Console QA: 새 browser session에서 warning/error 0건이며 invalid source/target handle warning이 없었다.
- 390×844 QA: grouped default, toolbar controls, canvas, minimap, right-side navigation separation이 유지됐다. 기존 fixed admin shell의 높은 밀도는 이번 Architecture 범위에서 변경하지 않았다.
- mock adapter와 기존 Policy/Actual, bidirectional diagnosis, VM/Cluster/NAS/Software/SOP drawer 계약은 유지한다.
- Full undo history는 범위 밖이며 현재는 마지막 node move 1건만 되돌리는 최소 지원이다.
