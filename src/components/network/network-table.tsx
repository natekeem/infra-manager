"use client";

import { useMemo, useState } from "react";
import type { NetworkStatus } from "@/domain/models";
import { ConnectionDrawer } from "./connection-drawer";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";

export function NetworkTable({
  statuses,
  mode,
}: {
  statuses: NetworkStatus[];
  mode?: "policy" | "connectivity" | "all";
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<NetworkStatus | null>(null);

  const filtered = useMemo(
    () =>
      statuses.filter((s) => {
        const q =
          `${s.policy.sourceName} ${s.policy.sourceIp} ${s.policy.targetName} ${s.policy.targetIp} ${s.policy.port} ${s.policy.requestId ?? ""} ${s.policy.purpose ?? ""}`.toLowerCase();
        const hit = q.includes(query.toLowerCase());

        const isExpiring =
          s.overall === "EXPIRING" ||
          s.overall === "POLICY_EXPIRED_BUT_REACHABLE" ||
          s.overall === "POLICY_EXPIRED_AND_UNREACHABLE";
        const isExpired =
          s.overall === "POLICY_EXPIRED_BUT_REACHABLE" ||
          s.overall === "POLICY_EXPIRED_AND_UNREACHABLE" ||
          (s.daysToExpiry !== null && s.daysToExpiry !== undefined && s.daysToExpiry < 0);
        const isPending =
          s.policy.approvalStatus === "PENDING" ||
          s.overall === "POLICY_NOT_APPROVED_BUT_REACHABLE";

        const f =
          filter === "ALL" ||
          (filter === "ISSUES" && s.overall !== "NORMAL") ||
          (filter === "TCP_FAILED" && s.observation?.tcp === "DOWN") ||
          (filter === "EXPIRING" && isExpiring) ||
          (filter === "EXPIRED" && isExpired) ||
          (filter === "PENDING" && isPending);

        return hit && f;
      }),
    [statuses, query, filter]
  );

  return (
    <>
      {/* Search and Filter Controls */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="flex flex-1 items-center gap-2">
          <div className="flex h-8 min-w-[280px] max-w-[420px] flex-1 items-center gap-2 rounded-md border border-[var(--border)] px-2.5">
            <SearchIcon className="h-3.5 w-3.5 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[11px] outline-none"
              placeholder="Search source, target, IP, port, request ID..."
            />
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
            <span>Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[10px] outline-none"
            >
              <option value="ALL">All Flows ({statuses.length})</option>
              <option value="ISSUES">
                All Issues ({statuses.filter((s) => s.overall !== "NORMAL").length})
              </option>
              <option value="TCP_FAILED">
                TCP Failed ({statuses.filter((s) => s.observation?.tcp === "DOWN").length})
              </option>
              <option value="EXPIRING">Expiring Soon (≤30d)</option>
              <option value="EXPIRED">Policy Expired</option>
              <option value="PENDING">Pending / Unapproved</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
          <span className="tabular-nums">
            Showing <b>{filtered.length}</b> of {statuses.length} connections
          </span>
        </div>
      </div>

      {/* Dense 11-Column Network Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-[11px]">
            <thead>
              <tr className="h-9 border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                <th className="px-3 py-1.5 font-medium">Source</th>
                <th className="px-3 py-1.5 font-medium">Target</th>
                <th className="px-3 py-1.5 font-medium">Protocol</th>
                <th className="px-3 py-1.5 font-medium">Port</th>
                <th className="px-3 py-1.5 font-medium">Policy</th>
                <th className="px-3 py-1.5 font-medium">Expiry</th>
                <th className="px-3 py-1.5 font-medium">Ping</th>
                <th className="px-3 py-1.5 font-medium">TCP</th>
                <th className="px-3 py-1.5 font-medium">RTT</th>
                <th className="px-3 py-1.5 font-medium">Last Check</th>
                <th className="px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const p = s.policy;
                const o = s.observation;
                const isTcpDown = o?.tcp === "DOWN";
                const isPingUp = o?.ping === "UP";

                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(s)}
                    className="h-[34px] cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors"
                  >
                    {/* 1. Source */}
                    <td className="px-3 py-1">
                      <div className="font-medium text-[11px] leading-tight">{p.sourceName}</div>
                      <div className="font-mono text-[9px] text-[var(--muted)]">{p.sourceIp}</div>
                    </td>

                    {/* 2. Target */}
                    <td className="px-3 py-1">
                      <div className="font-medium text-[11px] leading-tight">{p.targetName}</div>
                      <div className="font-mono text-[9px] text-[var(--muted)]">{p.targetIp}</div>
                    </td>

                    {/* 3. Protocol */}
                    <td className="px-3 py-1 font-mono text-[10px] text-[var(--muted)]">
                      {p.protocol}
                    </td>

                    {/* 4. Port */}
                    <td className="px-3 py-1 font-mono text-[11px] font-semibold tabular-nums">
                      {p.port}
                    </td>

                    {/* 5. Policy (Approval Status) */}
                    <td className="px-3 py-1">
                      <Badge
                        tone={
                          p.approvalStatus === "APPROVED"
                            ? "success"
                            : p.approvalStatus === "PENDING"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {p.approvalStatus}
                      </Badge>
                    </td>

                    {/* 6. Expiry */}
                    <td className="px-3 py-1">
                      <div className="font-mono text-[10px] leading-tight">
                        {p.expiresAt ?? "-"}
                      </div>
                      <div className="text-[9px] text-[var(--muted)]">
                        {s.daysToExpiry == null
                          ? "-"
                          : s.daysToExpiry >= 0
                            ? `D-${s.daysToExpiry}`
                            : `D+${Math.abs(s.daysToExpiry)}`}
                      </div>
                    </td>

                    {/* 7. Ping */}
                    <td className="px-3 py-1">
                      <ProbeBadge value={o?.ping} />
                    </td>

                    {/* 8. TCP */}
                    <td className="px-3 py-1 font-semibold">
                      <ProbeBadge value={o?.tcp} />
                    </td>

                    {/* 9. RTT */}
                    <td className="px-3 py-1 font-mono text-[10px] tabular-nums text-[var(--muted)]">
                      {o?.tcpLatencyMs != null
                        ? `${o.tcpLatencyMs} ms`
                        : o?.pingLatencyMs != null
                          ? `${o.pingLatencyMs} ms (P)`
                          : "-"}
                    </td>

                    {/* 10. Last Check */}
                    <td className="px-3 py-1 font-mono text-[9px] text-[var(--muted)]">
                      {o?.checkedAt ? o.checkedAt.replace("T", " ").slice(11, 19) : "-"}
                    </td>

                    {/* 11. Status */}
                    <td className="px-3 py-1">
                      <StatusBadge state={s.overall} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Slide Drawer */}
      <ConnectionDrawer status={selected} open={!!selected} onClose={() => setSelected(null)} />
    </>
  );
}

function ProbeBadge({ value }: { value?: "UP" | "DOWN" | "NO_DATA" }) {
  const v = value ?? "NO_DATA";
  return (
    <Badge
      tone={v === "UP" ? "success" : v === "DOWN" ? "danger" : "neutral"}
      dot
    >
      {v}
    </Badge>
  );
}
