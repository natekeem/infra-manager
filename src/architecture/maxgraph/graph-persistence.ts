import type { AbstractGraph, Cell } from "@maxgraph/core";
import type { GraphCellValue, PersistedCellGeometry } from "./types";

export const MAXGRAPH_LAYOUT_KEY = "rpa-maxgraph-layout:v1";

export function loadLayout(projectGroupId: string): Map<string, PersistedCellGeometry> {
  try {
    const rows = JSON.parse(localStorage.getItem(MAXGRAPH_LAYOUT_KEY) ?? "[]") as PersistedCellGeometry[];
    return new Map(rows.filter((row) => row.projectGroupId === projectGroupId).map((row) => [row.entityId, row]));
  } catch {
    return new Map();
  }
}

export function saveLayout(graph: AbstractGraph, projectGroupId: string, cells: Iterable<Cell>) {
  const current = loadAll().filter((row) => row.projectGroupId !== projectGroupId);
  for (const cell of cells) {
    if (!cell.vertex || !cell.geometry) continue;
    const value = cell.value as GraphCellValue | undefined;
    const meta = value?.meta;
    const entityId = meta?.kind === "asset" ? meta.assetId : meta?.kind === "group" ? meta.groupId : meta?.kind === "cluster" ? meta.clusterId : meta?.kind === "external" ? meta.entityId : null;
    if (!entityId) continue;
    current.push({ projectGroupId, entityId, x: cell.geometry.x, y: cell.geometry.y, width: cell.geometry.width, height: cell.geometry.height, collapsed: cell.collapsed });
  }
  localStorage.setItem(MAXGRAPH_LAYOUT_KEY, JSON.stringify(current));
}

function loadAll(): PersistedCellGeometry[] {
  try {
    return JSON.parse(localStorage.getItem(MAXGRAPH_LAYOUT_KEY) ?? "[]") as PersistedCellGeometry[];
  } catch {
    return [];
  }
}

