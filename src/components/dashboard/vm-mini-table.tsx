import type { VmAsset } from "@/domain/models";
import { Badge } from "@/components/tailgrids/core/badge";

export function VmMiniTable({ vms, onSelect }: { vms: VmAsset[]; onSelect?: (vm: VmAsset) => void }) {
  // Prioritize Critical & Warning VMs, then highest CPU
  const sorted = vms.slice().sort((a, b) => {
    const healthWeight = { critical: 0, warning: 1, unknown: 2, healthy: 3 };
    const diff = healthWeight[a.health] - healthWeight[b.health];
    if (diff !== 0) return diff;
    return (b.cpuPct ?? 0) - (a.cpuPct ?? 0);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-[10px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
            <th className="px-3 py-2 font-medium">Hostname</th>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">CPU</th>
            <th className="px-3 py-2 font-medium">MEM</th>
            <th className="px-3 py-2 font-medium">DISK</th>
            <th className="px-3 py-2 font-medium">State</th>
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, 8).map((vm) => (
            <tr
              key={vm.id}
              onClick={() => onSelect?.(vm)}
              className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
            >
              <td className="px-3 py-2 font-medium">
                {vm.hostname}
                <div className="font-mono text-[9px] font-normal text-[var(--muted)]">{vm.ipAddress}</div>
              </td>
              <td className="px-3 py-2">{vm.role}</td>
              <td className="px-3 py-2 tabular-nums">{vm.cpuPct}%</td>
              <td className="px-3 py-2 tabular-nums">{vm.memoryPct}%</td>
              <td className="px-3 py-2 tabular-nums">{vm.diskPct}%</td>
              <td className="px-3 py-2">
                <Badge tone={vm.health === "healthy" ? "success" : vm.health === "critical" ? "danger" : "warning"} dot>
                  {vm.health}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
