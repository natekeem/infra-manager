"use client";

import { useState } from "react";
import type { NetworkStatus, SoftwareInstall, SopDocument, VmAsset } from "@/domain/models";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { Badge } from "@/components/tailgrids/core/badge";
import { StatusBadge } from "@/components/network/status-badge";
import { getEoslState } from "@/domain/eosl";
import { ArrowUpRightIcon } from "@/components/common/icons";

type DrawerTab = "overview" | "network" | "software" | "sop";

export function VmDrawer({
  vm,
  network,
  software,
  sops,
  open,
  onClose,
  onSelectSoftware,
}: {
  vm: VmAsset | null;
  network: NetworkStatus[];
  software: SoftwareInstall[];
  sops: SopDocument[];
  open: boolean;
  onClose: () => void;
  onSelectSoftware?: (sw: SoftwareInstall) => void;
}) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");

  if (!vm) return null;

  const connections = network.filter(
    (s) => s.policy.sourceVmId === vm.id || s.policy.targetVmId === vm.id
  );
  const installed = software.filter((s) => s.vmId === vm.id);
  const docs = sops.filter((s) => s.relatedVmIds.includes(vm.id));
  const eosl = getEoslState(vm.eoslDate, new Date("2026-09-21T00:28:00+09:00"));
  const eoslTone =
    eosl.state === "EOSL"
      ? "danger"
      : eosl.state === "D30" || eosl.state === "D90" || eosl.state === "D180"
        ? "warning"
        : "success";

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={vm.hostname}
      subtitle={`${vm.ipAddress} · ${vm.environment} · ${vm.role}`}
      width={460}
    >
      <div className="flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border)] bg-[var(--surface-2)] px-4 pt-2">
          {(
            [
              { id: "overview", label: "개요" },
              { id: "network", label: `네트워크 (${connections.length})` },
              { id: "software", label: `소프트웨어 (${installed.length})` },
              { id: "sop", label: `SOP (${docs.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-3 pb-2 text-[10px] font-semibold transition ${
                activeTab === tab.id
                  ? "border-[#5750f1] text-[#5750f1]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Badge
                tone={
                  vm.health === "healthy"
                    ? "success"
                    : vm.health === "critical"
                      ? "danger"
                      : "warning"
                }
                dot
              >
                {vm.health}
              </Badge>
              <span className="text-[9px] text-[var(--muted)]">
                확인 일시 {vm.lastVerifiedAt?.slice(0, 16).replace("T", " ")}
              </span>
            </div>

            <div className="grid grid-cols-3 overflow-hidden rounded-md border border-[var(--border)]">
              {[
                ["CPU", vm.cpuPct],
                ["MEM", vm.memoryPct],
                ["DISK", vm.diskPct],
              ].map(([k, v], i) => (
                <div key={String(k)} className={`px-3 py-2.5 ${i ? "border-l border-[var(--border)]" : ""}`}>
                  <div className="text-[9px] text-[var(--muted)]">{k}</div>
                  <div className="mt-0.5 text-[16px] font-semibold tabular-nums">{v ?? 0}%</div>
                </div>
              ))}
            </div>

            <Section title="자산 상세 사양">
              <KV k="서비스" v={vm.service} />
              <KV k="티어 영역" v={vm.zone} />
              <KV k="중요도" v={vm.criticality} />
              <KV k="담당자" v={vm.owner ?? "-"} />
              <KV k="CPU 코어" v={`${vm.cpuCores ?? 8} vCPU`} />
              <KV k="메모리" v={`${vm.memoryGb ?? 32} GB`} />
              <KV k="디스크 용량" v={`${vm.diskGb ?? 500} GB`} />
              <KV k="운영체제 (OS)" v={`${vm.osName} ${vm.osVersion ?? ""}`} />
              <KV
                k="OS 수명주기"
                v={
                  <span className="flex items-center gap-2">
                    <Badge tone={eoslTone}>{eosl.state}</Badge>
                    <span className="font-mono text-[9px]">{vm.eoslDate ?? "미매핑"}</span>
                  </span>
                }
              />
            </Section>

            <a
              href={`${process.env.NEXT_PUBLIC_GRAFANA_BASE_URL ?? "#"}${vm.grafanaPath ?? ""}`}
              className="mt-4 flex h-8 items-center justify-center gap-1 rounded-md bg-[#5750f1] text-[10px] font-medium text-white transition hover:bg-[#4938d6]"
            >
              Grafana 상세 대시보드 <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* Tab 2: Network */}
        {activeTab === "network" && (
          <div className="p-4 space-y-2">
            <div className="mb-2 text-[10px] text-[var(--muted)]">
              인바운드 및 아웃바운드 승인 정책 흐름과 TCP 실측 프로브
            </div>
            <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
              {connections.map((s) => (
                <div key={s.policy.id} className="p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-[11px] font-medium">
                      {s.policy.sourceName} → {s.policy.targetName}
                    </div>
                    <StatusBadge state={s.overall} />
                  </div>
                  <div className="mt-1 flex items-center gap-3 font-mono text-[9px] text-[var(--muted)]">
                    <span>{s.policy.protocol}/{s.policy.port}</span>
                    <span>Ping {s.observation?.ping ?? "-"}</span>
                    <span className="font-semibold text-[var(--text)]">TCP {s.observation?.tcp ?? "-"}</span>
                    {s.isBidirectional && <span className="rounded bg-[var(--surface-2)] px-1">BIDIRECTIONAL</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Software */}
        {activeTab === "software" && (
          <div className="p-4 space-y-2">
            <div className="mb-2 text-[10px] text-[var(--muted)]">
              감지된 소프트웨어 패키지, 카탈로그 릴리스 매칭 및 지원 수명주기
            </div>
            <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
              {installed.map((sw) => {
                const state = getEoslState(sw.eoslDate, new Date("2026-09-21T00:28:00+09:00"));
                const tone =
                  state.state === "EOSL"
                    ? "danger"
                    : state.state === "D30" || state.state === "D90" || state.state === "D180"
                      ? "warning"
                      : "neutral";

                return (
                  <div
                    key={sw.id}
                    onClick={() => onSelectSoftware?.(sw)}
                    className="flex cursor-pointer items-center justify-between gap-2 p-2.5 hover:bg-[var(--surface-2)] transition"
                  >
                    <div>
                      <div className="text-[11px] font-medium text-[var(--text)]">{sw.name}</div>
                      <div className="text-[9px] text-[var(--muted)]">
                        {sw.version ?? "Unknown ver"} · {sw.vendor ?? "Unknown vendor"} · {sw.category ?? "General"}
                      </div>
                      <div className="mt-0.5 font-mono text-[8px] text-[var(--muted-2)]">
                        EOSL: {sw.eoslDate ?? "Unmapped"} {state.days != null ? `(${state.days < 0 ? `D+${Math.abs(state.days)}` : `D-${state.days}`})` : ""}
                      </div>
                    </div>
                    <Badge tone={tone}>{state.state}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: SOP */}
        {activeTab === "sop" && (
          <div className="p-4 space-y-2">
            <div className="mb-2 text-[10px] text-[var(--muted)]">
              이 자산과 연결된 표준 운영 절차서 (SOP)
            </div>
            <div className="space-y-1.5">
              {docs.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url ?? "#"}
                  target="_blank"
                  className="flex items-center justify-between rounded-md border border-[var(--border)] p-2.5 text-[11px] hover:bg-[var(--surface-2)] transition"
                >
                  <div>
                    <div className="font-medium text-[var(--text)]">{doc.title}</div>
                    <div className="text-[9px] text-[var(--muted)]">{doc.category} · {doc.owner}</div>
                  </div>
                  <ArrowUpRightIcon className="h-3.5 w-3.5 text-[var(--muted)]" />
                </a>
              ))}
              {docs.length === 0 && (
                <div className="p-3 text-center text-[10px] text-[var(--muted)]">
                  연결된 SOP 문서가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SlideDrawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center border-b border-[var(--border)] text-[10px] last:border-0">
      <div className="w-[120px] shrink-0 text-[var(--muted)]">{k}</div>
      <div className="min-w-0 font-medium">{v}</div>
    </div>
  );
}
