import type { AbstractGraph, Cell } from "@maxgraph/core";
import type { ArchitectureRelation, Asset, ClusterEntity, NetworkStatus, TopologyGroup } from "@/domain/models";
import { assetMatchesGroup, buildEntityCatalog } from "@/architecture/layout/semantic-layout";
import { assetStyle, clusterStyle, externalStyle, groupStyle, relationStyle } from "./styles";
import type { GraphCellValue, PersistedCellGeometry } from "./types";

export interface GraphAdapterInput {
  projectGroupId: string;
  environment: string;
  assets: Asset[];
  clusters: ClusterEntity[];
  groups: TopologyGroup[];
  relations: ArchitectureRelation[];
  statuses: NetworkStatus[];
  persisted: Map<string, PersistedCellGeometry>;
}

export interface GraphAdapterResult {
  cellsByEntityId: Map<string, Cell>;
  edgesByRelationId: Map<string, Cell>;
  topLevelGroups: Cell[];
  allCells: Cell[];
}

export function populateGraph(graph: AbstractGraph, input: GraphAdapterInput): GraphAdapterResult {
  const cellsByEntityId = new Map<string, Cell>();
  const edgesByRelationId = new Map<string, Cell>();
  const allCells: Cell[] = [];
  const defaultParent = graph.getDefaultParent();
  const groups = input.groups.filter((group) => group.projectGroupId === input.projectGroupId && (input.environment === "ALL" || !group.environment || group.environment === input.environment));
  const assets = input.assets.filter((asset) => (!asset.projectGroupId || asset.projectGroupId === input.projectGroupId) && (input.environment === "ALL" || asset.environment === input.environment));
  const clusters = input.clusters.filter((cluster) => (!cluster.projectGroupId || cluster.projectGroupId === input.projectGroupId) && (input.environment === "ALL" || cluster.environment === input.environment));
  const relations = input.relations.filter((relation) => relation.projectGroupId === input.projectGroupId);
  const catalog = buildEntityCatalog(groups, assets, clusters, assets.filter((asset) => asset.assetType === "NAS") as never, relations);
  const groupById = new Map(groups.map((group) => [group.id, group]));

  graph.batchUpdate(() => {
    const insertGroup = (group: TopologyGroup): Cell => {
      const existing = cellsByEntityId.get(group.id);
      if (existing) return existing;
      const parent = group.parentGroupId && groupById.has(group.parentGroupId) ? insertGroup(groupById.get(group.parentGroupId)!) : defaultParent;
      const stored = input.persisted.get(group.id);
      const members = assets.filter((asset) => assetMatchesGroup(asset, group));
      const value: GraphCellValue = { label: group.name, summary: `AP ${members.filter((asset) => asset.role.includes("AP")).length} · DB ${members.filter((asset) => asset.role.includes("DB")).length} · NAS ${members.filter((asset) => asset.assetType === "NAS").length}`, meta: { kind: "group", groupId: group.id, projectGroupId: input.projectGroupId } };
      const cell = graph.insertVertex({ parent, id: group.id, value, position: [stored?.x ?? 20, stored?.y ?? 40], size: [stored?.width ?? 360, stored?.height ?? 230], style: groupStyle });
      cellsByEntityId.set(group.id, cell);
      allCells.push(cell);
      return cell;
    };
    groups.forEach(insertGroup);

    const deepestGroup = (asset: Asset) => groups.filter((group) => assetMatchesGroup(asset, group)).sort((a, b) => depthOf(b, groupById) - depthOf(a, groupById))[0];
    for (const asset of assets) {
      const parentGroup = deepestGroup(asset);
      const parent = parentGroup ? cellsByEntityId.get(parentGroup.id)! : defaultParent;
      const stored = input.persisted.get(asset.id);
      const value: GraphCellValue = { label: asset.hostname || asset.name || asset.id, status: asset.health, icon: asset.assetType, meta: { kind: "asset", assetId: asset.id, projectGroupId: input.projectGroupId, assetType: asset.assetType ?? "OTHER" } };
      const cell = graph.insertVertex({ parent, id: asset.id, value, position: [stored?.x ?? 30, stored?.y ?? 52], size: [stored?.width ?? 92, stored?.height ?? 76], style: assetStyle(asset) });
      cellsByEntityId.set(asset.id, cell);
      allCells.push(cell);
    }

    for (const cluster of clusters) {
      const parentGroup = groups.filter((group) => (!group.domain || group.domain === cluster.domain) && (!group.system || group.system === cluster.system) && (!group.environment || group.environment === cluster.environment)).sort((a, b) => depthOf(b, groupById) - depthOf(a, groupById))[0];
      const parent = parentGroup ? cellsByEntityId.get(parentGroup.id)! : defaultParent;
      const stored = input.persisted.get(cluster.id);
      const value: GraphCellValue = { label: cluster.name, status: cluster.status === "HEALTHY" ? "healthy" : cluster.status === "DEGRADED" ? "warning" : "critical", summary: cluster.type, meta: { kind: "cluster", clusterId: cluster.id, projectGroupId: input.projectGroupId } };
      const cell = graph.insertVertex({ parent, id: cluster.id, value, position: [stored?.x ?? 150, stored?.y ?? 52], size: [stored?.width ?? 104, stored?.height ?? 82], style: clusterStyle(cluster) });
      cellsByEntityId.set(cluster.id, cell);
      allCells.push(cell);
    }

    for (const entity of catalog.values()) {
      if (cellsByEntityId.has(entity.id) || entity.kind !== "external") continue;
      const value: GraphCellValue = { label: entity.label, meta: { kind: "external", entityId: entity.id, projectGroupId: input.projectGroupId } };
      const cell = graph.insertVertex({ parent: defaultParent, id: entity.id, value, position: [20, 20], size: [96, 76], style: externalStyle });
      cellsByEntityId.set(entity.id, cell);
      allCells.push(cell);
    }

    for (const relation of relations) {
      const source = cellsByEntityId.get(relation.sourceEntityId);
      const target = cellsByEntityId.get(relation.targetEntityId);
      if (!source || !target || source === target) continue;
      const value: GraphCellValue = { label: relationLabel(relation), meta: { kind: "relation", relationId: relation.id, projectGroupId: input.projectGroupId, relationType: relation.relationType } };
      const edge = graph.insertEdge({ parent: defaultParent, id: relation.id, value, source, target, style: relationStyle(relation) });
      edgesByRelationId.set(relation.id, edge);
      allCells.push(edge);
    }

    for (const group of groups) {
      const cell = cellsByEntityId.get(group.id)!;
      const stored = input.persisted.get(group.id);
      const shouldCollapse = stored ? stored.collapsed : true;
      if (shouldCollapse) graph.foldCells(true, false, [cell], true);
    }
  });

  return { cellsByEntityId, edgesByRelationId, topLevelGroups: groups.filter((group) => !group.parentGroupId).map((group) => cellsByEntityId.get(group.id)!).filter(Boolean), allCells };
}

function depthOf(group: TopologyGroup, byId: Map<string, TopologyGroup>) {
  let depth = 0;
  let current: TopologyGroup | undefined = group;
  const seen = new Set<string>();
  while (current?.parentGroupId && !seen.has(current.id)) {
    seen.add(current.id);
    current = byId.get(current.parentGroupId);
    depth += 1;
  }
  return depth;
}

export function relationLabel(relation: ArchitectureRelation) {
  return `${relation.protocol ?? relation.relationType}${relation.port ? ` ${relation.port}` : ""}`;
}
