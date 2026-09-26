"use client";

import { useMemo, useState } from "react";
import type {
  AssetSoftwareInstallation,
  SoftwareInstall,
  SoftwareProduct,
  SoftwareRelease,
  VmAsset,
} from "@/domain/models";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";
import { SoftwareDetailDrawer } from "./software-detail-drawer";
import { daysUntil } from "@/domain/network-status";
import { useProjectGroup } from "@/context/project-group-context";

type TabMode = "by-asset" | "catalog" | "lifecycle";

export function SoftwareView({
  software,
  vms,
  products = [],
  releases = [],
  installations = [],
}: {
  software: SoftwareInstall[];
  vms: VmAsset[];
  products?: SoftwareProduct[];
  releases?: SoftwareRelease[];
  installations?: AssetSoftwareInstallation[];
}) {
  const { activeProject } = useProjectGroup();
  const [tab, setTab] = useState<TabMode>("by-asset");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRelease, setSelectedRelease] = useState<SoftwareRelease | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SoftwareProduct | null>(null);

  const projectVms = useMemo(
    () => vms.filter((v) => !v.projectGroupId || v.projectGroupId === activeProject.id),
    [vms, activeProject.id]
  );
  const projectVmIds = useMemo(() => new Set(projectVms.map((v) => v.id)), [projectVms]);

  const vmMap = useMemo(() => Object.fromEntries(projectVms.map((v) => [v.id, v])), [projectVms]);

  // Merge installations with legacy software if installations array is provided
  const combinedInstallations = useMemo(() => {
    if (installations && installations.length > 0) return installations;
    // Fallback from legacy software
    return software.map((s) => {
      const days = daysUntil(s.eoslDate);
      let lifecycleStatus: "SUPPORTED" | "D180" | "D90" | "D30" | "EOSL" | "UNMAPPED" = "UNMAPPED";
      if (!s.eoslDate) {
        lifecycleStatus = "UNMAPPED";
      } else if (days !== null && days < 0) {
        lifecycleStatus = "EOSL";
      } else if (days !== null && days <= 30) {
        lifecycleStatus = "D30";
      } else if (days !== null && days <= 90) {
        lifecycleStatus = "D90";
      } else if (days !== null && days <= 180) {
        lifecycleStatus = "D180";
      } else {
        lifecycleStatus = "SUPPORTED";
      }

      return {
        id: s.id,
        assetId: s.vmId,
        productId: s.name.toLowerCase().replace(/\s+/g, "-"),
        productName: s.name,
        detectedVersion: s.version ?? "Unknown",
        matchedReleaseVersion: s.version ?? null,
        eoslDate: s.eoslDate,
        lifecycleStatus,
        vendor: s.vendor,
        category: s.category,
      } as AssetSoftwareInstallation;
    }).filter((i) => projectVmIds.has(i.assetId));
  }, [installations, software, projectVmIds]);

  // Filtered by-asset
  const filteredInstallations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return combinedInstallations.filter((inst) => {
      const vm = vmMap[inst.assetId];
      const matchQuery =
        !q ||
        `${inst.productName} ${inst.detectedVersion} ${inst.vendor ?? ""} ${inst.assetId} ${vm?.hostname ?? ""} ${vm?.ipAddress ?? ""}`
          .toLowerCase()
          .includes(q);
      const matchStatus = statusFilter === "ALL" || inst.lifecycleStatus === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [combinedInstallations, vmMap, query, statusFilter]);

  // Filtered catalog
  const filteredReleases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return releases.filter((rel) => {
      const matchQuery =
        !q ||
        `${rel.productName} ${rel.version} ${rel.vendor} ${rel.versionMatchRule}`
          .toLowerCase()
          .includes(q);
      const matchStatus = statusFilter === "ALL" || rel.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [releases, query, statusFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const eolCount = combinedInstallations.filter((i) => i.lifecycleStatus === "EOSL").length;
    const d30Count = combinedInstallations.filter((i) => i.lifecycleStatus === "D30").length;
    const d90Count = combinedInstallations.filter((i) => i.lifecycleStatus === "D90").length;
    const d180Count = combinedInstallations.filter((i) => i.lifecycleStatus === "D180").length;
    const unmappedCount = combinedInstallations.filter((i) => i.lifecycleStatus === "UNMAPPED").length;
    const supportedCount = combinedInstallations.filter((i) => i.lifecycleStatus === "SUPPORTED").length;

    return {
      total: combinedInstallations.length,
      eolCount,
      d30Count,
      d90Count,
      d180Count,
      unmappedCount,
      supportedCount,
    };
  }, [combinedInstallations]);

  function handleOpenRelease(release: SoftwareRelease) {
    setSelectedRelease(release);
    setSelectedProduct(products.find((p) => p.id === release.productId) ?? null);
  }

  function handleOpenInstallation(inst: AssetSoftwareInstallation) {
    const matched = releases.find((r) => r.id === inst.matchedReleaseId) ??
      releases.find((r) => r.productName === inst.productName && r.version === inst.detectedVersion);
    if (matched) {
      setSelectedRelease(matched);
      setSelectedProduct(products.find((p) => p.id === matched.productId) ?? null);
    } else {
      setSelectedRelease({
        id: `unmapped-${inst.id}`,
        productId: inst.productId,
        productName: inst.productName,
        version: inst.detectedVersion,
        vendor: inst.vendor ?? "Unknown",
        eoslDate: inst.eoslDate ?? null,
        status: inst.lifecycleStatus === "UNMAPPED" ? "SUPPORTED" : (inst.lifecycleStatus as any),
        versionMatchRule: "exact",
      });
      setSelectedProduct(products.find((p) => p.id === inst.productId) ?? null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="전체 설치 소프트웨어" value={stats.total} tone="neutral" />
        <MetricCard label="지원 중" value={stats.supportedCount} tone="success" />
        <MetricCard label="D-180 / D-90 주의" value={stats.d180Count + stats.d90Count} tone="warning" />
        <MetricCard label="D-30 만료 임박" value={stats.d30Count} tone="warning" highlight />
        <MetricCard label="EOSL 만료됨" value={stats.eolCount} tone="danger" highlight />
        <MetricCard label="미매핑 / 미인식" value={stats.unmappedCount} tone="neutral" />
      </div>

      {/* Control Bar: Tabs + Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        {/* Tab Switcher */}
        <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
          <button
            type="button"
            onClick={() => setTab("by-asset")}
            className={`h-7 rounded px-3 text-[10px] font-medium transition ${
              tab === "by-asset"
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            자산별 현황 ({combinedInstallations.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("catalog")}
            className={`h-7 rounded px-3 text-[10px] font-medium transition ${
              tab === "catalog"
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            소프트웨어 카탈로그 ({releases.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("lifecycle")}
            className={`h-7 rounded px-3 text-[10px] font-medium transition ${
              tab === "lifecycle"
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            수명주기 매트릭스
          </button>
        </div>

        {/* Filter & Search */}
        <div className="flex items-center gap-2">
          {tab !== "lifecycle" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter software by status"
              className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] outline-none text-[var(--foreground)]"
            >
              <option value="ALL">전체 상태</option>
              <option value="SUPPORTED">SUPPORTED</option>
              <option value="D180">D-180</option>
              <option value="D90">D-90</option>
              <option value="D30">D-30</option>
              <option value="EOSL">EOSL</option>
              <option value="UNMAPPED">UNMAPPED</option>
            </select>
          )}

          <div className="flex h-7 w-[220px] items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2">
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[10px] outline-none text-[var(--foreground)]"
              placeholder="소프트웨어, 버전, 호스트 검색..."
            />
          </div>
        </div>
      </div>

      {/* Tab 1: By Asset Table */}
      {tab === "by-asset" && (
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-[10px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                  <Th>자산 / 호스트</Th>
                  <Th>소프트웨어</Th>
                  <Th>감지된 버전</Th>
                  <Th>벤더</Th>
                  <Th>분류</Th>
                  <Th>수명주기 상태</Th>
                  <Th>EOSL 일자</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredInstallations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-[11px] text-[var(--muted)]">
                      일치하는 소프트웨어 설치 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredInstallations.map((inst) => {
                    const vm = vmMap[inst.assetId];
                    const days = daysUntil(inst.eoslDate);

                    return (
                      <tr
                        key={inst.id}
                        onClick={() => handleOpenInstallation(inst)}
                        className="cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                      >
                        <Td>
                          <span className="font-mono font-bold text-[var(--foreground)]">
                            {vm?.hostname ?? inst.assetId}
                          </span>
                          <div className="font-mono text-[9px] text-[var(--muted)]">
                            {vm?.ipAddress ?? "-"}
                          </div>
                        </Td>
                        <Td>
                          <span className="font-semibold text-[var(--foreground)]">
                            {inst.productName}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono">{inst.detectedVersion}</span>
                        </Td>
                        <Td>{inst.vendor ?? "-"}</Td>
                        <Td>
                          <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px]">
                            {inst.category ?? "General"}
                          </span>
                        </Td>
                        <Td>
                          <Badge
                            tone={
                              inst.lifecycleStatus === "SUPPORTED"
                                ? "success"
                                : inst.lifecycleStatus === "EOSL"
                                  ? "danger"
                                  : inst.lifecycleStatus === "UNMAPPED"
                                    ? "neutral"
                                    : "warning"
                            }
                            dot
                          >
                            {inst.lifecycleStatus}
                          </Badge>
                        </Td>
                        <Td>
                          <span className="font-mono">{inst.eoslDate ?? "Unmapped"}</span>
                          {days != null && (
                            <div className="font-mono text-[9px] text-[var(--muted)]">
                              {days < 0 ? `D+${Math.abs(days)}` : `D-${days}`}
                            </div>
                          )}
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Software Catalog Table */}
      {tab === "catalog" && (
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-[10px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                  <Th>제품</Th>
                  <Th>릴리스 버전</Th>
                  <Th>벤더</Th>
                  <Th>매칭 규칙</Th>
                  <Th>매칭 패턴</Th>
                  <Th>지원 종료</Th>
                  <Th>EOSL 일자</Th>
                  <Th>상태</Th>
                  <Th>설치 수</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredReleases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-[11px] text-[var(--muted)]">
                      카탈로그에 등록된 릴리스가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredReleases.map((rel) => {
                    const matchCount = combinedInstallations.filter(
                      (i) => i.matchedReleaseId === rel.id || (i.productName === rel.productName && i.detectedVersion === rel.version)
                    ).length;

                    return (
                      <tr
                        key={rel.id}
                        onClick={() => handleOpenRelease(rel)}
                        className="cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                      >
                        <Td>
                          <span className="font-bold text-[var(--foreground)]">{rel.productName}</span>
                        </Td>
                        <Td>
                          <span className="font-mono font-semibold text-[var(--foreground)]">{rel.version}</span>
                        </Td>
                        <Td>{rel.vendor}</Td>
                        <Td>
                          <Badge tone="info">{rel.versionMatchRule.toUpperCase()}</Badge>
                        </Td>
                        <Td>
                          <span className="font-mono text-[9px] text-[var(--muted)]">
                            {rel.matchPattern ?? rel.version}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono">{rel.supportEndDate ?? "-"}</span>
                        </Td>
                        <Td>
                          <span className="font-mono font-medium">{rel.eoslDate ?? "Unmapped"}</span>
                        </Td>
                        <Td>
                          <Badge
                            tone={
                              rel.status === "SUPPORTED"
                                ? "success"
                                : rel.status === "EOSL"
                                  ? "danger"
                                  : "warning"
                            }
                            dot
                          >
                            {rel.status}
                          </Badge>
                        </Td>
                        <Td>
                          <span className="font-mono text-[var(--foreground)]">{matchCount} VM(s)</span>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Lifecycle Matrix View */}
      {tab === "lifecycle" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Urgent: EOSL & D-30 */}
            <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--surface)] p-3">
              <div className="mb-2 flex items-center justify-between border-b border-[var(--border)] pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
                  <h3 className="text-[11px] font-bold text-[var(--foreground)]">긴급 조치 필요 (EOSL & D-30)</h3>
                </div>
                <span className="font-mono text-[10px] font-bold text-[var(--danger)]">
                  {stats.eolCount + stats.d30Count}개 자산
                </span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {combinedInstallations
                  .filter((i) => i.lifecycleStatus === "EOSL" || i.lifecycleStatus === "D30")
                  .map((inst) => (
                    <div
                      key={inst.id}
                      onClick={() => handleOpenInstallation(inst)}
                      className="flex cursor-pointer items-center justify-between rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[10px] hover:border-[var(--danger)] transition-colors"
                    >
                      <div>
                        <div className="font-mono font-bold text-[var(--foreground)]">{vmMap[inst.assetId]?.hostname ?? inst.assetId}</div>
                        <div className="text-[9px] text-[var(--muted)]">
                          {inst.productName} {inst.detectedVersion}
                        </div>
                      </div>
                      <Badge tone={inst.lifecycleStatus === "EOSL" ? "danger" : "warning"}>
                        {inst.lifecycleStatus}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>

            {/* Upcoming: D-90 & D-180 */}
            <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--surface)] p-3">
              <div className="mb-2 flex items-center justify-between border-b border-[var(--border)] pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--warning)]" />
                  <h3 className="text-[11px] font-bold text-[var(--foreground)]">만료 도래 예정 (D-90 & D-180)</h3>
                </div>
                <span className="font-mono text-[10px] font-bold text-[var(--warning)]">
                  {stats.d90Count + stats.d180Count}개 자산
                </span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {combinedInstallations
                  .filter((i) => i.lifecycleStatus === "D90" || i.lifecycleStatus === "D180")
                  .map((inst) => (
                    <div
                      key={inst.id}
                      onClick={() => handleOpenInstallation(inst)}
                      className="flex cursor-pointer items-center justify-between rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[10px] hover:border-[var(--warning)] transition-colors"
                    >
                      <div>
                        <div className="font-mono font-bold text-[var(--foreground)]">{vmMap[inst.assetId]?.hostname ?? inst.assetId}</div>
                        <div className="text-[9px] text-[var(--muted)]">
                          {inst.productName} {inst.detectedVersion}
                        </div>
                      </div>
                      <Badge tone="warning">{inst.lifecycleStatus}</Badge>
                    </div>
                  ))}
              </div>
            </div>

            {/* Unmapped / Unrecognized */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="mb-2 flex items-center justify-between border-b border-[var(--border)] pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--muted)]" />
                  <h3 className="text-[11px] font-bold text-[var(--foreground)]">미매핑 / 카탈로그 검토 필요</h3>
                </div>
                <span className="font-mono text-[10px] font-bold text-[var(--muted)]">
                  {stats.unmappedCount}개 자산
                </span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {combinedInstallations
                  .filter((i) => i.lifecycleStatus === "UNMAPPED")
                  .map((inst) => (
                    <div
                      key={inst.id}
                      onClick={() => handleOpenInstallation(inst)}
                      className="flex cursor-pointer items-center justify-between rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[10px] hover:border-[var(--primary)] transition-colors"
                    >
                      <div>
                        <div className="font-mono font-bold text-[var(--foreground)]">{vmMap[inst.assetId]?.hostname ?? inst.assetId}</div>
                        <div className="text-[9px] text-[var(--muted)]">
                          {inst.productName} {inst.detectedVersion}
                        </div>
                      </div>
                      <Badge tone="neutral">UNMAPPED</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Compliance note */}
          <div className="rounded-md border border-dashed border-[var(--border-strong)] p-3 text-[9.5px] text-[var(--muted)] leading-relaxed">
            운영 원칙: 카탈로그와 매칭되지 않는 소프트웨어 버전은 임의로 정상 또는 만료 상태로 추정하지 않고 <span className="font-semibold text-[var(--foreground)]">UNMAPPED</span> 상태로 유지하여, 관리자가 정식 카탈로그 릴리스 규칙을 등록하거나 보안 검증을 수행하도록 유도합니다.
          </div>
        </div>
      )}

      {/* Software Detail Drawer */}
      <SoftwareDetailDrawer
        release={selectedRelease}
        product={selectedProduct}
        installations={combinedInstallations.filter(
          (i) =>
            selectedRelease &&
            (i.matchedReleaseId === selectedRelease.id ||
              (i.productName === selectedRelease.productName && i.detectedVersion === selectedRelease.version))
        )}
        open={!!selectedRelease}
        onClose={() => {
          setSelectedRelease(null);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
  highlight = false,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "danger" | "neutral";
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        highlight && tone === "danger"
          ? "border-[var(--danger)]/40 bg-[var(--danger-surface)] text-[var(--danger)]"
          : highlight && tone === "warning"
            ? "border-[var(--warning)]/40 bg-[var(--warning-surface)] text-[var(--warning)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
      }`}
    >
      <div className="text-[9px] text-[var(--muted)]">{label}</div>
      <div className="mt-0.5 font-mono text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-3 py-2 font-medium">{children}</th>
);

const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2 align-middle ${className ?? ""}`}>{children}</td>
);
