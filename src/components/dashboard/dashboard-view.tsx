"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ConnectivityObservation, NetworkStatus, ResourcePoint, SoftwareInstall, SopDocument, VmAsset } from "@/domain/models";
import { getEoslState } from "@/domain/eosl";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardHeader } from "@/components/tailgrids/core/card";
import { SummaryStrip, type SummaryMetrics } from "@/components/dashboard/summary-strip";
import { ResourceTrendChart } from "@/components/dashboard/resource-trend-chart";
import { IssuesTable } from "@/components/dashboard/issues-table";
import { VmMiniTable } from "@/components/dashboard/vm-mini-table";
import { ExpiringPolicies } from "@/components/dashboard/expiring-policies";
import { EoslRiskSummary } from "@/components/dashboard/eosl-risk-summary";
import { VmDrawer } from "@/components/infrastructure/vm-drawer";
import { ConnectionDrawer } from "@/components/network/connection-drawer";
import { ArrowUpRightIcon } from "@/components/common/icons";
import { useProjectGroup } from "@/context/project-group-context";

interface DashboardViewProps {
  vms: VmAsset[];
  network: NetworkStatus[];
  software: SoftwareInstall[];
  sops: SopDocument[];
  trend: ResourcePoint[];
}

export function DashboardView({ vms, network, software, sops, trend }: DashboardViewProps) {
  const { activeProject } = useProjectGroup();
  const [selectedVm, setSelectedVm] = useState<VmAsset | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<NetworkStatus | null>(null);

  // Dynamic filtering by active project group
  const projectVms = useMemo(
    () => vms.filter((v) => !v.projectGroupId || v.projectGroupId === activeProject.id),
    [vms, activeProject.id]
  );

  const projectVmIds = useMemo(() => new Set(projectVms.map((v) => v.id)), [projectVms]);

  const projectNetwork = useMemo(
    () =>
      network.filter(
        (n) =>
          (!n.policy.projectGroupId || n.policy.projectGroupId === activeProject.id) &&
          (projectVmIds.has(n.policy.sourceVmId) || projectVmIds.has(n.policy.targetVmId ?? ""))
      ),
    [network, activeProject.id, projectVmIds]
  );

  const projectSoftware = useMemo(
    () => software.filter((s) => projectVmIds.has(s.vmId)),
    [software, projectVmIds]
  );

  const projectSops = useMemo(
    () =>
      sops.filter(
        (s) =>
          (!s.projectGroupId || s.projectGroupId === activeProject.id) ||
          s.relatedVmIds.some((id) => projectVmIds.has(id))
      ),
    [sops, activeProject.id, projectVmIds]
  );

  // Dynamic metrics calculation from active dataset
  const metrics: SummaryMetrics = useMemo(() => {
    const vmHealthy = projectVms.filter((v) => v.health === "healthy").length;
    const vmWarning = projectVms.filter((v) => v.health === "warning").length;
    const vmCritical = projectVms.filter((v) => v.health === "critical").length;

    const tcpReachable = projectNetwork.filter((n) => n.observation?.tcp === "UP").length;
    const tcpFailed = projectNetwork.filter((n) => n.observation?.tcp === "DOWN").length;

    const policyExpiring = projectNetwork.filter((n) => n.overall === "EXPIRING").length;
    const policyExpired = projectNetwork.filter(
      (n) =>
        n.overall === "POLICY_EXPIRED_BUT_REACHABLE" ||
        n.overall === "POLICY_EXPIRED_AND_UNREACHABLE" ||
        (n.daysToExpiry !== null && n.daysToExpiry !== undefined && n.daysToExpiry < 0)
    ).length;

    const now = new Date("2026-09-21T00:28:00+09:00");
    const vmEosl = projectVms.map((v) => getEoslState(v.eoslDate, now).state);
    const swEosl = projectSoftware.map((s) => getEoslState(s.eoslDate, now).state);
    const allEosl = [...vmEosl, ...swEosl];

    const eoslExpired = allEosl.filter((s) => s === "EOSL").length;
    const eoslD90 = allEosl.filter((s) => s === "D90").length;
    const eoslD180 = allEosl.filter((s) => s === "D180").length;
    const eoslTotal = eoslExpired + eoslD90 + eoslD180;

    const criticalIssues =
      vmCritical +
      projectNetwork.filter(
        (n) =>
          n.observation?.tcp === "DOWN" ||
          n.overall === "POLICY_VALID_BUT_UNREACHABLE" ||
          n.overall === "POLICY_EXPIRED_AND_UNREACHABLE" ||
          n.overall === "POLICY_NOT_APPROVED_BUT_REACHABLE"
      ).length;

    return {
      vmTotal: projectVms.length,
      vmHealthy,
      vmWarning,
      vmCritical,
      networkTotal: projectNetwork.length,
      tcpReachable,
      tcpFailed,
      policyExpiring,
      policyExpired,
      eoslTotal,
      eoslExpired,
      eoslD90,
      eoslD180,
      criticalIssues,
    };
  }, [projectVms, projectNetwork, projectSoftware]);

  // Systems Breakdown
  const systems = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of projectVms) {
      const s = v.system || "Common";
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [projectVms]);

  // Environment Health Breakdown
  const envHealth = useMemo(() => {
    const envs = ["PROD", "QA", "DEV"];
    return envs
      .map((env) => {
        const vList = projectVms.filter((v) => v.environment === env);
        if (vList.length === 0) return null;
        const issues = vList.filter((v) => v.health !== "healthy").length;
        const netIssues = projectNetwork.filter(
          (n) =>
            vList.some((v) => v.id === n.policy.sourceVmId) &&
            n.overall !== "NORMAL"
        ).length;
        return { name: env, count: vList.length, issues: issues + netIssues };
      })
      .filter(Boolean) as { name: string; count: number; issues: number }[];
  }, [projectVms, projectNetwork]);

  return (
    <>
      <PageHeader
        title={`${activeProject.name} 운영 현황`}
        description={`선언된 방화벽 정책과 Telegraf TCP 프로브 기반의 운영 현황입니다.`}
        actions={
          <>
            <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[9px] text-[var(--muted)]">
              ● 실시간 모니터링 · 1m
            </span>
            <Link
              href="/infrastructure/architecture"
              className="flex h-8 items-center gap-1 rounded-md bg-[#5750f1] px-2.5 text-[10px] font-medium !text-white dark:!text-white transition hover:bg-[#4938d6]"
            >
              아키텍처 보기 <ArrowUpRightIcon className="h-3.5 w-3.5 text-white" />
            </Link>
          </>
        }
      />

      {/* 1. Core Summary Metrics Bar (All 8 Core Information Points) */}
      <SummaryStrip metrics={metrics} />

      {/* 1.1 Compact Systems & Environment Health Row */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px]">
        {/* Systems */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-2)]">
            시스템:
          </span>
          {systems.map((s) => (
            <span key={s.name} className="flex items-center gap-1 font-mono text-[9.5px]">
              <span className="font-semibold text-[var(--foreground)]">{s.name}</span>
              <span className="text-[var(--muted)]">({s.count})</span>
            </span>
          ))}
        </div>

        {/* Environments */}
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-2)]">
            환경:
          </span>
          {envHealth.map((e) => (
            <span key={e.name} className="flex items-center gap-1 text-[9.5px]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  e.issues > 0 ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              <span className="font-semibold text-[var(--foreground)]">{e.name}</span>
              <span className="text-[var(--muted)]">
                {e.issues > 0 ? `${e.issues} 경고` : "정상"}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* 2. Top Row: CPU/Memory/Disk Resource Trend + Control Signals */}
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_.65fr]">
        <Card>
          <CardHeader
            title="리소스 추이"
            description="최근 24시간 평균"
            action={
              <div className="flex items-center gap-3 text-[9px]">
                <span className="flex items-center gap-1 text-[var(--muted)]">
                  <span className="h-2 w-2 rounded-full bg-[#5750f1]" /> CPU
                </span>
                <span className="flex items-center gap-1 text-[var(--muted)]">
                  <span className="h-2 w-2 rounded-full bg-[#2e90fa]" /> Memory
                </span>
                <span className="flex items-center gap-1 text-[var(--muted)]">
                  <span className="h-2 w-2 rounded-full bg-[#12b76a]" /> Disk
                </span>
              </div>
            }
          />
          <ResourceTrendChart data={trend} />
        </Card>

        <Card>
          <CardHeader title="핵심 지표" description="즉시 조치가 필요한 운영 우선순위" />
          <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
            {[
              ["TCP 실패", metrics.tcpFailed, "danger"],
              ["위험 자산", metrics.vmCritical, "danger"],
              ["정책 만료 예정", metrics.policyExpiring, "warning"],
              ["정책 만료됨", metrics.policyExpired, "danger"],
              ["주의 필요", metrics.vmWarning + metrics.vmCritical, "warning"],
              ["EOSL 위험", metrics.eoslTotal, "warning"],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="bg-[var(--surface)] px-3 py-2.5">
                <div className="text-[9px] text-[var(--muted)]">{label}</div>
                <div
                  className={`mt-0.5 text-[20px] font-semibold tabular-nums ${
                    tone === "danger" && Number(value) > 0
                      ? "text-[#d92d20]"
                      : tone === "warning" && Number(value) > 0
                        ? "text-[#b54708]"
                        : ""
                  }`}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] p-3 text-[9px] leading-5 text-[var(--muted)]">
            <b className="text-[var(--text)]">2차원 네트워크 모델:</b>
            <br />
            선언 정책 = <i>Should Be</i> · Telegraf TCP 프로브 = <i>Actual</i>.
            <br />
            Ping은 진단 참고용입니다. Ping UP + TCP DOWN은 서비스/방화벽 구현 오류를 의미합니다.
          </div>
        </Card>
      </div>

      {/* 3. Middle Row: Recent Issues Table + VM Status Summary Table */}
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <CardHeader
            title="최근 주요 이슈"
            description="정책/실측 불일치, 연결 실패, 정책 만료"
            action={
              <Link href="/network/connectivity" className="text-[9px] font-medium text-[#5750f1] hover:underline">
                전체 보기 ({projectNetwork.filter((s) => s.overall !== "NORMAL").length}) →
              </Link>
            }
          />
          <IssuesTable statuses={projectNetwork} onSelect={setSelectedConnection} />
        </Card>

        <Card>
          <CardHeader
            title="자산 상태 요약"
            description="경고/위험 자산 및 높은 사용률 우선 표시"
            action={
              <Link href="/infrastructure/vms" className="text-[9px] font-medium text-[#5750f1] hover:underline">
                전체 인벤토리 ({projectVms.length}) →
              </Link>
            }
          />
          <VmMiniTable vms={projectVms} onSelect={setSelectedVm} />
        </Card>
      </div>

      {/* 4. Bottom Row: Expiring Network Policies + EOSL Risk Summary */}
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader
            title="만료 예정 네트워크 정책"
            description="30일 이내 만료 예정 또는 기한 초과된 승인 방화벽 요청"
            action={
              <Link href="/network/connectivity" className="text-[9px] font-medium text-[#5750f1] hover:underline">
                정책 및 연결 상태 →
              </Link>
            }
          />
          <ExpiringPolicies statuses={projectNetwork} onSelect={setSelectedConnection} />
        </Card>

        <Card>
          <CardHeader
            title="EOSL 위험 요약"
            description="지원 종료 임박한 운영체제 및 설치 소프트웨어"
            action={
              <Link href="/infrastructure/software" className="text-[9px] font-medium text-[#5750f1] hover:underline">
                소프트웨어 및 EOSL →
              </Link>
            }
          />
          <EoslRiskSummary vms={projectVms} software={projectSoftware} onSelectVm={setSelectedVm} />
        </Card>
      </div>

      {/* Sliding Drawers */}
      <VmDrawer
        vm={selectedVm}
        network={projectNetwork}
        software={projectSoftware}
        sops={projectSops}
        open={!!selectedVm}
        onClose={() => setSelectedVm(null)}
      />
      <ConnectionDrawer
        status={selectedConnection}
        open={!!selectedConnection}
        onClose={() => setSelectedConnection(null)}
      />
    </>
  );
}
