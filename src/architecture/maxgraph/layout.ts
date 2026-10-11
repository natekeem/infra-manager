import { CompactTreeLayout, CompositeLayout, HierarchicalLayout, SwimlaneLayout, type AbstractGraph, type Cell } from "@maxgraph/core";
import type { NativeLayoutName } from "./types";

export function runNativeLayout(graph: AbstractGraph, parent: Cell, name: NativeLayoutName = "composite") {
  const hierarchy = new HierarchicalLayout(graph, "north", true);
  hierarchy.intraCellSpacing = 38;
  hierarchy.interRankCellSpacing = 72;
  hierarchy.interHierarchySpacing = 64;
  hierarchy.resizeParent = parent !== graph.getDefaultParent();
  hierarchy.parentBorder = 28;

  if (name === "hierarchical") return hierarchy.execute(parent);
  if (name === "compact-tree") return new CompactTreeLayout(graph, false, false).execute(parent);
  if (name === "swimlane") {
    const lanes = graph.getChildVertices(parent).filter((cell) => cell.getChildCount() > 0);
    if (lanes.length > 1) return new SwimlaneLayout(graph, "north", true).execute(parent, lanes);
    return hierarchy.execute(parent);
  }

  const composite = new CompositeLayout(graph, [hierarchy], hierarchy);
  return composite.execute(parent);
}

export function layoutGraph(graph: AbstractGraph, topLevelGroups: Cell[]) {
  graph.batchUpdate(() => {
    for (const group of [...topLevelGroups].reverse()) layoutDescendants(graph, group);
    runNativeLayout(graph, graph.getDefaultParent(), "hierarchical");
  });
}

function layoutDescendants(graph: AbstractGraph, parent: Cell) {
  for (const child of parent.getChildren().filter((cell) => cell.vertex && cell.getChildCount() > 0)) layoutDescendants(graph, child);
  if (graph.getChildVertices(parent).length > 1) runNativeLayout(graph, parent, "hierarchical");
}
