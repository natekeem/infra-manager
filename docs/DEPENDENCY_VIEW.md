# Dependency View

Dependency answers three operator questions: what the target depends on, what depends on it, and what is included in its failure impact.

## Direction and traversal

Architecture relations follow `source depends on target` semantics. Deterministic breadth-first traversal uses a visited set, relation filters and the selected depth (`1`, `2`, `3`, or `All`). The default is `Both` at depth `2`; Monitoring is off.

- Left: impacted/dependent entities
- Center: selected target
- Right: upstream dependencies

Group-source relations are expanded to their relevant AP/workload members for operational blast-radius visibility while the original group relation remains intact.

## Calculated summary

The summary derives direct and total impacted counts, de-duplicated critical assets, affected systems, related policies, failed actual TCP links, related SOPs, and expired software installations from the mock dataset. TCP DOWN remains a connectivity failure; the UI does not infer a firewall block.

Clicking a Dependency node opens a right-side context drawer with Overview, Impact, Network, Software and SOP tabs.
