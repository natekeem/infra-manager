"use client";

import { useState } from "react";
import type {
  Asset,
  NetworkStatus,
  SoftwareInstall,
  SopDocument,
  TopologyGroup,
} from "@/domain/models";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { Badge } from "@/components/tailgrids/core/badge";
import { StatusBadge } from "@/components/network/status-badge";

export interface GroupDrawerData {
  groupName: string;
  groupType?: string;
  environment?: string;
  domain?: string;
  system?: string;
  description?: string;
  assets: Asset[];
  statuses: NetworkStatus[];
  software?: SoftwareInstall[];
  sops?: SopDocument[];
}

export function GroupDrawer({
  data,
  open,
  onClose,
  onSelectAsset,
  onDrillDown,
}: {
  data: GroupDrawerData | null;
  open: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: Asset) => void;
  onDrillDown?: (groupName: string) => void;
}) {
  const [tab, setTab] = useState<"overview" | "assets" | "network" | "software" | "sop">("overview");

  if (!data) return null;

  const { groupName, groupType, environment, domain, system, description, assets, statuses, software = [], sops = [] } = data;

  // Asset breakdown
  const apCount = assets.filter((a) => a.role === "AP" || a.role.includes("AP")).length;
  const dbCount = assets.filter((a) => a.role === "DB" || a.role.includes("DB")).length;
  const nasCount = assets.filter((a) => a.assetType === "NAS" || a.role === "Storage").length;
  const k8sCount = assets.filter((a) => a.assetType === "K8S_WORKLOAD" || a.assetType === "CONTAINER").length;

  const healthy = assets.filter((a) => a.health === "healthy").length;
  const warning = assets.filter((a) => a.health === "warning").length;
  const critical = assets.filter((a) => a.health === "critical").length;

  // Network breakdown
  const normalNet = statuses.filter((s) => s.overall === "NORMAL").length;
  const expiringNet = statuses.filter((s) => s.overall === "EXPIRING").length;
  const failedNet = statuses.filter((s) => s.overall !== "NORMAL" && s.overall !== "EXPIRING").length;

  // Group-related software & SOPs
  const assetIdSet = new Set(assets.map((a) => a.id));
  const groupSoftware = software.filter((s) => assetIdSet.has(s.vmId));
  const groupSops = sops.filter((s) => s.relatedVmIds.some((id) => assetIdSet.has(id)));

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={`${groupName}`}
      subtitle={`${system || "Platform"} · ${domain || "Common"} · ${environment || "PROD"}`}
    >
      {/* 5-Tab Navigation Bar */}
      <div className="flex border-b border-[var(--border)] px-4 bg-[var(--surface-2)]">
        {(
          [
            { id: "overview", label: "개요" },
            { id: "assets", label: `자산 (${assets.length})` },
            { id: "network", label: `네트워크 (${statuses.length})` },
            { id: "software", label: "소프트웨어" },
            { id: "sop", label: "SOP" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-[10px] font-semibold transition ${
              tab === t.id
                ? "border-[#5750f1] text-[#5750f1]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* TAB 1: OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Top metadata tags */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {environment && <Badge tone="info">{environment}</Badge>}
                {groupType && <Badge>{groupType}</Badge>}
                {domain && <Badge tone="neutral">{domain}</Badge>}
              </div>
              {onDrillDown && (
                <button
                  onClick={() => {
                    onDrillDown(groupName);
                    onClose();
                  }}
                  className="rounded bg-[#5750f1] px-2.5 py-1 text-[9px] font-medium text-white transition hover:bg-[#4938d6]"
                >
                  그룹 상세 보기 →
                </button>
              )}
            </div>

            {description && (
              <p className="text-[10.5px] leading-relaxed text-[var(--muted)]">
                {description}
              </p>
            )}

            {/* Asset Composition Card */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-2)]">
                자산 구성 ({assets.length})
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2">
                  <div className="text-[9px] text-[var(--muted)]">AP</div>
                  <div className="text-[14px] font-semibold text-[var(--foreground)]">{apCount}</div>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2">
                  <div className="text-[9px] text-[var(--muted)]">DB</div>
                  <div className="text-[14px] font-semibold text-[var(--foreground)]">{dbCount}</div>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2">
                  <div className="text-[9px] text-[var(--muted)]">NAS</div>
                  <div className="text-[14px] font-semibold text-[var(--foreground)]">{nasCount}</div>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2">
                  <div className="text-[9px] text-[var(--muted)]">K8s/기타</div>
                  <div className="text-[14px] font-semibold text-[var(--foreground)]">{k8sCount}</div>
                </div>
              </div>

              {/* Health status summary */}
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2 text-[10px]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {healthy} 정상
                  </span>
                  {warning > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {warning} 주의
                    </span>
                  )}
                  {critical > 0 && (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> {critical} 위험
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Network Policy & Observation Status Card */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-2)]">
                네트워크 연결 ({statuses.length}개 흐름)
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2">
                  <div className="text-[9px] text-[var(--muted)]">정상</div>
                  <div className="text-[14px] font-semibold text-emerald-600 dark:text-emerald-400">{normalNet}</div>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2">
                  <div className="text-[9px] text-[var(--muted)]">만료 예정</div>
                  <div className="text-[14px] font-semibold text-amber-600 dark:text-amber-400">{expiringNet}</div>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2">
                  <div className="text-[9px] text-[var(--muted)]">주의/실패</div>
                  <div className="text-[14px] font-semibold text-rose-600 dark:text-rose-400">{failedNet}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ASSETS */}
        {tab === "assets" && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-[var(--muted)] mb-2">
              자산을 클릭하면 상세 리소스 메트릭, 디스크 상태 및 설치된 소프트웨어를 확인할 수 있습니다.
            </div>
            {assets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => onSelectAsset && onSelectAsset(asset)}
                className="flex cursor-pointer items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5 transition hover:border-[#5750f1] hover:bg-[var(--surface-2)]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[var(--foreground)]">{asset.hostname}</span>
                    <Badge tone={asset.health === "critical" ? "danger" : asset.health === "warning" ? "warning" : "success"}>
                      {asset.role}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-[9.5px] font-mono text-[var(--muted)]">
                    {asset.ipAddress} · {asset.assetType || "VM"}
                  </div>
                </div>
                <div className="text-right">
                  {asset.memoryPct !== undefined && (
                    <div className="text-[9.5px] text-[var(--muted)]">
                      Mem <b className={asset.memoryPct > 85 ? "text-amber-600" : ""}>{asset.memoryPct}%</b>
                    </div>
                  )}
                  {asset.diskPct !== undefined && (
                    <div className="text-[9.5px] text-[var(--muted)]">
                      Disk <b className={asset.diskPct > 85 ? "text-amber-600" : ""}>{asset.diskPct}%</b>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: NETWORK */}
        {tab === "network" && (
          <div className="space-y-2">
            {statuses.length === 0 ? (
              <div className="text-[10px] text-[var(--muted)] text-center py-6">
                No network policies configured for this group.
              </div>
            ) : (
              statuses.map((s) => (
                <div
                  key={s.policy.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10.5px] font-semibold text-[var(--foreground)]">
                      {s.policy.sourceName} → {s.policy.targetName}
                    </span>
                    <StatusBadge state={s.overall} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9px] text-[var(--muted)]">
                    <span>
                      {s.policy.protocol}/{s.policy.port} ({s.policy.direction || "ONE_WAY"})
                    </span>
                    <span>Actual TCP: <b className={s.observation?.tcp === "UP" ? "text-emerald-600" : "text-rose-600"}>{s.observation?.tcp || "NO_DATA"}</b></span>
                  </div>
                  {s.daysToExpiry !== null && s.daysToExpiry !== undefined && (
                    <div className="mt-1 text-[8.5px] text-[var(--muted)]">
                      Expiry: {s.daysToExpiry > 0 ? `D-${s.daysToExpiry}` : `Expired ${Math.abs(s.daysToExpiry)} days ago`}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: SOFTWARE */}
        {tab === "software" && (
          <div className="space-y-2">
            {groupSoftware.length === 0 ? (
              <div className="text-[10px] text-[var(--muted)] text-center py-6">
                No software installations detected in this group.
              </div>
            ) : (
              groupSoftware.map((sw) => (
                <div
                  key={sw.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--foreground)]">{sw.name}</span>
                    <span className="font-mono text-[10px] text-[var(--muted)]">{sw.version || "Unknown"}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9px] text-[var(--muted)]">
                    <span>{sw.vendor || "Third-party"} · {sw.category || "General"}</span>
                    {sw.eoslDate && <span>EOSL: {sw.eoslDate}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 5: SOP */}
        {tab === "sop" && (
          <div className="space-y-2">
            {groupSops.length === 0 ? (
              <div className="text-[10px] text-[var(--muted)] text-center py-6">
                No related standard operating procedures (SOPs).
              </div>
            ) : (
              groupSops.map((sop) => (
                <div
                  key={sop.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5"
                >
                  <div className="text-[11px] font-semibold text-[var(--foreground)]">{sop.title}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone="info">{sop.category}</Badge>
                    <span className="text-[9px] text-[var(--muted)]">Owner: {sop.owner}</span>
                  </div>
                  {sop.summary && (
                    <p className="mt-1.5 text-[9.5px] leading-relaxed text-[var(--muted)]">
                      {sop.summary}
                    </p>
                  )}
                  {sop.url && (
                    <a
                      href={sop.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-[9px] text-[#5750f1] hover:underline"
                    >
                      View SOP Document →
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </SlideDrawer>
  );
}
