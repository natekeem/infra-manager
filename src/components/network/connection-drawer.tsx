"use client";

import { useState, useEffect } from "react";
import type { NetworkStatus } from "@/domain/models";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/tailgrids/core/badge";

export type HandleDirection = "t" | "b" | "l" | "r";

export function ConnectionDrawer({
  status,
  relatedStatuses,
  open,
  onClose,
  sourceHandle,
  targetHandle,
  onUpdateHandles,
}: {
  status: NetworkStatus | null;
  relatedStatuses?: NetworkStatus[];
  open: boolean;
  onClose: () => void;
  sourceHandle?: HandleDirection;
  targetHandle?: HandleDirection;
  onUpdateHandles?: (handles: { source?: HandleDirection; target?: HandleDirection }) => void;
}) {
  const [activeStatus, setActiveStatus] = useState<NetworkStatus | null>(status);

  useEffect(() => {
    setActiveStatus(status);
  }, [status]);

  if (!activeStatus) return null;
  const p = activeStatus.policy;
  const o = activeStatus.observation;
  const reverse = activeStatus.reverseObservation;
  const isBidi = p.direction === "BIDIRECTIONAL" || activeStatus.isBidirectional;
  const observesReverse = isBidi && Boolean(p.targetVmId);

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={`${p.sourceName} ${isBidi ? "⇄" : "→"} ${p.targetName}`}
      subtitle={`${p.protocol}/${p.port} · ${p.purpose ?? "Network flow"}`}
    >
      <div className="p-4 space-y-4">
        {/* Multi-flow selector if aggregated */}
        {relatedStatuses && relatedStatuses.length > 1 && (
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-2">
            <div className="mb-1 text-[9px] font-medium text-[var(--muted)]">
              통합된 연결 흐름 ({relatedStatuses.length}개) — 클릭하여 전환:
            </div>
            <div className="flex flex-wrap gap-1">
              {relatedStatuses.map((s) => (
                <button
                  key={s.policy.id}
                  onClick={() => setActiveStatus(s)}
                  className={`rounded border px-1.5 py-0.5 font-mono text-[8px] transition ${
                    s.policy.id === activeStatus.policy.id
                      ? "border-[#5750f1] bg-[#5750f1] text-white"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  {s.policy.protocol}/{s.policy.port}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <StatusBadge state={activeStatus.overall} />
          <div className="flex items-center gap-2">
            <Badge tone={isBidi ? "info" : "neutral"}>{isBidi ? "BIDIRECTIONAL" : "ONE_WAY"}</Badge>
            <span className="font-mono text-[9px] text-[var(--muted)]">{p.requestId ?? "요청 ID 없음"}</span>
          </div>
        </div>

        <DrawerSection title="방화벽 정책 기준 (Should Be)">
          <KV k="승인 상태" v={<Badge tone={p.approvalStatus === "APPROVED" ? "success" : p.approvalStatus === "PENDING" ? "warning" : "danger"}>{p.approvalStatus}</Badge>} />
          <KV k="방향" v={isBidi ? "양방향 (Bidirectional)" : "단방향 (One-way)"} />
          <KV k="출발지" v={`${p.sourceName} · ${p.sourceIp}`} />
          <KV k="목적지" v={`${p.targetName} · ${p.targetIp}`} />
          <KV k="프로토콜 / 포트" v={`${p.protocol} / ${p.port}`} />
          <KV k="만료일" v={p.expiresAt ?? "-"} />
          <KV k="잔여 기간" v={activeStatus.daysToExpiry == null ? "-" : activeStatus.daysToExpiry >= 0 ? `D-${activeStatus.daysToExpiry}` : `D+${Math.abs(activeStatus.daysToExpiry)}`} />
          <KV k="용도" v={p.purpose ?? "-"} />
        </DrawerSection>

        {observesReverse ? (
          <DrawerSection title="실측 프로브 (양방향)">
            <div className="space-y-2.5">
              {/* Forward Probe Card */}
              <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold text-[var(--foreground)]">정방향 (Forward): {p.sourceName} → {p.targetName}</span>
                  <ProbeBadge value={o?.tcp ?? "NO_DATA"} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="text-[var(--muted)]">Ping: </span><ProbeBadge value={o?.ping ?? "NO_DATA"} /></div>
                  <div><span className="text-[var(--muted)]">Ping RTT: </span><span className="font-mono">{o?.pingLatencyMs != null ? `${o.pingLatencyMs} ms` : "-"}</span></div>
                  <div><span className="text-[var(--muted)]">TCP: </span><ProbeBadge value={o?.tcp ?? "NO_DATA"} /></div>
                  <div><span className="text-[var(--muted)]">TCP RTT: </span><span className="font-mono">{o?.tcpLatencyMs != null ? `${o.tcpLatencyMs} ms` : "-"}</span></div>
                </div>
              </div>

              {/* Return Probe Card */}
              <div className={`rounded border p-2.5 ${reverse?.tcp === "DOWN" ? "border-[var(--danger)]/30 bg-[var(--danger-surface)]" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold text-[var(--foreground)]">역방향 (Return): {p.targetName} → {p.sourceName}</span>
                  <ProbeBadge value={reverse?.tcp ?? "NO_DATA"} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="text-[var(--muted)]">Ping: </span><ProbeBadge value={reverse?.ping ?? "NO_DATA"} /></div>
                  <div><span className="text-[var(--muted)]">Ping RTT: </span><span className="font-mono">{reverse?.pingLatencyMs != null ? `${reverse.pingLatencyMs} ms` : "-"}</span></div>
                  <div><span className="text-[var(--muted)]">TCP: </span><ProbeBadge value={reverse?.tcp ?? "NO_DATA"} /></div>
                  <div><span className="text-[var(--muted)]">TCP RTT: </span><span className="font-mono">{reverse?.tcpLatencyMs != null ? `${reverse.tcpLatencyMs} ms` : "-"}</span></div>
                </div>
              </div>
              <div className="text-[9px] text-[var(--muted)]">정방향 확인: {o?.checkedAt?.replace("T", " ").slice(0, 19) ?? "-"}<br/>역방향 확인: {reverse?.checkedAt?.replace("T", " ").slice(0, 19) ?? "-"}</div>
            </div>
          </DrawerSection>
        ) : (
          <DrawerSection title="실측 프로브 (Actual)">
            <KV k="Ping" v={<ProbeBadge value={o?.ping ?? "NO_DATA"} />} />
            <KV k="Ping RTT" v={o?.pingLatencyMs == null ? "-" : `${o.pingLatencyMs} ms`} />
            <KV k="TCP" v={<ProbeBadge value={o?.tcp ?? "NO_DATA"} />} />
            <KV k="TCP RTT" v={o?.tcpLatencyMs == null ? "-" : `${o.tcpLatencyMs} ms`} />
            <KV k="확인 일시" v={o?.checkedAt?.replace("T", " ").slice(0, 19) ?? "-"} />
            {isBidi && !p.targetVmId && (
              <div className="mt-2 rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[9px] text-[var(--muted)]">
                정책은 양방향이지만 Target이 관리 대상 VM이 아니어서 Target→Source Telegraf probe는 자동 수집 대상이 아닙니다.
              </div>
            )}
          </DrawerSection>
        )}

        <DrawerSection title="상태 진단">
          <div className={`rounded-md border p-3 text-[10px] leading-5 ${activeStatus.overall === "RETURN_DIRECTION_FAILED" ? "border-[var(--danger)]/40 bg-[var(--danger-surface)] text-[var(--danger)]" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"}`}>
            {activeStatus.diagnostic}
          </div>
        </DrawerSection>

        {onUpdateHandles && (
          <DrawerSection title="Connection Routing / Handles (선 연결 위치)">
            <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">출발선 위치 (Source Exit):</span>
                <select
                  value={sourceHandle ?? "auto"}
                  onChange={(e) =>
                    onUpdateHandles({
                      source: e.target.value === "auto" ? undefined : (e.target.value as HandleDirection),
                      target: targetHandle,
                    })
                  }
                  className="h-6 rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[9px] text-[var(--foreground)] outline-none"
                >
                  <option value="auto">Auto (자동 감지)</option>
                  <option value="t">Top (상단)</option>
                  <option value="b">Bottom (하단)</option>
                  <option value="l">Left (좌측)</option>
                  <option value="r">Right (우측)</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">도착선 위치 (Target Entry):</span>
                <select
                  value={targetHandle ?? "auto"}
                  onChange={(e) =>
                    onUpdateHandles({
                      source: sourceHandle,
                      target: e.target.value === "auto" ? undefined : (e.target.value as HandleDirection),
                    })
                  }
                  className="h-6 rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[9px] text-[var(--foreground)] outline-none"
                >
                  <option value="auto">Auto (자동 감지)</option>
                  <option value="t">Top (상단)</option>
                  <option value="b">Bottom (하단)</option>
                  <option value="l">Left (좌측)</option>
                  <option value="r">Right (우측)</option>
                </select>
              </div>
              <div className="text-[8px] text-[var(--muted)]">
                카드 위치를 이동한 후 선이 자연스럽게 이어지도록 상/하/좌/우 중 출발/도착 연결점을 수동 설정할 수 있습니다.
              </div>
            </div>
          </DrawerSection>
        )}

        <div className="rounded-md border border-dashed border-[var(--border-strong)] p-3 text-[9px] text-[var(--muted)] leading-relaxed">
          통신 실패는 방화벽 차단으로 단정하지 않습니다. Ping/TCP 결과와 승인 정책을 이용해 원인 범위를 좁히고 실제 방화벽 작업 상태 또는 대상 서비스를 확인합니다.
        </div>
      </div>
    </SlideDrawer>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 first:mt-0">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{title}</h3>
      {children}
    </section>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center border-b border-[var(--border)] text-[10px] last:border-0">
      <div className="w-[118px] shrink-0 text-[var(--muted)]">{k}</div>
      <div className="min-w-0 font-medium">{v}</div>
    </div>
  );
}

function ProbeBadge({ value }: { value: "UP" | "DOWN" | "NO_DATA" }) {
  return <Badge tone={value === "UP" ? "success" : value === "DOWN" ? "danger" : "neutral"} dot>{value}</Badge>;
}

