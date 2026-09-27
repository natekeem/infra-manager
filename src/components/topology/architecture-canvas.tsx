"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background, BaseEdge, ConnectionLineType, ConnectionMode, Controls, EdgeLabelRenderer, Handle,
  MarkerType, MiniMap, Position, ReactFlow, applyNodeChanges, getSmoothStepPath,
  type Connection, type Edge, type EdgeProps, type Node, type NodeChange, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  ArchitectureRelation, Asset, ClusterEntity, NasAsset, NetworkStatus, RelationType,
  SoftwareInstall, SoftwareProduct, SoftwareRelease, SopDocument, TopologyGroup,
} from "@/domain/models";
import { elkLayoutEngine } from "@/architecture/layout/elk-layout";
import { RELATION_LAYOUT_PRIORITY } from "@/architecture/layout/layout-presets";
import { traverseDependencies, type DependencyDepth, type DependencyMode } from "@/architecture/layout/dependency-layout";
import {
  breadcrumbFor, buildEntityCatalog, groupAssets, nearestVisibleEntity,
  overviewEntities, type SemanticEntity,
} from "@/architecture/layout/semantic-layout";
import { NODE_DIMENSIONS, type RoutedPoint } from "@/architecture/layout/types";
import { VmDrawer } from "@/components/infrastructure/vm-drawer";
import { ConnectionDrawer } from "@/components/network/connection-drawer";
import { ClusterDrawer } from "@/components/cluster/cluster-drawer";
import { NasDrawer } from "@/components/storage/nas-drawer";
import { GroupDrawer, type GroupDrawerData } from "@/components/topology/group-drawer";
import { SoftwareDetailDrawer } from "@/components/software/software-detail-drawer";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { SearchIcon } from "@/components/common/icons";
import { matchLegacySoftwareRelease } from "@/domain/software-lifecycle";
import { managementRepo } from "@/services/management/mock-repository";
import { useProjectGroup } from "@/context/project-group-context";

type ViewMode = "overview" | "dependency";
type OverlayMode = "policy" | "live";
export type HandleDirection = "t" | "b" | "l" | "r";

export interface TopologyNodeData extends Record<string, unknown> {
  kind: "group" | "asset" | "cluster" | "nas" | "dbaas" | "external";
  key: string; label: string; sortKey: string; sublabel?: string; isEditing?: boolean;
  selectedTarget?: boolean; dependencySide?: "impact" | "dependency" | "selected"; dependencyDepth?: number;
  count?: number; healthyCount?: number; warningCount?: number; criticalCount?: number; issueCount?: number;
  apCount?: number; dbCount?: number; nasCount?: number; k8sCount?: number;
  environment?: string; domain?: string; system?: string; groupType?: string; description?: string;
  group?: TopologyGroup; vm?: Asset; cluster?: ClusterEntity; nas?: NasAsset;
  onDrillDown?: () => void;
}

export interface TopologyEdgeData extends Record<string, unknown> {
  label: string; secondary: string; issueCount: number; status?: NetworkStatus;
  relatedStatuses?: NetworkStatus[]; relation?: ArchitectureRelation; relationType?: RelationType;
  flowActive?: boolean; showLabel?: boolean; routedPoints?: RoutedPoint[]; layoutPriority?: number;
}

function NodeHandles({ editing }: { editing?: boolean }) {
  const cls = editing
    ? "!h-3 !w-3 !rounded-full !border-2 !border-white !bg-[#5750f1] shadow ring-2 ring-[#5750f1]/30"
    : "!h-1.5 !w-1.5 !rounded-full !border-0 !bg-[#98a2b3] opacity-0 group-hover:opacity-40";
  const items = [[Position.Top, "t"], [Position.Bottom, "b"], [Position.Left, "l"], [Position.Right, "r"]] as const;
  return <>{items.flatMap(([position, id]) => [
    <Handle key={`${id}-src`} id={`${id}-src`} type="source" position={position} isConnectable={editing} className={cls} />,
    <Handle key={`${id}-tgt`} id={`${id}-tgt`} type="target" position={position} isConnectable={editing} className="!h-3 !w-3 !border-0 !bg-transparent" />,
  ])}</>;
}

function CardShell({ data, selected, children, accent = "border-[var(--border)]" }: NodeProps<Node<TopologyNodeData>> & { children: React.ReactNode; accent?: string }) {
  const size = NODE_DIMENSIONS[data.kind];
  return <div style={{ width: size.width, height: size.height }} className={`group relative flex flex-col justify-between rounded-md border bg-[var(--surface)] p-2.5 shadow-sm ${data.selectedTarget || selected ? "border-[#5750f1] ring-1 ring-[#5750f1]/25" : accent}`}><NodeHandles editing={data.isEditing} />{children}</div>;
}

function Metric({ label, value }: { label: string; value?: number }) {
  return <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-1"><div className="text-[7px] text-[var(--muted)]">{label}</div><div className="text-[10px] font-bold">{value ?? 0}</div></div>;
}

