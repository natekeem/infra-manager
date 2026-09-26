"use client";

import type { SoftwareProduct, SoftwareRelease, AssetSoftwareInstallation } from "@/domain/models";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { Badge } from "@/components/tailgrids/core/badge";
import { daysUntil } from "@/domain/network-status";

export function SoftwareDetailDrawer({
  release,
  product,
  installations = [],
  open,
  onClose,
  onSelectAsset,
}: {
  release?: SoftwareRelease | null;
  product?: SoftwareProduct | null;
  installations?: AssetSoftwareInstallation[];
  open: boolean;
  onClose: () => void;
  onSelectAsset?: (assetId: string) => void;
}) {
  if (!release && !product) return null;

  const title = release ? `${release.productName} ${release.version}` : product?.name ?? "소프트웨어 상세 정보";
  const subtitle = `${release?.vendor ?? product?.vendor ?? "-"} · ${product?.category ?? "Middleware"}`;
  const days = release ? daysUntil(release.eoslDate) : null;

  return (
    <SlideDrawer open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div className="p-4 space-y-4">
        {/* Status Header */}
        {release && (
          <div className="flex items-center justify-between">
            <Badge
              tone={
                release.status === "SUPPORTED"
                  ? "success"
                  : release.status === "EOSL"
                    ? "danger"
                    : "warning"
              }
              dot
            >
              {release.status}
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

        {/* Release / Product Details */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            수명주기 및 EOSL 상세 사양
          </h3>
          <div className="text-[10px]">
            <KV k="제품명" v={release?.productName ?? product?.name ?? "-"} />
            <KV k="벤더" v={release?.vendor ?? product?.vendor ?? "-"} />
            <KV k="버전" v={<span className="font-mono">{release?.version ?? "전체 버전"}</span>} />
            <KV k="EOSL 일자" v={<span className="font-mono font-medium">{release?.eoslDate ?? "미지정 / 미매핑"}</span>} />
            <KV k="지원 종료일" v={<span className="font-mono">{release?.supportEndDate ?? "-"}</span>} />
            <KV k="릴리스 일자" v={<span className="font-mono">{release?.releaseDate ?? "-"}</span>} />
          </div>
        </section>

        {/* Version Match Rule */}
        {release && (
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              카탈로그 매칭 규칙
            </h3>
            <div className="text-[10px]">
              <KV
                k="규칙 유형"
                v={
                  <Badge tone="info">
                    {release.versionMatchRule.toUpperCase()}
                  </Badge>
                }
              />
              <KV
                k="매칭 패턴"
                v={<span className="font-mono">{release.matchPattern ?? release.version}</span>}
              />
            </div>
          </section>
        )}

        {/* Installed Assets */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              설치된 자산 ({installations.length}대)
            </h3>
            <span className="text-[9px] text-[var(--muted)]">카탈로그 매칭</span>
          </div>

          {installations.length === 0 ? (
            <div className="rounded border border-dashed border-[var(--border)] p-3 text-center text-[10px] text-[var(--muted)]">
              현재 이 릴리스와 일치하는 자산 설치 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {installations.map((inst) => (
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
