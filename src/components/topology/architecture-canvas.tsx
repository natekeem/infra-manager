"use client";

import { useMemo, useRef, useState } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { NetworkStatus, SoftwareInstall, SopDocument, VmAsset } from "@/domain/models";
import { VmDrawer } from "@/components/infrastructure/vm-drawer";
import { ConnectionDrawer } from "@/components/network/connection-drawer";
import { MaximizeIcon, SearchIcon } from "@/components/common/icons";

type ViewMode = "overview" | "service" | "vm";
type OverlayMode = "policy" | "live";

export type TopologyNodeData = {
  kind: "group" | "vm" | "external";
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
};

export type TopologyEdgeData = {
  label: string;
  secondary: string;
  issueCount: number;
  status?: NetworkStatus;
  onSelect?: () => void;
};

const zoneOrder = ["WEB", "APP", "DB", "CONTROL", "BOT", "VDI", "SUPPORT", "EXTERNAL"];
const zonePos: Record<string, { x: number; y: number }> = {
  WEB: { x: 380, y: 70 },
  APP: { x: 380, y: 260 },
  DB: { x: 380, y: 460 },
  CONTROL: { x: 60, y: 160 },
  BOT: { x: 60, y: 350 },
  VDI: { x: 60, y: 530 },
  SUPPORT: { x: 700, y: 460 },
  EXTERNAL: { x: 700, y: 200 },
};

function statusColor(issueCount: number, status?: NetworkStatus) {
  if (status?.overall.includes("UNREACHABLE") || status?.overall === "UNREACHABLE") return "#f04438";
  if (status?.overall === "EXPIRING" || status?.overall.includes("EXPIRED")) return "#f79009";
  return issueCount > 0 ? "#f79009" : "#98a2b3";
}

