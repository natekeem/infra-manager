"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Graph, ImageBox, InternalEvent, UndoManager, type AbstractGraph, type Cell, type CellStyle } from "@maxgraph/core";
import type { ArchitectureRelation, Asset, ClusterEntity, NasAsset, NetworkStatus, RelationType, SoftwareInstall, SoftwareProduct, SoftwareRelease, SopDocument, TopologyGroup } from "@/domain/models";
import { assetMatchesGroup } from "@/architecture/layout/semantic-layout";
import { dependencyFocus } from "@/architecture/maxgraph/dependency-highlight";
import { populateGraph, relationLabel, type GraphAdapterResult } from "@/architecture/maxgraph/graph-adapter";
import { layoutGraph, runNativeLayout } from "@/architecture/maxgraph/layout";
import { loadLayout, saveLayout } from "@/architecture/maxgraph/graph-persistence";
import type { GraphCellValue, NativeLayoutName } from "@/architecture/maxgraph/types";
import { useProjectGroup } from "@/context/project-group-context";
import { VmDrawer } from "@/components/infrastructure/vm-drawer";
import { ClusterDrawer } from "@/components/cluster/cluster-drawer";
import { NasDrawer } from "@/components/storage/nas-drawer";
import { GroupDrawer, type GroupDrawerData } from "@/components/topology/group-drawer";
import { ConnectionDrawer } from "@/components/network/connection-drawer";
import { RelationEditorDrawer } from "@/components/topology/relation-editor-drawer";
import { SoftwareDetailDrawer } from "@/components/software/software-detail-drawer";
import { matchLegacySoftwareRelease } from "@/domain/software-lifecycle";
import { managementRepo } from "@/services/management/mock-repository";
import { ArchitectureLegend } from "./architecture-legend";
import { MaxGraphToolbar } from "./maxgraph-toolbar";

const RELATION_TYPES: RelationType[] = ["SERVICE", "DATABASE", "STORAGE", "MONITORING", "MANAGEMENT", "CLUSTER", "EXTERNAL", "OTHER"];

export interface MaxGraphArchitectureProps {
  vms: Asset[];
  statuses: NetworkStatus[];
  software: SoftwareInstall[];
  sops: SopDocument[];
  clusters?: ClusterEntity[];
  nasAssets?: NasAsset[];
  softwareReleases?: SoftwareRelease[];
  softwareProducts?: SoftwareProduct[];
  relations?: ArchitectureRelation[];
  topologyGroups?: TopologyGroup[];
}

