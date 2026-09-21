import type { SoftwareInstall, VmAsset } from "@/domain/models";
import { getEoslState } from "@/domain/eosl";
import { Badge } from "@/components/tailgrids/core/badge";

export interface EoslRiskItem {
  id: string;
  type: "OS" | "Software";
  name: string;
  version?: string;
  hostname: string;
  eoslDate: string;
  state: "EOSL" | "D90" | "D180";
  days: number | null;
}

export function EoslRiskSummary({
  vms,
  software,
  onSelectVm,
}: {
  vms: VmAsset[];
  software: SoftwareInstall[];
  onSelectVm?: (vm: VmAsset) => void;
}) {
  const now = new Date("2026-09-21T00:28:00+09:00");
  const vmMap = new Map(vms.map((v) => [v.id, v]));

  const items: EoslRiskItem[] = [];

  // Check VM OS
  for (const vm of vms) {
    if (vm.eoslDate) {
      const e = getEoslState(vm.eoslDate, now);
      if (e.state === "EOSL" || e.state === "D90" || e.state === "D180") {
        items.push({
          id: `vm-${vm.id}`,
          type: "OS",
          name: `${vm.osName} ${vm.osVersion ?? ""}`.trim(),
          hostname: vm.hostname,
          eoslDate: vm.eoslDate,
          state: e.state,
          days: e.days,
        });
      }
    }
  }

  // Check Software
  for (const sw of software) {
    if (sw.eoslDate) {
      const e = getEoslState(sw.eoslDate, now);
      if (e.state === "EOSL" || e.state === "D90" || e.state === "D180") {
        const vm = vmMap.get(sw.vmId);
        items.push({
          id: `sw-${sw.id}`,
          type: "Software",
          name: sw.name,
          version: sw.version,
          hostname: vm?.hostname ?? sw.vmId,
          eoslDate: sw.eoslDate,
          state: e.state,
          days: e.days,
        });
      }
    }
  }

  // Sort: EOSL first, then D90, then D180
  items.sort((a, b) => {
    const rank = { EOSL: 0, D90: 1, D180: 2 };
    return rank[a.state] - rank[b.state];
  });

  const displayList = items.slice(0, 6);

  if (displayList.length === 0) {
    return (
      <div className="p-4 text-center text-[11px] text-[var(--muted)]">
        180일 이내 도래하는 EOSL 위험 항목이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[500px] text-left text-[10px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
            <th className="px-3 py-2 font-medium">Type / Component</th>
            <th className="px-3 py-2 font-medium">VM Host</th>
            <th className="px-3 py-2 font-medium">Risk Status</th>
            <th className="px-3 py-2 font-medium">EOSL Date</th>
          </tr>
        </thead>
        <tbody>
          {displayList.map((item) => {
            const vm = vms.find((v) => v.hostname === item.hostname);
            return (
              <tr
                key={item.id}
                onClick={() => vm && onSelectVm?.(vm)}
                className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-[11px]">{item.name}</div>
                  <div className="text-[9px] text-[var(--muted)]">{item.type} {item.version ? `· ${item.version}` : ""}</div>
                </td>
                <td className="px-3 py-2 font-mono text-[10px]">{item.hostname}</td>
                <td className="px-3 py-2">
                  <Badge tone={item.state === "EOSL" ? "danger" : "warning"}>
                    {item.state}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono text-[9px]">{item.eoslDate}</span>
                  {item.days != null && (
                    <span className="ml-1 text-[8px] text-[var(--muted)]">
                      ({item.days < 0 ? `D+${Math.abs(item.days)}` : `D-${item.days}`})
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
