import type { ArchitectureRelation, RelationType } from "@/domain/models";
import { traverseDependencies } from "@/architecture/layout/dependency-layout";

export function dependencyFocus(
  selectedId: string,
  relations: ArchitectureRelation[],
  enabled: Partial<Record<RelationType, boolean>>,
) {
  const result = traverseDependencies(selectedId, relations, "both", 2, enabled);
  return {
    selectedId,
    dependencyEntityIds: new Set(result.visits.filter((item) => item.side === "dependency").map((item) => item.id)),
    impactedEntityIds: new Set(result.visits.filter((item) => item.side === "impact").map((item) => item.id)),
    relatedEntityIds: new Set(result.visits.map((item) => item.id)),
    relatedRelationIds: new Set(result.relations.map((item) => item.id)),
    depthByEntityId: new Map(result.visits.map((item) => [item.id, item.depth])),
  };
}

