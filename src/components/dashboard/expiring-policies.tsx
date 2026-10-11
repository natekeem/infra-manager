import Link from "next/link";
import type { NetworkStatus } from "@/domain/models";
import { Badge } from "@/components/tailgrids/core/badge";

export function ExpiringPolicies({ statuses, onSelect }: { statuses: NetworkStatus[]; onSelect?: (status: NetworkStatus) => void }) {
  const expiring = statuses
    .filter(
      (s) =>
        s.overall === "EXPIRING" ||
        s.overall === "POLICY_EXPIRED_BUT_REACHABLE" ||
        s.overall === "POLICY_EXPIRED_AND_UNREACHABLE" ||
        (s.daysToExpiry !== null && s.daysToExpiry !== undefined && s.daysToExpiry <= 30)
    )
    .slice(0, 6);

  if (expiring.length === 0) {
    return (
      <div className="p-4 text-center text-[11px] text-[var(--muted)]">
        만료 30일 이내 정책이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px] text-left text-[10px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
            <th className="px-3 py-2 font-medium">흐름</th>
            <th className="px-3 py-2 font-medium">포트</th>
            <th className="px-3 py-2 font-medium">만료 / D-Day</th>
            <th className="px-3 py-2 font-medium">TCP</th>
            <th className="px-3 py-2 font-medium">요청 ID</th>
          </tr>
        </thead>
        <tbody>
          {expiring.map((s) => {
            const days = s.daysToExpiry;
            const expired = days !== null && days !== undefined && days < 0;
            return (
              <tr
                key={s.policy.id}
                onClick={() => onSelect?.(s)}
                className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-[11px]">{s.policy.sourceName} → {s.policy.targetName}</div>
                  <div className="text-[9px] text-[var(--muted)]">{s.policy.purpose ?? "서비스 흐름"}</div>
                </td>
                <td className="px-3 py-2 font-mono">{s.policy.protocol}/{s.policy.port}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={expired ? "danger" : "warning"}>
                      {days == null ? "-" : days >= 0 ? `D-${days}` : `D+${Math.abs(days)}`}
                    </Badge>
                    <span className="text-[9px] text-[var(--muted)]">{s.policy.expiresAt ?? "-"}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-semibold">
                  <Badge tone={s.observation?.tcp === "UP" ? "success" : "danger"} dot>
                    {s.observation?.tcp ?? "데이터 없음"}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-mono text-[9px] text-[var(--muted)]">
                  {s.policy.requestId ?? "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
