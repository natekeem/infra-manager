# Architecture Layout Engine

## Pipeline

`Domain Graph → Semantic Layout Adapter → Layout Graph → ELK Layered → React Flow`

The canvas never calculates production coordinates with domain-specific row/column constants. `semantic-layout.ts` derives visible entities from `TopologyGroup`, `Asset`, `ClusterEntity`, `NasAsset`, and `ArchitectureRelation`. `elk-layout.ts` sorts stable IDs, applies the layered preset, and returns positioned nodes plus orthogonal route points.

## Presets and sizing

- Overview direction: `DOWN`
- Dependency direction: `RIGHT`
- Routing: `ORTHOGONAL`
- Monitoring priority: low and disabled by default
- Node dimensions are centralized in `NODE_DIMENSIONS` and used by both ELK and rendered cards.

## Stability and fallback

The cache key contains direction, scope, sorted node identities and sorted edge identities. ELK runs only when graph inputs or an explicit Auto Layout revision change. If ELK rejects a graph, the engine returns a deterministic grid rather than breaking the canvas. Manual positions are stored separately by project, view and scope, then applied after ELK. Auto Layout removes only the current scope override and refits the viewport.

AI/LLM calls are not part of coordinate generation.
