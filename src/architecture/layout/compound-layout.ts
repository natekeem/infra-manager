import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";
import { elkPreset } from "./layout-presets";
import { NODE_DIMENSIONS, type LayoutEdgeData, type LayoutNodeData } from "./types";

const elk = new ELK();
const GROUP_HEADER = 38;
const GROUP_PADDING_X = 28;
const GROUP_PADDING_BOTTOM = 28;

export interface CompoundNodeData extends LayoutNodeData {
  expanded?: boolean;
  width?: number;
  height?: number;
}

function sizeOf(node: Node<CompoundNodeData>) {
  const fallback = NODE_DIMENSIONS[node.data.kind] ?? NODE_DIMENSIONS.asset;
  return { width: node.data.width ?? fallback.width, height: node.data.height ?? fallback.height };
}

/**
 * Bottom-up two-pass layout. Each expanded group is laid out locally first and
 * then participates in its parent's ELK graph as one measured node.
 */
export async function layoutCompoundGraph<N extends CompoundNodeData, E extends LayoutEdgeData>(nodes: Node<N>[], edges: Edge<E>[]) {
  const byId = new Map(nodes.map((node) => [node.id, { ...node, data: { ...node.data } }]));
  const children = new Map<string, string[]>();
  for (const node of byId.values()) {
    const parent = node.parentId ?? "root";
    children.set(parent, [...(children.get(parent) ?? []), node.id]);
  }

  const directChild = (id: string, parent: string) => {
    let current = byId.get(id);
    if (!current) return undefined;
    while (current.parentId && current.parentId !== parent) {
      const ancestor = byId.get(current.parentId);
      if (!ancestor) return undefined;
      current = ancestor;
    }
    return (current.parentId ?? "root") === parent ? current.id : undefined;
  };

  const layoutScope = async (parent: string): Promise<void> => {
    const ids = children.get(parent) ?? [];
    for (const id of ids) if (children.has(id)) await layoutScope(id);
    if (!ids.length) return;

    const localEdges = new Map<string, { source: string; target: string }>();
    for (const edge of edges) {
      const source = directChild(edge.source, parent);
      const target = directChild(edge.target, parent);
      if (source && target && source !== target) localEdges.set(`${source}:${target}`, { source, target });
    }
    const graph: ElkNode = {
      id: parent,
      layoutOptions: {
        ...elkPreset("DOWN"),
        "elk.padding": "[top=0,left=0,bottom=0,right=0]",
        "elk.spacing.nodeNode": "42",
        "elk.layered.spacing.nodeNodeBetweenLayers": "72",
      },
      children: ids.sort().map((id) => ({ id, ...sizeOf(byId.get(id)!) })),
      edges: [...localEdges.entries()].map(([id, edge]) => ({ id, sources: [edge.source], targets: [edge.target] })),
    };
    const result = await elk.layout(graph);
    for (const item of result.children ?? []) {
      const node = byId.get(item.id)!;
      const insetX = parent === "root" ? 0 : GROUP_PADDING_X;
      const insetY = parent === "root" ? 0 : GROUP_HEADER;
      node.position = { x: (item.x ?? 0) + insetX, y: (item.y ?? 0) + insetY };
    }
    if (parent !== "root") {
      const group = byId.get(parent);
      if (group) {
        group.data.width = Math.max(320, (result.width ?? 0) + GROUP_PADDING_X * 2);
        group.data.height = Math.max(210, (result.height ?? 0) + GROUP_HEADER + GROUP_PADDING_BOTTOM);
      }
    }
  };

  try {
    await layoutScope("root");
  } catch {
    const rootIds = children.get("root") ?? [];
    rootIds.forEach((id, index) => { byId.get(id)!.position = { x: (index % 4) * 300, y: Math.floor(index / 4) * 210 }; });
  }
  return { nodes: nodes.map((node) => byId.get(node.id) as Node<N>), edges };
}
