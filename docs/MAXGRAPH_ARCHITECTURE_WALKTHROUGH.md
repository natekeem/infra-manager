# Architecture Engine Migration Walkthrough

## 1. Why the renderer changed

The previous Architecture renderer combined React Flow, ELK routed positions, custom group expansion, manual visible-endpoint promotion, custom handle routing, and separate dependency view state. This made native diagram concerns application concerns and allowed node positions and edge route state to diverge.

The new route uses `@maxgraph/core` 0.24.0 (Apache-2.0). It remains client-only inside the existing Next.js deployment. No server, SaaS, iframe, paid engine, or AI layout was introduced.

## 2. Client and lifecycle

`MaxGraphArchitecture` is a `"use client"` component. The `Graph`, listeners, native `UndoManager`, grid, panning, connection handler, tooltip handler, and folding assets are initialized once on mount and destroyed once on unmount. Project or environment scope changes rebuild the graph model; selection, dependency focus, labels, relation filters, policy, actual state, and Drawer state only update cell style, visibility, warning overlays, or selection.

## 3. Domain adapter

`graph-adapter.ts` maps existing `Asset`, `TopologyGroup`, `ClusterEntity`, and `ArchitectureRelation` values into maxGraph cells. Cell values keep only a short label/status/summary and ID-based `GraphCellMeta`; full domain objects remain in the existing service/repository layer.

Asset nodes share one compact image-based shape. Local SVGs distinguish server, database, NAS, cluster, Kubernetes, and network/external entities. Nodes deliberately omit IP, CPU, memory, OS, owner, EOSL, policy, probe, software, and SOP detail.

## 4. Groups, folding, and edges

Topology groups are actual maxGraph parent cells. Assets and nested groups are inserted as children, so group drag, child geometry, edge terminals, and edge movement are managed by maxGraph. The first view folds groups to avoid rendering every VM. Folded labels show only AP/DB/NAS counts.

Folding uses maxGraph `foldCells()` and its renderer control. Local `ImageBox` assets replace maxGraph's default package-relative GIF path. In the Next.js SVG overlay pane, the native click handler was not consistently reached by automated browser input. A capture-phase pointer bridge identifies only maxGraph's local expand/collapse images through the graph view state and calls the same native `foldCells()` API; group double-click also delegates to `foldCells()`. There is no `expandedGroupIds`, child visibility engine, or manual endpoint aggregation.

Architecture relations stay distinct from policy and observation data. Edges retain their real child terminals. When a parent is folded, maxGraph promotes visible terminals; no nearest-visible-node or absolute routed-point implementation remains in the new renderer. Relation creation adds an edge without running layout.

## 5. Editing, grid, and history

Edit is off by default. Selection, panning, zooming, folding, and Drawers remain available. Edit enables native move, resize, connection creation, delete, 20 px grid snap, and native undo/redo. Geometry changes persist in `rpa-maxgraph-layout:v1` with project/entity geometry and collapsed state. Auto Layout runs only on initial graph creation, project/environment changes, or the explicit button.

## 6. Native layout comparison

The POC exposes the four requested maxGraph choices for direct browser comparison:

| Layout | Observed result | Decision |
| --- | --- | --- |
| HierarchicalLayout | Best directional reading and stable promoted edges | Top-level default |
| CompactTreeLayout | Useful for tree-like expanded groups, weak for multi-parent relations | Available for comparison |
| SwimlaneLayout | Useful when multiple group lanes exist, too rigid as the only global layout | Available for comparison |
| CompositeLayout | Hierarchical composition works well across nested group passes | Default toolbar choice |

Nested groups are laid out deepest-first with native hierarchical passes, then the top-level graph is arranged by native hierarchical layout. RPA domain names and fixed coordinates are not present in layout code.

## 7. Dependency, search, and Drawers

Node click runs the existing cycle-safe traversal at depth 2 against the full relation graph. The selected node and related paths remain clear; unrelated cells dim. A folded group is highlighted when it contains related assets and is not forced open. Blank-canvas click clears focus. Search covers label/hostname, IP, group, cluster, and external entity IDs, expands only ancestors, selects, and reveals the matching cell.

VM, NAS, cluster, group, connection, software/EOSL, and SOP information remains in existing right-side Drawers. Policy is still SHOULD BE, observation is still independent Telegraf ACTUAL, and matching remains source + target + protocol + port. A TCP failure is labelled connectivity failure, not automatically firewall blocked.

## 8. Policy and actual overlays

Labels are off by default. Monitoring relations are off by default. Policy/Actual toggles use native cell warnings on existing Architecture edges. Missing/expiring policy and TCP DOWN/return DOWN can add a compact warning; normal edges remain undecorated. No network evaluation logic is duplicated in the canvas.

## 9. Validation

- `npx tsc --noEmit`: passed
- `npm run build`: passed
- Production browser route: grouped RPA view, promoted edges, right Drawer, dependency dimming, and zero console errors/warnings observed
- Native fold control uses local SVG and native `foldCells()`
- Existing Dashboard, Asset inventory, Network, Software/EOSL, SOP, and Management routes were not rewritten

## 10. Remaining lower-priority work

Probe Flow animation is intentionally deferred. The existing React Flow/ELK implementation and packages remain temporarily available until the final route passes the complete edit/create/delete/undo/redo and large expanded-graph regression checklist on the target operator viewport. They are no longer used by the production Architecture route and can then be removed in a focused cleanup.
