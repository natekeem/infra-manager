"use client";

import type { NasAsset } from "@/domain/models";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { Badge } from "@/components/tailgrids/core/badge";

export function NasDrawer({
  nas,
  open,
  onClose,
  onSelectVm,
}: {
  nas: NasAsset | null;
  open: boolean;
  onClose: () => void;
  onSelectVm?: (hostname: string) => void;
}) {
  if (!nas) return null;

  const usedPct = nas.capacityTb > 0 ? Math.round((nas.usedCapacityTb / nas.capacityTb) * 100) : 0;
  const freeTb = Math.max(0, nas.capacityTb - nas.usedCapacityTb).toFixed(1);

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={nas.hostname}
      subtitle={`${nas.vendor} ${nas.model ?? "NAS"} · ${nas.ipAddress}`}
    >
      <div className="p-4 space-y-4">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <Badge
            tone={
              nas.status === "ONLINE"
                ? "success"
                : nas.status === "DEGRADED"
                  ? "warning"
                  : "danger"
            }
            dot
          >
            {nas.status}
          </Badge>
          <Badge tone="info">{nas.protocol}</Badge>
        </div>

        {/* Capacity Gauge */}
        <section className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[var(--foreground)]">스토리지 할당량</span>
            <span className="font-mono text-[var(--muted)]">
              {nas.usedCapacityTb} / {nas.capacityTb} TB ({usedPct}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded bg-[var(--surface-3)]">
            <div
              className={`h-full rounded transition-all duration-300 ${
                usedPct >= 90
                  ? "bg-[var(--danger)]"
                  : usedPct >= 75
                    ? "bg-[var(--warning)]"
                    : "bg-[var(--primary)]"
              }`}
              style={{ width: `${Math.min(100, usedPct)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-[var(--muted)]">
            <span>사용 중: {nas.usedCapacityTb} TB</span>
            <span>여유 공간: {freeTb} TB</span>
          </div>
        </section>

        {/* Storage Properties */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            스토리지 상세 사양
          </h3>
          <div className="text-[10px]">
            <KV k="벤더 / 모델" v={`${nas.vendor} ${nas.model ?? "-"}`} />
            <KV k="IP 주소" v={<span className="font-mono">{nas.ipAddress}</span>} />
            <KV k="프로토콜" v={nas.protocol} />
            <KV k="마운트 경로" v={<span className="font-mono">{nas.mountPath ?? "-"}</span>} />
            <KV k="환경" v={nas.environment} />
            <KV k="영역" v={nas.zone} />
            <KV k="중요도" v={<Badge tone={nas.criticality === "CRITICAL" ? "danger" : "neutral"}>{nas.criticality}</Badge>} />
            <KV k="담당자" v={nas.owner ?? "-"} />
          </div>
        </section>

        {/* Connected VMs / Clients */}
        {nas.targetVms && nas.targetVms.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
                마운트된 대상 VM ({nas.targetVms.length}대)
              </h3>
              <span className="text-[9px] text-[var(--muted)]">클라이언트 노드</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {nas.targetVms.map((vm) => (
                <button
                  key={vm}
                  type="button"
                  onClick={() => onSelectVm?.(vm)}
                  className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-[10px] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  {vm}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Guidance Tip */}
        <div className="rounded-md border border-dashed border-[var(--border-strong)] p-3 text-[9px] text-[var(--muted)] leading-relaxed">
          공유 스토리지(NAS) 장애 시 마운트된 모든 대상 VM의 RPA 파일 입출력 및 로그 저장 프로세스에 연쇄 장애가 발생할 수 있습니다.
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
