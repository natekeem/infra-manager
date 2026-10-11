import type { AssetType, RelationType } from "@/domain/models";

export type GraphCellMeta =
  | { kind: "asset"; assetId: string; projectGroupId: string; assetType: AssetType }
  | { kind: "group"; groupId: string; projectGroupId: string }
  | { kind: "cluster"; clusterId: string; projectGroupId: string }
  | { kind: "external"; entityId: string; projectGroupId: string }
  | { kind: "relation"; relationId: string; projectGroupId: string; relationType: RelationType };

export interface GraphCellValue {
  label: string;
  meta: GraphCellMeta;
  status?: "healthy" | "warning" | "critical" | "unknown";
  summary?: string;
  icon?: string;
}

export interface PersistedCellGeometry {
  projectGroupId: string;
  entityId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
}

export type NativeLayoutName = "hierarchical" | "compact-tree" | "swimlane" | "composite";

