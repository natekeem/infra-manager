"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MiniMap,
  MarkerType,
  Position,
  ReactFlow,
  applyNodeChanges,
  getBezierPath,
  getSmoothStepPath,
  ConnectionMode,
  ConnectionLineType,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import type {
  ArchitectureRelation,
  Asset,
  ClusterEntity,
  NasAsset,
  NetworkStatus,
  RelationType,
  SoftwareInstall,
  SoftwareProduct,
  SoftwareRelease,
  SopDocument,
  TopologyGroup,
} from "@/domain/models";
import { managementRepo } from "@/services/management/mock-repository";
import { VmDrawer } from "@/components/infrastructure/vm-drawer";
import { ConnectionDrawer } from "@/components/network/connection-drawer";
import { ClusterDrawer } from "@/components/cluster/cluster-drawer";
import { NasDrawer } from "@/components/storage/nas-drawer";
import { GroupDrawer, type GroupDrawerData } from "@/components/topology/group-drawer";
import { SoftwareDetailDrawer } from "@/components/software/software-detail-drawer";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { SearchIcon } from "@/components/common/icons";
import { matchLegacySoftwareRelease } from "@/domain/software-lifecycle";
import { useProjectGroup } from "@/context/project-group-context";

type ViewMode = "overview" | "asset";

type OverlayMode = "policy" | "live";

export type TopologyNodeData = {
  kind: "group" | "vm" | "external" | "cluster" | "nas";
  key: string;
  label: string;
  sublabel?: string;
  isEditing?: boolean;
  count?: number;
  healthyCount?: number;
  warningCount?: number;
  criticalCount?: number;
  connectionsCount?: number;
  issueCount?: number;
  apCount?: number;
  dbCount?: number;
  nasCount?: number;
  k8sCount?: number;
  environment?: string;
  domain?: string;
  system?: string;
  groupType?: string;
  description?: string;
  vm?: Asset;
  cluster?: ClusterEntity;
  nas?: NasAsset;
};

export type TopologyEdgeData = {
  label: string;
  secondary: string;
  issueCount: number;
  status?: NetworkStatus;
  relatedStatuses?: NetworkStatus[];
  flowActive?: boolean;
  showLabel?: boolean;
  onSelect?: () => void;
  edgeIndex?: number;
  totalEdges?: number;
  lineStyle?: "bezier" | "smoothstep";
  relationType?: RelationType;
};

function statusColor(issueCount: number, status?: NetworkStatus) {
  if (status?.overall === "RETURN_DIRECTION_FAILED") return "#d92d20";
  if (status?.overall?.includes("UNREACHABLE") || status?.overall === "UNREACHABLE") return "#f04438";
  if (status?.overall === "EXPIRING" || status?.overall?.includes("EXPIRED")) return "#f79009";
  return issueCount > 0 ? "#f79009" : "#98a2b3";
}

export type HandleDirection = "t" | "b" | "l" | "r";

function NodeHandles({ isEditing = false }: { isEditing?: boolean }) {
  const baseClasses = isEditing
    ? "!w-3 !h-3 !rounded-full !bg-[#5750f1] !border-2 !border-white shadow-md hover:!scale-150 transition-all cursor-crosshair z-30 ring-2 ring-[#5750f1]/40"
    : "!w-1.5 !h-1.5 !rounded-full !border-0 opacity-0 group-hover:opacity-40 transition-opacity !bg-[#98a2b3]";

  return (
    <>
      <Handle
        id="t"
        type="source"
        position={Position.Top}
        isConnectable={isEditing}
        isConnectableStart={isEditing}
        isConnectableEnd={isEditing}
        className={baseClasses}
        title={isEditing ? "상단 연결점 (끌어서 다른 노드로 연결)" : undefined}
      />
      <Handle
        id="b"
        type="source"
        position={Position.Bottom}
        isConnectable={isEditing}
        isConnectableStart={isEditing}
        isConnectableEnd={isEditing}
        className={baseClasses}
        title={isEditing ? "하단 연결점 (끌어서 다른 노드로 연결)" : undefined}
      />
      <Handle
        id="l"
        type="source"
        position={Position.Left}
        isConnectable={isEditing}
        isConnectableStart={isEditing}
        isConnectableEnd={isEditing}
        className={baseClasses}
        title={isEditing ? "좌측 연결점 (끌어서 다른 노드로 연결)" : undefined}
      />
      <Handle
        id="r"
        type="source"
        position={Position.Right}
        isConnectable={isEditing}
        isConnectableStart={isEditing}
        isConnectableEnd={isEditing}
        className={baseClasses}
        title={isEditing ? "우측 연결점 (끌어서 다른 노드로 연결)" : undefined}
      />
    </>
  );
}

