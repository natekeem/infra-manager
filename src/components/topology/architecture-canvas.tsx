"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type {
  ClusterEntity,
  NasAsset,
  NetworkStatus,
  SoftwareInstall,
  SoftwareProduct,
  SoftwareRelease,
  SopDocument,
  VmAsset,
} from "@/domain/models";
import { VmDrawer } from "@/components/infrastructure/vm-drawer";
import { ConnectionDrawer } from "@/components/network/connection-drawer";
import { ClusterDrawer } from "@/components/cluster/cluster-drawer";
import { NasDrawer } from "@/components/storage/nas-drawer";
import { SoftwareDetailDrawer } from "@/components/software/software-detail-drawer";
import { MaximizeIcon, SearchIcon } from "@/components/common/icons";
import { matchLegacySoftwareRelease } from "@/domain/software-lifecycle";

type ViewMode = "overview" | "service" | "vm";
type OverlayMode = "policy" | "live";

export type TopologyNodeData = {
  kind: "group" | "vm" | "external" | "cluster" | "nas";
  key: string;
  label: string;
  sublabel?: string;
  count?: number;
  healthyCount?: number;
  warningCount?: number;
  criticalCount?: number;
  connectionsCount?: number;
  issueCount?: number;
  vm?: VmAsset;
  cluster?: ClusterEntity;
  nas?: NasAsset;
};

export type TopologyEdgeData = {
  label: string;
  secondary: string;
  issueCount: number;
  status?: NetworkStatus;
  flowActive?: boolean;
  showLabel?: boolean;
  onSelect?: () => void;
};

const zoneOrder = ["WEB", "APP", "DB", "CONTROL", "BOT", "VDI", "SUPPORT", "EXTERNAL"];
const zonePos: Record<string, { x: number; y: number }> = {
  WEB: { x: 420, y: 60 },
  APP: { x: 420, y: 260 },
  DB: { x: 420, y: 470 },
  CONTROL: { x: 60, y: 150 },
  BOT: { x: 60, y: 350 },
  VDI: { x: 60, y: 530 },
  SUPPORT: { x: 780, y: 470 },
  EXTERNAL: { x: 780, y: 180 },
};

function statusColor(issueCount: number, status?: NetworkStatus) {
  if (status?.overall === "RETURN_DIRECTION_FAILED") return "#d92d20";
  if (status?.overall.includes("UNREACHABLE") || status?.overall === "UNREACHABLE") return "#f04438";
  if (status?.overall === "EXPIRING" || status?.overall.includes("EXPIRED")) return "#f79009";
  return issueCount > 0 ? "#f79009" : "#98a2b3";
}

