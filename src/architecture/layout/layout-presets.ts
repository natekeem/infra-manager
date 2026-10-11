import type { LayoutDirection } from "./types";

export const RELATION_LAYOUT_PRIORITY = {
  DATABASE: 100,
  SERVICE: 100,
  STORAGE: 100,
  CLUSTER: 100,
  EXTERNAL: 70,
  MANAGEMENT: 50,
  MONITORING: 10,
  OTHER: 10,
} as const;

export function elkPreset(direction: LayoutDirection) {
  return {
    "elk.algorithm": "layered",
    "elk.direction": direction,
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    "elk.spacing.nodeNode": "44",
    "elk.layered.spacing.nodeNodeBetweenLayers": direction === "DOWN" ? "90" : "110",
    "elk.layered.spacing.edgeNodeBetweenLayers": "34",
    "elk.layered.nodePlacement.favorStraightEdges": "true",
    "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
    "elk.padding": "[top=40,left=40,bottom=40,right=40]",
  };
}