export function MaxGraphArchitecture({ vms, statuses, software, sops, clusters = [], nasAssets = [], softwareReleases = [], softwareProducts = [], relations = [], topologyGroups = [] }: MaxGraphArchitectureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<AbstractGraph | null>(null);
  const adapterRef = useRef<GraphAdapterResult | null>(null);
  const undoRef = useRef<UndoManager | null>(null);
  const destroyTimerRef = useRef<number | null>(null);
  const graphCleanupRef = useRef<(() => void) | null>(null);
  const editModeRef = useRef(false);
  const historyTrackingRef = useRef(true);
  const clickHandlerRef = useRef<(cell: Cell | null) => void>(() => {});
  const baseStylesRef = useRef(new Map<Cell, CellStyle>());
  const projectRef = useRef("rpa");
  const { activeProject, activeProjectId, projectGroups, setActiveProjectId } = useProjectGroup();
  const [environment, setEnvironment] = useState("ALL");
  const [relationMode, setRelationMode] = useState("CORE");
  const [editMode, setEditMode] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showActual, setShowActual] = useState(false);
  const [layoutName, setLayoutName] = useState<NativeLayoutName>("composite");
  const [historyRevision, setHistoryRevision] = useState(0);
  const [graphRevision, setGraphRevision] = useState(0);
  const [graphReadyRevision, setGraphReadyRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [currentRelations, setCurrentRelations] = useState(relations);
  const [selectedVm, setSelectedVm] = useState<Asset | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterEntity | null>(null);
  const [selectedNas, setSelectedNas] = useState<NasAsset | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupDrawerData | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<NetworkStatus | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<SoftwareRelease | null>(null);
  const [editingRelation, setEditingRelation] = useState<{ relation: ArchitectureRelation; sourceName: string; targetName: string; isNew?: boolean } | null>(null);

  const allAssets = useMemo(() => {
    const map = new Map<string, Asset>();
    [...vms, ...nasAssets].forEach((asset) => map.set(asset.id, asset));
    return [...map.values()];
  }, [vms, nasAssets]);
  const projectAssets = useMemo(() => allAssets.filter((item) => (!item.projectGroupId || item.projectGroupId === activeProjectId) && (environment === "ALL" || item.environment === environment)), [allAssets, activeProjectId, environment]);
  const projectClusters = useMemo(() => clusters.filter((item) => (!item.projectGroupId || item.projectGroupId === activeProjectId) && (environment === "ALL" || item.environment === environment)), [clusters, activeProjectId, environment]);
  const projectStatuses = useMemo(() => statuses.filter((item) => !item.policy.projectGroupId || item.policy.projectGroupId === activeProjectId), [statuses, activeProjectId]);
  const projectTopologyGroups = useMemo(() => topologyGroups.filter((item) => item.projectGroupId === activeProjectId), [topologyGroups, activeProjectId]);
  const projectRelations = useMemo(() => currentRelations.filter((item) => item.projectGroupId === activeProjectId), [currentRelations, activeProjectId]);
  const environments = useMemo(() => [...new Set(allAssets.filter((asset) => !asset.projectGroupId || asset.projectGroupId === activeProjectId).map((asset) => asset.environment).filter(Boolean))].sort(), [allAssets, activeProjectId]);
  const enabledRelations = useMemo<Partial<Record<RelationType, boolean>>>(() => Object.fromEntries(RELATION_TYPES.map((type) => [type, relationMode === "ALL" || (relationMode === "MONITORING" ? type === "MONITORING" : type !== "MONITORING")])) as Partial<Record<RelationType, boolean>>, [relationMode]);

  projectRef.current = activeProjectId;

  const fitGraph = useCallback(() => {
    const plugin = graphRef.current?.getPlugin("fit") as { fitCenter?: (options?: { margin?: number }) => number } | undefined;
    plugin?.fitCenter?.({ margin: 24 });
  }, []);

  const clearFocus = useCallback(() => {
    const graph = graphRef.current;
    const adapter = adapterRef.current;
    if (!graph || !adapter) return;
    historyTrackingRef.current = false;
    try {
      graph.batchUpdate(() => {
        for (const cell of adapter.allCells) {
          const original = baseStylesRef.current.get(cell);
          if (original) graph.getDataModel().setStyle(cell, { ...original });
        }
      });
    } finally {
      historyTrackingRef.current = true;
    }
    graph.clearSelection();
  }, []);

  const applyFocus = useCallback((entityId: string) => {
    const graph = graphRef.current;
    const adapter = adapterRef.current;
    if (!graph || !adapter) return;
    const focus = dependencyFocus(entityId, projectRelations, enabledRelations);
    historyTrackingRef.current = false;
    try {
      graph.batchUpdate(() => {
        for (const [id, cell] of adapter.cellsByEntityId) {
        const base = baseStylesRef.current.get(cell) ?? cell.getClonedStyle();
        const direct = focus.depthByEntityId.get(id);
        const relatedGroup = cell.value?.meta?.kind === "group" ? projectTopologyGroups.find((group) => group.id === id) : undefined;
        const groupRelatedCount = relatedGroup ? projectAssets.filter((asset) => assetMatchesGroup(asset, relatedGroup) && focus.relatedEntityIds.has(asset.id)).length : 0;
        const opacity = id === entityId || direct === 1 ? 100 : direct === 2 ? 80 : direct === 3 ? 65 : groupRelatedCount ? 85 : 15;
        const strokeColor = id === entityId ? "#5750f1" : focus.dependencyEntityIds.has(id) ? "#5750f1" : focus.impactedEntityIds.has(id) ? "#0e9384" : base.strokeColor;
        graph.getDataModel().setStyle(cell, { ...base, opacity, strokeColor, strokeWidth: id === entityId ? 3 : direct ? 2 : base.strokeWidth });
      }
        for (const [id, edge] of adapter.edgesByRelationId) {
        const base = baseStylesRef.current.get(edge) ?? edge.getClonedStyle();
        const relation = projectRelations.find((item) => item.id === id);
        const related = relation && (focus.relatedRelationIds.has(id) || (focus.relatedEntityIds.has(relation.sourceEntityId) && focus.relatedEntityIds.has(relation.targetEntityId)));
        const color = relation?.sourceEntityId === entityId ? "#5750f1" : relation?.targetEntityId === entityId ? "#0e9384" : base.strokeColor;
        graph.getDataModel().setStyle(edge, { ...base, opacity: related ? 100 : 10, strokeColor: related ? color : base.strokeColor, strokeWidth: related ? 2.25 : base.strokeWidth });
        }
      });
    } finally {
      historyTrackingRef.current = true;
    }
  }, [enabledRelations, projectAssets, projectRelations, projectTopologyGroups]);

  editModeRef.current = editMode;
  clickHandlerRef.current = (cell) => {
    if (!cell) {
      clearFocus();
      return;
    }
    const value = cell.value as GraphCellValue | undefined;
    const meta = value?.meta;
    if (!meta) return;
    if (meta.kind === "asset") {
      const asset = allAssets.find((item) => item.id === meta.assetId);
      if (asset?.assetType === "NAS") setSelectedNas(asset as NasAsset);
      else setSelectedVm(asset ?? null);
      applyFocus(meta.assetId);
    } else if (meta.kind === "cluster") {
      setSelectedCluster(clusters.find((item) => item.id === meta.clusterId) ?? null);
      applyFocus(meta.clusterId);
    } else if (meta.kind === "group") {
      const group = topologyGroups.find((item) => item.id === meta.groupId);
      if (group) {
        const assets = allAssets.filter((asset) => assetMatchesGroup(asset, group));
        const ids = new Set(assets.map((asset) => asset.id));
        setSelectedGroup({ groupName: group.name, groupType: group.groupType, environment: group.environment, domain: group.domain, system: group.system, description: group.description, assets, statuses: statuses.filter((status) => ids.has(status.policy.sourceVmId) || (!!status.policy.targetVmId && ids.has(status.policy.targetVmId))), software, sops });
        applyFocus(meta.groupId);
      }
    } else if (meta.kind === "relation") {
      const relation = currentRelations.find((item) => item.id === meta.relationId);
      if (!relation) return;
      const matches = matchingStatuses(relation, statuses);
      if (matches.length) setSelectedConnection(matches[0]);
      else setEditingRelation({ relation, sourceName: entityLabel(relation.sourceEntityId, allAssets, clusters, topologyGroups), targetName: entityLabel(relation.targetEntityId, allAssets, clusters, topologyGroups) });
    }
  };

  useEffect(() => { managementRepo.getRelations().then((items) => setCurrentRelations(items.length ? items : relations)); }, [relations]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (destroyTimerRef.current !== null) {
      window.clearTimeout(destroyTimerRef.current);
      destroyTimerRef.current = null;
    }
    if (graphRef.current) {
      setGraphReadyRevision((value) => value + 1);
      return () => {
        destroyTimerRef.current = window.setTimeout(() => graphCleanupRef.current?.(), 0);
      };
    }
    const graph = new Graph(container);
    const undo = new UndoManager();
    graphRef.current = graph;
    undoRef.current = undo;
    setGraphReadyRevision((value) => value + 1);
    graph.setPanning(true);
    graph.setGridEnabled(true);
    graph.setGridSize(20);
    graph.setConnectable(false);
    graph.setCellsMovable(false);
    graph.setCellsResizable(false);
    graph.setCellsEditable(false);
    graph.setAllowDanglingEdges(false);
    graph.setHtmlLabels(false);
    graph.setTooltips(true);
    graph.options.collapsedImage = new ImageBox("/architecture/icons/expand.svg", 14, 14);
    graph.options.expandedImage = new ImageBox("/architecture/icons/collapse.svg", 14, 14);
    graph.convertValueToString = (cell) => {
      const value = cell.value as GraphCellValue | undefined;
      return cell.collapsed && value?.summary ? `\u00a0\u00a0\u00a0${value.label}\n\u00a0\u00a0\u00a0${value.summary}` : value?.label ?? "";
    };
    const foldControlFallback = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const image = target?.tagName.toLowerCase() === "image" ? target : target?.closest("g")?.querySelector("image");
      if (!target || !image) return;
      const href = image.getAttribute("href") ?? image.getAttribute("xlink:href") ?? "";
      if (!href.includes("/architecture/icons/expand.svg") && !href.includes("/architecture/icons/collapse.svg")) return;
      const cell = [...graph.getView().getStates().entries()].find(([, state]) => state.control?.node === target || state.control?.node?.contains(target))?.[0] ?? null;
      const value = cell?.value as GraphCellValue | undefined;
      if (!cell || value?.meta.kind !== "group") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      graph.foldCells(!cell.collapsed, false, [cell], false, event);
    };
    container.addEventListener("pointerdown", foldControlFallback, true);

    const undoListener = (_sender: unknown, event: { getProperty: (key: string) => unknown }) => {
      if (!historyTrackingRef.current) return;
      undo.undoableEditHappened(event.getProperty("edit") as never);
      setHistoryRevision((value) => value + 1);
    };
    graph.getDataModel().addListener(InternalEvent.UNDO, undoListener);
    graph.getView().addListener(InternalEvent.UNDO, undoListener);

    graph.addListener(InternalEvent.CLICK, (_sender: unknown, event: { getProperty: (key: string) => unknown }) => {
      const mouseEvent = event.getProperty("event") as { getCell?: () => Cell | null } | undefined;
      const cell = (event.getProperty("cell") as Cell | null) ?? mouseEvent?.getCell?.() ?? null;
      clickHandlerRef.current(cell);
    });
    graph.addListener(InternalEvent.DOUBLE_CLICK, (_sender: unknown, event: { getProperty: (key: string) => unknown; consume?: () => void }) => {
      const cell = event.getProperty("cell") as Cell | null;
      const value = cell?.value as GraphCellValue | undefined;
      if (!cell || value?.meta.kind !== "group") return;
      graph.foldCells(!cell.collapsed, false, [cell], false);
      event.consume?.();
    });

    graph.addListener(InternalEvent.MOVE_CELLS, () => window.setTimeout(() => adapterRef.current && saveLayout(graph, projectRef.current, adapterRef.current.allCells), 0));
    graph.addListener(InternalEvent.CELLS_FOLDED, () => window.setTimeout(() => adapterRef.current && saveLayout(graph, projectRef.current, adapterRef.current.allCells), 0));
    graph.addListener(InternalEvent.CELLS_ADDED, (_sender: unknown, event: { getProperty: (key: string) => unknown }) => {
      const cells = (event.getProperty("cells") as Cell[] | undefined) ?? [];
      const edge = cells.find((cell) => cell.edge && !(cell.value as GraphCellValue | undefined)?.meta);
      if (!edge?.source || !edge.target || !editModeRef.current) return;
      const sourceValue = edge.source.value as GraphCellValue;
      const targetValue = edge.target.value as GraphCellValue;
      const sourceId = entityIdFromValue(sourceValue);
      const targetId = entityIdFromValue(targetValue);
      if (!sourceId || !targetId) return;
      const relation: ArchitectureRelation = { id: `manual-${Date.now().toString(36)}`, projectGroupId: projectRef.current, sourceEntityType: entityTypeFromValue(sourceValue), sourceEntityId: sourceId, targetEntityType: entityTypeFromValue(targetValue), targetEntityId: targetId, relationType: "SERVICE", protocol: "TCP" };
      edge.setId(relation.id);
      edge.setValue({ label: relationLabel(relation), meta: { kind: "relation", relationId: relation.id, projectGroupId: projectRef.current, relationType: relation.relationType } } satisfies GraphCellValue);
      adapterRef.current?.edgesByRelationId.set(relation.id, edge);
      setEditingRelation({ relation, sourceName: sourceValue.label, targetName: targetValue.label, isNew: true });
    });

    graphCleanupRef.current = () => {
      container.removeEventListener("pointerdown", foldControlFallback, true);
      graph.destroy();
      graphRef.current = null;
      adapterRef.current = null;
      undoRef.current = null;
      graphCleanupRef.current = null;
      destroyTimerRef.current = null;
    };
    return () => {
      destroyTimerRef.current = window.setTimeout(() => graphCleanupRef.current?.(), 0);
    };
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || graphReadyRevision === 0) return;
    graph.getDataModel().clear();
    undoRef.current?.clear();
    const adapter = populateGraph(graph, { projectGroupId: activeProjectId, environment, assets: allAssets, clusters, groups: topologyGroups, relations: currentRelations, statuses, persisted: loadLayout(activeProjectId) });
    adapterRef.current = adapter;
    baseStylesRef.current = new Map(adapter.allCells.map((cell) => [cell, { ...cell.getStyle() }]));
    layoutGraph(graph, adapter.topLevelGroups);
    saveLayout(graph, activeProjectId, adapter.allCells);
    // Graph population and the initial native layout emit model edits too. They
    // establish the baseline and must not appear as operator Undo actions.
    undoRef.current?.clear();
    requestAnimationFrame(() => fitGraph());
    setHistoryRevision((value) => value + 1);
    setGraphRevision((value) => value + 1);
  }, [activeProjectId, environment, graphReadyRevision]);

  useEffect(() => {
    const graph = graphRef.current;
    const adapter = adapterRef.current;
    if (!graph || !adapter) return;
    historyTrackingRef.current = false;
    try {
      graph.batchUpdate(() => {
        for (const [id, edge] of adapter.edgesByRelationId) {
        const relation = currentRelations.find((item) => item.id === id);
        if (!relation) continue;
        graph.getDataModel().setVisible(edge, enabledRelations[relation.relationType] !== false);
        const base = baseStylesRef.current.get(edge) ?? edge.getClonedStyle();
        graph.getDataModel().setStyle(edge, { ...base, noLabel: !showLabels });
        graph.setCellWarning(edge, null);
        const matched = matchingStatuses(relation, projectStatuses);
        if (showActual && matched.some((status) => status.observation?.tcp === "DOWN" || status.reverseObservation?.tcp === "DOWN")) graph.setCellWarning(edge, "Connectivity failure. Check the target service and firewall implementation.");
        else if (showPolicy && !matched.length) graph.setCellWarning(edge, "Approved policy not mapped");
        else if (showPolicy && matched.some((status) => status.overall === "EXPIRING")) graph.setCellWarning(edge, "Policy expiring");
        }
      });
    } finally {
      historyTrackingRef.current = true;
    }
  }, [currentRelations, enabledRelations, graphRevision, projectStatuses, showActual, showLabels, showPolicy]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.setConnectable(editMode);
    graph.setCellsMovable(editMode);
    graph.setCellsResizable(editMode);
    graph.setCellsDeletable(editMode);
  }, [editMode]);

  const runLayout = () => {
    const graph = graphRef.current;
    const adapter = adapterRef.current;
    if (!graph || !adapter) return;
    graph.batchUpdate(() => {
      for (const group of [...adapter.topLevelGroups].reverse()) runNativeLayout(graph, group, layoutName);
      runNativeLayout(graph, graph.getDefaultParent(), layoutName === "swimlane" ? "swimlane" : "hierarchical");
    });
    saveLayout(graph, activeProjectId, adapter.allCells);
    requestAnimationFrame(() => fitGraph());
  };

  const search = () => {
    const graph = graphRef.current;
    const adapter = adapterRef.current;
    if (!graph || !adapter || !query.trim()) return;
    const needle = query.trim().toLowerCase();
    const match = [...adapter.cellsByEntityId.entries()].find(([id, cell]) => {
      const value = cell.value as GraphCellValue;
      const asset = allAssets.find((item) => item.id === id);
      return `${value.label} ${asset?.ipAddress ?? ""}`.toLowerCase().includes(needle);
    });
    if (!match) return;
    let parent = match[1].parent;
    while (parent && parent !== graph.getDefaultParent()) {
      if (parent.collapsed) graph.foldCells(false, false, [parent], true);
      parent = parent.parent;
    }
    graph.setSelectionCell(match[1]);
    graph.scrollCellToVisible(match[1], true);
    applyFocus(match[0]);
  };

  const onRelationSave = async (updated: ArchitectureRelation) => {
    const saved = editingRelation?.isNew ? await managementRepo.createRelation(updated) : await managementRepo.updateRelation(updated.id, updated);
    setCurrentRelations((items) => editingRelation?.isNew ? [saved, ...items] : items.map((item) => item.id === saved.id ? saved : item));
    const edge = adapterRef.current?.edgesByRelationId.get(updated.id);
    if (edge && graphRef.current) {
      graphRef.current.getDataModel().setValue(edge, { label: relationLabel(saved), meta: { kind: "relation", relationId: saved.id, projectGroupId: saved.projectGroupId, relationType: saved.relationType } } satisfies GraphCellValue);
    }
    setEditingRelation(null);
  };

  const onRelationDelete = async (id: string) => {
    await managementRepo.deleteRelation(id);
    const edge = adapterRef.current?.edgesByRelationId.get(id);
    if (edge) graphRef.current?.removeCells([edge]);
    setCurrentRelations((items) => items.filter((item) => item.id !== id));
    setEditingRelation(null);
  };

  const onRelationCancel = () => {
    if (editingRelation?.isNew) {
      const edge = adapterRef.current?.edgesByRelationId.get(editingRelation.relation.id);
      if (edge) graphRef.current?.removeCells([edge]);
      adapterRef.current?.edgesByRelationId.delete(editingRelation.relation.id);
    }
    setEditingRelation(null);
  };

  return <div className="space-y-2">
    <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <div className="relative max-w-sm flex-1"><input aria-label="Architecture search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && search()} placeholder="Hostname, display name, IP, group, cluster" className="h-8 w-full rounded border border-[var(--border)] bg-[var(--surface-2)] px-3 pr-14 text-[10px] outline-none focus:border-[#5750f1]" /><button type="button" onClick={search} className="absolute right-1 top-1 h-6 rounded px-2 text-[9px] font-semibold text-[#5750f1]">Search</button></div>
      <div className="text-[9px] text-[var(--muted)]">Node click: dependency focus · blank canvas: clear</div>
    </div>
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <MaxGraphToolbar projects={projectGroups} projectId={activeProjectId} environments={environments} environment={environment} relationMode={relationMode} editMode={editMode} showLabels={showLabels} showPolicy={showPolicy} showActual={showActual} layoutName={layoutName} canUndo={Boolean(historyRevision && undoRef.current?.canUndo())} canRedo={Boolean(historyRevision && undoRef.current?.canRedo())} onProject={setActiveProjectId} onEnvironment={setEnvironment} onRelationMode={setRelationMode} onEdit={() => setEditMode((value) => !value)} onLabels={() => setShowLabels((value) => !value)} onPolicy={() => setShowPolicy((value) => !value)} onActual={() => setShowActual((value) => !value)} onLayoutName={setLayoutName} onAutoLayout={runLayout} onFit={fitGraph} onUndo={() => { undoRef.current?.undo(); setHistoryRevision((value) => value + 1); }} onRedo={() => { undoRef.current?.redo(); setHistoryRevision((value) => value + 1); }} />
      <div className="relative h-[calc(100vh-250px)] min-h-[560px] overflow-auto bg-[#f8fafc]">
        <div ref={containerRef} data-testid="maxgraph-canvas" className="h-full min-w-[960px] cursor-grab overflow-hidden bg-[linear-gradient(#e4e7ec_1px,transparent_1px),linear-gradient(90deg,#e4e7ec_1px,transparent_1px)] bg-[size:20px_20px]" />
        <ArchitectureLegend />
      </div>
    </div>
    <VmDrawer vm={selectedVm} network={projectStatuses} software={software} sops={sops} open={!!selectedVm} onClose={() => setSelectedVm(null)} onSelectSoftware={(item) => { const release = matchLegacySoftwareRelease(item, softwareProducts, softwareReleases); if (release) setSelectedRelease(release); }} />
    <ClusterDrawer cluster={selectedCluster} open={!!selectedCluster} onClose={() => setSelectedCluster(null)} />
    <NasDrawer nas={selectedNas} open={!!selectedNas} onClose={() => setSelectedNas(null)} onSelectVm={(hostname) => setSelectedVm(projectAssets.find((item) => item.hostname === hostname) ?? null)} />
    <GroupDrawer data={selectedGroup} open={!!selectedGroup} onClose={() => setSelectedGroup(null)} onSelectAsset={setSelectedVm} />
    <ConnectionDrawer status={selectedConnection} relatedStatuses={selectedConnection ? [selectedConnection] : []} open={!!selectedConnection} onClose={() => setSelectedConnection(null)} />
    <SoftwareDetailDrawer release={selectedRelease} open={!!selectedRelease} onClose={() => setSelectedRelease(null)} />
    <RelationEditorDrawer relation={editingRelation?.relation ?? null} open={!!editingRelation} onClose={onRelationCancel} onCancel={onRelationCancel} onSave={onRelationSave} onDelete={onRelationDelete} sourceName={editingRelation?.sourceName} targetName={editingRelation?.targetName} />
  </div>;
}

function matchingStatuses(relation: ArchitectureRelation, statuses: NetworkStatus[]) {
  return statuses.filter((status) => status.policy.sourceVmId === relation.sourceEntityId && status.policy.targetVmId === relation.targetEntityId && (!relation.protocol || status.policy.protocol === relation.protocol) && (!relation.port || status.policy.port === relation.port));
}

function entityLabel(id: string, assets: Asset[], clusters: ClusterEntity[], groups: TopologyGroup[]) {
  return assets.find((item) => item.id === id)?.hostname ?? clusters.find((item) => item.id === id)?.name ?? groups.find((item) => item.id === id)?.name ?? id;
}

function entityIdFromValue(value: GraphCellValue) {
  const meta = value.meta;
  return meta.kind === "asset" ? meta.assetId : meta.kind === "group" ? meta.groupId : meta.kind === "cluster" ? meta.clusterId : meta.kind === "external" ? meta.entityId : null;
}

function entityTypeFromValue(value: GraphCellValue): ArchitectureRelation["sourceEntityType"] {
  return value.meta.kind === "asset" ? "ASSET" : value.meta.kind === "group" ? "TOPOLOGY_GROUP" : value.meta.kind === "cluster" ? "CLUSTER" : "EXTERNAL";
}