function GroupNode({ data, selected }: NodeProps<Node<TopologyNodeData>>) {
  const isExternal = data.kind === "external";
  return (
    <div
      className={`h-[116px] w-[200px] rounded-md border bg-[var(--surface)] p-2.5 shadow-sm transition ${
        selected ? "border-[#5750f1] ring-1 ring-[#5750f1]/20" : "border-[var(--border-strong)]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle id="l" type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle id="r" type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />

      <div className="flex items-center justify-between gap-1 border-b border-[var(--border)] pb-1.5">
        <span className="truncate text-[11px] font-bold tracking-tight text-[var(--foreground)]">{data.label}</span>
        {data.issueCount ? (
          <span className="rounded bg-[var(--danger-soft)] px-1.5 py-0.5 text-[8px] font-semibold text-[#b42318]">
            {data.issueCount} issue
          </span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />
        )}
      </div>

      {isExternal ? (
        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--muted)]">
          <span>{data.count ?? 1} External Target(s)</span>
          <span className="text-[9px] uppercase tracking-wider text-[var(--muted-2)]">External</span>
        </div>
      ) : (
        <div className="mt-2 space-y-1 text-[10px]">
          <div className="flex items-center justify-between font-semibold">
            <span className="text-[12px] tabular-nums">{data.count ?? 0} VMs</span>
            <span className="text-[9px] font-normal text-[var(--muted)]">{data.connectionsCount ?? 0} Connections</span>
          </div>
          <div className="flex items-center gap-2 text-[9px]">
            <span className="text-[#067647] dark:text-[#75e0aa]">{data.healthyCount ?? 0} Healthy</span>
            {(data.warningCount ?? 0) > 0 && (
              <span className="text-[#b54708] dark:text-[#fdbf5a] font-medium">{data.warningCount} Warning</span>
            )}
            {(data.criticalCount ?? 0) > 0 && (
              <span className="text-[#b42318] dark:text-[#ff8a82] font-semibold">{data.criticalCount} Critical</span>
            )}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-1 text-[8px] text-[var(--muted-2)]">
        <span>{isExternal ? "Dependency" : "Double-click to expand"}</span>
        <span>→</span>
      </div>
    </div>
  );
}

function VmNode({ data, selected }: NodeProps<Node<TopologyNodeData>>) {
  const vm = data.vm!;
  return (
    <div
      className={`w-[230px] h-[125px] rounded-md border bg-[var(--surface)] p-2.5 shadow-sm transition flex flex-col justify-between ${
        selected ? "border-[#5750f1] ring-1 ring-[#5750f1]/20" : "border-[var(--border)]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle id="r" type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle id="l" type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />

      {/* Row 1: Hostname + Health dot */}
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-semibold text-[var(--foreground)]" title={vm.hostname}>
          {vm.hostname}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-[var(--surface-2)] px-1 py-0.5 font-mono text-[8px] text-[var(--muted)]">
            {vm.role}
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
          <span className="rounded bg-[var(--surface-2)] px-1 py-0.2">{vm.zone}</span>
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
        <span className="truncate">{vm.osName}</span>
        <span className="font-mono text-[7.5px]">{vm.service}</span>
      </div>
    </div>
  );
}

function ClusterNode({ data, selected }: NodeProps<Node<TopologyNodeData>>) {
  const cluster = data.cluster!;
  return (
    <div
      className={`w-[230px] h-[135px] rounded-md border bg-[var(--surface)] p-2.5 shadow-sm transition flex flex-col justify-between border-purple-500/40 ${
        selected ? "border-purple-600 ring-1 ring-purple-500/20" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-purple-400" />
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-purple-400" />
      <Handle id="r" type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-purple-400" />
      <Handle id="l" type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-purple-400" />

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
          {cluster.zone}
        </span>
      </div>

      {/* Row 3: Cluster Members */}
      <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-1 text-[8px]">
        <div className="flex justify-between text-[var(--muted)] mb-0.5">
          <span>Active / Passive Nodes:</span>
          <span>{cluster.members.length} nodes</span>
        </div>
        <div className="flex gap-1">
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
      className={`w-[220px] h-[120px] rounded-md border bg-[var(--surface)] p-2.5 shadow-sm transition flex flex-col justify-between border-cyan-500/40 ${
        selected ? "border-cyan-600 ring-1 ring-cyan-500/20" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-cyan-400" />
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-cyan-400" />
      <Handle id="r" type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-cyan-400" />
      <Handle id="l" type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-cyan-400" />

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
        <span>{nas.targetVms?.length ?? 0} VMs mounted</span>
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
  const [path, x, y] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 8,
  });
  const data = props.data!;
  const color = statusColor(data.issueCount, data.status);
  const isTcpUp = data.status?.observation?.tcp === "UP";
  const isBidi = data.status?.isBidirectional;
  const isReverseUp = isBidi && data.status?.reverseObservation?.tcp === "UP";
  const flowActive = data.flowActive ?? true;

  return (
    <>
      <BaseEdge
        path={path}
        markerStart={props.markerStart}
        markerEnd={props.markerEnd}
        interactionWidth={18}
        style={{
          stroke: color,
          strokeWidth: data.issueCount ? 1.8 : 1.2,
          strokeDasharray: data.status?.observation?.tcp === "DOWN" ? "5 4" : undefined,
        }}
      />

      {/* SVG Probe Flow Particle Animation */}
      {flowActive && isTcpUp && (
        <circle r="3" fill={color}>
          <animateMotion dur="2.4s" repeatCount="indefinite" path={path} />
        </circle>
      )}
      {flowActive && isReverseUp && (
        <circle r="2.5" fill="#12b76a">
          <animateMotion dur="2.4s" repeatCount="indefinite" path={path} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
        </circle>
      )}

      {data.showLabel && (
        <EdgeLabelRenderer>
          <button
            onClick={() => data.onSelect?.()}
            style={{ transform: `translate(-50%,-50%) translate(${x}px,${y}px)` }}
            className="nodrag nopan absolute z-10 rounded border border-[var(--border)] bg-[var(--surface)]/95 px-1.5 py-0.5 text-left shadow-sm backdrop-blur-[1px] transition hover:border-[#5750f1]"
          >
            <div className="whitespace-nowrap text-[8px] font-semibold">{data.label}</div>
            <div className="whitespace-nowrap text-[7px] text-[var(--muted)]">{data.secondary}</div>
          </button>
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
const edgeTypes = { flow: FlowEdge };

export function ArchitectureCanvas({
  vms,
  statuses,
  software,
  sops,
  clusters = [],
  nasAssets = [],
  softwareReleases = [],
  softwareProducts = [],
}: {
  vms: VmAsset[];
  statuses: NetworkStatus[];
  software: SoftwareInstall[];
  sops: SopDocument[];
  clusters?: ClusterEntity[];
  nasAssets?: NasAsset[];
  softwareReleases?: SoftwareRelease[];
  softwareProducts?: SoftwareProduct[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ViewMode>("overview");
  const [envFilter, setEnvFilter] = useState("ALL");
  const [zone, setZone] = useState("ALL");
  const [overlay, setOverlay] = useState<OverlayMode>("live");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [flowAnimation, setFlowAnimation] = useState(false);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [positionOverrides, setPositionOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [query, setQuery] = useState("");

  // Drawers
  const [selectedVm, setSelectedVm] = useState<VmAsset | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<NetworkStatus | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterEntity | null>(null);
  const [selectedNas, setSelectedNas] = useState<NasAsset | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<SoftwareRelease | null>(null);

  // Filter VMs by environment
  const envVms = useMemo(
    () => vms.filter((v) => envFilter === "ALL" || v.environment === envFilter),
    [vms, envFilter]
  );
  const envVmIds = useMemo(() => new Set(envVms.map((v) => v.id)), [envVms]);

  // Filter statuses matching filtered VMs
  const envStatuses = useMemo(
    () => statuses.filter((s) => envVmIds.has(s.policy.sourceVmId)),
    [statuses, envVmIds]
  );

  const issueVmIds = useMemo(
    () =>
      new Set(
        envStatuses
          .filter((s) => s.overall !== "NORMAL")
          .flatMap((s) => [s.policy.sourceVmId, s.policy.targetVmId].filter(Boolean) as string[])
      ),
    [envStatuses]
  );

  const { nodes, edges } = useMemo(() => {
    if (mode === "overview") {
      return buildOverview(envVms, envStatuses, issuesOnly, overlay, query, flowAnimation, setSelectedConnection);
    }
    if (mode === "service") {
      return buildServices(envVms, envStatuses, issuesOnly, overlay, query, flowAnimation, setSelectedConnection);
    }
    return buildVms(
      envVms,
      envStatuses,
      zone,
      issuesOnly,
      issueVmIds,
      overlay,
      query,
      flowAnimation,
      showEdgeLabels,
      clusters,
      nasAssets,
      setSelectedConnection
    );
  }, [mode, envVms, envStatuses, zone, issuesOnly, issueVmIds, overlay, query, flowAnimation, showEdgeLabels, clusters, nasAssets]);

  const layoutStorageKey = `rpa-topology-layout:v2:${mode}:${envFilter}:${zone}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(layoutStorageKey);
      setPositionOverrides(saved ? JSON.parse(saved) : {});
    } catch {
      setPositionOverrides({});
    }
  }, [layoutStorageKey]);

  const renderedNodes = useMemo(
    () => nodes.map((node) => ({ ...node, position: positionOverrides[node.id] ?? node.position })),
    [nodes, positionOverrides]
  );

  function saveNodePosition(nodeId: string, position: { x: number; y: number }) {
    const snapped = { x: Math.round(position.x / 20) * 20, y: Math.round(position.y / 20) * 20 };
    setPositionOverrides((current) => {
      const next = { ...current, [nodeId]: snapped };
      window.localStorage.setItem(layoutStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function resetLayout() {
    window.localStorage.removeItem(layoutStorageKey);
    setPositionOverrides({});
    setCanvasRevision((value) => value + 1);
  }

  function handleSearch(val: string) {
    setQuery(val);
    const q = val.trim().toLowerCase();
    if (!q) return;

    // Check if query directly matches a VM hostname or IP
    const hit = envVms.find((v) => `${v.hostname} ${v.ipAddress}`.toLowerCase().includes(q));
    if (hit) {
      setMode("vm");
      setZone(hit.zone);
      setSelectedVm(hit);
    }
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  return (
    <div ref={containerRef} className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      {/* Top Architecture Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] p-2">
        {/* Left side: View Mode, Environment, and Zone */}
        <div className="flex items-center gap-2">
          {/* View: Overview / Service / VM */}
          <Segment value={mode} setValue={setMode} />

          {/* Environment Filter */}
          <div className="flex items-center gap-1 text-[9px] text-[var(--muted)]">
            <span>Env:</span>
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[9px] outline-none"
            >
              <option value="ALL">ALL</option>
              <option value="PROD">PROD</option>
              <option value="STG">STG</option>
              <option value="DEV">DEV</option>
            </select>
          </div>

          {/* Tier Zone Filter (VM drill-down mode) */}
          {mode === "vm" && (
            <div className="flex items-center gap-1 text-[9px] text-[var(--muted)]">
              <span>Tier:</span>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[9px] outline-none"
              >
                <option value="ALL">All tiers</option>
                {zoneOrder
                  .filter((z) => z !== "EXTERNAL")
                  .map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Right side: Overlay Toggle, Flow Animation Toggle, Search, Issues Only, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Overlay: Policy / Live */}
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            <button
              onClick={() => setOverlay("policy")}
              className={`h-6 rounded px-2 text-[9px] font-medium transition ${
                overlay === "policy" ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"
              }`}
            >
              Policy
            </button>
            <button
              onClick={() => setOverlay("live")}
              className={`h-6 rounded px-2 text-[9px] font-medium transition ${
                overlay === "live" ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"
              }`}
            >
              Live
            </button>
          </div>

          {/* Flow Animation Toggle */}
          <button
            onClick={() => setFlowAnimation((prev) => !prev)}
            title="Toggle Probe Flow Particle Animation"
            className={`flex h-7 items-center gap-1 rounded-md border px-2 text-[9px] font-medium transition ${
              flowAnimation
                ? "border-[#5750f1] bg-[#5750f1]/10 text-[#5750f1]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${flowAnimation ? "bg-[#5750f1] animate-pulse" : "bg-[var(--muted)]"}`} />
            <span>Flow</span>
          </button>

          <button
            onClick={() => setShowEdgeLabels((value) => !value)}
            title="Show connection labels. Off by default on VM view to prevent label/node collisions."
            className={`flex h-7 items-center gap-1 rounded-md border px-2 text-[9px] font-medium transition ${
              showEdgeLabels
                ? "border-[#5750f1] bg-[#5750f1]/10 text-[#5750f1]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
            }`}
          >
            Labels
          </button>

          <button
            onClick={() => setLayoutEditMode((value) => !value)}
            title="Allow manual node movement. Dragging snaps to a 20px grid."
            className={`flex h-7 items-center gap-1 rounded-md border px-2 text-[9px] font-medium transition ${
              layoutEditMode
                ? "border-[#5750f1] bg-[#5750f1]/10 text-[#5750f1]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
            }`}
          >
            {layoutEditMode ? "Editing layout" : "Edit layout"}
          </button>

          <button
            onClick={resetLayout}
            title="Discard manual positions and restore the automatic hierarchical layout."
            className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[9px] text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            Auto layout
          </button>

          {/* Search: hostname / IP / port */}
          <div className="flex h-7 w-[200px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-transparent text-[9px] outline-none"
              placeholder="Search hostname, IP, port..."
            />
          </div>

          {/* Issues Only */}
          <label className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] px-2 text-[9px]">
            <input
              type="checkbox"
              checked={issuesOnly}
              onChange={(e) => setIssuesOnly(e.target.checked)}
              className="rounded"
            />
            <span>Issues only</span>
          </label>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
            className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[9px] text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <MaximizeIcon className="h-3.5 w-3.5" />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="relative h-[calc(100vh-170px)] min-h-[640px]">
        <ReactFlow
          key={`${mode}-${envFilter}-${zone}-${canvasRevision}`}
          nodes={renderedNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          minZoom={0.25}
          maxZoom={1.8}
          nodesDraggable={layoutEditMode}
          nodesConnectable={false}
          snapToGrid
          snapGrid={[20, 20]}
          elevateEdgesOnSelect
          onNodeDragStop={(_, node) => saveNodePosition(node.id, node.position)}
          onNodeClick={(_, node) => {
            const d = node.data as TopologyNodeData;
            if (d.vm) setSelectedVm(d.vm);
            else if (d.cluster) setSelectedCluster(d.cluster);
            else if (d.nas) setSelectedNas(d.nas);
          }}
          onNodeDoubleClick={(_, node) => {
            const d = node.data as TopologyNodeData;
            if (d.kind !== "group") return;
            if (zoneOrder.includes(d.key)) {
              setMode("vm");
              setZone(d.key);
              return;
            }
            const hit = envVms.find((v) => v.service === d.key);
            if (hit) {
              setMode("vm");
              setZone(hit.zone);
            }
          }}
          onEdgeClick={(_, edge) => {
            const d = edge.data as TopologyEdgeData;
            if (d?.status) setSelectedConnection(d.status);
          }}
        >
          <Background gap={20} size={1} color="var(--border)" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor="#c7cbd1" maskColor="rgba(17,24,39,.08)" />
        </ReactFlow>

        {/* Informative Legend Overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-[var(--border)] bg-[var(--surface)]/95 px-2.5 py-2 text-[8px] text-[var(--muted)] shadow-sm">
          <div>
            <b className="text-[var(--foreground)]">Policy (Should Be)</b>: 승인/만료 ·{" "}
            <b className="text-[var(--foreground)]">Actual</b>: Source→Target Telegraf TCP probe (양방향 지원)
          </div>
          <div className="mt-0.5">
            더블클릭 → 티어 드릴다운 · 노드/연결 클릭 → 우측 슬라이드 서랍 상세 · Labels → 포트 라벨 표시 · Edit layout → 20px 격자 스냅
          </div>
        </div>
      </div>

      {/* Slide Drawers (All slide from Right, width 460px) */}
      <VmDrawer
        vm={selectedVm}
        network={statuses}
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
        status={selectedConnection}
        open={!!selectedConnection}
        onClose={() => setSelectedConnection(null)}
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
          const hit = vms.find((v) => v.hostname === hostname);
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
    </div>
  );
}

function Segment({ value, setValue }: { value: ViewMode; setValue: (v: ViewMode) => void }) {
  return (
    <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
      {(["overview", "service", "vm"] as ViewMode[]).map((v) => (
        <button
          key={v}
          onClick={() => setValue(v)}
          className={`h-6 rounded px-2.5 text-[9px] font-medium transition ${
            value === v ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"
          }`}
        >
          {v === "overview" ? "Overview" : v === "service" ? "Service" : "VM"}
        </button>
      ))}
    </div>
  );
}

function buildOverview(
  vms: VmAsset[],
  statuses: NetworkStatus[],
  issuesOnly: boolean,
  overlay: OverlayMode,
  query: string,
  flowActive: boolean,
  onSelectConnection: (status: NetworkStatus) => void
) {
  const q = query.trim().toLowerCase();
  const issueIds = new Set(
    statuses
      .filter((s) => s.overall !== "NORMAL")
      .flatMap((s) => [s.policy.sourceVmId, s.policy.targetVmId].filter(Boolean) as string[])
  );

  const groups = zoneOrder
    .filter((z) => z !== "EXTERNAL")
    .map((z) => {
      const list = vms.filter((v) => v.zone === z);
      const healthy = list.filter((v) => v.health === "healthy").length;
      const warning = list.filter((v) => v.health === "warning").length;
      const critical = list.filter((v) => v.health === "critical").length;
      const issues = list.filter((v) => issueIds.has(v.id)).length + warning + critical;
      const connCount = statuses.filter(
        (s) =>
          list.some((v) => v.id === s.policy.sourceVmId) ||
          list.some((v) => v.id === s.policy.targetVmId)
      ).length;

      return {
        z,
        list,
        healthy,
        warning,
        critical,
        connCount,
        issues,
      };
    })
    .filter((g) => g.list.length > 0 && (issuesOnly ? g.issues > 0 : true));

  const externalNames = Array.from(
    new Set(statuses.filter((s) => !s.policy.targetVmId).map((s) => s.policy.targetName))
  );

  const nodes: Node<TopologyNodeData>[] = [
    ...groups.map((g) => ({
      id: `zone-${g.z}`,
      type: "tier",
      position: zonePos[g.z] ?? { x: 0, y: 0 },
      style: { width: 200, height: 116 },
      data: {
        kind: "group" as const,
        key: g.z,
        label: `${g.z} TIER`,
        count: g.list.length,
        healthyCount: g.healthy,
        warningCount: g.warning,
        criticalCount: g.critical,
        connectionsCount: g.connCount,
        issueCount: g.issues,
      },
    })),
    ...(externalNames.length && (!issuesOnly || statuses.some((s) => !s.policy.targetVmId && s.overall !== "NORMAL"))
      ? [
          {
            id: "zone-EXTERNAL",
            type: "tier",
            position: zonePos.EXTERNAL,
            style: { width: 200, height: 116 },
            data: {
              kind: "external" as const,
              key: "EXTERNAL",
              label: "EXTERNAL",
              count: externalNames.length,
              issueCount: statuses.filter((s) => !s.policy.targetVmId && s.overall !== "NORMAL").length,
            },
          },
        ]
      : []),
  ];

  const vmZone = Object.fromEntries(vms.map((v) => [v.id, v.zone]));
  const agg = new Map<string, { source: string; target: string; count: number; issues: number; sample?: NetworkStatus }>();

  for (const s of statuses) {
    if (issuesOnly && s.overall === "NORMAL") continue;
    if (q && !`${s.policy.port} ${s.policy.sourceName} ${s.policy.targetName}`.toLowerCase().includes(q)) {
      continue;
    }
    const src = vmZone[s.policy.sourceVmId];
    const tgt = s.policy.targetVmId ? vmZone[s.policy.targetVmId] : "EXTERNAL";
    if (!src || !tgt || src === tgt) continue;
    const key = `${src}->${tgt}`;
    const cur = agg.get(key) ?? { source: src, target: tgt, count: 0, issues: 0, sample: s };
    cur.count++;
    if (s.overall !== "NORMAL") cur.issues++;
    agg.set(key, cur);
  }

  const edges: Edge<TopologyEdgeData>[] = [...agg.entries()].map(([id, a]) => {
    const label = overlay === "policy" ? `${a.count} Policies` : `${a.count} Flows`;
    const secondary =
      overlay === "policy"
        ? a.issues
          ? `${a.issues} Expiring/Issue`
          : "All Approved"
        : a.issues
          ? `${a.issues} TCP Attention`
          : "All Reachable";

    return {
      id,
      type: "flow",
      source: `zone-${a.source}`,
      target: `zone-${a.target}`,
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
      data: {
        label,
        secondary,
        issueCount: a.issues,
        status: a.sample,
        flowActive,
        showLabel: true,
        onSelect: () => a.sample && onSelectConnection(a.sample),
      },
    };
  });

  return { nodes, edges };
}

function buildServices(
  vms: VmAsset[],
  statuses: NetworkStatus[],
  issuesOnly: boolean,
  overlay: OverlayMode,
  query: string,
  flowActive: boolean,
  onSelectConnection: (status: NetworkStatus) => void
) {
  const q = query.trim().toLowerCase();
  const services = Array.from(new Set(vms.map((v) => v.service)));
  const vmService = Object.fromEntries(vms.map((v) => [v.id, v.service]));

  const issueByService = new Map<string, number>();
  for (const s of statuses.filter((s) => s.overall !== "NORMAL")) {
    const a = vmService[s.policy.sourceVmId];
    if (a) issueByService.set(a, (issueByService.get(a) || 0) + 1);
    if (s.policy.targetVmId) {
      const b = vmService[s.policy.targetVmId];
      if (b) issueByService.set(b, (issueByService.get(b) || 0) + 1);
    }
  }

  const visible = services.filter((s) => !issuesOnly || (issueByService.get(s) || 0) > 0);
  const nodes: Node<TopologyNodeData>[] = visible.map((service, i) => {
    const sVms = vms.filter((v) => v.service === service);
    return {
      id: `svc-${service}`,
      type: "tier",
      position: { x: (i % 3) * 280 + 80, y: Math.floor(i / 3) * 170 + 90 },
      style: { width: 200, height: 116 },
      data: {
        kind: "group" as const,
        key: service,
        label: service,
        count: sVms.length,
        healthyCount: sVms.filter((v) => v.health === "healthy").length,
        warningCount: sVms.filter((v) => v.health === "warning").length,
        criticalCount: sVms.filter((v) => v.health === "critical").length,
        connectionsCount: statuses.filter(
          (s) =>
            sVms.some((v) => v.id === s.policy.sourceVmId) ||
            sVms.some((v) => v.id === s.policy.targetVmId)
        ).length,
        issueCount: issueByService.get(service) || 0,
      },
    };
  });

  const externals = Array.from(
    new Set(statuses.filter((s) => !s.policy.targetVmId && (issuesOnly ? s.overall !== "NORMAL" : true)).map((s) => s.policy.targetName))
  );
  externals.forEach((name, i) =>
    nodes.push({
      id: `ext-${name}`,
      type: "tier",
      position: { x: 940, y: 90 + i * 150 },
      style: { width: 200, height: 116 },
      data: {
        kind: "external" as const,
        key: name,
        label: name,
        sublabel: "External dependency",
        issueCount: statuses.filter((s) => s.policy.targetName === name && s.overall !== "NORMAL").length,
      },
    })
  );

  const agg = new Map<string, { src: string; tgt: string; count: number; issues: number; sample?: NetworkStatus }>();
  for (const s of statuses) {
    if (issuesOnly && s.overall === "NORMAL") continue;
    if (q && !`${s.policy.port} ${s.policy.sourceName} ${s.policy.targetName}`.toLowerCase().includes(q)) {
      continue;
    }
    const src = vmService[s.policy.sourceVmId];
    const tgt = s.policy.targetVmId ? vmService[s.policy.targetVmId] : s.policy.targetName;
    if (!src || !tgt || src === tgt) continue;
    const k = `${src}->${tgt}`;
    const a = agg.get(k) ?? { src, tgt, count: 0, issues: 0, sample: s };
    a.count++;
    if (s.overall !== "NORMAL") a.issues++;
    agg.set(k, a);
  }

  const edges: Edge<TopologyEdgeData>[] = [...agg.entries()].map(([id, a]) => ({
    id,
    type: "flow",
    source: `svc-${a.src}`,
    target: services.includes(a.tgt) ? `svc-${a.tgt}` : `ext-${a.tgt}`,
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    data: {
      label: overlay === "policy" ? `${a.count} Policies` : `${a.count} Flows`,
      secondary: a.issues ? `${a.issues} Issues` : overlay === "policy" ? "Approved" : "Reachable",
      issueCount: a.issues,
      status: a.sample,
      flowActive,
      showLabel: true,
      onSelect: () => a.sample && onSelectConnection(a.sample),
    },
  }));

  return { nodes, edges };
}

function buildVms(
  vms: VmAsset[],
  statuses: NetworkStatus[],
  zone: string,
  issuesOnly: boolean,
  issueVmIds: Set<string>,
  overlay: OverlayMode,
  query: string,
  flowActive: boolean,
  showEdgeLabels: boolean,
  clusters: ClusterEntity[],
  nasAssets: NasAsset[],
  onSelectConnection: (status: NetworkStatus) => void
) {
  const q = query.trim().toLowerCase();
  const visible = vms.filter(
    (v) =>
      (zone === "ALL" || v.zone === zone) &&
      (!issuesOnly || issueVmIds.has(v.id)) &&
      (!q || `${v.hostname} ${v.ipAddress} ${v.service}`.toLowerCase().includes(q))
  );
  const visibleIds = new Set(visible.map((v) => v.id));

  // Automatic hierarchical/swim-lane layout.
  // The default layout favors readable service flow; users can make small final adjustments in Edit layout mode.
  const VM_W = 230;
  const VM_H = 125;
  const X_STEP = 270;
  const Y_STEP = 165;

  const zoneSpec: Record<string, { x: number; y: number; cols: number }> = {
    WEB: { x: 520, y: 40, cols: 4 },
    APP: { x: 260, y: 300, cols: 6 },
    DB: { x: 520, y: 590, cols: 4 },
    CONTROL: { x: -620, y: 300, cols: 2 },
    BOT: { x: -880, y: 590, cols: 4 },
    VDI: { x: -880, y: 930, cols: 4 },
    SUPPORT: { x: 2240, y: 590, cols: 2 },
  };

  function positionForVm(vm: VmAsset, indexWithinZone: number, zoneCount: number) {
    if (zone !== "ALL") {
      const cols = Math.min(4, Math.max(1, zoneCount));
      return {
        x: (indexWithinZone % cols) * X_STEP + 80,
        y: Math.floor(indexWithinZone / cols) * Y_STEP + 80,
      };
    }

    const spec = zoneSpec[vm.zone] ?? { x: 520, y: 1180, cols: 4 };
    return {
      x: spec.x + (indexWithinZone % spec.cols) * X_STEP,
      y: spec.y + Math.floor(indexWithinZone / spec.cols) * Y_STEP,
    };
  }

  const zoneIndexes = new Map<string, number>();
  const zoneCounts = new Map<string, number>();
  for (const vm of visible) zoneCounts.set(vm.zone, (zoneCounts.get(vm.zone) ?? 0) + 1);

  const nodes: Node<TopologyNodeData>[] = visible.map((vm) => {
    const indexWithinZone = zoneIndexes.get(vm.zone) ?? 0;
    zoneIndexes.set(vm.zone, indexWithinZone + 1);
    return {
      id: vm.id,
      type: "vm",
      position: positionForVm(vm, indexWithinZone, zoneCounts.get(vm.zone) ?? 1),
      style: { width: VM_W, height: VM_H },
      data: { kind: "vm" as const, key: vm.id, label: vm.hostname, vm },
    };
  });

  // Append logical cluster nodes close to the DB lane (or below a filtered tier).
  const relevantClusters = clusters.filter(
    (c) => (zone === "ALL" || c.zone === zone) && (!issuesOnly || c.status !== "HEALTHY")
  );
  relevantClusters.forEach((cluster, index) => {
    const position =
      zone === "ALL"
        ? { x: 760 + index * X_STEP, y: 805 }
        : { x: (index % 4) * X_STEP + 80, y: Math.ceil(visible.length / 4) * Y_STEP + 110 };
    nodes.push({
      id: `cluster-${cluster.id}`,
      type: "cluster",
      position,
      style: { width: 230, height: 135 },
      data: {
        kind: "cluster" as const,
        key: cluster.id,
        label: cluster.name,
        cluster,
      },
    });
  });

  // Append NAS assets near the support/data lane.
  const relevantNas = nasAssets.filter(
    (n) => (zone === "ALL" || n.zone === zone) && (!issuesOnly || n.status !== "ONLINE")
  );
  relevantNas.forEach((nas, index) => {
    const position =
      zone === "ALL"
        ? { x: 2240 + (index % 2) * X_STEP, y: 940 + Math.floor(index / 2) * Y_STEP }
        : {
            x: (index % 4) * X_STEP + 80,
            y: (Math.ceil(visible.length / 4) + Math.ceil(relevantClusters.length / 4)) * Y_STEP + 110,
          };
    nodes.push({
      id: `nas-${nas.id}`,
      type: "nas",
      position,
      style: { width: 230, height: 135 },
      data: {
        kind: "nas" as const,
        key: nas.id,
        label: nas.hostname,
        nas,
      },
    });
  });

  // External targets are kept in a dedicated lane to prevent them from cutting across VM cards.
  const extMap = new Map<string, number>();
  for (const s of statuses) {
    if (visibleIds.has(s.policy.sourceVmId) && !s.policy.targetVmId && (!issuesOnly || s.overall !== "NORMAL")) {
      extMap.set(s.policy.targetName, (extMap.get(s.policy.targetName) || 0) + (s.overall !== "NORMAL" ? 1 : 0));
    }
  }

  let externalIndex = 0;
  for (const [name, issues] of extMap) {
    nodes.push({
      id: `ext-${name}`,
      type: "tier",
      position: zone === "ALL"
        ? { x: 2240, y: 120 + externalIndex++ * 150 }
        : { x: 1180, y: 80 + externalIndex++ * 150 },
      style: { width: 200, height: 116 },
      data: {
        kind: "external" as const,
        key: name,
        label: name,
        sublabel: "External dependency",
        issueCount: issues,
      },
    });
  }

  const edges: Edge<TopologyEdgeData>[] = statuses
    .filter(
      (s) =>
        visibleIds.has(s.policy.sourceVmId) &&
        (s.policy.targetVmId ? visibleIds.has(s.policy.targetVmId) : true) &&
        (!issuesOnly || s.overall !== "NORMAL") &&
        (!q || `${s.policy.port} ${s.policy.protocol} ${s.policy.requestId ?? ""}`.toLowerCase().includes(q))
    )
    .map((s) => {
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
            : `TCP ${s.observation?.tcp ?? "NO DATA"}${
                s.observation?.tcpLatencyMs != null ? ` (${s.observation.tcpLatencyMs}ms)` : ""
              }`;

      const sourceId = s.policy.sourceVmId;
      const targetId = s.policy.targetVmId ?? `ext-${s.policy.targetName}`;
      const sourceNode = nodes.find((node) => node.id === sourceId);
      const targetNode = nodes.find((node) => node.id === targetId);
      const horizontalForward =
        Boolean(sourceNode && targetNode) &&
        (targetNode!.position.x - sourceNode!.position.x) > Math.abs(targetNode!.position.y - sourceNode!.position.y);

      return {
        id: s.policy.id,
        type: "flow",
        source: sourceId,
        target: targetId,
        sourceHandle: horizontalForward ? "r" : undefined,
        targetHandle: horizontalForward ? "l" : undefined,
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
        markerStart: isBidi ? { type: MarkerType.ArrowClosed, width: 12, height: 12 } : undefined,
        data: {
          label,
          secondary,
          issueCount: s.overall === "NORMAL" ? 0 : 1,
          status: s,
          flowActive,
          // On a 30+ VM canvas, edge labels are opt-in. Status is conveyed by line color/dash; click opens full detail.
          showLabel: showEdgeLabels,
          onSelect: () => onSelectConnection(s),
        },
      };
    });

  return { nodes, edges };
}
