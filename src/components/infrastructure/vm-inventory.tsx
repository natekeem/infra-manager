"use client";

import { useMemo, useState } from "react";
import type { Asset, NetworkStatus, SoftwareInstall, SopDocument } from "@/domain/models";
import { Badge } from "@/components/tailgrids/core/badge";
import { VmDrawer } from "./vm-drawer";
import { getEoslState } from "@/domain/eosl";
import { SearchIcon } from "@/components/common/icons";
import { useProjectGroup } from "@/context/project-group-context";

export function VmInventory({
  vms,
  network,
  software,
  sops,
}: {
  vms: Asset[];
  network: NetworkStatus[];
  software: SoftwareInstall[];
  sops: SopDocument[];
}) {
  const { activeProject } = useProjectGroup();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [envFilter, setEnvFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [eoslFilter, setEoslFilter] = useState("ALL");
  const [selected, setSelected] = useState<Asset | null>(null);

  // Scoped project assets
  const projectVms = useMemo(
    () => vms.filter((v) => !v.projectGroupId || v.projectGroupId === activeProject.id),
    [vms, activeProject.id]
  );

  const assetTypes = useMemo(() => ["ALL", ...Array.from(new Set(projectVms.map((v) => v.assetType || "VM")))], [projectVms]);
  const roles = useMemo(() => ["ALL", ...Array.from(new Set(projectVms.map((v) => v.role)))], [projectVms]);
  const environments = useMemo(() => ["ALL", ...Array.from(new Set(projectVms.map((v) => v.environment)))], [projectVms]);

  const now = new Date("2026-09-21T00:28:00+09:00");

  const filtered = useMemo(() => {
    return projectVms.filter((vm) => {
      // 1. Search: hostname, IP, service, domain
      const q = `${vm.hostname} ${vm.ipAddress} ${vm.service} ${vm.domain ?? ""}`.toLowerCase();
      if (query && !q.includes(query.toLowerCase())) return false;

      // 2. Filter: Asset Type
      if (typeFilter !== "ALL" && (vm.assetType || "VM") !== typeFilter) return false;

      // 3. Filter: Environment
      if (envFilter !== "ALL" && vm.environment !== envFilter) return false;

      // 4. Filter: Role
      if (roleFilter !== "ALL" && vm.role !== roleFilter) return false;

      // 5. Filter: Status
      if (statusFilter !== "ALL" && vm.health !== statusFilter) return false;

      // 6. Filter: EOSL Risk
      if (eoslFilter !== "ALL") {
        const eoslState = getEoslState(vm.eoslDate, now).state;
        if (eoslState !== eoslFilter) return false;
      }

      return true;
    });
  }, [projectVms, query, typeFilter, envFilter, roleFilter, statusFilter, eoslFilter]);

  const networkByVm = (id: string) =>
    network.filter((n) => n.policy.sourceVmId === id || n.policy.targetVmId === id);

  return (
    <>
      {/* Search and 5-Axis Filter Bar */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search: hostname, IP, service */}
          <div className="flex h-8 min-w-[220px] max-w-[320px] flex-1 items-center gap-2 rounded-md border border-[var(--border)] px-2.5">
            <SearchIcon className="h-3.5 w-3.5 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[11px] outline-none"
              placeholder="호스트명, IP, 도메인, 서비스 검색..."
            />
          </div>

          {/* Filter 1: Type */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>유형:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] outline-none"
            >
              {assetTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Filter 2: Environment */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>환경:</span>
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] outline-none"
            >
              {environments.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Filter 3: Role */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>역할:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] outline-none"
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Filter 4: Status */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>상태:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] outline-none"
            >
              <option value="ALL">전체</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Filter 5: EOSL */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>EOSL:</span>
            <select
              value={eoslFilter}
              onChange={(e) => setEoslFilter(e.target.value)}
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] outline-none"
            >
              <option value="ALL">전체</option>
              <option value="EOSL">만료됨 (EOSL)</option>
              <option value="D90">D90 (≤90일)</option>
              <option value="D180">D180 (≤180일)</option>
              <option value="SUPPORTED">지원 중</option>
            </select>
          </div>
        </div>

        {/* Counts summary */}
        <div className="px-2 text-[10px] text-[var(--muted)] tabular-nums">
          표시 <b>{filtered.length}</b> / {projectVms.length} 자산
        </div>
      </div>

      {/* Dense 12-Column Asset Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-[11px]">
            <thead>
              <tr className="h-9 border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                <th className="px-3 py-1.5 font-medium">호스트명</th>
                <th className="px-3 py-1.5 font-medium">유형</th>
                <th className="px-3 py-1.5 font-medium">IP</th>
                <th className="px-3 py-1.5 font-medium">환경</th>
                <th className="px-3 py-1.5 font-medium">도메인</th>
                <th className="px-3 py-1.5 font-medium">역할</th>
                <th className="px-3 py-1.5 font-medium">서비스</th>
                <th className="px-3 py-1.5 font-medium">CPU</th>
                <th className="px-3 py-1.5 font-medium">Memory</th>
                <th className="px-3 py-1.5 font-medium">Disk</th>
                <th className="px-3 py-1.5 font-medium">네트워크</th>
                <th className="px-3 py-1.5 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((vm) => {
                const net = networkByVm(vm.id);
                const netIssues = net.filter((n) => n.overall !== "NORMAL").length;
                const isCpuHigh = (vm.cpuPct ?? 0) >= 80;
                const isMemHigh = (vm.memoryPct ?? 0) >= 85;
                const isDiskHigh = (vm.diskPct ?? 0) >= 85;

                return (
                  <tr
                    key={vm.id}
                    onClick={() => setSelected(vm)}
                    className="h-[34px] cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors"
                  >
                    {/* Hostname */}
                    <td className="px-3 py-1 font-semibold text-[11px]">
                      {vm.hostname}
                    </td>

                    {/* Type */}
                    <td className="px-3 py-1 font-mono text-[9px] text-[var(--muted)]">
                      <span className="rounded bg-[var(--surface-2)] px-1 py-0.5">
                        {vm.assetType || "VM"}
                      </span>
                    </td>

                    {/* IP */}
                    <td className="px-3 py-1 font-mono text-[10px] text-[var(--muted)]">
                      {vm.ipAddress}
                    </td>

                    {/* Environment */}
                    <td className="px-3 py-1">
                      <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[var(--text)]">
                        {vm.environment}
                      </span>
                    </td>

                    {/* Domain */}
                    <td className="px-3 py-1 font-mono text-[9.5px] text-[var(--muted)]">
                      {vm.domain || "-"}
                    </td>

                    {/* Role */}
                    <td className="px-3 py-1 text-[11px]">
                      {vm.role}
                    </td>

                    {/* Service */}
                    <td className="px-3 py-1 text-[11px] text-[var(--muted)]">
                      {vm.service}
                    </td>

                    {/* CPU */}
                    <td className="px-3 py-1 font-mono text-[10px] tabular-nums">
                      <span className={isCpuHigh ? "font-bold text-[#b54708]" : ""}>
                        {vm.cpuPct ?? 0}%
                      </span>
                    </td>

                    {/* Memory */}
                    <td className="px-3 py-1 font-mono text-[10px] tabular-nums">
                      <span className={isMemHigh ? "font-bold text-[#b54708]" : ""}>
                        {vm.memoryPct ?? 0}%
                      </span>
                    </td>

                    {/* Disk */}
                    <td className="px-3 py-1 font-mono text-[10px] tabular-nums">
                      <span className={isDiskHigh ? "font-bold text-[#b54708]" : ""}>
                        {vm.diskPct ?? 0}%
                      </span>
                    </td>

                    {/* Network */}
                    <td className="px-3 py-1 text-[10px]">
                      {netIssues > 0 ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {netIssues} 이슈
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                      )}
                    </td>

                    {/* Health Status */}
                    <td className="px-3 py-1">
                      <Badge tone={vm.health === "critical" ? "danger" : vm.health === "warning" ? "warning" : "success"}>
                        {vm.health}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide Drawer for Asset Inspection */}
      <VmDrawer
        vm={selected}
        network={network}
        software={software}
        sops={sops}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
