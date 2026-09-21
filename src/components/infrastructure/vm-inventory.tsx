"use client";

import { useMemo, useState } from "react";
import type { NetworkStatus, SoftwareInstall, SopDocument, VmAsset } from "@/domain/models";
import { Badge } from "@/components/tailgrids/core/badge";
import { VmDrawer } from "./vm-drawer";
import { getEoslState } from "@/domain/eosl";
import { SearchIcon } from "@/components/common/icons";

export function VmInventory({
  vms,
  network,
  software,
  sops,
}: {
  vms: VmAsset[];
  network: NetworkStatus[];
  software: SoftwareInstall[];
  sops: SopDocument[];
}) {
  const [query, setQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [eoslFilter, setEoslFilter] = useState("ALL");
  const [selected, setSelected] = useState<VmAsset | null>(null);

  const roles = useMemo(() => ["ALL", ...Array.from(new Set(vms.map((v) => v.role)))], [vms]);
  const environments = useMemo(() => ["ALL", ...Array.from(new Set(vms.map((v) => v.environment)))], [vms]);

  const now = new Date("2026-09-21T00:28:00+09:00");

  const filtered = useMemo(() => {
    return vms.filter((vm) => {
      // 1. Search: hostname, IP, service
      const q = `${vm.hostname} ${vm.ipAddress} ${vm.service}`.toLowerCase();
      if (query && !q.includes(query.toLowerCase())) return false;

      // 2. Filter: Environment
      if (envFilter !== "ALL" && vm.environment !== envFilter) return false;

      // 3. Filter: Role
      if (roleFilter !== "ALL" && vm.role !== roleFilter) return false;

      // 4. Filter: Status
      if (statusFilter !== "ALL" && vm.health !== statusFilter) return false;

      // 5. Filter: EOSL Risk
      if (eoslFilter !== "ALL") {
        const eoslState = getEoslState(vm.eoslDate, now).state;
        if (eoslState !== eoslFilter) return false;
      }

      return true;
    });
  }, [vms, query, envFilter, roleFilter, statusFilter, eoslFilter]);

  const networkByVm = (id: string) =>
    network.filter((n) => n.policy.sourceVmId === id || n.policy.targetVmId === id);

  return (
    <>
      {/* Search and 4-Axis Filter Bar */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search: hostname, IP, service */}
          <div className="flex h-8 min-w-[240px] max-w-[340px] flex-1 items-center gap-2 rounded-md border border-[var(--border)] px-2.5">
            <SearchIcon className="h-3.5 w-3.5 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[11px] outline-none"
              placeholder="Search hostname, IP, service..."
            />
          </div>

          {/* Filter 1: Environment */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>Env:</span>
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

          {/* Filter 2: Role */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>Role:</span>
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

          {/* Filter 3: Status */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Filter 4: EOSL Risk */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>EOSL:</span>
            <select
              value={eoslFilter}
              onChange={(e) => setEoslFilter(e.target.value)}
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] outline-none"
            >
              <option value="ALL">All EOSL</option>
              <option value="EOSL">EOSL Expired</option>
              <option value="D90">D90 (≤90d)</option>
              <option value="D180">D180 (≤180d)</option>
              <option value="SUPPORTED">Supported</option>
            </select>
          </div>
        </div>

        {/* Counts summary */}
        <div className="px-2 text-[10px] text-[var(--muted)] tabular-nums">
          Showing <b>{filtered.length}</b> / {vms.length} VMs
        </div>
      </div>

      {/* Dense 12-Column VM Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-[11px]">
            <thead>
              <tr className="h-9 border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                <th className="px-3 py-1.5 font-medium">Hostname</th>
                <th className="px-3 py-1.5 font-medium">IP</th>
                <th className="px-3 py-1.5 font-medium">Environment</th>
                <th className="px-3 py-1.5 font-medium">Role</th>
                <th className="px-3 py-1.5 font-medium">Service</th>
                <th className="px-3 py-1.5 font-medium">OS</th>
                <th className="px-3 py-1.5 font-medium">CPU</th>
                <th className="px-3 py-1.5 font-medium">Memory</th>
                <th className="px-3 py-1.5 font-medium">Disk</th>
                <th className="px-3 py-1.5 font-medium">Network</th>
                <th className="px-3 py-1.5 font-medium">EOSL</th>
                <th className="px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((vm) => {
                const net = networkByVm(vm.id);
                const netIssues = net.filter((n) => n.overall !== "NORMAL").length;
                const eosl = getEoslState(vm.eoslDate, now);

                const isCpuHigh = (vm.cpuPct ?? 0) >= 80;
                const isMemHigh = (vm.memoryPct ?? 0) >= 85;
                const isDiskHigh = (vm.diskPct ?? 0) >= 85;

                return (
                  <tr
                    key={vm.id}
                    onClick={() => setSelected(vm)}
                    className="h-[34px] cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors"
                  >
                    {/* 1. Hostname */}
                    <td className="px-3 py-1 font-semibold text-[11px]">
                      {vm.hostname}
                    </td>

                    {/* 2. IP */}
                    <td className="px-3 py-1 font-mono text-[10px] text-[var(--muted)]">
                      {vm.ipAddress}
                    </td>

                    {/* 3. Environment */}
                    <td className="px-3 py-1">
                      <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[var(--text)]">
                        {vm.environment}
                      </span>
                    </td>

                    {/* 4. Role */}
                    <td className="px-3 py-1 text-[11px]">
                      {vm.role}
                    </td>

                    {/* 5. Service */}
                    <td className="px-3 py-1 text-[11px] text-[var(--muted)]">
                      {vm.service}
                    </td>

                    {/* 6. OS */}
                    <td className="px-3 py-1 text-[10px]">
                      {vm.osName} {vm.osVersion ?? ""}
                    </td>

                    {/* 7. CPU */}
                    <td className="px-3 py-1 font-mono text-[10px] tabular-nums">
                      <span className={isCpuHigh ? "font-bold text-[#b54708]" : ""}>
                        {vm.cpuPct ?? 0}%
                      </span>
                    </td>

                    {/* 8. Memory */}
                    <td className="px-3 py-1 font-mono text-[10px] tabular-nums">
                      <span className={isMemHigh ? "font-bold text-[#b54708]" : ""}>
                        {vm.memoryPct ?? 0}%
                      </span>
                    </td>

                    {/* 9. Disk */}
                    <td className="px-3 py-1 font-mono text-[10px] tabular-nums">
                      <span className={isDiskHigh ? "font-bold text-[#b54708]" : ""}>
                        {vm.diskPct ?? 0}%
                      </span>
                    </td>

                    {/* 10. Network */}
                    <td className="px-3 py-1">
                      <Badge tone={netIssues > 0 ? "warning" : "success"} dot>
                        {netIssues > 0 ? `${netIssues} ISSUE` : `${net.length} OK`}
                      </Badge>
                    </td>

                    {/* 11. EOSL */}
                    <td className="px-3 py-1">
                      <Badge
                        tone={
                          eosl.state === "EOSL"
                            ? "danger"
                            : eosl.state === "D90" || eosl.state === "D180"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {eosl.state}
                      </Badge>
                    </td>

                    {/* 12. Status */}
                    <td className="px-3 py-1">
                      <Badge
                        tone={
                          vm.health === "healthy"
                            ? "success"
                            : vm.health === "critical"
                              ? "danger"
                              : "warning"
                        }
                        dot
                      >
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

      {/* Shared Slide Drawer */}
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
