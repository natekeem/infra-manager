import type { NetworkStatus } from "@/domain/models";
import { StatusBadge } from "@/components/network/status-badge";
import { Badge } from "@/components/tailgrids/core/badge";

export function IssuesTable({
  statuses,
  onSelect,
}: {
  statuses: NetworkStatus[];
  onSelect?: (status: NetworkStatus) => void;
}) {
  const rows = statuses.filter((s) => s.overall !== "NORMAL").slice(0, 8);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-[10px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Source</th>
            <th className="px-3 py-2 font-medium">Target</th>
            <th className="px-3 py-2 font-medium">Port</th>
            <th className="px-3 py-2 font-medium">Ping</th>
            <th className="px-3 py-2 font-medium">TCP</th>
            <th className="px-3 py-2 font-medium">Expiry / Request</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr
              key={s.policy.id}
              onClick={() => onSelect?.(s)}
              className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
            >
              <td className="px-3 py-2">
                <StatusBadge state={s.overall} />
              </td>
              <td className="px-3 py-2 font-medium">
                {s.policy.sourceName}
                <div className="font-mono text-[9px] font-normal text-[var(--muted)]">{s.policy.sourceIp}</div>
              </td>
              <td className="px-3 py-2 font-medium">
                {s.policy.targetName}
                <div className="font-mono text-[9px] font-normal text-[var(--muted)]">{s.policy.targetIp}</div>
              </td>
              <td className="px-3 py-2 font-mono">
                {s.policy.protocol}/{s.policy.port}
              </td>
              <td className="px-3 py-2">
                <Badge tone={s.observation?.ping === "UP" ? "success" : s.observation?.ping === "DOWN" ? "danger" : "neutral"} dot>
                  {s.observation?.ping ?? "-"}
                </Badge>
              </td>
              <td className="px-3 py-2 font-semibold">
                <Badge tone={s.observation?.tcp === "UP" ? "success" : s.observation?.tcp === "DOWN" ? "danger" : "neutral"} dot>
                  {s.observation?.tcp ?? "-"}
                </Badge>
              </td>
              <td className="px-3 py-2">
                <div className="font-mono text-[9px] text-[var(--text)]">
                  {s.daysToExpiry == null ? "-" : s.daysToExpiry >= 0 ? `D-${s.daysToExpiry}` : `D+${Math.abs(s.daysToExpiry)}`}
                </div>
                <div className="font-mono text-[8px] text-[var(--muted)]">
                  {s.policy.requestId ?? "-"}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