function ScopeNode(props: NodeProps<Node<TopologyNodeData>>) {
  const { data } = props;
  return <div onClick={(event) => { if (event.detail === 2) { event.stopPropagation(); data.onDrillDown?.(); } }} onDoubleClick={(event) => { event.stopPropagation(); data.onDrillDown?.(); }}><CardShell {...props}>
    <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-1.5"><div className="min-w-0"><div className="truncate text-[11px] font-bold">{data.label}</div><div className="truncate text-[8px] text-[var(--muted)]">{data.sublabel}</div></div>{data.selectedTarget ? <span className="rounded bg-[#5750f1]/10 px-1.5 py-0.5 text-[7px] font-bold text-[#5750f1]">SELECTED</span> : data.issueCount ? <span className="rounded bg-[var(--danger-soft)] px-1.5 py-0.5 text-[8px] text-[#b42318]">{data.issueCount} issue</span> : <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#12b76a]" />}</div>
    <div className="grid grid-cols-3 gap-1 text-center text-[8px]"><Metric label="AP" value={data.apCount} /><Metric label="DB" value={data.dbCount} /><Metric label="NAS" value={data.nasCount} /></div>
    <div className="flex items-center justify-between border-t border-[var(--border)] pt-1 text-[8px]"><span className="text-emerald-600">{data.healthyCount ?? 0} Healthy</span>{data.onDrillDown ? <button type="button" onClick={(event) => { event.stopPropagation(); data.onDrillDown?.(); }} className="nodrag text-[#5750f1] hover:underline">Drill down →</button> : <span className="text-[var(--muted)]">{data.dependencySide && data.dependencySide !== "selected" ? `${data.dependencySide === "impact" ? "IMPACT" : "DEPENDS"} · DEPTH ${data.dependencyDepth}` : `${data.count ?? 0} assets`}</span>}</div>
  </CardShell></div>;
}

function AssetNode(props: NodeProps<Node<TopologyNodeData>>) {
  const vm = props.data.vm!;
  return <CardShell {...props} accent={vm.health === "critical" ? "border-red-500/50" : vm.health === "warning" ? "border-amber-500/50" : "border-[var(--border)]"}>
    <div className="flex items-center justify-between gap-2"><span className="truncate text-[11px] font-semibold">{vm.hostname}</span><span className="rounded bg-[var(--surface-2)] px-1 text-[8px]">{props.data.selectedTarget ? "SELECTED" : vm.role}</span></div>
    <div className="flex items-center justify-between text-[9px]"><span className="font-mono">{vm.ipAddress}</span><span className="text-[var(--muted)]">{vm.environment} · {vm.domain ?? "UNMAPPED"}</span></div>
    <div className="grid grid-cols-3 gap-1 text-center text-[8px]"><Metric label="CPU" value={vm.cpuPct} /><Metric label="MEM" value={vm.memoryPct} /><Metric label="DISK" value={vm.diskPct} /></div>
    <div className="flex justify-between border-t border-[var(--border)] pt-1 text-[8px] text-[var(--muted)]"><span className="truncate">{vm.service}</span>{props.data.dependencySide && props.data.dependencySide !== "selected" && <span>{props.data.dependencySide === "impact" ? "IMPACT" : "DEPENDS"} D{props.data.dependencyDepth}</span>}</div>
  </CardShell>;
}

function ClusterNode(props: NodeProps<Node<TopologyNodeData>>) {
  const c = props.data.cluster!;
  return <CardShell {...props} accent="border-purple-500/40"><div className="flex justify-between"><span className="text-[8px] font-bold text-purple-600">{c.type}</span>{props.data.selectedTarget ? <span className="text-[7px] font-bold text-[#5750f1]">SELECTED</span> : props.data.dependencySide && <span className="text-[7px] text-[var(--muted)]">{props.data.dependencySide.toUpperCase()} D{props.data.dependencyDepth}</span>}</div><div className="truncate text-[11px] font-bold">{c.name}</div><div className="font-mono text-[9px] text-[#5750f1]">VIP {c.vip}</div><div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-1 text-[8px]">{c.members.map((m) => `${m.hostname} ${m.role}`).join(" · ")}</div></CardShell>;
}

function NasNode(props: NodeProps<Node<TopologyNodeData>>) {
  const n = props.data.nas!; const pct = n.capacityTb ? Math.round(n.usedCapacityTb / n.capacityTb * 100) : 0;
  return <CardShell {...props} accent="border-cyan-500/40"><div className="flex justify-between"><span className="text-[8px] font-bold text-cyan-600">NAS · {n.protocol}</span>{props.data.selectedTarget ? <span className="text-[7px] font-bold text-[#5750f1]">SELECTED</span> : props.data.dependencySide && <span className="text-[7px] text-[var(--muted)]">{props.data.dependencySide.toUpperCase()} D{props.data.dependencyDepth}</span>}</div><div className="truncate text-[11px] font-semibold">{n.hostname}</div><div className="font-mono text-[9px]">{n.ipAddress}</div><div><div className="mb-1 flex justify-between text-[8px] text-[var(--muted)]"><span>Capacity</span><span>{n.usedCapacityTb}/{n.capacityTb} TB</span></div><div className="h-1.5 rounded bg-[var(--surface-3)]"><div className="h-full rounded bg-cyan-500" style={{ width: `${Math.min(100, pct)}%` }} /></div></div></CardShell>;
}

function FlowEdge(props: EdgeProps<Edge<TopologyEdgeData>>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props;
  const routed = data?.routedPoints;
  const [fallback, lx, ly] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 8 });
  const path = routed && routed.length > 1 ? routed.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ") : fallback;
  const middle = routed?.[Math.floor(routed.length / 2)];
  const color = data?.status?.overall === "RETURN_DIRECTION_FAILED" || data?.status?.overall.includes("UNREACHABLE") ? "#f04438" : data?.issueCount ? "#f79009" : "#98a2b3";
  return <><BaseEdge id={id} path={path} style={{ stroke: color, strokeWidth: selected ? 2.5 : 1.5 }} />{data?.flowActive && !data.issueCount && <circle r={3} fill="#5750f1"><animateMotion dur="2.4s" repeatCount="indefinite" path={path} /></circle>}{data?.showLabel && <EdgeLabelRenderer><div style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${middle?.x ?? lx}px,${middle?.y ?? ly}px)`, pointerEvents: "all" }} className="nodrag nopan rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[8px] shadow-sm">{data.label}</div></EdgeLabelRenderer>}</>;
}

const nodeTypes = { scopeCard: ScopeNode, assetCard: AssetNode, dbaasCard: AssetNode, externalCard: ScopeNode, clusterCard: ClusterNode, nasCard: NasNode };
const edgeTypes = { flow: FlowEdge };

function entityNode(entity: SemanticEntity, assets: Asset[], selectedId?: string, side?: TopologyNodeData["dependencySide"], depth?: number): Node<TopologyNodeData> {
  if (entity.group) {
    const members = groupAssets(entity.group, assets);
    return { id: entity.id, type: "scopeCard", position: { x: 0, y: 0 }, data: { kind: "group", key: entity.id, label: entity.label, sortKey: `${entity.group.groupType}:${entity.label}:${entity.id}`, sublabel: [entity.group.system, entity.group.environment, entity.group.domain].filter(Boolean).join(" · "), count: members.length, healthyCount: members.filter((a) => a.health === "healthy").length, warningCount: members.filter((a) => a.health === "warning").length, criticalCount: members.filter((a) => a.health === "critical").length, issueCount: members.filter((a) => a.health === "warning" || a.health === "critical").length, apCount: members.filter((a) => a.role === "AP").length, dbCount: members.filter((a) => a.role === "DB").length, nasCount: members.filter((a) => a.assetType === "NAS").length, environment: entity.group.environment, domain: entity.group.domain, system: entity.group.system, groupType: entity.group.groupType, description: entity.group.description, group: entity.group, selectedTarget: entity.id === selectedId, dependencySide: side, dependencyDepth: depth } };
  }
  if (entity.cluster) return { id: entity.id, type: "clusterCard", position: { x: 0, y: 0 }, data: { kind: "cluster", key: entity.id, label: entity.label, sortKey: `cluster:${entity.label}:${entity.id}`, cluster: entity.cluster, selectedTarget: entity.id === selectedId, dependencySide: side, dependencyDepth: depth } };
  if (entity.nas) return { id: entity.id, type: "nasCard", position: { x: 0, y: 0 }, data: { kind: "nas", key: entity.id, label: entity.label, sortKey: `nas:${entity.label}:${entity.id}`, nas: entity.nas, selectedTarget: entity.id === selectedId, dependencySide: side, dependencyDepth: depth } };
  if (entity.asset) return { id: entity.id, type: entity.kind === "dbaas" ? "dbaasCard" : "assetCard", position: { x: 0, y: 0 }, data: { kind: entity.kind === "dbaas" ? "dbaas" : "asset", key: entity.id, label: entity.label, sortKey: `${entity.asset.role}:${entity.label}:${entity.id}`, vm: entity.asset, selectedTarget: entity.id === selectedId, dependencySide: side, dependencyDepth: depth } };
  return { id: entity.id, type: "externalCard", position: { x: 0, y: 0 }, data: { kind: "external", key: entity.id, label: entity.label, sortKey: `external:${entity.label}:${entity.id}`, count: 0, healthyCount: 0, selectedTarget: entity.id === selectedId, dependencySide: side, dependencyDepth: depth } };
}

function makeEdge(relation: ArchitectureRelation, source: string, target: string, flowActive: boolean, showLabel: boolean): Edge<TopologyEdgeData> {
  return { id: relation.id, type: "flow", source, target, markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 }, data: { label: `${relation.protocol ?? relation.relationType}${relation.port ? `/${relation.port}` : ""}`, secondary: relation.relationType, issueCount: 0, relation, relationType: relation.relationType, flowActive, showLabel, layoutPriority: RELATION_LAYOUT_PRIORITY[relation.relationType] } };
}

export function ArchitectureCanvas({ vms, statuses, software, sops, clusters = [], nasAssets = [], softwareReleases = [], softwareProducts = [], relations = [], topologyGroups = [] }: { vms: Asset[]; statuses: NetworkStatus[]; software: SoftwareInstall[]; sops: SopDocument[]; clusters?: ClusterEntity[]; nasAssets?: NasAsset[]; softwareReleases?: SoftwareRelease[]; softwareProducts?: SoftwareProduct[]; relations?: ArchitectureRelation[]; topologyGroups?: TopologyGroup[] }) {
  const { activeProject } = useProjectGroup();
  const [mode, setMode] = useState<ViewMode>("overview");
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [environment, setEnvironment] = useState("ALL");
  const [overlay, setOverlay] = useState<OverlayMode>("live");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [flowAnimation, setFlowAnimation] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [layoutEdit, setLayoutEdit] = useState(false);
  const [isLayouting, setIsLayouting] = useState(false);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [dependencyQuery, setDependencyQuery] = useState("");
  const [dependencyTarget, setDependencyTarget] = useState<string | null>(null);
  const [dependencyMode, setDependencyMode] = useState<DependencyMode>("both");
  const [dependencyDepth, setDependencyDepth] = useState<DependencyDepth>(2);
  const [relationFilters, setRelationFilters] = useState<Record<RelationType, boolean>>({ SERVICE: true, DATABASE: true, STORAGE: true, MONITORING: false, MANAGEMENT: true, CLUSTER: true, EXTERNAL: true, OTHER: true });
  const [currentRelations, setCurrentRelations] = useState(relations);
  const [liveNodes, setLiveNodes] = useState<Node<TopologyNodeData>[]>([]);
  const [liveEdges, setLiveEdges] = useState<Edge<TopologyEdgeData>[]>([]);
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedVm, setSelectedVm] = useState<Asset | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterEntity | null>(null);
  const [selectedNas, setSelectedNas] = useState<NasAsset | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupDrawerData | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<NetworkStatus | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<SoftwareRelease | null>(null);
  const [dependencyDrawerEntity, setDependencyDrawerEntity] = useState<SemanticEntity | null>(null);
  const [edgeHandles, setEdgeHandles] = useState<Record<string, { source?: HandleDirection; target?: HandleDirection }>>({});
  const groupClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flowInstance = useRef<{ fitView: (options?: Record<string, unknown>) => Promise<boolean> } | null>(null);

  useEffect(() => { managementRepo.getRelations().then((items) => setCurrentRelations(items.length ? items : relations)); }, [relations]);
  const projectAssets = useMemo(() => vms.filter((item) => (!item.projectGroupId || item.projectGroupId === activeProject.id) && (environment === "ALL" || item.environment === environment)), [vms, activeProject.id, environment]);
  const projectGroups = useMemo(() => topologyGroups.filter((item) => item.projectGroupId === activeProject.id), [topologyGroups, activeProject.id]);
  const projectClusters = useMemo(() => clusters.filter((item) => (!item.projectGroupId || item.projectGroupId === activeProject.id) && (environment === "ALL" || item.environment === environment)), [clusters, activeProject.id, environment]);
  const projectNas = useMemo(() => nasAssets.filter((item) => (!item.projectGroupId || item.projectGroupId === activeProject.id) && (environment === "ALL" || item.environment === environment)), [nasAssets, activeProject.id, environment]);
  const projectRelations = useMemo(() => currentRelations.filter((item) => item.projectGroupId === activeProject.id), [currentRelations, activeProject.id]);
  const projectStatuses = useMemo(() => statuses.filter((item) => !item.policy.projectGroupId || item.policy.projectGroupId === activeProject.id), [statuses, activeProject.id]);
  const catalog = useMemo(() => buildEntityCatalog(projectGroups, projectAssets, projectClusters, projectNas, projectRelations), [projectGroups, projectAssets, projectClusters, projectNas, projectRelations]);
  const searchableEntities = useMemo(() => [...catalog.values()].sort((a, b) => a.label.localeCompare(b.label)), [catalog]);

  useEffect(() => { if (!dependencyTarget || !catalog.has(dependencyTarget)) { const preferred = searchableEntities.find((item) => item.kind === "cluster") ?? searchableEntities[0]; setDependencyTarget(preferred?.id ?? null); setDependencyQuery(preferred?.label ?? ""); } }, [catalog, dependencyTarget, searchableEntities]);

  const expandedRelations = useMemo(() => {
    const result = [...projectRelations];
    for (const relation of projectRelations) {
      const sourceGroup = projectGroups.find((group) => group.id === relation.sourceEntityId);
      if (sourceGroup) for (const asset of groupAssets(sourceGroup, projectAssets).filter((item) => item.role === "AP" || item.assetType === "K8S_WORKLOAD")) result.push({ ...relation, id: `${relation.id}:member:${asset.id}`, sourceEntityType: "ASSET", sourceEntityId: asset.id });
    }
    return result;
  }, [projectRelations, projectGroups, projectAssets]);

  const dependencyGraph = useMemo(() => dependencyTarget ? traverseDependencies(dependencyTarget, expandedRelations, dependencyMode, dependencyDepth, relationFilters) : { visits: [], relations: [] }, [dependencyTarget, expandedRelations, dependencyMode, dependencyDepth, relationFilters]);

  const semanticGraph = useMemo(() => {
    if (mode === "dependency") {
      const visits = dependencyGraph.visits.filter((visit) => catalog.has(visit.id));
      const visible = new Set(visits.map((visit) => visit.id));
      const nodes = visits.map((visit) => entityNode(catalog.get(visit.id)!, projectAssets, dependencyTarget ?? undefined, visit.side, visit.depth));
      const edges = dependencyGraph.relations.filter((relation) => visible.has(relation.sourceEntityId) && visible.has(relation.targetEntityId)).map((relation) => makeEdge(relation, relation.sourceEntityId, relation.targetEntityId, flowAnimation, showLabels));
      return { nodes, edges };
    }
    const entities = overviewEntities(scopeId, projectGroups, projectAssets, projectClusters, projectNas);
    const visible = new Set(entities.map((item) => item.id));
    const nodes = entities.map((item) => {
      const node = entityNode(catalog.get(item.id)!, projectAssets);
      if (node.data.kind === "group") node.data.onDrillDown = () => {
        if (groupClickTimer.current) clearTimeout(groupClickTimer.current);
        setSelectedGroup(null);
        setScopeId(item.id);
      };
      return node;
    });
    const edgeMap = new Map<string, Edge<TopologyEdgeData>>();
    for (const relation of projectRelations) {
      if (relationFilters[relation.relationType] === false) continue;
      let sources = [nearestVisibleEntity(relation.sourceEntityId, visible, catalog, projectGroups)].filter(Boolean) as string[];
      const targets = [nearestVisibleEntity(relation.targetEntityId, visible, catalog, projectGroups)].filter(Boolean) as string[];
      if (scopeId && relation.sourceEntityId === scopeId) sources = nodes.filter((node) => node.data.vm?.role === "AP" || node.data.vm?.assetType === "K8S_WORKLOAD").map((node) => node.id);
      for (const source of sources) for (const target of targets) if (source !== target) {
        const key = `${source}:${target}:${relation.relationType}`;
        if (!edgeMap.has(key)) edgeMap.set(key, makeEdge({ ...relation, id: key }, source, target, flowAnimation, showLabels));
      }
    }
    for (const status of projectStatuses) {
      if (visible.has(status.policy.sourceVmId) && status.policy.targetVmId && visible.has(status.policy.targetVmId)) {
        const relation: ArchitectureRelation = { id: status.policy.id, projectGroupId: activeProject.id, sourceEntityType: "ASSET", sourceEntityId: status.policy.sourceVmId, targetEntityType: "ASSET", targetEntityId: status.policy.targetVmId, relationType: "SERVICE", protocol: status.policy.protocol, port: status.policy.port };
        const edge = makeEdge(relation, relation.sourceEntityId, relation.targetEntityId, flowAnimation, showLabels);
        edge.data = { ...edge.data!, status, relatedStatuses: [status], issueCount: status.overall === "NORMAL" ? 0 : 1, secondary: overlay === "policy" ? status.policy.approvalStatus : `TCP ${status.observation?.tcp ?? "NO_DATA"}` };
        edgeMap.set(edge.id, edge);
      }
    }
    const filteredNodes = nodes.filter((node) => (!issuesOnly || (node.data.issueCount ?? (node.data.vm?.health === "healthy" ? 0 : 1)) > 0) && (!query.trim() || `${node.data.label} ${node.data.vm?.ipAddress ?? ""}`.toLowerCase().includes(query.toLowerCase())));
    const ids = new Set(filteredNodes.map((node) => node.id));
    return { nodes: filteredNodes, edges: [...edgeMap.values()].filter((edge) => ids.has(edge.source) && ids.has(edge.target)) };
  }, [mode, dependencyGraph, catalog, projectAssets, dependencyTarget, scopeId, projectGroups, projectClusters, projectNas, projectRelations, relationFilters, projectStatuses, flowAnimation, showLabels, overlay, issuesOnly, query, activeProject.id]);

  const scopeKey = mode === "overview" ? scopeId ?? "root" : `${dependencyTarget ?? "none"}:${dependencyMode}:${dependencyDepth}`;
  const storageKey = `rpa-topology-layout:v4:${activeProject.id}:${mode}:${scopeKey}`;
  useEffect(() => { try { setManualPositions(JSON.parse(localStorage.getItem(storageKey) ?? "{}")); } catch { setManualPositions({}); } }, [storageKey]);
  useEffect(() => { try { setEdgeHandles(JSON.parse(localStorage.getItem(`rpa-topology-handles:v2:${activeProject.id}`) ?? "{}")); } catch { setEdgeHandles({}); } }, [activeProject.id]);

  useEffect(() => {
    let cancelled = false; setIsLayouting(true);
    elkLayoutEngine.layout({ nodes: semanticGraph.nodes, edges: semanticGraph.edges, direction: mode === "dependency" ? "RIGHT" : "DOWN", scopeId: `${scopeKey}:${layoutRevision}` }).then((result) => {
      if (cancelled) return;
      setLiveNodes(result.nodes.map((node) => ({ ...node, position: manualPositions[node.id] ?? node.position, data: { ...node.data, isEditing: layoutEdit } })));
      setLiveEdges(result.edges); setIsLayouting(false);
      requestAnimationFrame(() => requestAnimationFrame(() => flowInstance.current?.fitView({ padding: mode === "dependency" ? 0.24 : 0.18 })));
    });
    return () => { cancelled = true; };
  }, [semanticGraph, mode, scopeKey, layoutRevision, manualPositions, layoutEdit]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setLiveNodes((nodes) => applyNodeChanges(changes, nodes) as Node<TopologyNodeData>[]), []);
  const savePosition = (node: Node) => { const position = { x: Math.round(node.position.x / 20) * 20, y: Math.round(node.position.y / 20) * 20 }; setManualPositions((current) => { const next = { ...current, [node.id]: position }; localStorage.setItem(storageKey, JSON.stringify(next)); return next; }); };
  const autoLayout = () => { localStorage.removeItem(storageKey); setManualPositions({}); setLayoutRevision((value) => value + 1); };
  const updateHandles = (id: string, value: { source?: HandleDirection; target?: HandleDirection }) => setEdgeHandles((current) => { const next = { ...current, [id]: value }; localStorage.setItem(`rpa-topology-handles:v2:${activeProject.id}`, JSON.stringify(next)); return next; });
  const resolvedEdges = useMemo(() => liveEdges.map((edge) => ({ ...edge, sourceHandle: `${edgeHandles[edge.id]?.source ?? (mode === "dependency" ? "r" : "b")}-src`, targetHandle: `${edgeHandles[edge.id]?.target ?? (mode === "dependency" ? "l" : "t")}-tgt`, data: { ...edge.data!, showLabel: showLabels, flowActive: flowAnimation } })), [liveEdges, edgeHandles, mode, showLabels, flowAnimation]);

  const selectEntity = (id: string, dependencyDrawer = false) => {
    const entity = catalog.get(id); if (!entity) return; setSelectedEntityId(id);
    if (dependencyDrawer) { setDependencyDrawerEntity(entity); return; }
    if (entity.asset) setSelectedVm(entity.asset); else if (entity.cluster) setSelectedCluster(entity.cluster); else if (entity.nas) setSelectedNas(entity.nas); else if (entity.group) { const members = groupAssets(entity.group, projectAssets); setSelectedGroup({ groupName: entity.label, groupType: entity.group.groupType, environment: entity.group.environment, domain: entity.group.domain, system: entity.group.system, description: entity.group.description, assets: members, statuses: projectStatuses.filter((status) => members.some((asset) => asset.id === status.policy.sourceVmId || asset.id === status.policy.targetVmId)), software, sops }); }
  };
  const handleNodeClick = (id: string) => {
    const entity = catalog.get(id);
    if (mode === "overview" && entity?.group) {
      setSelectedEntityId(id);
      if (groupClickTimer.current) clearTimeout(groupClickTimer.current);
      groupClickTimer.current = setTimeout(() => selectEntity(id), 240);
      return;
    }
    selectEntity(id, mode === "dependency");
  };
  const handleNodeDoubleClick = (id: string) => {
    if (groupClickTimer.current) clearTimeout(groupClickTimer.current);
    if (mode === "overview" && catalog.get(id)?.group) {
      setSelectedGroup(null);
      setScopeId(id);
    }
  };
  const openDependency = (id: string) => { const entity = catalog.get(id); setDependencyTarget(id); setDependencyQuery(entity?.label ?? id); setMode("dependency"); setSelectedGroup(null); setSelectedVm(null); setSelectedCluster(null); setSelectedNas(null); };
  const chooseDependencyQuery = (value: string) => { setDependencyQuery(value); const q = value.trim().toLowerCase(); const hit = searchableEntities.find((item) => item.id === value || item.label.toLowerCase() === q) ?? searchableEntities.find((item) => item.aliases.some((alias) => alias.toLowerCase().includes(q))); if (hit) setDependencyTarget(hit.id); };
  const crumbs = breadcrumbFor(scopeId, projectGroups);
  const impactedIds = dependencyGraph.visits.filter((visit) => visit.side === "impact").map((visit) => visit.id);
  const impactedAssets = [...new Map(impactedIds.flatMap((id) => { const entity = catalog.get(id); return entity?.asset ? [entity.asset] : entity?.group ? groupAssets(entity.group, projectAssets) : entity?.cluster ? entity.cluster.members.map((member) => projectAssets.find((asset) => asset.id === member.assetId)).filter(Boolean) as Asset[] : []; }).map((asset) => [asset.id, asset])).values()];
  const impactSummary = { direct: dependencyGraph.visits.filter((visit) => visit.side === "impact" && visit.depth === 1).length, total: new Set(impactedIds).size, critical: impactedAssets.filter((asset) => asset.criticality === "CRITICAL").length, systems: new Set(impactedAssets.map((asset) => asset.system).filter(Boolean)).size, policies: projectStatuses.filter((status) => impactedAssets.some((asset) => asset.id === status.policy.sourceVmId || asset.id === status.policy.targetVmId)).length, failed: projectStatuses.filter((status) => status.overall !== "NORMAL" && impactedAssets.some((asset) => asset.id === status.policy.sourceVmId || asset.id === status.policy.targetVmId)).length, sops: sops.filter((sop) => sop.relatedVmIds.some((id) => impactedAssets.some((asset) => asset.id === id))).length, eosl: software.filter((item) => impactedAssets.some((asset) => asset.id === item.vmId) && item.eoslDate && new Date(item.eoslDate).getTime() < Date.now()).length };

  const onConnect = async (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const source = catalog.get(connection.source); const target = catalog.get(connection.target); if (!source || !target) return;
    const relation: ArchitectureRelation = { id: `rel-${Date.now().toString(36)}`, projectGroupId: activeProject.id, sourceEntityType: source.kind === "group" ? "TOPOLOGY_GROUP" : source.kind === "cluster" ? "CLUSTER" : "ASSET", sourceEntityId: source.id, targetEntityType: target.kind === "group" ? "TOPOLOGY_GROUP" : target.kind === "cluster" ? "CLUSTER" : target.kind === "nas" ? "NAS" : "ASSET", targetEntityId: target.id, relationType: target.kind === "cluster" || target.kind === "dbaas" ? "DATABASE" : target.kind === "nas" ? "STORAGE" : "SERVICE", protocol: target.kind === "nas" ? "NFS" : "TCP", port: target.kind === "cluster" ? 1433 : target.kind === "nas" ? 2049 : 8080 };
    await managementRepo.createRelation(relation); setCurrentRelations((items) => [relation, ...items]); updateHandles(relation.id, { source: (connection.sourceHandle?.replace("-src", "") as HandleDirection) ?? "r", target: (connection.targetHandle?.replace("-tgt", "") as HandleDirection) ?? "l" });
  };

  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-[10px]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5">{(["overview", "dependency"] as ViewMode[]).map((view) => <button key={view} type="button" onClick={() => setMode(view)} className={`h-6 rounded px-2.5 text-[9px] font-semibold ${mode === view ? "bg-[var(--surface)] shadow-sm" : "text-[var(--muted)]"}`}>{view === "overview" ? "Overview" : "Dependency"}</button>)}</div>
        {mode === "overview" ? <><label className="flex items-center gap-1 text-[var(--muted)]">Project <span className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[var(--foreground)]">{activeProject.name}</span></label><label className="flex items-center gap-1 text-[var(--muted)]">Environment <select value={environment} onChange={(event) => { setEnvironment(event.target.value); setScopeId(null); }} className="h-7 rounded border border-[var(--border)] bg-[var(--surface)] px-2"><option>ALL</option><option>PROD</option><option>QA</option><option>DEV</option></select></label></> : <><label className="flex items-center gap-1 text-[var(--muted)]">Target <span className="flex h-7 w-56 items-center gap-1 rounded border border-[var(--border)] px-2"><SearchIcon className="h-3 w-3" /><input list="dependency-targets" value={dependencyQuery} onChange={(event) => chooseDependencyQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Search asset / cluster / group..." /><datalist id="dependency-targets">{searchableEntities.map((item) => <option key={item.id} value={item.label}>{item.id}</option>)}</datalist></span></label><Segment values={["impact", "dependencies", "both"]} value={dependencyMode} onChange={(value) => setDependencyMode(value as DependencyMode)} /><Segment values={["1", "2", "3", "all"]} value={String(dependencyDepth)} onChange={(value) => setDependencyDepth(value === "all" ? "all" : Number(value) as 1 | 2 | 3)} /></>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5"><button type="button" onClick={() => setOverlay((value) => value === "policy" ? "live" : "policy")} className="h-7 rounded border border-[var(--border)] px-2">{overlay === "policy" ? "Policy" : "Actual"}</button><Toggle label="Flow" active={flowAnimation} onClick={() => setFlowAnimation((v) => !v)} /><Toggle label="Labels" active={showLabels} onClick={() => setShowLabels((v) => !v)} /><Toggle label="Edit Layout" active={layoutEdit} onClick={() => setLayoutEdit((v) => !v)} /><button type="button" onClick={autoLayout} className="h-7 rounded border border-[var(--border)] px-2">Auto Layout</button>{selectedEntityId && <button type="button" onClick={() => openDependency(selectedEntityId)} className="h-7 rounded border border-[#5750f1]/40 px-2 text-[#5750f1]">View Dependency</button>}</div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[9px]"><div className="flex flex-wrap gap-1">{(Object.keys(relationFilters) as RelationType[]).map((type) => <label key={type} className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5"><input type="checkbox" checked={relationFilters[type]} onChange={(event) => setRelationFilters((current) => ({ ...current, [type]: event.target.checked }))} className="h-3 w-3 accent-[#5750f1]" />{type}</label>)}</div>{mode === "overview" && <div className="flex items-center gap-2"><button type="button" onClick={() => setScopeId(null)} className="text-[var(--muted)] hover:text-[#5750f1]">{activeProject.name}</button>{crumbs.map((group) => <span key={group.id} className="flex items-center gap-2"><span>›</span><button type="button" onClick={() => setScopeId(group.id)} className="font-semibold hover:text-[#5750f1]">{group.name}</button></span>)}{scopeId && <button type="button" onClick={() => setScopeId(crumbs.at(-2)?.id ?? null)} className="rounded border border-[var(--border)] px-2 py-0.5">Back</button>}<span className="flex h-6 w-44 items-center gap-1 rounded border border-[var(--border)] px-2"><SearchIcon className="h-3 w-3" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="hostname / IP" /></span><label className="flex items-center gap-1"><input type="checkbox" checked={issuesOnly} onChange={(event) => setIssuesOnly(event.target.checked)} />Issues only</label></div>}</div>
    {mode === "dependency" && <ImpactSummary values={impactSummary} />}
    <div className="relative h-[calc(100vh-260px)] min-h-[510px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      {isLayouting && <div className="absolute right-3 top-3 z-30 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[9px] text-[var(--muted)] shadow">Calculating layout...</div>}
      <ReactFlow key={`${mode}:${scopeKey}:${layoutRevision}`} nodes={liveNodes} edges={resolvedEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={{ padding: mode === "dependency" ? 0.24 : 0.18 }} minZoom={0.2} maxZoom={1.6} nodesDraggable={layoutEdit} nodesConnectable={layoutEdit} connectionMode={ConnectionMode.Loose} connectionLineType={ConnectionLineType.SmoothStep} snapToGrid snapGrid={[20, 20]} onInit={(instance) => { flowInstance.current = instance as unknown as typeof flowInstance.current; }} onNodesChange={onNodesChange} onNodeDragStop={(_, node) => savePosition(node)} onConnect={onConnect} onNodeClick={(event, node) => { if (event.detail === 2) handleNodeDoubleClick(node.id); else handleNodeClick(node.id); }} onNodeDoubleClick={(_, node) => handleNodeDoubleClick(node.id)} onEdgeClick={(_, edge) => { const status = edge.data?.status as NetworkStatus | undefined; if (status) { setSelectedEdgeId(edge.id); setSelectedConnection(status); } }}>
        <Background gap={20} size={1} color="var(--border)" /><Controls showInteractive={false} /><MiniMap pannable zoomable className="!border-[var(--border)] !bg-[var(--surface)]" nodeColor={(node) => node.data.selectedTarget ? "#5750f1" : node.type === "cluster" ? "#a855f7" : node.type === "nas" ? "#0ea5e9" : "#98a2b3"} />
      </ReactFlow>
      {!isLayouting && liveNodes.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--muted)]">현재 범위와 필터에 표시할 관계가 없습니다.</div>}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-1 text-[8px] text-[var(--muted)] shadow">Policy (Should Be) · Actual (TCP Probe) · double-click Group to drill down · 20px Grid Snap</div>
    </div>
    <GroupDrawer data={selectedGroup} open={!!selectedGroup} onClose={() => setSelectedGroup(null)} onSelectAsset={(asset) => setSelectedVm(asset)} onDrillDown={() => { if (selectedEntityId) setScopeId(selectedEntityId); setSelectedGroup(null); }} />
    <VmDrawer vm={selectedVm} network={projectStatuses} software={software} sops={sops} open={!!selectedVm} onClose={() => setSelectedVm(null)} onSelectSoftware={(item) => { const release = matchLegacySoftwareRelease(item, softwareProducts, softwareReleases); if (release) setSelectedRelease(release); }} />
    <ConnectionDrawer sourceHandle={edgeHandles[selectedEdgeId ?? ""]?.source} targetHandle={edgeHandles[selectedEdgeId ?? ""]?.target} onUpdateHandles={(value) => selectedEdgeId && updateHandles(selectedEdgeId, value)} status={selectedConnection} relatedStatuses={selectedConnection ? [selectedConnection] : []} open={!!selectedConnection} onClose={() => setSelectedConnection(null)} />
    <ClusterDrawer cluster={selectedCluster} open={!!selectedCluster} onClose={() => setSelectedCluster(null)} /><NasDrawer nas={selectedNas} open={!!selectedNas} onClose={() => setSelectedNas(null)} onSelectVm={(hostname) => setSelectedVm(projectAssets.find((item) => item.hostname === hostname) ?? null)} /><SoftwareDetailDrawer release={selectedRelease} open={!!selectedRelease} onClose={() => setSelectedRelease(null)} />
    <DependencyDrawer entity={dependencyDrawerEntity} open={!!dependencyDrawerEntity} onClose={() => setDependencyDrawerEntity(null)} visits={dependencyGraph.visits} catalog={catalog} statuses={projectStatuses} software={software} sops={sops} assets={projectAssets} />
  </div>;
}

function Segment({ values, value, onChange }: { values: string[]; value: string; onChange: (value: string) => void }) { return <div className="flex rounded border border-[var(--border)] bg-[var(--surface-2)] p-0.5">{values.map((item) => <button type="button" key={item} onClick={() => onChange(item)} className={`h-6 rounded px-2 text-[8px] capitalize ${value === item ? "bg-[var(--surface)] font-semibold shadow-sm" : "text-[var(--muted)]"}`}>{item}</button>)}</div>; }
function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) { return <button type="button" aria-pressed={active} onClick={onClick} className={`h-7 rounded border px-2 ${active ? "border-[#5750f1] bg-[#5750f1]/10 text-[#5750f1]" : "border-[var(--border)] text-[var(--muted)]"}`}>{label}</button>; }
function ImpactSummary({ values }: { values: Record<string, number> }) { const labels: Record<string, string> = { direct: "Direct dependents", total: "Total impacted", critical: "Critical assets", systems: "Systems affected", policies: "Related policies", failed: "Failed actual links", sops: "Related SOP", eosl: "EOSL risk" }; return <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] sm:grid-cols-8">{Object.entries(values).map(([key, value]) => <div key={key} className="bg-[var(--surface)] px-2 py-1.5"><div className="text-[8px] text-[var(--muted)]">{labels[key]}</div><div className="text-[13px] font-semibold tabular-nums">{value}</div></div>)}</div>; }

function DependencyDrawer({ entity, open, onClose, visits, catalog, statuses, software, sops, assets }: { entity: SemanticEntity | null; open: boolean; onClose: () => void; visits: Array<{ id: string; side: string; depth: number }>; catalog: Map<string, SemanticEntity>; statuses: NetworkStatus[]; software: SoftwareInstall[]; sops: SopDocument[]; assets: Asset[] }) {
  const [tab, setTab] = useState("Overview"); if (!entity) return null;
  const ids = new Set([entity.id, ...(entity.group ? groupAssets(entity.group, assets).map((asset) => asset.id) : []), ...(entity.cluster ? entity.cluster.members.map((member) => member.assetId) : [])]);
  const relatedStatuses = statuses.filter((status) => ids.has(status.policy.sourceVmId) || (!!status.policy.targetVmId && ids.has(status.policy.targetVmId)));
  const relatedSoftware = software.filter((item) => ids.has(item.vmId));
  const relatedSops = sops.filter((item) => item.relatedVmIds.some((id) => ids.has(id)));
  return <SlideDrawer open={open} onClose={onClose} title={entity.label} subtitle={`${entity.kind.toUpperCase()} · Dependency context`} width={460}><div className="border-b border-[var(--border)] px-3 pt-2"><div className="flex gap-1">{["Overview", "Impact", "Network", "Software", "SOP"].map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`border-b-2 px-2 py-2 text-[9px] ${tab === item ? "border-[#5750f1] font-semibold text-[#5750f1]" : "border-transparent text-[var(--muted)]"}`}>{item}</button>)}</div></div><div className="space-y-2 p-4 text-[10px]">{tab === "Overview" && <><KV k="Entity ID" v={entity.id} /><KV k="Type" v={entity.kind.toUpperCase()} /><KV k="Aliases" v={entity.aliases.join(", ") || "-"} /></>}{tab === "Impact" && visits.filter((visit) => visit.id !== entity.id).map((visit) => <div key={`${visit.side}:${visit.id}`} className="flex justify-between rounded border border-[var(--border)] p-2"><span>{catalog.get(visit.id)?.label ?? visit.id}</span><span className="text-[var(--muted)]">{visit.side.toUpperCase()} · DEPTH {visit.depth}</span></div>)}{tab === "Network" && relatedStatuses.map((status) => <div key={status.policy.id} className="rounded border border-[var(--border)] p-2"><div>{status.policy.sourceName} → {status.policy.targetName}</div><div className="text-[var(--muted)]">{status.policy.protocol}/{status.policy.port} · {status.policy.approvalStatus} · TCP {status.observation?.tcp ?? "NO_DATA"} · {status.overall}</div></div>)}{tab === "Software" && relatedSoftware.map((item) => <div key={item.id} className="flex justify-between rounded border border-[var(--border)] p-2"><span>{item.name} {item.version}</span><span className="font-mono text-[var(--muted)]">EOSL {item.eoslDate ?? "UNKNOWN"}</span></div>)}{tab === "SOP" && relatedSops.map((item) => <a key={item.id} href={item.url ?? "#"} className="block rounded border border-[var(--border)] p-2 hover:bg-[var(--surface-2)]"><div className="font-semibold">{item.title}</div><div className="text-[var(--muted)]">{item.category} · {item.owner}</div></a>)}{((tab === "Network" && !relatedStatuses.length) || (tab === "Software" && !relatedSoftware.length) || (tab === "SOP" && !relatedSops.length)) && <div className="rounded border border-dashed border-[var(--border)] p-3 text-center text-[var(--muted)]">관련 데이터가 없습니다.</div>}</div></SlideDrawer>;
}
function KV({ k, v }: { k: string; v: React.ReactNode }) { return <div className="flex min-h-8 items-center border-b border-[var(--border)]"><span className="w-28 text-[var(--muted)]">{k}</span><span className="font-medium">{v}</span></div>; }
