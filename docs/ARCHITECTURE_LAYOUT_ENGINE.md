# Architecture Layout Engine

## Pipeline

`Domain Graph → Visible Compound Graph → Recursive child ELK → measured parent ELK → React Flow`

The canvas never calculates production coordinates with domain-specific row/column constants. `compound-layout.ts` lays out expanded groups bottom-up: child bounds determine the parent box, then the measured parent participates in its ancestor/root ELK pass. React Flow children use parent-relative coordinates.

## Presets and sizing

- Full topology direction: `DOWN`
- Dependency keeps the same topology positions and changes only focus styling.
- Edges use current React Flow handle coordinates and SmoothStep paths so dragging never leaves an old ELK route behind.
- Monitoring priority: low and disabled by default
- Node dimensions are centralized in `NODE_DIMENSIONS` and used by both ELK and rendered cards.

## Stability and fallback

The layout fingerprint contains project/environment, visible node IDs, parent hierarchy, expansion state and explicit Auto Layout revision. Presentation changes do not run ELK or fit the viewport. Manual positions are stored per project. Relation creation updates edges only and preserves every live node position.

AI/LLM calls are not part of coordinate generation.
