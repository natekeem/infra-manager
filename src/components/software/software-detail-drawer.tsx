"use client";

import { useEffect, useMemo, useState } from "react";
import type { SoftwareProduct, SoftwareRelease, AssetSoftwareInstallation, SoftwareLifecyclePhase, SoftwareReleaseLifecycleHistory, VmAsset } from "@/domain/models";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { Badge } from "@/components/tailgrids/core/badge";
import { daysUntilEosl, deriveLifecycleStatus } from "@/domain/software-lifecycle";
import { EoslTimelineChart } from "./eosl-timeline-chart";

export function SoftwareDetailDrawer({
  release,
  product,
  releases = [],
  phases = [],
  installations = [],
  history = [],
  assets = [],
  inProject = false,
  onAddToProject,
  open,
  onClose,
  onSelectAsset,
}: {
  release?: SoftwareRelease | null;
  product?: SoftwareProduct | null;
  releases?: SoftwareRelease[];
  phases?: SoftwareLifecyclePhase[];
  installations?: AssetSoftwareInstallation[];
  history?: SoftwareReleaseLifecycleHistory[];
  assets?: VmAsset[];
  inProject?: boolean;
  onAddToProject?: () => void;
  open: boolean;
  onClose: () => void;
  onSelectAsset?: (assetId: string) => void;
}) {
  const [activeRelease, setActiveRelease] = useState<SoftwareRelease | null>(release ?? null);
  useEffect(() => setActiveRelease(release ?? null), [release]);
  const installedCounts = useMemo(() => Object.fromEntries(releases.map((item) => [item.id, installations.filter((installation) => installation.matchedReleaseId === item.id).length])), [releases, installations]);
  if (!release && !product) return null;

  const current = activeRelease ?? release;
  const title = product?.name ?? current?.productName ?? "소프트웨어 상세 정보";
  const subtitle = `${current?.vendor ?? product?.vendor ?? "-"} · ${product?.category ?? "General"}`;
  const days = current ? daysUntilEosl(current.eoslDate) : null;
  const status = deriveLifecycleStatus(current?.eoslDate);
  const relevantInstallations = current ? installations.filter((installation) => installation.matchedReleaseId === current.id) : installations;
  const impactedAssets = assets.filter((asset) => relevantInstallations.some((installation) => installation.assetId === asset.id));
  const environments = Object.entries(impactedAssets.reduce<Record<string, number>>((counts, asset) => ({ ...counts, [asset.environment]: (counts[asset.environment] ?? 0) + 1 }), {}));
  const releaseHistory = history.filter((entry) => !current || entry.releaseId === current.id).slice(0, 5);

  return (
    <SlideDrawer open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div className="p-4 space-y-4">
        {/* Status Header */}
        <div className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface-2)] p-2">
          <div><div className="text-[9px] text-[var(--muted)]">Project Scope</div><div className="text-[10px] font-semibold">{inProject ? "In Project ✓" : "Company Catalog only"}</div></div>
          <button type="button" disabled={inProject} onClick={onAddToProject} className="h-7 rounded border border-[var(--border)] px-3 text-[9px] font-medium text-[#5750f1] disabled:text-[var(--muted)]">{inProject ? "In Project ✓" : "Add to Project"}</button>
        </div>

        {current && (
          <div className="flex items-center justify-between">
            <Badge
              tone={
                status === "SUPPORTED"
                  ? "success"
                  : status === "EOSL"
                    ? "danger"
                    : "warning"
              }
              dot
            >
              {status}
            </Badge>
            <span className="font-mono text-[9px] text-[var(--muted)]">
              {days == null
                ? "EOSL 일자 미지정"
                : days < 0
                  ? `EOSL ${Math.abs(days)}일 경과`
                  : `D-${days}`}
            </span>
          </div>
        )}

        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Release Support Timeline</h3>
          <EoslTimelineChart releases={releases} phases={phases} selectedReleaseId={current?.id} installedCounts={installedCounts} maxRows={7} onSelectRelease={setActiveRelease} compact />
        </section>

        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Impact / Blast Radius</h3>
          <div className="grid grid-cols-2 gap-2 text-[9px]"><div className="rounded border border-[var(--border)] p-2"><span className="text-[var(--muted)]">Installed Assets</span><div className="font-mono text-[14px] font-semibold">{impactedAssets.length}</div></div><div className="rounded border border-[var(--border)] p-2"><span className="text-[var(--muted)]">Critical Assets</span><div className="font-mono text-[14px] font-semibold">{impactedAssets.filter((asset) => asset.criticality === "CRITICAL").length}</div></div></div>
          {environments.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{environments.map(([environment, count]) => <span key={environment} className="rounded bg-[var(--surface-2)] px-2 py-1 text-[9px]">{environment} <b>{count}</b></span>)}</div>}
        </section>

        {/* Release / Product Details */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            수명주기 및 EOSL 상세 사양
          </h3>
          <div className="text-[10px]">
            <KV k="제품명" v={current?.productName ?? product?.name ?? "-"} />
            <KV k="벤더" v={current?.vendor ?? product?.vendor ?? "-"} />
            <KV k="버전" v={<span className="font-mono">{current?.version ?? "전체 버전"}</span>} />
            <KV k="EOSL 일자" v={<span className="font-mono font-medium">{current?.eoslDate ?? "미지정 / 미매핑"}</span>} />
            <KV k="Active Support End" v={<span className="font-mono">{current?.supportEndDate ?? "-"}</span>} />
            <KV k="Security Support End" v={<span className="font-mono">{current?.securitySupportEndDate ?? "-"}</span>} />
            <KV k="Extended Support End" v={<span className="font-mono">{current?.extendedSupportEndDate ?? "-"}</span>} />
            <KV k="릴리스 일자" v={<span className="font-mono">{current?.releaseDate ?? "-"}</span>} />
            <KV k="Remaining" v={<span className="font-mono">{days == null ? "UNKNOWN" : days < 0 ? `D+${Math.abs(days)}` : `D-${days}`}</span>} />
          </div>
        </section>

        {/* Version Match Rule */}
        {current && (
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              카탈로그 매칭 규칙
            </h3>
            <div className="text-[10px]">
              <KV
                k="규칙 유형"
                v={
                  <Badge tone="info">
                    {current.versionMatchRule.toUpperCase()}
                  </Badge>
                }
              />
              <KV
                k="매칭 패턴"
                v={<span className="font-mono">{current.matchPattern ?? current.version}</span>}
              />
            </div>
          </section>
        )}

        {/* Installed Assets */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              설치된 자산 ({relevantInstallations.length}대)
            </h3>
            <span className="text-[9px] text-[var(--muted)]">카탈로그 매칭</span>
          </div>

          {relevantInstallations.length === 0 ? (
            <div className="rounded border border-dashed border-[var(--border)] p-3 text-center text-[10px] text-[var(--muted)]">
              현재 이 릴리스와 일치하는 자산 설치 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {relevantInstallations.map((inst) => (
                <div
                  key={inst.id}
                  onClick={() => onSelectAsset?.(inst.assetId)}
                  className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[10px] hover:border-[var(--primary)] cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-mono font-semibold text-[var(--foreground)]">
                      {inst.assetId}
                    </div>
                    <div className="text-[9px] text-[var(--muted)]">
                      감지 버전: <span className="font-mono">{inst.detectedVersion}</span>
                    </div>
                  </div>
                  <div className="text-right">
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
                    >
                      {inst.lifecycleStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {releaseHistory.length > 0 && <section><h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Lifecycle History</h3><div className="divide-y divide-[var(--border)] rounded border border-[var(--border)]">{releaseHistory.map((entry) => <div key={entry.id} className="p-2 text-[9px]"><b>{entry.fieldName}</b> <span className="font-mono text-[var(--muted)]">{entry.oldValue ?? "NULL"} → {entry.newValue ?? "NULL"}</span><div className="text-[8px] text-[var(--muted)]">{entry.changedAt.slice(0, 16).replace("T", " ")}</div></div>)}</div></section>}

        {/* Policy Guidance */}
        <div className="rounded-md border border-dashed border-[var(--border-strong)] p-3 text-[9px] text-[var(--muted)] leading-relaxed">
          카탈로그에 등록되지 않은 소프트웨어 버전은 임의로 추정하지 않고 <span className="font-semibold text-[var(--foreground)]">UNMAPPED</span>로 분류하여 보안 감사 및 패치 관리 대상으로 유지합니다.
        </div>
      </div>
    </SlideDrawer>
  );
}
function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center border-b border-[var(--border)] text-[10px] last:border-0">
      <div className="w-[120px] shrink-0 text-[var(--muted)]">{k}</div>
      <div className="min-w-0 font-medium text-[var(--foreground)]">{v}</div>
    </div>
  );
}
