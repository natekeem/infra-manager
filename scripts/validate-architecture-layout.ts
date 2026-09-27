import assert from "node:assert/strict";
import type { Edge, Node } from "@xyflow/react";
import { elkLayoutEngine } from "../src/architecture/layout/elk-layout";
import { traverseDependencies } from "../src/architecture/layout/dependency-layout";
import type { ArchitectureRelation } from "../src/domain/models";

const relations: ArchitectureRelation[] = Array.from({ length: 120 }, (_, index) => ({
  id: `relation-${index}`,
  projectGroupId: "performance",
  sourceEntityType: "ASSET",
  sourceEntityId: `asset-${index % 60}`,
  targetEntityType: "ASSET",
  targetEntityId: `asset-${(index * 7 + 1) % 60}`,
  relationType: index % 6 === 0 ? "MONITORING" : index % 3 === 0 ? "DATABASE" : "SERVICE",
}));

const cycle = traverseDependencies("asset-0", relations, "both", "all", { MONITORING: false });
assert(cycle.visits.length <= 60, "cycle-safe traversal must visit each entity at most once per result map");

const nodes: Node<{ kind: "asset"; sortKey: string }>[] = Array.from({ length: 60 }, (_, index) => ({
  id: `asset-${index}`,
  type: "assetCard",
  position: { x: 0, y: 0 },
  data: { kind: "asset", sortKey: `asset-${String(index).padStart(2, "0")}` },
}));
const edges: Edge<{ layoutPriority: number }>[] = relations.map((relation) => ({
  id: relation.id,
  source: relation.sourceEntityId,
  target: relation.targetEntityId,
  data: { layoutPriority: relation.relationType === "MONITORING" ? 10 : 100 },
}));

async function main() {
  const startedAt = performance.now();
  const result = await elkLayoutEngine.layout({ nodes, edges, direction: "RIGHT", scopeId: "performance-60-120" });
  const durationMs = Math.round(performance.now() - startedAt);
  assert.equal(result.nodes.length, 60);
  assert.equal(result.edges.length, 120);
  for (const node of result.nodes) {
    assert(Number.isFinite(node.position.x) && Number.isFinite(node.position.y), `invalid position for ${node.id}`);
  }
  console.log(JSON.stringify({ nodes: result.nodes.length, edges: result.edges.length, traversalVisits: cycle.visits.length, durationMs }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
