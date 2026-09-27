import type { ArchitectureRelation, Asset, ClusterEntity, NasAsset, TopologyGroup } from "@/domain/models";

export type SemanticKind = "group" | "asset" | "cluster" | "nas" | "dbaas" | "external";

export interface SemanticEntity {
  id: string;
  kind: SemanticKind;
  label: string;
  aliases: string[];
  group?: TopologyGroup;
  asset?: Asset;
  cluster?: ClusterEntity;
  nas?: NasAsset;
}

export function assetMatchesGroup(asset: Asset, group: TopologyGroup) {
  if (group.assetIds?.includes(asset.id)) return true;
  if (group.domain && asset.domain !== group.domain) return false;
  if (group.system && asset.system !== group.system) return false;
  if (group.environment && asset.environment !== group.environment) return false;
  if (group.groupType === "RUNTIME" || group.groupType === "SERVICE_GROUP") {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, " ").trim();
    const excluded = new Set(normalize(`${group.system ?? ""} ${group.environment ?? ""}`).split(" ").filter(Boolean));
    const discriminators = normalize(group.name).split(" ").filter((token) => token.length > 2 && !excluded.has(token));
    if (discriminators.length) {
      const haystack = normalize(`${asset.role} ${asset.service} ${asset.name ?? ""} ${asset.hostname}`);
      return discriminators.some((token) => haystack.includes(token));
    }
  }
  return Boolean(group.domain || group.system || group.environment);
}

export function buildEntityCatalog(
  groups: TopologyGroup[],
  assets: Asset[],
  clusters: ClusterEntity[],
  nasAssets: NasAsset[],
  relations: ArchitectureRelation[]
) {
  const map = new Map<string, SemanticEntity>();
  for (const group of groups) map.set(group.id, { id: group.id, kind: "group", label: group.name, aliases: [group.name, group.domain, group.system, group.environment].filter(Boolean) as string[], group });
  for (const asset of assets) map.set(asset.id, { id: asset.id, kind: asset.assetType === "DBAAS" ? "dbaas" : "asset", label: asset.hostname, aliases: [asset.hostname, asset.name, asset.ipAddress, asset.service, asset.domain, asset.system].filter(Boolean) as string[], asset });
  for (const cluster of clusters) map.set(cluster.id, { id: cluster.id, kind: "cluster", label: cluster.name, aliases: [cluster.name, cluster.vip, cluster.domain, cluster.system].filter(Boolean) as string[], cluster });
  for (const nas of nasAssets) map.set(nas.id, { id: nas.id, kind: "nas", label: nas.hostname, aliases: [nas.hostname, nas.ipAddress, nas.domain, nas.system].filter(Boolean) as string[], nas });
  for (const relation of relations) {
    for (const [id, type] of [[relation.sourceEntityId, relation.sourceEntityType], [relation.targetEntityId, relation.targetEntityType]] as const) {
      if (!map.has(id) && type === "EXTERNAL") map.set(id, { id, kind: "external", label: id, aliases: [id] });
    }
  }
  return map;
}

export function groupAssets(group: TopologyGroup, assets: Asset[]) {
  return assets.filter((asset) => assetMatchesGroup(asset, group));
}

export function breadcrumbFor(scopeId: string | null, groups: TopologyGroup[]) {
  if (!scopeId) return [];
  const byId = new Map(groups.map((group) => [group.id, group]));
  const result: TopologyGroup[] = [];
  const seen = new Set<string>();
  let current = byId.get(scopeId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    result.unshift(current);
    current = current.parentGroupId ? byId.get(current.parentGroupId) : undefined;
  }
  return result;
}

export function overviewEntities(scopeId: string | null, groups: TopologyGroup[], assets: Asset[], clusters: ClusterEntity[], nasAssets: NasAsset[]) {
  const directGroups = groups.filter((group) => (group.parentGroupId ?? null) === scopeId);
  if (directGroups.length) return directGroups.map((group) => ({ id: group.id, kind: "group" as const, group }));
  if (!scopeId) return [];
  const scope = groups.find((group) => group.id === scopeId);
  if (!scope) return [];
  const matchedAssets = groupAssets(scope, assets).filter((asset) => asset.assetType !== "NAS");
  const matchedClusters = clusters.filter((cluster) => (!scope.domain || cluster.domain === scope.domain) && (!scope.system || cluster.system === scope.system) && (!scope.environment || cluster.environment === scope.environment));
  const matchedNas = nasAssets.filter((nas) => assetMatchesGroup(nas, scope));
  return [
    ...matchedAssets.map((asset) => ({ id: asset.id, kind: asset.assetType === "DBAAS" ? "dbaas" as const : "asset" as const, asset })),
    ...matchedClusters.map((cluster) => ({ id: cluster.id, kind: "cluster" as const, cluster })),
    ...matchedNas.map((nas) => ({ id: nas.id, kind: "nas" as const, nas })),
  ];
}

export function nearestVisibleEntity(id: string, visible: Set<string>, catalog: Map<string, SemanticEntity>, groups: TopologyGroup[]) {
  if (visible.has(id)) return id;
  const entity = catalog.get(id);
  const asset = entity?.asset ?? entity?.nas;
  if (asset) {
    const candidate = groups
      .filter((group) => visible.has(group.id) && assetMatchesGroup(asset, group))
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    return candidate?.id;
  }
  const cluster = entity?.cluster;
  if (cluster) {
    const candidate = groups
      .filter((group) => visible.has(group.id) && (!group.domain || group.domain === cluster.domain) && (!group.system || group.system === cluster.system) && (!group.environment || group.environment === cluster.environment))
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    return candidate?.id;
  }
  const group = entity?.group;
  if (group) {
    const byId = new Map(groups.map((item) => [item.id, item]));
    let parent = group.parentGroupId ? byId.get(group.parentGroupId) : undefined;
    while (parent) {
      if (visible.has(parent.id)) return parent.id;
      parent = parent.parentGroupId ? byId.get(parent.parentGroupId) : undefined;
    }
  }
  return undefined;
}