// Compact Group Card
function GroupNode({ data, selected }: NodeProps<Node<TopologyNodeData>>) {
  const isExternal = data.kind === "external";
  return (
    <div
      className={`relative group min-h-[120px] w-[220px] rounded-md border bg-[var(--surface)] p-2.5 shadow-sm transition flex flex-col justify-between ${
        selected ? "border-[#5750f1] ring-1 ring-[#5750f1]/20" : "border-[var(--border-strong)]"
      }`}
    >
      <NodeHandles isEditing={data.isEditing} />

      {/* Row 1: Group Name & Issue Dot */}
      <div className="flex items-center justify-between gap-1 border-b border-[var(--border)] pb-1.5">
        <div className="truncate">
          <div className="truncate text-[11px] font-bold tracking-tight text-[var(--foreground)]">{data.label}</div>
          {data.sublabel && <div className="text-[8px] text-[var(--muted)]">{data.sublabel}</div>}
        </div>
        {data.issueCount ? (
          <span className="rounded bg-[var(--danger-soft)] px-1.5 py-0.5 text-[8px] font-semibold text-[#b42318]">
            {data.issueCount} issue
          </span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />
        )}
      </div>

      {/* Row 2: Breakdown Counters (AP, DB, NAS, K8s) */}
      {!isExternal ? (
        <div className="my-1.5 grid grid-cols-3 gap-1 text-center text-[8px]">
          {data.apCount !== undefined && data.apCount > 0 && (
            <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-1">
              <div className="text-[7px] text-[var(--muted)]">AP</div>
              <div className="font-bold text-[10px] text-[var(--foreground)]">{data.apCount}</div>
            </div>
          )}
          {data.dbCount !== undefined && data.dbCount > 0 && (
            <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-1">
              <div className="text-[7px] text-[var(--muted)]">DB</div>
              <div className="font-bold text-[10px] text-[var(--foreground)]">{data.dbCount}</div>
            </div>
          )}
          {data.nasCount !== undefined && data.nasCount > 0 && (
            <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-1">
              <div className="text-[7px] text-[var(--muted)]">NAS</div>
              <div className="font-bold text-[10px] text-[var(--foreground)]">{data.nasCount}</div>
            </div>
          )}
          {data.k8sCount !== undefined && data.k8sCount > 0 && (
            <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-1 col-span-2">
              <div className="text-[7px] text-[var(--muted)]">K8s Workloads</div>
              <div className="font-bold text-[10px] text-[var(--foreground)]">{data.k8sCount} pods</div>
            </div>
          )}
          {!data.apCount && !data.dbCount && !data.nasCount && !data.k8sCount && (
            <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-1 col-span-3">
              <div className="text-[7px] text-[var(--muted)]">Total Assets</div>
              <div className="font-bold text-[10px] text-[var(--foreground)]">{data.count ?? 0}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="my-2 text-[10px] text-[var(--muted)]">
          {data.count ?? 1} External Dependencies
        </div>
      )}

      {/* Row 3: Health & Actions */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-1 text-[8.5px]">
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{data.healthyCount ?? data.count ?? 0} OK</span>
          {(data.warningCount ?? 0) > 0 && (
            <span className="text-amber-600 font-medium">{data.warningCount} W</span>
          )}
        </div>
        <span className="text-[7.5px] text-[var(--muted)] hover:text-[#5750f1]">
          클릭: 정보 · 더블클릭: 상세 →
        </span>
      </div>
    </div>
  );
}

// Compute / VM / Workload Node
function VmNode({ data, selected }: NodeProps<Node<TopologyNodeData>>) {
  const vm = data.vm!;
  const isK8s = vm.assetType === "K8S_WORKLOAD";
  const isDbaas = vm.assetType === "DBAAS";

  return (
    <div
      className={`relative group w-[230px] h-[125px] rounded-md border bg-[var(--surface)] p-2.5 shadow-sm transition flex flex-col justify-between ${
        selected ? "border-[#5750f1] ring-1 ring-[#5750f1]/20" : "border-[var(--border)]"
      }`}
    >
      <NodeHandles isEditing={data.isEditing} />

      {/* Row 1: Hostname + Health dot */}
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-semibold text-[var(--foreground)]" title={vm.hostname}>
          {vm.hostname}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-[var(--surface-2)] px-1 py-0.5 font-mono text-[8px] text-[var(--muted)]">
            {isK8s ? "K8S" : isDbaas ? "DBAAS" : vm.role}
          </span>
          <span
            className={`h-2 w-2 rounded-full ${
              vm.health === "healthy" ? "bg-[#12b76a]" : vm.health === "critical" ? "bg-[#f04438]" : "bg-[#f79009]"
            }`}
          />
        </div>
      </div>

      {/* Row 2: IP + Env / Zone */}
      <div className="flex items-center justify-between text-[9px] text-[var(--muted)]">
        <span className="font-mono text-[var(--foreground)]">{vm.ipAddress}</span>
        <div className="flex items-center gap-1 font-mono text-[8px]">
          <span className="rounded border border-[var(--border)] px-1 py-0.2">{vm.environment}</span>
          {vm.domain && <span className="rounded bg-[var(--surface-2)] px-1 py-0.2">{vm.domain}</span>}
        </div>
      </div>

      {/* Row 3: Compact Metrics */}
      <div className="grid grid-cols-3 gap-1 text-center text-[8px]">
        <Metric k="CPU" v={vm.cpuPct} />
        <Metric k="MEM" v={vm.memoryPct} />
        <Metric k="DISK" v={vm.diskPct} />
      </div>

      {/* Row 4: OS Summary */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-1 text-[8px] text-[var(--muted-2)]">
        <span className="truncate">{vm.osName || vm.assetType || "Compute Node"}</span>
        <span className="font-mono text-[7.5px]">{vm.service}</span>
      </div>
    </div>
  );
}

function ClusterNode({ data, selected }: NodeProps<Node<TopologyNodeData>>) {
  const cluster = data.cluster!;
  return (
    <div
      className={`relative group w-[230px] h-[135px] rounded-md border bg-[var(--surface)] p-2.5 shadow-sm transition flex flex-col justify-between border-purple-500/40 ${
        selected ? "border-purple-600 ring-1 ring-purple-500/20" : ""
      }`}
    >
      <NodeHandles isEditing={data.isEditing} />

      {/* Row 1: Cluster Name + Type Badge */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-purple-500/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-purple-600 dark:text-purple-400">
            {cluster.type}
          </span>
          <span className="truncate text-[11px] font-bold text-[var(--foreground)]" title={cluster.name}>
            {cluster.name}
          </span>
        </div>
        <span className="h-2 w-2 rounded-full bg-[#12b76a]" />
      </div>

      {/* Row 2: Virtual IP */}
      <div className="flex items-center justify-between text-[9px]">
        <span className="text-[var(--muted)]">VIP:</span>
        <span className="font-mono font-bold text-[#5750f1]">{cluster.vip}</span>
        <span className="rounded bg-[var(--surface-2)] px-1 py-0.2 font-mono text-[8px] text-[var(--muted)]">
          {cluster.domain || cluster.environment}
        </span>
      </div>

      {/* Row 3: Cluster Members */}
      <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-1 text-[8px]">
        <div className="flex justify-between text-[var(--muted)] mb-0.5">
          <span>Active / Passive Nodes:</span>
          <span>{cluster.members.length} nodes</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {cluster.members.map((m) => (
            <span
              key={m.assetId}
              className={`rounded px-1 py-0.5 font-mono font-medium ${
                m.role === "ACTIVE"
                  ? "bg-purple-600/15 text-purple-700 dark:text-purple-300"
                  : "bg-[var(--surface-3)] text-[var(--muted)]"
              }`}
            >
              {m.hostname} ({m.role.slice(0, 1)})
            </span>
          ))}
        </div>
      </div>

      {/* Row 4: Clustered Service */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-1 text-[8px] text-[var(--muted-2)]">
        <span>HA Database Cluster</span>
        <span className="font-mono text-[7.5px]">Port 1433</span>
      </div>
    </div>
  );
}

function NasNode({ data, selected }: NodeProps<Node<TopologyNodeData>>) {
  const nas = data.nas!;
  const usedPct = nas.capacityTb > 0 ? Math.round((nas.usedCapacityTb / nas.capacityTb) * 100) : 0;

  return (
    <div
      className={`relative group w-[220px] h-[120px] rounded-md border bg-[var(--surface)] p-2.5 shadow-sm transition flex flex-col justify-between border-cyan-500/40 ${
        selected ? "border-cyan-600 ring-1 ring-cyan-500/20" : ""
      }`}
    >
      <NodeHandles isEditing={data.isEditing} />

      {/* Row 1: Hostname + Protocol */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[8px] font-bold text-cyan-700 dark:text-cyan-300">
            NAS
          </span>
          <span className="truncate text-[11px] font-semibold text-[var(--foreground)]" title={nas.hostname}>
            {nas.hostname}
          </span>
        </div>
        <span className="h-2 w-2 rounded-full bg-[#12b76a]" />
      </div>

      {/* Row 2: IP + Protocol */}
      <div className="flex items-center justify-between text-[9px] text-[var(--muted)]">
        <span className="font-mono text-[var(--foreground)]">{nas.ipAddress}</span>
        <span className="rounded border border-[var(--border)] px-1 py-0.2 font-mono text-[8px]">{nas.protocol}</span>
      </div>

      {/* Row 3: Capacity Bar */}
      <div className="space-y-1 text-[8px]">
        <div className="flex justify-between text-[var(--muted)]">
          <span>Capacity:</span>
          <span className="font-mono">{nas.usedCapacityTb} / {nas.capacityTb} TB ({usedPct}%)</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded bg-[var(--surface-3)]">
          <div
            className={`h-full rounded transition-all ${
              usedPct >= 90 ? "bg-[var(--danger)]" : usedPct >= 75 ? "bg-[var(--warning)]" : "bg-cyan-500"
            }`}
            style={{ width: `${Math.min(100, usedPct)}%` }}
          />
        </div>
      </div>

      {/* Row 4: Mount targets */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-1 text-[8px] text-[var(--muted-2)]">
        <span>{nas.vendor} {nas.model ?? ""}</span>
        <span>{nas.domain || nas.environment}</span>
      </div>
    </div>
  );
}

function Metric({ k, v }: { k: string; v?: number }) {
  const val = v ?? 0;
  const isHigh = val >= 85;
  return (
    <div className={`rounded px-1 py-0.5 ${isHigh ? "bg-[var(--warning-soft)] text-[#b54708]" : "bg-[var(--surface-2)]"}`}>
      <div className="text-[7px] text-[var(--muted)]">{k}</div>
      <div className="font-semibold tabular-nums">{val}%</div>
    </div>
  );
}

function FlowEdge(props: EdgeProps<Edge<TopologyEdgeData>>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props;
  const lineStyle = data?.lineStyle ?? "bezier";
  const pathFn = lineStyle === "smoothstep" ? getSmoothStepPath : getBezierPath;

  const [edgePath, labelX, labelY] = pathFn({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const strokeColor = statusColor(data?.issueCount ?? 0, data?.status);
  const showLabel = data?.showLabel ?? true;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2.5 : 1.5,
          opacity: 0.85,
        }}
      />
      {data?.flowActive && (
        <circle r={3} fill="#5750f1">
          <animateMotion dur="2.4s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 20,
            }}
            onClick={(e) => {
              e.stopPropagation();
              data?.onSelect?.();
            }}
            className={`nodrag nopan cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[8px] font-mono shadow-sm hover:border-[#5750f1] transition ${
              data?.issueCount ? "text-amber-600 font-bold" : "text-[var(--foreground)]"
            }`}
          >
            {data?.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = {
  tier: GroupNode,
  vm: VmNode,
  cluster: ClusterNode,
  nas: NasNode,
};

const edgeTypes = {
  flow: FlowEdge,
};

function getSmartHandlePair(
  sourcePos?: { x: number; y: number },
  targetPos?: { x: number; y: number },
  sourceDim = { w: 200, h: 116 },
  targetDim = { w: 200, h: 116 }
): { sourceHandle: HandleDirection; targetHandle: HandleDirection } {
  if (!sourcePos || !targetPos) {
    return { sourceHandle: "r", targetHandle: "l" };
  }

  const scx = sourcePos.x + sourceDim.w / 2;
  const scy = sourcePos.y + sourceDim.h / 2;
  const tcx = targetPos.x + targetDim.w / 2;
  const tcy = targetPos.y + targetDim.h / 2;

  const dx = tcx - scx;
  const dy = tcy - scy;

  // Decide dominant orientation based on delta
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return { sourceHandle: "r", targetHandle: "l" };
    } else {
      return { sourceHandle: "l", targetHandle: "r" };
    }
  } else {
    if (dy >= 0) {
      return { sourceHandle: "b", targetHandle: "t" };
    } else {
      return { sourceHandle: "t", targetHandle: "b" };
    }
  }
}

export function ArchitectureCanvas({
  vms,
  statuses,
  software,
  sops,
  clusters = [],
  nasAssets = [],
  softwareReleases = [],
  softwareProducts = [],
  relations = [],
  topologyGroups = [],
}: {
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
}) {
  const { activeProject } = useProjectGroup();

  // Navigation & Filter States
  const [mode, setMode] = useState<ViewMode>("overview");

  const [envFilter, setEnvFilter] = useState("ALL");
  const [drillGroup, setDrillGroup] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayMode>("live");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [flowAnimation, setFlowAnimation] = useState(false);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [lineStyle, setLineStyle] = useState<"bezier" | "smoothstep">("bezier");
  const [positionOverrides, setPositionOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [edgeHandleOverrides, setEdgeHandleOverrides] = useState<Record<string, { source?: HandleDirection; target?: HandleDirection }>>({});
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [query, setQuery] = useState("");

  // Live relations state to support in-canvas relation creation and deletion
  const [currentRelations, setCurrentRelations] = useState<ArchitectureRelation[]>(relations);
  useEffect(() => {
    setCurrentRelations(relations);
  }, [relations]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Relation Filters (APM Monitoring default OFF)
  const [relationFilters, setRelationFilters] = useState<Record<string, boolean>>({
    SERVICE: true,
    DATABASE: true,
    STORAGE: true,
    MONITORING: false,
    MANAGEMENT: true,
  });

  // Slide Drawers State
  const [selectedVm, setSelectedVm] = useState<Asset | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<NetworkStatus | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedRelatedStatuses, setSelectedRelatedStatuses] = useState<NetworkStatus[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupDrawerData | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterEntity | null>(null);
  const [selectedNas, setSelectedNas] = useState<NasAsset | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<SoftwareRelease | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<ArchitectureRelation | null>(null);

  // Scoped project assets
  const projectVms = useMemo(
    () => vms.filter((v) => !v.projectGroupId || v.projectGroupId === activeProject.id),
    [vms, activeProject.id]
  );
  const projectClusters = useMemo(
    () => clusters.filter((c) => !c.projectGroupId || c.projectGroupId === activeProject.id),
    [clusters, activeProject.id]
  );
  const projectNas = useMemo(
    () => nasAssets.filter((n) => !n.projectGroupId || n.projectGroupId === activeProject.id),
    [nasAssets, activeProject.id]
  );
  const projectRelations = useMemo(
    () => currentRelations.filter((r) => !r.projectGroupId || r.projectGroupId === activeProject.id),
    [currentRelations, activeProject.id]
  );
  const projectStatuses = useMemo(
    () => statuses.filter((s) => !s.policy.projectGroupId || s.policy.projectGroupId === activeProject.id),
    [statuses, activeProject.id]
  );

  const availableGroups = useMemo(() => {
    const registered = topologyGroups.filter((g) => g.projectGroupId === activeProject.id);
    const domains = Array.from(new Set(projectVms.map((v) => v.domain || v.zone || "UNMAPPED")));
    return [
      ...registered,
      ...domains
        .filter((d) => !registered.some((g) => g.domain === d))
        .map((d) => ({ id: "domain:" + d, name: d, domain: d, projectGroupId: activeProject.id } as TopologyGroup)),
    ];
  }, [topologyGroups, projectVms, activeProject.id]);

  const selectedFilterGroup = availableGroups.find((g) => g.id === drillGroup);
  const envVms = useMemo(
    () =>
      projectVms.filter((v) => {
        if (envFilter !== "ALL" && v.environment !== envFilter) return false;
        const g = selectedFilterGroup;
        if (!g) return true;
        if (g.assetIds) return g.assetIds.includes(v.id);
        return (
          !!(g.domain || g.system || g.environment) &&
          (!g.domain || (v.domain || v.zone || "UNMAPPED") === g.domain) &&
          (!g.system || v.system === g.system) &&
          (!g.environment || v.environment === g.environment)
        );
      }),
    [projectVms, envFilter, selectedFilterGroup]
  );
  const envVmIds = useMemo(() => new Set(envVms.map((v) => v.id)), [envVms]);

  const envStatuses = useMemo(
    () => projectStatuses.filter((s) => envVmIds.has(s.policy.sourceVmId)),
    [projectStatuses, envVmIds]
  );

  const handleSelectConnection = useCallback(
    (edgeId: string, status: NetworkStatus, relatedStatuses: NetworkStatus[]) => {
      setSelectedEdgeId(edgeId);
      setSelectedConnection(status);
      setSelectedRelatedStatuses(relatedStatuses);
      setSelectedRelation(null);
    },
    []
  );

  // Build Topology based on View Mode
  const { nodes, edges } = useMemo(() => {
    if (mode === "overview") {
      return buildOverview(
        envVms,
        envStatuses,
        projectRelations,
        relationFilters,
        issuesOnly,
        overlay,
        query,
        flowAnimation,
        showEdgeLabels,
        handleSelectConnection,
        (rel) => {
          setSelectedRelation(rel);
          setSelectedConnection(null);
        }
      );
    }
    return buildAssets(
      envVms,
      envStatuses,
      projectClusters.filter(
        (c) =>
          (envFilter === "ALL" || c.environment === envFilter) &&
          (!drillGroup || c.members.some((m) => envVmIds.has(m.assetId)))
      ),
      projectNas.filter(
        (n) =>
          (envFilter === "ALL" || n.environment === envFilter) &&
          (!selectedFilterGroup?.environment || n.environment === selectedFilterGroup.environment) &&
          (!drillGroup || envVms.some((v) => v.id === n.id || v.hostname === n.hostname || v.ipAddress === n.ipAddress))
      ),
      drillGroup,
      projectRelations,
      relationFilters,
      issuesOnly,
      overlay,
      query,
      flowAnimation,
      showEdgeLabels,
      handleSelectConnection,
      (rel) => {
        setSelectedRelation(rel);
        setSelectedConnection(null);
      }
    );
  }, [
    mode,
    envFilter,
    envVmIds,
    selectedFilterGroup,
    drillGroup,
    projectVms,
    envVms,
    envStatuses,
    projectStatuses,
    projectClusters,
    projectNas,
    projectRelations,
    relationFilters,
    issuesOnly,
    overlay,
    query,
    flowAnimation,
    showEdgeLabels,
    handleSelectConnection,
  ]);

  const layoutStorageKey = `rpa-topology-layout:v3:${activeProject.id}:${mode}:${envFilter}:${drillGroup ?? "ALL"}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(layoutStorageKey);
      setPositionOverrides(saved ? JSON.parse(saved) : {});
    } catch {
      setPositionOverrides({});
    }
  }, [layoutStorageKey]);

  useEffect(() => {
    try {
      const savedHandles = window.localStorage.getItem(`rpa-topology-handles:v2:${activeProject.id}`);
      setEdgeHandleOverrides(savedHandles ? JSON.parse(savedHandles) : {});
    } catch {
      setEdgeHandleOverrides({});
    }
  }, [activeProject.id]);

  function updateEdgeHandles(edgeId: string, handles: { source?: HandleDirection; target?: HandleDirection }) {
    setEdgeHandleOverrides((prev) => {
      const next = { ...prev, [edgeId]: handles };
      try {
        window.localStorage.setItem(`rpa-topology-handles:v2:${activeProject.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  // Real-time smooth dragging state with ghost twin preview
  const [liveNodes, setLiveNodes] = useState<Node<TopologyNodeData>[]>([]);

  useEffect(() => {
    setLiveNodes(
      nodes.map((node) => ({
        ...node,
        position: positionOverrides[node.id] ?? node.position,
        data: {
          ...node.data,
          isEditing: layoutEditMode,
        },
      }))
    );
  }, [nodes, positionOverrides, layoutEditMode]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setLiveNodes((nds) => applyNodeChanges(changes, nds) as Node<TopologyNodeData>[]);
  }, []);

  function saveNodePosition(nodeId: string, position: { x: number; y: number }) {
    const snapped = { x: Math.round(position.x / 20) * 20, y: Math.round(position.y / 20) * 20 };
    setPositionOverrides((current) => {
      const next = { ...current, [nodeId]: snapped };
      try {
        window.localStorage.setItem(layoutStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function onNodeDragStop(_: unknown, node: Node) {
    saveNodePosition(node.id, node.position);
  }

  function resetLayout() {
    try {
      window.localStorage.removeItem(layoutStorageKey);
    } catch {}
    setPositionOverrides({});
    setCanvasRevision((value) => value + 1);
  }

  // Dynamically resolve edge connection handles (4-way) and properties
  const resolvedEdges = useMemo(() => {
    const nodeMap = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const n of liveNodes) {
      const w = (n.style?.width as number) || 200;
      const h = (n.style?.height as number) || 116;
      nodeMap.set(n.id, { x: n.position.x, y: n.position.y, w, h });
    }

    return edges.map((e) => {
      const override = edgeHandleOverrides[e.id];
      let sourceHandle: string | undefined = override?.source ? override.source : undefined;
      let targetHandle: string | undefined = override?.target ? override.target : undefined;

      if (!sourceHandle || !targetHandle) {
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
        const smart = getSmartHandlePair(
          src,
          tgt,
          src ? { w: src.w, h: src.h } : undefined,
          tgt ? { w: tgt.w, h: tgt.h } : undefined
        );
        if (!sourceHandle) sourceHandle = smart.sourceHandle;
        if (!targetHandle) targetHandle = smart.targetHandle;
      }

      // Normalize any legacy handle ids
      if (sourceHandle) sourceHandle = sourceHandle.replace(/-(src|tgt)$/, "");
      if (targetHandle) targetHandle = targetHandle.replace(/-(src|tgt)$/, "");

      return {
        ...e,
        sourceHandle,
        targetHandle,
        data: {
          ...e.data,
          lineStyle,
          showLabel: showEdgeLabels,
        },
      };
    });
  }, [liveNodes, edges, edgeHandleOverrides, lineStyle, showEdgeLabels]);

  // Handle in-canvas drag connection
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      const sourceNode = liveNodes.find((n) => n.id === connection.source);
      const targetNode = liveNodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      let sourceEntityId = connection.source;
      let sourceLabel = connection.source;
      const sKind = sourceNode.data.kind;

      if (sKind === "vm" && sourceNode.data.vm) {
        sourceEntityId = sourceNode.data.vm.id;
        sourceLabel = sourceNode.data.vm.hostname;
      } else if (sKind === "cluster" && sourceNode.data.cluster) {
        sourceEntityId = sourceNode.data.cluster.id;
        sourceLabel = sourceNode.data.cluster.name;
      } else if (sKind === "nas" && sourceNode.data.nas) {
        sourceEntityId = sourceNode.data.nas.id;
        sourceLabel = sourceNode.data.nas.hostname;
      } else if (sKind === "group") {
        sourceEntityId = sourceNode.data.key || sourceNode.id;
        sourceLabel = sourceNode.data.label;
      }

      const sourceEntityType =
        sKind === "vm"
          ? "ASSET"
          : sKind === "cluster"
            ? "CLUSTER"
            : sKind === "nas"
              ? "NAS"
              : sKind === "group"
                ? "TOPOLOGY_GROUP"
                : "EXTERNAL";

      let targetEntityId = connection.target;
      let targetLabel = connection.target;
      const tKind = targetNode.data.kind;

      if (tKind === "vm" && targetNode.data.vm) {
        targetEntityId = targetNode.data.vm.id;
        targetLabel = targetNode.data.vm.hostname;
      } else if (tKind === "cluster" && targetNode.data.cluster) {
        targetEntityId = targetNode.data.cluster.id;
        targetLabel = targetNode.data.cluster.name;
      } else if (tKind === "nas" && targetNode.data.nas) {
        targetEntityId = targetNode.data.nas.id;
        targetLabel = targetNode.data.nas.hostname;
      } else if (tKind === "group") {
        targetEntityId = targetNode.data.key || targetNode.id;
        targetLabel = targetNode.data.label;
      }

      const targetEntityType =
        tKind === "cluster"
          ? "CLUSTER"
          : tKind === "nas"
            ? "NAS"
            : tKind === "vm"
              ? "ASSET"
              : tKind === "group"
                ? "TOPOLOGY_GROUP"
                : "EXTERNAL";

      // Default relation parameters based on target type
      let relationType: RelationType = "SERVICE";
      let protocol = "TCP";
      let port = 8080;

      if (tKind === "cluster" || targetNode.data.vm?.role === "DB") {
        relationType = "DATABASE";
        port = 1433;
      } else if (tKind === "nas") {
        relationType = "STORAGE";
        protocol = "NFS";
        port = 2049;
      } else if (targetNode.data.system === "APM" || targetNode.data.domain === "APM") {
        relationType = "MONITORING";
        port = 10050;
      }

      const newRelation: ArchitectureRelation = {
        id: `rel-${Date.now().toString(36)}`,
        projectGroupId: activeProject.id,
        sourceEntityId,
        sourceEntityType: sourceEntityType as any,
        targetEntityId,
        targetEntityType: targetEntityType as any,
        relationType,
        protocol,
        port,
        description: `${sourceLabel} → ${targetLabel} 연결 (${mode === "overview" ? "오버뷰" : "자산"})`,
      };

      // 1. Create in management repository
      await managementRepo.createRelation(newRelation);

      // 2. Persist handle overrides for this connection
      const cleanSrc = (connection.sourceHandle?.replace(/-(src|tgt)$/, "") || "r") as HandleDirection;
      const cleanTgt = (connection.targetHandle?.replace(/-(src|tgt)$/, "") || "l") as HandleDirection;
      updateEdgeHandles(newRelation.id, { source: cleanSrc, target: cleanTgt });

      // 3. Update local relations state
      setCurrentRelations((prev) => [newRelation, ...prev]);

      // 4. Show success feedback
      setToastMessage(`✓ ${sourceLabel} → ${targetLabel} 연결 관계가 등록되었습니다. (관리 > 연결 관계에 자동 반영됨)`);
      setTimeout(() => setToastMessage(null), 4000);
    },
    [liveNodes, activeProject.id, mode]
  );

  return (
    <div className="space-y-2">
      {/* Top Banner: Multi-Relation Filter Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--muted)]">연결 유형 필터:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(["SERVICE", "DATABASE", "STORAGE", "MONITORING", "MANAGEMENT"] as const).map((rt) => (
              <label
                key={rt}
                className="flex cursor-pointer items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[9px] hover:border-[var(--border-strong)]"
              >
                <input
                  type="checkbox"
                  checked={relationFilters[rt] !== false}
                  onChange={(e) =>
                    setRelationFilters((prev) => ({
                      ...prev,
                      [rt]: e.target.checked,
                    }))
                  }
                  className="rounded h-3 w-3 accent-[#5750f1]"
                />
                <span className={relationFilters[rt] ? "font-medium text-[var(--foreground)]" : "text-[var(--muted)]"}>
                  {rt.charAt(0) + rt.slice(1).toLowerCase()}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Main Filter & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        {/* Left: View Mode Segment + Sub-selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Summary and individual assets */}
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            {(["overview", "asset"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setMode(v);
                }}
                className={`h-6 rounded px-2.5 text-[9px] font-medium transition capitalize ${
                  mode === v ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm font-bold" : "text-[var(--muted)]"
                }`}
              >
                {v === "overview" ? "오버뷰" : "전체보기"}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            그룹:
            <select
              aria-label="그룹"
              value={selectedFilterGroup?.id ?? "ALL"}
              onChange={(e) => setDrillGroup(e.target.value === "ALL" ? null : e.target.value)}
              className="h-7 max-w-48 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[9.5px]"
            >
              <option value="ALL">전체 그룹</option>
              {availableGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          {/* Environment Filter */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>환경:</span>
            <select
              aria-label="환경"
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[9.5px] outline-none"
            >
              <option value="ALL">ALL</option>
              <option value="PROD">PROD</option>
              <option value="QA">QA</option>
              <option value="DEV">DEV</option>
            </select>
          </div>

          {/* Overlay Mode */}
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            <button
              onClick={() => setOverlay("policy")}
              className={`h-6 rounded px-2 text-[9px] font-medium ${
                overlay === "policy" ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"
              }`}
            >
              정책 (Policy)
            </button>
            <button
              onClick={() => setOverlay("live")}
              className={`h-6 rounded px-2 text-[9px] font-medium ${
                overlay === "live" ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"
              }`}
            >
              실측 프로브 (Actual)
            </button>
          </div>
        </div>

        {/* Right: Search, Toggles, Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Probe Flow Animation */}
          <button
            onClick={() => setFlowAnimation((v) => !v)}
            className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[9px] font-medium transition ${
              flowAnimation
                ? "border-[#5750f1] bg-[#5750f1]/10 text-[#5750f1]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${flowAnimation ? "bg-[#5750f1]" : "bg-[var(--muted)]"}`} />
            <span>프로브 플로우</span>
          </button>

          {/* Labels Toggle */}
          <button
            onClick={() => setShowEdgeLabels((v) => !v)}
            className={`flex h-7 items-center gap-1.5 rounded-md border px-2 text-[9px] font-medium transition ${
              showEdgeLabels
                ? "border-[#5750f1] bg-[#5750f1]/10 text-[#5750f1]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
            }`}
          >
            <span>라벨: {showEdgeLabels ? "ON" : "OFF"}</span>
          </button>

          {/* Edit Mode Toggle with prominent styling */}
          <button
            aria-pressed={layoutEditMode}
            onClick={() => setLayoutEditMode((v) => !v)}
            className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[9px] font-semibold transition ${
              layoutEditMode
                ? "bg-[#5750f1] text-white shadow-sm ring-2 ring-[#5750f1]/30 hover:bg-[#463fc9]"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[#5750f1]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${layoutEditMode ? "bg-white animate-pulse" : "bg-[var(--muted)]"}`} />
            <span>{layoutEditMode ? "편집 완료" : "레이아웃 & 선 연결 편집"}</span>
          </button>

          <button onClick={resetLayout} className="h-7 rounded-md border border-[var(--border)] px-2 text-[9px] hover:bg-[var(--surface-2)]">
            자동 배치
          </button>
          <button
            onClick={() => setLineStyle((v) => (v === "bezier" ? "smoothstep" : "bezier"))}
            className="h-7 rounded-md border border-[var(--border)] px-2 text-[9px] hover:bg-[var(--surface-2)]"
          >
            {lineStyle === "bezier" ? "곡선 연결" : "직각 연결"}
          </button>

          {/* Search */}
          <div className="flex h-7 w-[180px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
            <SearchIcon className="h-3 w-3 shrink-0 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[9px] outline-none"
              placeholder="호스트명, IP, 포트 검색..."
            />
          </div>

          {/* Issues Only */}
          <label className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] px-2 text-[9px]">
            <input
              type="checkbox"
              checked={issuesOnly}
              onChange={(e) => setIssuesOnly(e.target.checked)}
              className="rounded h-3 w-3 accent-[#5750f1]"
            />
            <span>이슈 항목만</span>
          </label>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative h-[calc(100vh-235px)] min-h-[500px] rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {/* Floating Edit Mode Banner */}
        {layoutEditMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 rounded-lg border border-[#5750f1] bg-[var(--surface)]/95 px-3.5 py-1.5 shadow-lg backdrop-blur-sm text-[10px]">
            <span className="flex h-2 w-2 rounded-full bg-[#5750f1] animate-ping" />
            <span className="font-bold text-[#5750f1]">편집 모드 활성화</span>
            <span className="text-[var(--muted)]">
              • 노드 본체를 드래그하여 배치 이동 | • 노드 둘레의 <b>보라색 점</b>을 마우스로 끌어서 다른 노드로 선 연결
            </span>
            <button
              onClick={() => setLayoutEditMode(false)}
              className="ml-2 rounded bg-[#5750f1] px-2.5 py-1 text-[9px] font-semibold text-white shadow-sm hover:bg-[#463fc9] transition"
            >
              편집 완료
            </button>
          </div>
        )}

        {/* Floating Action Toast Notification */}
        {toastMessage && (
          <div className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-[var(--surface)] px-4 py-2 text-[11px] font-medium text-emerald-700 shadow-xl backdrop-blur-sm dark:text-emerald-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>{toastMessage}</span>
          </div>
        )}

        <ReactFlow
          key={`${mode}-${envFilter}-${drillGroup}-${activeProject.id}-${canvasRevision}`}
          nodes={liveNodes}
          edges={resolvedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.2}
          maxZoom={1.6}
          nodesDraggable={layoutEditMode}
          nodesConnectable={layoutEditMode}
          connectionMode={ConnectionMode.Loose}
          connectionLineType={lineStyle === "bezier" ? ConnectionLineType.Bezier : ConnectionLineType.SmoothStep}
          connectionLineStyle={{
            stroke: "#5750f1",
            strokeWidth: 2.5,
            strokeDasharray: "5 5",
          }}
          snapToGrid
          snapGrid={[20, 20]}
          onNodeDragStop={onNodeDragStop}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => {
            const d = node.data as TopologyNodeData;
            if (d.vm) {
              setSelectedVm(d.vm);
            } else if (d.cluster) {
              setSelectedCluster(d.cluster);
            } else if (d.nas) {
              setSelectedNas(d.nas);
            } else if (d.kind === "group" || d.kind === "external") {
              const groupAssets = envVms.filter((v) => {
                if (d.environment && v.environment !== d.environment) return false;
                if (d.domain) return v.domain === d.domain;
                if (d.system) return v.system === d.system;
                if (d.environment) return v.environment === d.environment;
                return v.service === d.key || v.zone === d.key;
              });
              const groupStatuses = projectStatuses.filter((s) => {
                return groupAssets.some(
                  (a) => a.id === s.policy.sourceVmId || a.id === s.policy.targetVmId
                );
              });
              setSelectedGroup({
                groupName: d.label,
                groupType: d.groupType,
                environment: d.environment,
                domain: d.domain,
                system: d.system,
                description: d.description,
                assets: groupAssets,
                statuses: groupStatuses,
                software,
                sops,
              });
            }
          }}
          onNodeDoubleClick={(_, node) => {
            const d = node.data as TopologyNodeData;
            if (d.kind === "group") {
              setMode("asset");
              setDrillGroup(
                availableGroups.find((g) => (d.domain && g.domain === d.domain) || (d.system && g.system === d.system))?.id ?? null
              );
              if (d.environment) setEnvFilter(d.environment);
              setSelectedGroup(null);
            }
          }}
          onEdgeClick={(_, edge) => {
            const d = edge.data as TopologyEdgeData;
            setSelectedEdgeId(edge.id);
            if (d?.status) {
              setSelectedConnection(d.status);
              setSelectedRelatedStatuses(d.relatedStatuses ?? [d.status]);
              setSelectedRelation(null);
            } else {
              const matchingRel = currentRelations.find((r) => r.id === edge.id);
              if (matchingRel) {
                setSelectedRelation(matchingRel);
                setSelectedConnection(null);
              }
            }
          }}
        >
          <Background gap={20} size={1} color="var(--border)" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => {
              if (n.type === "cluster") return "#a855f7";
              if (n.type === "nas") return "#0ea5e9";
              const d = n.data as TopologyNodeData;
              if ((d.issueCount ?? 0) > 0 || d?.vm?.health === "critical") return "#f04438";
              if (d?.vm?.health === "warning") return "#f79009";
              return "#5750f1";
            }}
            className="!border-[var(--border)] !bg-[var(--surface)] shadow-md"
          />
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[var(--muted)]">
            선택한 환경·그룹에 표시할 자산이 없습니다.
          </div>
        )}

        {/* Legend Overlay at bottom center */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[90vw] rounded-md border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-1.5 text-center text-[8px] text-[var(--muted)] shadow-sm backdrop-blur-sm">
          <div>
            <b className="text-[var(--foreground)]">선언 정책 (Should Be)</b> vs.{" "}
            <b className="text-[var(--foreground)]">Telegraf TCP 프로브 (Actual)</b>
          </div>
          <div className="mt-0.5 text-[7.5px]">
            클릭 → 상세 확인 · 더블클릭 → 그룹 전체보기 · 레이아웃 &amp; 선 연결 편집 → 노드 이동 및 점 드래그로 선 연결 (연결 관계 자동 등록)
          </div>
        </div>
      </div>

      {/* Slide Drawers (All sliding in from the right: right-0, width 460px) */}
      <GroupDrawer
        data={selectedGroup}
        open={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        onSelectAsset={(asset) => {
          setSelectedVm(asset);
        }}
        onDrillDown={(groupName) => {
          setMode("asset");
          setDrillGroup(
            availableGroups.find(
              (g) =>
                g.name === groupName ||
                (!!g.domain && g.domain === selectedGroup?.domain) ||
                (!!g.system && g.system === selectedGroup?.system)
            )?.id ?? null
          );
          if (selectedGroup?.environment) setEnvFilter(selectedGroup.environment);
          setSelectedGroup(null);
        }}
      />
      <VmDrawer
        vm={selectedVm}
        network={projectStatuses}
        software={software}
        sops={sops}
        open={!!selectedVm}
        onClose={() => setSelectedVm(null)}
        onSelectSoftware={(sw) => {
          const matched = matchLegacySoftwareRelease(sw, softwareProducts, softwareReleases);
          if (matched) setSelectedRelease(matched);
        }}
      />
      <ConnectionDrawer
        sourceHandle={edgeHandleOverrides[selectedEdgeId ?? ""]?.source}
        targetHandle={edgeHandleOverrides[selectedEdgeId ?? ""]?.target}
        onUpdateHandles={(handles) => {
          if (selectedEdgeId) updateEdgeHandles(selectedEdgeId, handles);
        }}
        status={selectedConnection}
        relatedStatuses={selectedRelatedStatuses}
        open={!!selectedConnection}
        onClose={() => {
          setSelectedConnection(null);
          setSelectedEdgeId(null);
          setSelectedRelatedStatuses([]);
        }}
      />
      <ClusterDrawer
        cluster={selectedCluster}
        open={!!selectedCluster}
        onClose={() => setSelectedCluster(null)}
      />
      <NasDrawer
        nas={selectedNas}
        open={!!selectedNas}
        onClose={() => setSelectedNas(null)}
        onSelectVm={(hostname) => {
          const hit = projectVms.find((v) => v.hostname === hostname);
          if (hit) {
            setSelectedNas(null);
            setSelectedVm(hit);
          }
        }}
      />
      <SoftwareDetailDrawer
        release={selectedRelease}
        open={!!selectedRelease}
        onClose={() => setSelectedRelease(null)}
      />

      {/* SlideDrawer for Architecture Relations created in-canvas */}
      <SlideDrawer
        open={!!selectedRelation}
        onClose={() => setSelectedRelation(null)}
        title="아키텍처 연결 관계"
        subtitle={`${selectedRelation?.protocol || "TCP"}/${selectedRelation?.port || 8080} · ${selectedRelation?.relationType ?? ""}`}
        width={460}
      >
        {selectedRelation && (
          <div className="p-4 space-y-4 text-[10px]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <div className="text-[9px] text-[var(--muted)]">연결 ID</div>
                <div className="font-mono font-semibold text-[var(--foreground)]">{selectedRelation.id}</div>
              </div>
              <span className="rounded bg-purple-500/15 px-2 py-0.5 font-mono text-[9px] font-bold text-purple-700 dark:text-purple-300">
                {selectedRelation.relationType}
              </span>
            </div>

            <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2.5 space-y-2">
              <div className="font-semibold text-[var(--foreground)]">연결 엔티티 정보</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-[var(--muted)]">출발지 (Source)</div>
                  <div className="font-mono font-bold text-[var(--foreground)]">{selectedRelation.sourceEntityId}</div>
                  <div className="text-[8.5px] text-[var(--muted)]">유형: {selectedRelation.sourceEntityType}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[var(--muted)]">목적지 (Target)</div>
                  <div className="font-mono font-bold text-[var(--foreground)]">{selectedRelation.targetEntityId}</div>
                  <div className="text-[8.5px] text-[var(--muted)]">유형: {selectedRelation.targetEntityType}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[9px] text-[var(--muted)]">프로토콜</div>
                <div className="font-mono font-semibold">{selectedRelation.protocol || "TCP"}</div>
              </div>
              <div>
                <div className="text-[9px] text-[var(--muted)]">포트</div>
                <div className="font-mono font-semibold">{selectedRelation.port || "-"}</div>
              </div>
            </div>

            {selectedRelation.description && (
              <div>
                <div className="text-[9px] text-[var(--muted)]">설명</div>
                <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--foreground)]">
                  {selectedRelation.description}
                </div>
              </div>
            )}

            <div className="rounded-md border border-emerald-500/20 bg-emerald-50/50 p-2 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              ✓ 이 연결은 관리 &gt; 아키텍처 연결 관계 레지스트리에 영구 등록되어 있습니다.
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
              <a
                href="/management/relations"
                className="text-[10px] text-[#5750f1] font-semibold hover:underline"
              >
                관리 메뉴에서 전체 보기 →
              </a>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("정말 이 연결 관계를 삭제하시겠습니까?")) return;
                  await managementRepo.deleteRelation(selectedRelation.id);
                  setCurrentRelations((prev) => prev.filter((r) => r.id !== selectedRelation.id));
                  setSelectedRelation(null);
                  setToastMessage("연결 관계가 삭제되었습니다.");
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="rounded border border-rose-500/40 px-3 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
              >
                연결 관계 삭제
              </button>
            </div>
          </div>
        )}
      </SlideDrawer>
    </div>
  );
}

// -------------------------------------------------------------
// BUILD 1: OVERVIEW ARCHITECTURE (Executive single-screen view)
// -------------------------------------------------------------
function buildOverview(
  vms: Asset[],
  statuses: NetworkStatus[],
  relations: ArchitectureRelation[],
  relationFilters: Record<string, boolean>,
  issuesOnly: boolean,
  overlay: OverlayMode,
  query: string,
  flowActive: boolean,
  showLabels: boolean,
  onSelectConnection: (id: string, s: NetworkStatus, all: NetworkStatus[]) => void,
  onSelectRelation?: (r: ArchitectureRelation) => void
) {
  const q = query.trim().toLowerCase();
  if (q) {
    vms = vms.filter((v) =>
      `${v.hostname} ${v.ipAddress} ${v.service} ${v.domain ?? ""}`.toLowerCase().includes(q)
    );
  }
  // Aggregate entities for the overview canvas
  const portalAssets = vms.filter((v) => v.system === "RPA Portal" || v.domain === "PORTAL");
  const memProdAssets = vms.filter((v) => v.domain === "MEMORY" && v.environment === "PROD");
  const fndProdAssets = vms.filter((v) => v.domain === "FOUNDRY" && v.environment === "PROD");
  const comProdAssets = vms.filter((v) => v.domain === "COMMON" && v.environment === "PROD");
  const qaAssets = vms.filter((v) => v.environment === "QA");
  const devAssets = vms.filter((v) => v.environment === "DEV");
  const apmAssets = vms.filter((v) => v.system === "APM" || v.domain === "APM");
  const commonFuncAssets = vms.filter((v) => v.system === "Common Function" || v.domain === "COMMON_FUNCTION");

  function makeGroupData(label: string, sublabel: string, assets: Asset[], domain?: string, system?: string, env?: string) {
    const apCount = assets.filter((a) => a.role === "AP").length;
    const dbCount = assets.filter((a) => a.role === "DB").length;
    const nasCount = assets.filter((a) => a.assetType === "NAS").length;
    const k8sCount = assets.filter((a) => a.assetType === "K8S_WORKLOAD").length;
    const healthy = assets.filter((a) => a.health === "healthy").length;
    const warning = assets.filter((a) => a.health === "warning").length;
    const critical = assets.filter((a) => a.health === "critical").length;
    return {
      kind: "group" as const,
      key: label,
      label,
      sublabel,
      count: assets.length,
      apCount,
      dbCount,
      nasCount,
      k8sCount,
      healthyCount: healthy,
      warningCount: warning,
      criticalCount: critical,
      issueCount: warning + critical,
      domain,
      system,
      environment: env,
    };
  }

  const nodes: Node<TopologyNodeData>[] = [
    // Top Center: RPA Portal (Kubernetes)
    {
      id: "overview-portal",
      type: "tier",
      position: { x: 440, y: 30 },
      data: makeGroupData("RPA PORTAL", "Kubernetes Runtime · PROD", portalAssets, "PORTAL", "RPA Portal", "PROD"),
    },
    // Top Right: APM Monitoring
    {
      id: "overview-apm",
      type: "tier",
      position: { x: 1040, y: 30 },
      data: makeGroupData("APM MONITOR", "Telemetry Fleet · PROD", apmAssets, "APM", "APM", "PROD"),
    },
    // Middle Row: 3 A360 PROD Domains + Common Function
    {
      id: "overview-mem-prod",
      type: "tier",
      position: { x: 80, y: 220 },
      data: makeGroupData("MEMORY PROD", "A360 Platform", memProdAssets, "MEMORY", "A360", "PROD"),
    },
    {
      id: "overview-fnd-prod",
      type: "tier",
      position: { x: 440, y: 220 },
      data: makeGroupData("FOUNDRY PROD", "A360 Platform", fndProdAssets, "FOUNDRY", "A360", "PROD"),
    },
    {
      id: "overview-com-prod",
      type: "tier",
      position: { x: 740, y: 220 },
      data: makeGroupData("COMMON PROD", "A360 Platform", comProdAssets, "COMMON", "A360", "PROD"),
    },
    {
      id: "overview-common-func",
      type: "tier",
      position: { x: 1040, y: 220 },
      data: makeGroupData("COMMON FUNCTION", "Shared Auth & Services", commonFuncAssets, "COMMON_FUNCTION", "Common Function", "PROD"),
    },
    // Bottom Row: QA and DEV
    {
      id: "overview-qa",
      type: "tier",
      position: { x: 80, y: 410 },
      data: makeGroupData("QA ENVIRONMENT", "Memory / Foundry / Common QA", qaAssets, undefined, "A360", "QA"),
    },
    {
      id: "overview-dev",
      type: "tier",
      position: { x: 440, y: 410 },
      data: makeGroupData("DEV ENVIRONMENT", "Single AP & Standalone DB", devAssets, "DEV", "A360", "DEV"),
    },
  ];

  // High-Level Clean Connective Edges
  const rawEdges: {
    id: string;
    source: string;
    target: string;
    label: string;
    secondary: string;
    relType: RelationType;
    issues?: number;
    sample?: NetworkStatus;
  }[] = [
    {
      id: "edge-portal-mem",
      source: "overview-portal",
      target: "overview-mem-prod",
      label: "HTTPS/443",
      secondary: "Management",
      relType: "MANAGEMENT",
      sample: statuses.find((s) => s.policy.port === 443),
    },
    {
      id: "edge-portal-fnd",
      source: "overview-portal",
      target: "overview-fnd-prod",
      label: "HTTPS/443",
      secondary: "Management",
      relType: "MANAGEMENT",
    },
    {
      id: "edge-portal-com",
      source: "overview-portal",
      target: "overview-com-prod",
      label: "HTTPS/443",
      secondary: "Management",
      relType: "MANAGEMENT",
    },
    {
      id: "edge-com-common-func",
      source: "overview-com-prod",
      target: "overview-common-func",
      label: "Service API",
      secondary: "Common Sync",
      relType: "SERVICE",
    },
    {
      id: "edge-apm-mem",
      source: "overview-apm",
      target: "overview-mem-prod",
      label: "TCP/10050",
      secondary: "APM Probe",
      relType: "MONITORING",
      sample: statuses.find((s) => s.policy.port === 10050),
    },
    {
      id: "edge-apm-fnd",
      source: "overview-apm",
      target: "overview-fnd-prod",
      label: "TCP/10050",
      secondary: "APM Probe",
      relType: "MONITORING",
    },
    {
      id: "edge-apm-com",
      source: "overview-apm",
      target: "overview-com-prod",
      label: "TCP/10050",
      secondary: "APM Probe",
      relType: "MONITORING",
    },
  ];

  // Dynamic user-created relations in overview
  const dynamicOverviewEdges: typeof rawEdges = [];
  for (const r of relations) {
    const srcNode = nodes.find(
      (n) =>
        n.id === r.sourceEntityId ||
        n.data.key === r.sourceEntityId ||
        n.data.domain === r.sourceEntityId ||
        n.data.system === r.sourceEntityId
    );
    const tgtNode = nodes.find(
      (n) =>
        n.id === r.targetEntityId ||
        n.data.key === r.targetEntityId ||
        n.data.domain === r.targetEntityId ||
        n.data.system === r.targetEntityId
    );
    if (srcNode && tgtNode && srcNode.id !== tgtNode.id) {
      if (!rawEdges.some((e) => e.id === r.id) && !dynamicOverviewEdges.some((e) => e.id === r.id)) {
        dynamicOverviewEdges.push({
          id: r.id,
          source: srcNode.id,
          target: tgtNode.id,
          label: `${r.protocol || "TCP"}/${r.port || 8080}`,
          secondary: r.relationType,
          relType: r.relationType,
        });
      }
    }
  }

  const allOverviewEdges = [...rawEdges, ...dynamicOverviewEdges];

  const edges: Edge<TopologyEdgeData>[] = allOverviewEdges
    .filter((e) => relationFilters[e.relType] !== false)
    .map((e) => {
      const matchingRelation = relations.find((r) => r.id === e.id);
      return {
        id: e.id,
        type: "flow",
        source: e.source,
        target: e.target,
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
        data: {
          label: e.label,
          secondary: e.secondary,
          issueCount: e.issues ?? 0,
          status: e.sample,
          relatedStatuses: e.sample ? [e.sample] : [],
          flowActive,
          showLabel: showLabels,
          relationType: e.relType,
          onSelect: () => {
            if (e.sample) {
              onSelectConnection(e.id, e.sample, [e.sample]);
            } else if (matchingRelation && onSelectRelation) {
              onSelectRelation(matchingRelation);
            }
          },
        },
      };
    });

  const shownNodes = nodes.filter(
    (n) => n.data.kind !== "group" || ((n.data.count ?? 0) > 0 && (!issuesOnly || (n.data.issueCount ?? 0) > 0))
  );
  const ids = new Set(shownNodes.map((n) => n.id));
  return { nodes: shownNodes, edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)) };
}

// -------------------------------------------------------------
// BUILD 2: ASSET VIEW (Detailed nodes: VMs, DBaaS, K8s, NAS, Clusters)
// -------------------------------------------------------------
function buildAssets(
  vms: Asset[],
  statuses: NetworkStatus[],
  clusters: ClusterEntity[],
  nasAssets: NasAsset[],
  drillGroup: string | null,
  relations: ArchitectureRelation[],
  relationFilters: Record<string, boolean>,
  issuesOnly: boolean,
  overlay: OverlayMode,
  query: string,
  flowActive: boolean,
  showLabels: boolean,
  onSelectConnection: (id: string, s: NetworkStatus, all: NetworkStatus[]) => void,
  onSelectRelation?: (r: ArchitectureRelation) => void
) {
  const q = query.trim().toLowerCase();

  // Filter visible assets
  const visible = vms.filter((v) => {
    if (v.assetType === "NAS" && nasAssets.some((n) => n.id === v.id || n.hostname === v.hostname)) return false;
    if (drillGroup && v.domain !== drillGroup && v.system !== drillGroup && v.zone !== drillGroup) {
      return false;
    }
    if (issuesOnly && v.health === "healthy") return false;
    if (q && !`${v.hostname} ${v.ipAddress} ${v.service} ${v.domain ?? ""}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  const visibleIds = new Set(visible.map((v) => v.id));

  // Layout arrangement by Domain / Zone Lanes
  const X_STEP = 260;
  const Y_STEP = 150;

  // Domain groupings for clean layout
  const domainOrder = ["MEMORY", "FOUNDRY", "COMMON", "PORTAL", "APM", "COMMON_FUNCTION", "DEV"];
  const domainBuckets = new Map<string, Asset[]>();

  for (const vm of visible) {
    const d = vm.domain || "OTHER";
    const b = domainBuckets.get(d) ?? [];
    b.push(vm);
    domainBuckets.set(d, b);
  }

  const nodes: Node<TopologyNodeData>[] = [];

  let currentY = 50;

  for (const dom of [...domainOrder, ...Array.from(domainBuckets.keys()).filter((d) => !domainOrder.includes(d))]) {
    const items = domainBuckets.get(dom);
    if (!items || items.length === 0) continue;

    items.forEach((vm, idx) => {
      nodes.push({
        id: vm.id,
        type: "vm",
        position: { x: 80 + (idx % 4) * X_STEP, y: currentY + Math.floor(idx / 4) * Y_STEP },
        data: {
          kind: "vm" as const,
          key: vm.id,
          label: vm.hostname,
          vm,
        },
      });
    });

    currentY += Math.ceil(items.length / 4) * Y_STEP + 40;
  }

  // Clusters
  const relevantClusters = clusters.filter(
    (c) => !drillGroup || c.domain === drillGroup || c.name.includes(drillGroup)
  );
  relevantClusters.forEach((cl, idx) => {
    nodes.push({
      id: `cluster-${cl.id}`,
      type: "cluster",
      position: { x: 80 + (idx % 3) * X_STEP, y: currentY },
      data: {
        kind: "cluster" as const,
        key: cl.id,
        label: cl.name,
        cluster: cl,
      },
    });
  });

  if (relevantClusters.length > 0) {
    currentY += 170;
  }

  // NAS
  const relevantNas = nasAssets.filter(
    (n) => !drillGroup || n.domain === drillGroup || n.hostname.includes(drillGroup)
  );
  relevantNas.forEach((nas, idx) => {
    nodes.push({
      id: `nas-${nas.id}`,
      type: "nas",
      position: { x: 80 + (idx % 3) * X_STEP, y: currentY },
      data: {
        kind: "nas" as const,
        key: nas.id,
        label: nas.hostname,
        nas,
      },
    });
  });

  // Edges filtered by policy & relation filters
  const filteredStatuses = statuses.filter(
    (s) =>
      visibleIds.has(s.policy.sourceVmId) &&
      (s.policy.targetVmId ? visibleIds.has(s.policy.targetVmId) : true) &&
      (!issuesOnly || s.overall !== "NORMAL") &&
      (!q || `${s.policy.port} ${s.policy.protocol} ${s.policy.sourceName} ${s.policy.targetName}`.toLowerCase().includes(q))
  );

  const edges: Edge<TopologyEdgeData>[] = filteredStatuses.map((s) => {
    const isBidi = s.isBidirectional || s.policy.direction === "BIDIRECTIONAL";
    const label = `${s.policy.protocol}/${s.policy.port}${isBidi ? " (⇄)" : ""}`;
    const secondary =
      overlay === "policy"
        ? `${s.policy.approvalStatus}${
            s.daysToExpiry != null
              ? ` · ${s.daysToExpiry >= 0 ? `D-${s.daysToExpiry}` : `D+${Math.abs(s.daysToExpiry)}`}`
              : ""
          }`
        : s.overall === "RETURN_DIRECTION_FAILED"
          ? "RETURN FAILED"
          : `TCP ${s.observation?.tcp ?? "NO DATA"}`;

    return {
      id: s.policy.id,
      type: "flow",
      source: s.policy.sourceVmId,
      target: s.policy.targetVmId ?? `ext-${s.policy.targetName}`,
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
      data: {
        label,
        secondary,
        issueCount: s.overall === "NORMAL" ? 0 : 1,
        status: s,
        relatedStatuses: [s],
        flowActive,
        showLabel: showLabels,
        onSelect: () => onSelectConnection(s.policy.id, s, [s]),
      },
    };
  });

  // Dynamic user-created architecture relations in asset view
  for (const r of relations) {
    if (relationFilters[r.relationType] === false) continue;
    const srcNode = nodes.find(
      (n) =>
        n.id === r.sourceEntityId ||
        n.id === `cluster-${r.sourceEntityId}` ||
        n.id === `nas-${r.sourceEntityId}` ||
        n.data.label === r.sourceEntityId ||
        (n.data.vm && n.data.vm.hostname === r.sourceEntityId)
    );
    const tgtNode = nodes.find(
      (n) =>
        n.id === r.targetEntityId ||
        n.id === `cluster-${r.targetEntityId}` ||
        n.id === `nas-${r.targetEntityId}` ||
        n.data.label === r.targetEntityId ||
        (n.data.vm && n.data.vm.hostname === r.targetEntityId)
    );
    if (srcNode && tgtNode && srcNode.id !== tgtNode.id) {
      if (!edges.some((e) => e.id === r.id)) {
        edges.push({
          id: r.id,
          type: "flow",
          source: srcNode.id,
          target: tgtNode.id,
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
          data: {
            label: `${r.protocol || "TCP"}/${r.port || 8080}`,
            secondary: r.relationType,
            issueCount: 0,
            flowActive,
            showLabel: showLabels,
            relationType: r.relationType,
            onSelect: () => onSelectRelation?.(r),
          },
        });
      }
    }
  }

  const shownNodes = nodes.filter(
    (n) => n.data.kind !== "group" || ((n.data.count ?? 0) > 0 && (!issuesOnly || (n.data.issueCount ?? 0) > 0))
  );
  const ids = new Set(shownNodes.map((n) => n.id));
  return { nodes: shownNodes, edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)) };
}
