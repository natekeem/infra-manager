"use client";

import type { NetworkStatus } from "@/domain/models";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/tailgrids/core/badge";

export function ConnectionDrawer({ status, open, onClose }: { status: NetworkStatus | null; open: boolean; onClose: () => void }) {
  if (!status) return null;
  const p = status.policy;
  const o = status.observation;
  const reverse = status.reverseObservation;
  const isBidi = p.direction === "BIDIRECTIONAL" || status.isBidirectional;
  const observesReverse = isBidi && Boolean(p.targetVmId);

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={`${p.sourceName} ${isBidi ? "⇄" : "→"} ${p.targetName}`}
      subtitle={`${p.protocol}/${p.port} · ${p.purpose ?? "Network flow"}`}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <StatusBadge state={status.overall} />
          <div className="flex items-center gap-2">
            <Badge tone={isBidi ? "info" : "neutral"}>{isBidi ? "BIDIRECTIONAL" : "ONE_WAY"}</Badge>
            <span className="font-mono text-[9px] text-[var(--muted)]">{p.requestId ?? "NO REQUEST ID"}</span>
          </div>
        </div>

        <DrawerSection title="Policy / Should be">
          <KV k="Approval" v={<Badge tone={p.approvalStatus === "APPROVED" ? "success" : p.approvalStatus === "PENDING" ? "warning" : "danger"}>{p.approvalStatus}</Badge>} />
          <KV k="Direction" v={isBidi ? "양방향 (Bidirectional)" : "단방향 (One-way)"} />
          <KV k="Source" v={`${p.sourceName} · ${p.sourceIp}`} />
          <KV k="Target" v={`${p.targetName} · ${p.targetIp}`} />
          <KV k="Protocol / Port" v={`${p.protocol} / ${p.port}`} />
          <KV k="Expires" v={p.expiresAt ?? "-"} />
          <KV k="Remaining" v={status.daysToExpiry == null ? "-" : status.daysToExpiry >= 0 ? `D-${status.daysToExpiry}` : `D+${Math.abs(status.daysToExpiry)}`} />
          <KV k="Purpose" v={p.purpose ?? "-"} />
        </DrawerSection>

        {observesReverse ? (
          <DrawerSection title="Observed Probes (Bidirectional)">
            <div className="space-y-2.5">
              {/* Forward Probe Card */}
              <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold text-[var(--foreground)]">Forward: {p.sourceName} → {p.targetName}</span>
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
                  <span className="font-mono text-[10px] font-semibold text-[var(--foreground)]">Return: {p.targetName} → {p.sourceName}</span>
                  <ProbeBadge value={reverse?.tcp ?? "NO_DATA"} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="text-[var(--muted)]">Ping: </span><ProbeBadge value={reverse?.ping ?? "NO_DATA"} /></div>
                  <div><span className="text-[var(--muted)]">Ping RTT: </span><span className="font-mono">{reverse?.pingLatencyMs != null ? `${reverse.pingLatencyMs} ms` : "-"}</span></div>
                  <div><span className="text-[var(--muted)]">TCP: </span><ProbeBadge value={reverse?.tcp ?? "NO_DATA"} /></div>
                  <div><span className="text-[var(--muted)]">TCP RTT: </span><span className="font-mono">{reverse?.tcpLatencyMs != null ? `${reverse.tcpLatencyMs} ms` : "-"}</span></div>
                </div>
              </div>
              <div className="text-[9px] text-[var(--muted)]">Forward checked: {o?.checkedAt?.replace("T", " ").slice(0, 19) ?? "-"}<br/>Return checked: {reverse?.checkedAt?.replace("T", " ").slice(0, 19) ?? "-"}</div>
            </div>
          </DrawerSection>
        ) : (
          <DrawerSection title="Observed / Actual">
            <KV k="Ping" v={<ProbeBadge value={o?.ping ?? "NO_DATA"} />} />
            <KV k="Ping RTT" v={o?.pingLatencyMs == null ? "-" : `${o.pingLatencyMs} ms`} />
            <KV k="TCP" v={<ProbeBadge value={o?.tcp ?? "NO_DATA"} />} />
            <KV k="TCP RTT" v={o?.tcpLatencyMs == null ? "-" : `${o.tcpLatencyMs} ms`} />
            <KV k="Checked" v={o?.checkedAt?.replace("T", " ").slice(0, 19) ?? "-"} />
            {isBidi && !p.targetVmId && (
              <div className="mt-2 rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[9px] text-[var(--muted)]">
                정책은 양방향이지만 Target이 관리 대상 VM이 아니어서 Target→Source Telegraf probe는 자동 수집 대상이 아닙니다.
              </div>
            )}
          </DrawerSection>
        )}

        <DrawerSection title="Diagnosis">
          <div className={`rounded-md border p-3 text-[10px] leading-5 ${status.overall === "RETURN_DIRECTION_FAILED" ? "border-[var(--danger)]/40 bg-[var(--danger-surface)] text-[var(--danger)]" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"}`}>
            {status.diagnostic}
          </div>
        </DrawerSection>

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

