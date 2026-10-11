# Dependency Focus View

Dependency is a full-topology focus/highlight mode. It never replaces the canvas with an isolated subgraph, so the selected target remains located in the complete architecture.

## Direction and traversal

Architecture relations follow `source depends on target` semantics. Deterministic breadth-first traversal always evaluates both directions with cycle protection, relation filters and the selected range (`직접 연결`, `2단계`, `3단계`, `전체`). The default is depth 2; Monitoring is off.

- `영향 대상`: entities that depend on the selected target
- `선택 대상`: the current focus
- `필요 자원`: entities required by the selected target

Group-source relations are expanded to their relevant AP/workload members for operational blast-radius visibility while the original group relation remains intact.

## Calculated summary

The summary derives direct and total impacted counts, de-duplicated critical assets, affected systems, related policies, failed actual TCP links, related SOPs, and expired software installations from the mock dataset. TCP DOWN remains a connectivity failure; the UI does not infer a firewall block.

Selected/direct nodes stay at full opacity, deeper nodes are progressively softened, and unrelated topology remains visible at 15%. Collapsed groups receive a related-asset badge rather than being force-expanded. Clicking a node changes focus and opens the right drawer; clicking empty canvas clears focus.
