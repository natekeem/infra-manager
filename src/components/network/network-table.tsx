"use client";

import { useMemo, useState } from "react";
import type { NetworkStatus, ProbeState } from "@/domain/models";
import { ConnectionDrawer } from "./connection-drawer";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";
import { useProjectGroup } from "@/context/project-group-context";

export function NetworkTable({ statuses }: { statuses: NetworkStatus[] }) {
  const { activeProject } = useProjectGroup();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<NetworkStatus | null>(null);

  const scopedStatuses = useMemo(
    () => statuses.filter((s) => !s.policy.projectGroupId || s.policy.projectGroupId === activeProject.id),
    [statuses, activeProject.id]
  );

  const filtered = useMemo(
    () =>
      scopedStatuses.filter((s) => {
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
        const hasTcpFailure = s.observation?.tcp === "DOWN" || s.reverseObservation?.tcp === "DOWN";

        const f =
          filter === "ALL" ||
          (filter === "ISSUES" && s.overall !== "NORMAL") ||
          (filter === "TCP_FAILED" && hasTcpFailure) ||
          (filter === "EXPIRING" && isExpiring) ||
          (filter === "EXPIRED" && isExpired) ||
          (filter === "PENDING" && isPending);

        return hit && f;
      }),
    [scopedStatuses, query, filter]
  );

  const tcpFailures = scopedStatuses.filter(
    (s) => s.observation?.tcp === "DOWN" || s.reverseObservation?.tcp === "DOWN"
  ).length;

  return (
    <>
      <div className="mb-2.5 grid gap-2 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
          <div className="flex h-8 min-w-[280px] max-w-[430px] flex-1 items-center gap-2 rounded-md border border-[var(--border)] px-2.5">
            <SearchIcon className="h-3.5 w-3.5 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[11px] outline-none"
              placeholder="출발지, 목적지, IP, 포트, 요청 ID 검색..."
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[10px] outline-none"
          >
            <option value="ALL">전체 ({statuses.length})</option>
            <option value="ISSUES">이슈 ({statuses.filter((s) => s.overall !== "NORMAL").length})</option>
            <option value="TCP_FAILED">TCP 실패 ({tcpFailures})</option>
            <option value="EXPIRING">만료 예정 (≤30일)</option>
            <option value="EXPIRED">정책 만료</option>
            <option value="PENDING">대기 / 미승인</option>
          </select>

          <span className="ml-auto text-[10px] tabular-nums text-[var(--muted)]">
            <b>{filtered.length}</b> / {scopedStatuses.length}개 정책 연결
          </span>
        </div>

        <div className="flex min-w-[310px] items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[9px] text-[var(--muted)]">
          <span><b className="text-[var(--foreground)]">Policy</b> = 기준</span>
          <span className="text-[var(--border-strong)]">→</span>
          <span><b className="text-[var(--foreground)]">Actual</b> = Telegraf 실측</span>
          <span className="text-[var(--border-strong)]">·</span>
          <span>Source + Target + Protocol + Port로 조인</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] text-left text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                <th colSpan={5} className="border-r border-[var(--border)] px-3 py-1.5 font-semibold text-[var(--foreground)]">
                  연결 / 정책 기준 (Should Be)
                </th>
                <th colSpan={4} className="border-r border-[var(--border)] px-3 py-1.5 font-semibold text-[var(--foreground)]">
                  실측 / Telegraf 프로브 (Actual)
                </th>
                <th className="px-3 py-1.5 font-semibold text-[var(--foreground)]">상태 진단</th>
              </tr>
              <tr className="h-8 border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                <th className="px-3 py-1.5 font-medium">출발지 → 목적지</th>
                <th className="px-3 py-1.5 font-medium">방향</th>
                <th className="px-3 py-1.5 font-medium">프로토콜 / 포트</th>
                <th className="px-3 py-1.5 font-medium">승인 상태</th>
                <th className="border-r border-[var(--border)] px-3 py-1.5 font-medium">만료일</th>
                <th className="px-3 py-1.5 font-medium">Ping</th>
                <th className="px-3 py-1.5 font-medium">TCP</th>
                <th className="px-3 py-1.5 font-medium">RTT</th>
                <th className="border-r border-[var(--border)] px-3 py-1.5 font-medium">최근 확인</th>
                <th className="px-3 py-1.5 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const p = s.policy;
                const o = s.observation;
                const reverse = s.reverseObservation;
                const isBidi = p.direction === "BIDIRECTIONAL" || s.isBidirectional;
                const observesReverse = Boolean(isBidi && p.targetVmId);

                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(s)}
                    className="min-h-[38px] cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5 font-medium text-[10.5px] leading-tight">
                        <span>{p.sourceName}</span>
                        <span className="text-[var(--muted-2)]">{isBidi ? "⇄" : "→"}</span>
                        <span>{p.targetName}</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[8.5px] text-[var(--muted)]">
                        {p.sourceIp} → {p.targetIp}
                      </div>
                    </td>

                    <td className="px-3 py-1.5">
                      <Badge tone={isBidi ? "info" : "neutral"}>{isBidi ? "BIDIRECTIONAL" : "ONE_WAY"}</Badge>
                    </td>

                    <td className="px-3 py-1.5 font-mono text-[10px] font-semibold tabular-nums">
                      {p.protocol}/{p.port}
                    </td>

                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
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
                        {p.requestId && <span className="font-mono text-[8px] text-[var(--muted)]">{p.requestId}</span>}
                      </div>
                    </td>

                    <td className="border-r border-[var(--border)] px-3 py-1.5">
                      <div className="font-mono text-[9.5px] leading-tight">{p.expiresAt ?? "-"}</div>
                      <div className="text-[8.5px] text-[var(--muted)]">
                        {s.daysToExpiry == null
                          ? "-"
                          : s.daysToExpiry >= 0
                            ? `D-${s.daysToExpiry}`
                            : `D+${Math.abs(s.daysToExpiry)}`}
                      </div>
                    </td>

                    <td className="px-3 py-1.5">
                      <DirectionalProbeCell forward={o?.ping} reverse={observesReverse ? reverse?.ping : undefined} bidirectional={observesReverse} />
                    </td>

                    <td className="px-3 py-1.5">
                      <DirectionalProbeCell forward={o?.tcp} reverse={observesReverse ? reverse?.tcp : undefined} bidirectional={observesReverse} />
                    </td>

                    <td className="px-3 py-1.5 font-mono text-[9px] tabular-nums text-[var(--muted)]">
                      <div>→ {formatRtt(o?.tcpLatencyMs, o?.pingLatencyMs)}</div>
                      {observesReverse && <div>← {formatRtt(reverse?.tcpLatencyMs, reverse?.pingLatencyMs)}</div>}
                    </td>

                    <td className="border-r border-[var(--border)] px-3 py-1.5 font-mono text-[8.5px] text-[var(--muted)]">
                      <div>→ {formatCheck(o?.checkedAt)}</div>
                      {observesReverse && <div>← {formatCheck(reverse?.checkedAt)}</div>}
                    </td>

                    <td className="px-3 py-1.5">
                      <StatusBadge state={s.overall} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConnectionDrawer status={selected} open={!!selected} onClose={() => setSelected(null)} />
    </>
  );
}

function DirectionalProbeCell({
  forward,
  reverse,
  bidirectional,
}: {
  forward?: ProbeState;
  reverse?: ProbeState;
  bidirectional: boolean;
}) {
  if (!bidirectional) return <ProbeBadge value={forward} />;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1"><span className="w-3 text-[8px] text-[var(--muted)]">→</span><ProbeBadge value={forward} /></div>
      <div className="flex items-center gap-1"><span className="w-3 text-[8px] text-[var(--muted)]">←</span><ProbeBadge value={reverse} /></div>
    </div>
  );
}

function ProbeBadge({ value }: { value?: ProbeState }) {
  const v = value ?? "NO_DATA";
  return (
    <Badge tone={v === "UP" ? "success" : v === "DOWN" ? "danger" : "neutral"} dot>
      {v}
    </Badge>
  );
}

function formatRtt(tcp?: number | null, ping?: number | null) {
  if (tcp != null) return `${tcp} ms`;
  if (ping != null) return `${ping} ms P`;
  return "-";
}

function formatCheck(value?: string | null) {
  if (!value) return "-";
  return value.replace("T", " ").slice(11, 19);
}
