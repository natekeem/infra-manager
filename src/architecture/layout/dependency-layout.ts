import type { ArchitectureRelation, RelationType } from "@/domain/models";

export type DependencyMode = "impact" | "dependencies" | "both";
export type DependencyDepth = 1 | 2 | 3 | "all";

export interface DependencyVisit {
  id: string;
  side: "impact" | "dependency" | "selected";
  depth: number;
}

export function traverseDependencies(
  targetId: string,
  relations: ArchitectureRelation[],
  mode: DependencyMode,
  depth: DependencyDepth,
  enabled: Partial<Record<RelationType, boolean>>
) {
  const limit = depth === "all" ? Number.POSITIVE_INFINITY : depth;
  const visits = new Map<string, DependencyVisit>([[targetId, { id: targetId, side: "selected", depth: 0 }]]);
  const usedRelations = new Map<string, ArchitectureRelation>();

  const walk = (side: "impact" | "dependency") => {
    const queue: Array<{ id: string; depth: number }> = [{ id: targetId, depth: 0 }];
    const seen = new Set<string>([targetId]);
    while (queue.length) {
      const current = queue.shift()!;
      if (current.depth >= limit) continue;
      for (const relation of relations) {
        if (enabled[relation.relationType] === false) continue;
        const matches = side === "dependency" ? relation.sourceEntityId === current.id : relation.targetEntityId === current.id;
        if (!matches) continue;
        const nextId = side === "dependency" ? relation.targetEntityId : relation.sourceEntityId;
        usedRelations.set(relation.id, relation);
        const nextDepth = current.depth + 1;
        const existing = visits.get(nextId);
        if (!existing || nextDepth < existing.depth) visits.set(nextId, { id: nextId, side, depth: nextDepth });
        if (!seen.has(nextId)) {
          seen.add(nextId);
          queue.push({ id: nextId, depth: nextDepth });
        }
      }
    }
  };

  if (mode !== "dependencies") walk("impact");
  if (mode !== "impact") walk("dependency");
  return { visits: [...visits.values()], relations: [...usedRelations.values()] };
}
