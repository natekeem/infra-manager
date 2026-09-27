import type { Edge, Node } from "@xyflow/react";
import type { RelationType } from "@/domain/models";

export type ArchitectureLayoutMode = "overview" | "dependency";
export type LayoutDirection = "DOWN" | "RIGHT";

export const NODE_DIMENSIONS = {
  asset: { width: 230, height: 125 },
  group: { width: 220, height: 124 },
  cluster: { width: 240, height: 132 },
  nas: { width: 220, height: 112 },
  dbaas: { width: 220, height: 112 },
  external: { width: 220, height: 124 },
} as const;

export interface LayoutNodeData extends Record<string, unknown> {
  kind: keyof typeof NODE_DIMENSIONS;
  sortKey?: string;
}

export interface RoutedPoint {
  x: number;
  y: number;
}

export interface LayoutEdgeData extends Record<string, unknown> {
  relationType?: RelationType;
  routedPoints?: RoutedPoint[];
  layoutPriority?: number;
}

export interface LayoutRequest<N extends LayoutNodeData, E extends LayoutEdgeData> {
  nodes: Node<N>[];
  edges: Edge<E>[];
  direction?: LayoutDirection;
  scopeId?: string;
}

export interface LayoutResult<N extends LayoutNodeData, E extends LayoutEdgeData> {
  nodes: Node<N>[];
  edges: Edge<E>[];
}

export interface ArchitectureLayoutEngine {
  layout<N extends LayoutNodeData, E extends LayoutEdgeData>(request: LayoutRequest<N, E>): Promise<LayoutResult<N, E>>;
}
