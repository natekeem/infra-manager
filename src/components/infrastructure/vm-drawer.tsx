"use client";

import type { NetworkStatus, SoftwareInstall, SopDocument, VmAsset } from "@/domain/models";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { Badge } from "@/components/tailgrids/core/badge";
import { StatusBadge } from "@/components/network/status-badge";
import { getEoslState } from "@/domain/eosl";
import { ArrowUpRightIcon } from "@/components/common/icons";

export function VmDrawer({ vm, network, software, sops, open, onClose }: { vm: VmAsset | null; network: NetworkStatus[]; software: SoftwareInstall[]; sops: SopDocument[]; open: boolean; onClose: () => void }) {
  if (!vm) return null;
  const connections = network.filter((s) => s.policy.sourceVmId === vm.id || s.policy.targetVmId === vm.id);
  const installed = software.filter((s) => s.vmId === vm.id);
  const docs = sops.filter((s) => s.relatedVmIds.includes(vm.id));
  const eosl = getEoslState(vm.eoslDate, new Date("2026-09-21T00:28:00+09:00"));
  const eoslTone = eosl.state === "EOSL" ? "danger" : eosl.state === "D90" || eosl.state === "D180" ? "warning" : "success";
  return <SlideDrawer open={open} onClose={onClose} title={vm.hostname} subtitle={`${vm.ipAddress} · ${vm.environment} · ${vm.role}`}>
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between"><Badge tone={vm.health === "healthy" ? "success" : vm.health === "critical" ? "danger" : "warning"} dot>{vm.health}</Badge><span className="text-[9px] text-[var(--muted)]">Verified {vm.lastVerifiedAt?.slice(0,16).replace("T"," ")}</span></div>
      <div className="grid grid-cols-3 overflow-hidden rounded-md border border-[var(--border)]">
        {[['CPU',vm.cpuPct],['MEM',vm.memoryPct],['DISK',vm.diskPct]].map(([k,v],i)=><div key={String(k)} className={`px-3 py-2.5 ${i ? 'border-l border-[var(--border)]':''}`}><div className="text-[9px] text-[var(--muted)]">{k}</div><div className="mt-0.5 text-[16px] font-semibold tabular-nums">{v}%</div></div>)}
      </div>

      <Section title="Asset">
        <KV k="Service" v={vm.service}/><KV k="Zone" v={vm.zone}/><KV k="Criticality" v={vm.criticality}/><KV k="Owner" v={vm.owner ?? "-"}/><KV k="OS" v={`${vm.osName} ${vm.osVersion ?? ''}`}/><KV k="OS EOSL" v={<span className="flex items-center gap-2"><Badge tone={eoslTone}>{eosl.state}</Badge><span>{vm.eoslDate ?? '-'}</span></span>}/>
      </Section>

      <Section title={`Network · ${connections.length}`}>
        <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">{connections.slice(0,8).map((s)=><div key={s.policy.id} className="px-2.5 py-2"><div className="flex items-center justify-between gap-2"><div className="min-w-0 truncate text-[10px] font-medium">{s.policy.sourceName} → {s.policy.targetName}</div><StatusBadge state={s.overall}/></div><div className="mt-1 flex gap-3 font-mono text-[9px] text-[var(--muted)]"><span>{s.policy.protocol}/{s.policy.port}</span><span>Ping {s.observation?.ping ?? '-'}</span><span>TCP {s.observation?.tcp ?? '-'}</span></div></div>)}</div>
      </Section>

      <Section title={`Software · ${installed.length}`}>
        <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">{installed.map((sw)=>{const state=getEoslState(sw.eoslDate,new Date("2026-09-21T00:28:00+09:00"));return <div key={sw.id} className="flex items-center justify-between gap-2 px-2.5 py-2"><div><div className="text-[10px] font-medium">{sw.name}</div><div className="text-[9px] text-[var(--muted)]">{sw.version ?? '-'} · {sw.vendor ?? '-'}</div></div><Badge tone={state.state==='EOSL'?'danger':state.state==='D90'||state.state==='D180'?'warning':'neutral'}>{state.state}</Badge></div>})}</div>
      </Section>

      <Section title={`SOP · ${docs.length}`}>
        <div className="space-y-1.5">{docs.map((doc)=><a key={doc.id} href={doc.url ?? '#'} target="_blank" className="flex items-center justify-between rounded-md border border-[var(--border)] px-2.5 py-2 text-[10px] hover:bg-[var(--surface-2)]"><span>{doc.title}</span><ArrowUpRightIcon className="h-3.5 w-3.5 text-[var(--muted)]"/></a>)}</div>
      </Section>

      <a href={`${process.env.NEXT_PUBLIC_GRAFANA_BASE_URL ?? '#'}${vm.grafanaPath ?? ''}`} className="mt-4 flex h-8 items-center justify-center gap-1 rounded-md bg-[#5750f1] text-[10px] font-medium text-white">Grafana 상세보기 <ArrowUpRightIcon className="h-3.5 w-3.5"/></a>
    </div>
  </SlideDrawer>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mt-5"><h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{title}</h3>{children}</section>; }
function KV({ k, v }: { k: string; v: React.ReactNode }) { return <div className="flex min-h-7 items-center border-b border-[var(--border)] text-[10px] last:border-0"><div className="w-[118px] shrink-0 text-[var(--muted)]">{k}</div><div className="min-w-0 font-medium">{v}</div></div>; }
