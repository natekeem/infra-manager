"use client";

import type { NetworkStatus } from "@/domain/models";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/tailgrids/core/badge";

export function ConnectionDrawer({ status, open, onClose }: { status: NetworkStatus | null; open: boolean; onClose: () => void }) {
  if (!status) return null;
  const p=status.policy, o=status.observation;
  return <SlideDrawer open={open} onClose={onClose} title={`${p.sourceName} → ${p.targetName}`} subtitle={`${p.protocol}/${p.port} · ${p.purpose ?? "Network flow"}`}>
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between"><StatusBadge state={status.overall}/><span className="font-mono text-[9px] text-[var(--muted)]">{p.requestId ?? "NO REQUEST ID"}</span></div>
      <DrawerSection title="Policy / Should be">
        <KV k="Approval" v={<Badge tone={p.approvalStatus==='APPROVED'?'success':p.approvalStatus==='PENDING'?'warning':'danger'}>{p.approvalStatus}</Badge>}/>
        <KV k="Source" v={`${p.sourceName} · ${p.sourceIp}`}/><KV k="Target" v={`${p.targetName} · ${p.targetIp}`}/><KV k="Protocol / Port" v={`${p.protocol} / ${p.port}`}/><KV k="Expires" v={p.expiresAt ?? "-"}/><KV k="Remaining" v={status.daysToExpiry == null ? "-" : status.daysToExpiry >= 0 ? `D-${status.daysToExpiry}` : `D+${Math.abs(status.daysToExpiry)}`}/><KV k="Purpose" v={p.purpose ?? "-"}/>
      </DrawerSection>
      <DrawerSection title="Observed / Actual">
        <KV k="Ping" v={<ProbeBadge value={o?.ping ?? 'NO_DATA'}/>}/><KV k="Ping RTT" v={o?.pingLatencyMs == null ? "-" : `${o.pingLatencyMs} ms`}/><KV k="TCP" v={<ProbeBadge value={o?.tcp ?? 'NO_DATA'}/>}/><KV k="TCP RTT" v={o?.tcpLatencyMs == null ? "-" : `${o.tcpLatencyMs} ms`}/><KV k="Checked" v={o?.checkedAt?.replace('T',' ').slice(0,19) ?? '-'}/>
      </DrawerSection>
      <DrawerSection title="Diagnosis"><div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[10px] leading-5 text-[var(--muted)]">{status.diagnostic}</div></DrawerSection>
      <div className="mt-4 rounded-md border border-dashed border-[var(--border-strong)] p-3 text-[9px] text-[var(--muted)]">통신 실패는 방화벽 차단으로 단정하지 않습니다. Ping/TCP 결과와 승인 정책을 이용해 원인 범위를 좁히고 실제 방화벽 작업 상태 또는 대상 서비스를 확인합니다.</div>
    </div>
  </SlideDrawer>;
}
function DrawerSection({title,children}:{title:string;children:React.ReactNode}){return <section className="mt-5 first:mt-0"><h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{title}</h3>{children}</section>}
function KV({k,v}:{k:string;v:React.ReactNode}){return <div className="flex min-h-8 items-center border-b border-[var(--border)] text-[10px] last:border-0"><div className="w-[118px] shrink-0 text-[var(--muted)]">{k}</div><div className="min-w-0 font-medium">{v}</div></div>}
function ProbeBadge({value}:{value:"UP"|"DOWN"|"NO_DATA"}){return <Badge tone={value==='UP'?'success':value==='DOWN'?'danger':'neutral'} dot>{value}</Badge>}