function GroupNode({ data, selected }: NodeProps<Node<TopologyNodeData>>) {
  const isExternal = data.kind === "external";
  return (
    <div
      className={`w-[194px] rounded-md border bg-[var(--surface)] p-2.5 shadow-sm transition ${
        selected ? "border-[#5750f1] ring-1 ring-[#5750f1]/20" : "border-[var(--border-strong)]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle id="l" type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle id="r" type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />

      <div className="flex items-center justify-between gap-1 border-b border-[var(--border)] pb-1.5">
        <span className="truncate text-[11px] font-bold tracking-tight">{data.label}</span>
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
      className={`w-[164px] rounded-md border bg-[var(--surface)] px-2.5 py-2 shadow-sm transition ${
        selected ? "border-[#5750f1] ring-1 ring-[#5750f1]/20" : "border-[var(--border)]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle id="r" type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />
      <Handle id="l" type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-[#98a2b3]" />

      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[10px] font-semibold">{vm.hostname}</span>
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            vm.health === "healthy" ? "bg-[#12b76a]" : vm.health === "critical" ? "bg-[#f04438]" : "bg-[#f79009]"
          }`}
        />
      </div>
      <div className="mt-0.5 flex items-center justify-between text-[8px] text-[var(--muted)]">
        <span className="font-mono">{vm.ipAddress}</span>
        <span className="rounded bg-[var(--surface-2)] px-1 py-0.2 font-mono text-[7px]">{vm.environment}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[8px]">
        <Metric k="CPU" v={vm.cpuPct} />
        <Metric k="MEM" v={vm.memoryPct} />
        <Metric k="DISK" v={vm.diskPct} />
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
  const [path, x, y] = getSmoothStepPath(props);
  const data = props.data!;
  const color = statusColor(data.issueCount, data.status);
  return (
    <>
      <BaseEdge
        path={path}
        style={{
          stroke: color,
          strokeWidth: data.issueCount ? 1.8 : 1.2,
          strokeDasharray: data.status?.observation?.tcp === "DOWN" ? "5 4" : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <button
          onClick={() => data.onSelect?.()}
          style={{ transform: `translate(-50%,-50%) translate(${x}px,${y}px)` }}
          className="nodrag nopan absolute rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-left shadow-sm transition hover:border-[#5750f1]"
        >
          <div className="whitespace-nowrap text-[8px] font-semibold">{data.label}</div>
          <div className="whitespace-nowrap text-[7px] text-[var(--muted)]">{data.secondary}</div>
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { group: GroupNode, vm: VmNode };
const edgeTypes = { flow: FlowEdge };

export function ArchitectureCanvas({
  vms,
  statuses,
  software,
  sops,
}: {
  vms: VmAsset[];
  statuses: NetworkStatus[];
  software: SoftwareInstall[];
  sops: SopDocument[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ViewMode>("overview");
  const [envFilter, setEnvFilter] = useState("ALL");
  const [zone, setZone] = useState("ALL");
  const [overlay, setOverlay] = useState<OverlayMode>("live");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedVm, setSelectedVm] = useState<VmAsset | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<NetworkStatus | null>(null);

  // Filter VMs by environment first
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
      return buildOverview(envVms, envStatuses, issuesOnly, overlay, query);
    }
    if (mode === "service") {
      return buildServices(envVms, envStatuses, issuesOnly, overlay, query);
    }
    return buildVms(envVms, envStatuses, zone, issuesOnly, issueVmIds, overlay, query, setSelectedConnection);
  }, [mode, envVms, envStatuses, zone, issuesOnly, issueVmIds, overlay, query]);

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
        {/* Left side: View Mode, Environment, and Zone (if in VM mode) */}
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

          {/* Tier Zone Filter (only when in VM drill-down mode) */}
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

        {/* Right side: Overlay Toggle, Search (hostname / IP / port), Issues Only, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Overlay: Policy / Live */}
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            <button
              onClick={() => setOverlay("policy")}
              className={`h-6 rounded px-2 text-[9px] font-medium transition ${
                overlay === "policy" ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--muted)]"
              }`}
            >
              Policy
            </button>
            <button
              onClick={() => setOverlay("live")}
              className={`h-6 rounded px-2 text-[9px] font-medium transition ${
                overlay === "live" ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--muted)]"
              }`}
            >
              Live
            </button>
          </div>

          {/* Search: hostname / IP / port */}
          <div className="flex h-7 w-[220px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
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
            className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[9px] text-[var(--muted)] transition hover:text-[var(--text)]"
          >
            <MaximizeIcon className="h-3.5 w-3.5" />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>

      {/* React Flow Canvas (Maximized) */}
      <div className="relative h-[calc(100vh-170px)] min-h-[640px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          minZoom={0.25}
          maxZoom={1.8}
          onNodeClick={(_, node) => {
            const d = node.data as TopologyNodeData;
            if (d.vm) setSelectedVm(d.vm);
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
            if (d.status) setSelectedConnection(d.status);
          }}
        >
          <Background gap={24} size={1} color="var(--border)" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor="#c7cbd1" maskColor="rgba(17,24,39,.08)" />
        </ReactFlow>

        {/* Informative Legend Overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-[var(--border)] bg-[var(--surface)]/95 px-2.5 py-2 text-[8px] text-[var(--muted)] shadow-sm">
          <div>
            <b className="text-[var(--text)]">Policy (Should Be)</b>: 승인/만료 ·{" "}
            <b className="text-[var(--text)]">Actual</b>: Source→Target Telegraf TCP probe
          </div>
          <div className="mt-0.5">
            그룹 더블클릭 → 해당 티어 VM 드릴다운 · VM/연결 클릭 → 왼쪽 Drawer 상세
          </div>
        </div>
      </div>

      {/* Slide Drawers (440px from left) */}
      <VmDrawer
        vm={selectedVm}
        network={statuses}
        software={software}
        sops={sops}
        open={!!selectedVm}
        onClose={() => setSelectedVm(null)}
      />
      <ConnectionDrawer
        status={selectedConnection}
        open={!!selectedConnection}
        onClose={() => setSelectedConnection(null)}
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
            value === v ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--muted)]"
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
  query: string
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
      type: "group",
      position: zonePos[g.z] ?? { x: 0, y: 0 },
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
            type: "group",
            position: zonePos.EXTERNAL,
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
      data: {
        label,
        secondary,
        issueCount: a.issues,
        status: a.sample,
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
  query: string
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
      type: "group",
      position: { x: (i % 3) * 280 + 80, y: Math.floor(i / 3) * 170 + 90 },
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
      type: "group",
      position: { x: 920, y: 90 + i * 150 },
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
    data: {
      label: overlay === "policy" ? `${a.count} Policies` : `${a.count} Flows`,
      secondary: a.issues ? `${a.issues} Issues` : overlay === "policy" ? "Approved" : "Reachable",
      issueCount: a.issues,
      status: a.sample,
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

  const nodes: Node<TopologyNodeData>[] = visible.map((vm, i) => ({
    id: vm.id,
    type: "vm",
    position: { x: (i % 5) * 210 + 60, y: Math.floor(i / 5) * 145 + 70 },
    data: { kind: "vm" as const, key: vm.id, label: vm.hostname, vm },
  }));

  const extMap = new Map<string, number>();
  for (const s of statuses) {
    if (visibleIds.has(s.policy.sourceVmId) && !s.policy.targetVmId && (!issuesOnly || s.overall !== "NORMAL")) {
      extMap.set(s.policy.targetName, (extMap.get(s.policy.targetName) || 0) + (s.overall !== "NORMAL" ? 1 : 0));
    }
  }

  let ei = 0;
  for (const [name, issues] of extMap) {
    nodes.push({
      id: `ext-${name}`,
      type: "group",
      position: { x: 1120, y: 70 + ei++ * 140 },
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
      const label = `${s.policy.protocol}/${s.policy.port}`;
      const secondary =
        overlay === "policy"
          ? `${s.policy.approvalStatus}${
              s.daysToExpiry != null
                ? ` · ${s.daysToExpiry >= 0 ? `D-${s.daysToExpiry}` : `D+${Math.abs(s.daysToExpiry)}`}`
                : ""
            }`
          : `TCP ${s.observation?.tcp ?? "NO DATA"}${
              s.observation?.tcpLatencyMs != null ? ` (${s.observation.tcpLatencyMs}ms)` : ""
            }`;

      return {
        id: s.policy.id,
        type: "flow",
        source: s.policy.sourceVmId,
        target: s.policy.targetVmId ?? `ext-${s.policy.targetName}`,
        data: {
          label,
          secondary,
          issueCount: s.overall === "NORMAL" ? 0 : 1,
          status: s,
          onSelect: () => onSelectConnection(s),
        },
      };
    });

  return { nodes, edges };
}
