import ELK, { type ElkExtendedEdge, type ElkNode } from "elkjs/lib/elk.bundled.js";
import { elkPreset } from "./layout-presets";
import { NODE_DIMENSIONS, type ArchitectureLayoutEngine, type LayoutEdgeData, type LayoutNodeData, type LayoutRequest, type LayoutResult } from "./types";

const elk = new ELK();
const cache = new Map<string, LayoutResult<any, any>>();

function fingerprint<N extends LayoutNodeData, E extends LayoutEdgeData>(request: LayoutRequest<N, E>) {
  return JSON.stringify({
    d: request.direction ?? "DOWN",
    s: request.scopeId ?? "root",
    n: request.nodes.map((node) => [node.id, node.data.kind, node.data.sortKey]).sort(),
    e: request.edges.map((edge) => [edge.id, edge.source, edge.target, edge.data?.layoutPriority]).sort(),
  });
}

function fallback<N extends LayoutNodeData, E extends LayoutEdgeData>(request: LayoutRequest<N, E>): LayoutResult<N, E> {
  const horizontal = request.direction === "RIGHT";
  return {
    nodes: [...request.nodes]
      .sort((a, b) => (a.data.sortKey ?? a.id).localeCompare(b.data.sortKey ?? b.id))
      .map((node, index) => ({
        ...node,
        position: horizontal
          ? { x: Math.floor(index / 5) * 300 + 40, y: (index % 5) * 170 + 40 }
          : { x: (index % 4) * 280 + 40, y: Math.floor(index / 4) * 190 + 40 },
      })),
    edges: request.edges,
  };
}

export const elkLayoutEngine: ArchitectureLayoutEngine = {
  async layout<N extends LayoutNodeData, E extends LayoutEdgeData>(request: LayoutRequest<N, E>): Promise<LayoutResult<N, E>> {
    const key = fingerprint(request);
    const cached = cache.get(key) as LayoutResult<N, E> | undefined;
    if (cached) return cached;

    const sortedNodes = [...request.nodes].sort((a, b) => (a.data.sortKey ?? a.id).localeCompare(b.data.sortKey ?? b.id));
    const sortedEdges = [...request.edges].sort((a, b) => a.id.localeCompare(b.id));
    const graph: ElkNode = {
      id: "root",
      layoutOptions: elkPreset(request.direction ?? "DOWN"),
      children: sortedNodes.map((node) => {
        const size = NODE_DIMENSIONS[node.data.kind] ?? NODE_DIMENSIONS.asset;
        return { id: node.id, width: size.width, height: size.height };
      }),
      edges: sortedEdges.map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
    };

    try {
      const laidOut = await elk.layout(graph);
      const positions = new Map((laidOut.children ?? []).map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]));
      const routes = new Map(
        ((laidOut.edges ?? []) as ElkExtendedEdge[]).map((edge) => {
          const section = edge.sections?.[0];
          const points = section
            ? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map((point) => ({ x: point.x, y: point.y }))
            : undefined;
          return [edge.id, points] as const;
        })
      );
      const result: LayoutResult<N, E> = {
        nodes: sortedNodes.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position })),
        edges: sortedEdges.map((edge) => ({
          ...edge,
          data: { ...(edge.data as E), routedPoints: routes.get(edge.id) },
        })),
      };
      cache.set(key, result);
      return result;
    } catch {
      return fallback(request);
    }
  },
};
