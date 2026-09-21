"use client";

import type { NetworkStatus, VmAsset } from "@/domain/models";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { Badge } from "@/components/tailgrids/core/badge";

export interface TierDrawerData {
  tierName: string;
  kind?: "group" | "external";
  vms: VmAsset[];
  statuses: NetworkStatus[];
  healthyCount?: number;
  warningCount?: number;
  criticalCount?: number;
  issueCount?: number;
}

export function TierDrawer({
  data,
  open,
  onClose,
  onDrillDown,
  onSelectVm,
}: {
  data: TierDrawerData | null;
  open: boolean;
  onClose: () => void;
  onDrillDown?: (tier: string) => void;
  onSelectVm?: (vm: VmAsset) => void;
}) {
  if (!data) return null;

  const { tierName, kind, vms, statuses } = data;
  const isExternal = kind === "external";

  const healthy = data.healthyCount ?? vms.filter((v) => v.health === "healthy").length;
  const warning = data.warningCount ?? vms.filter((v) => v.health === "warning").length;
  const critical = data.criticalCount ?? vms.filter((v) => v.health === "critical").length;

  const relevantStatuses = statuses.filter((s) => {
    if (isExternal) return !s.policy.targetVmId && s.policy.targetName === tierName;
    return vms.some((v) => v.id === s.policy.sourceVmId || v.id === s.policy.targetVmId);
  });
  const issueStatuses = relevantStatuses.filter((s) => s.overall !== "NORMAL");

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={isExternal ? `External Dependency: ${tierName}` : `${tierName} Tier Overview`}
      subtitle={isExternal ? "External system dependency and firewall policies" : `Overview of ${vms.length} VMs in this architectural tier`}
    >
      <div className="p-4 space-y-4">
        {/* Top Action & Badge Bar */}
        <div className="flex items-center justify-between">
          <Badge tone={critical > 0 ? "danger" : warning > 0 ? "warning" : "success"}>
            {isExternal ? "EXTERNAL" : `${vms.length} VMs`}
          </Badge>
          {!isExternal && onDrillDown && (
            <button
              onClick={() => {
                onDrillDown(tierName);
                onClose();
              }}
              className="flex h-7 items-center gap-1 rounded bg-[#5750f1] px-2.5 text-[9px] font-medium text-white transition hover:bg-[#4938d6]"
            >
              Drill into {tierName} View →
            </button>
          )}
        </div>
        {/* Tier Summary KPI */}
        {!isExternal && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-center">
              <div className="text-[9px] text-[var(--muted)]">Healthy</div>
              <div className="text-[14px] font-semibold text-emerald-600 dark:text-emerald-400">{healthy}</div>
            </div>
            <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-center">
              <div className="text-[9px] text-[var(--muted)]">Warning</div>
              <div className="text-[14px] font-semibold text-amber-600 dark:text-amber-400">{warning}</div>
            </div>
            <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-center">
              <div className="text-[9px] text-[var(--muted)]">Critical</div>
              <div className="text-[14px] font-semibold text-rose-600 dark:text-rose-400">{critical}</div>
            </div>
          </div>
        )}

        {/* VM Asset List */}
        {!isExternal && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Member Virtual Machines ({vms.length})
              </h4>
              <span className="text-[8px] text-[var(--muted-2)]">Click VM for full inventory drawer</span>
            </div>
            <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] bg-[var(--surface)]">
              {vms.map((vm) => (
                <div
                  key={vm.id}
                  onClick={() => onSelectVm?.(vm)}
                  className="flex cursor-pointer items-center justify-between p-2 text-[10px] transition hover:bg-[var(--surface-2)]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        vm.health === "healthy"
                          ? "bg-emerald-500"
                          : vm.health === "critical"
                            ? "bg-rose-500"
                            : "bg-amber-500"
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-[var(--foreground)]">{vm.hostname}</div>
                      <div className="font-mono text-[8.5px] text-[var(--muted)]">{vm.ipAddress} · {vm.role}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[8.5px] text-[var(--muted)]">
                    CPU {vm.cpuPct}% · MEM {vm.memoryPct}%
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Network Connections */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Network Flows ({relevantStatuses.length})
            </h4>
            {issueStatuses.length > 0 && (
              <Badge tone="danger">{issueStatuses.length} Attention Needed</Badge>
            )}
          </div>
          <div className="max-h-[260px] divide-y divide-[var(--border)] overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] text-[9px]">
            {relevantStatuses.length === 0 ? (
              <div className="p-3 text-center text-[var(--muted)]">No active policies found for this tier.</div>
            ) : (
              relevantStatuses.map((s) => (
                <div key={s.policy.id} className="p-2">
                  <div className="flex items-center justify-between font-medium">
                    <span>
                      {s.policy.sourceName} → {s.policy.targetName}
                    </span>
                    <span className="font-mono font-semibold">{s.policy.protocol}/{s.policy.port}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[8px] text-[var(--muted)]">
                    <span>TCP: {s.observation?.tcp ?? "NO DATA"}</span>
                    <span>{s.overall}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </SlideDrawer>
  );
}
