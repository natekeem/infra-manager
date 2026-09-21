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

interface DashboardViewProps {
  vms: VmAsset[];
  network: NetworkStatus[];
  software: SoftwareInstall[];
  sops: SopDocument[];
  trend: ResourcePoint[];
}

export function DashboardView({ vms, network, software, sops, trend }: DashboardViewProps) {
  const [selectedVm, setSelectedVm] = useState<VmAsset | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<NetworkStatus | null>(null);

  const metrics: SummaryMetrics = useMemo(() => {
    const vmHealthy = vms.filter((v) => v.health === "healthy").length;
    const vmWarning = vms.filter((v) => v.health === "warning").length;
    const vmCritical = vms.filter((v) => v.health === "critical").length;

    const tcpReachable = network.filter((n) => n.observation?.tcp === "UP").length;
    const tcpFailed = network.filter((n) => n.observation?.tcp === "DOWN").length;

    const policyExpiring = network.filter((n) => n.overall === "EXPIRING").length;
    const policyExpired = network.filter(
      (n) =>
        n.overall === "POLICY_EXPIRED_BUT_REACHABLE" ||
        n.overall === "POLICY_EXPIRED_AND_UNREACHABLE" ||
        (n.daysToExpiry !== null && n.daysToExpiry !== undefined && n.daysToExpiry < 0)
    ).length;

    const now = new Date("2026-09-21T00:28:00+09:00");
    const vmEosl = vms.map((v) => getEoslState(v.eoslDate, now).state);
    const swEosl = software.map((s) => getEoslState(s.eoslDate, now).state);
    const allEosl = [...vmEosl, ...swEosl];

    const eoslExpired = allEosl.filter((s) => s === "EOSL").length;
    const eoslD90 = allEosl.filter((s) => s === "D90").length;
    const eoslD180 = allEosl.filter((s) => s === "D180").length;
    const eoslTotal = eoslExpired + eoslD90 + eoslD180;

    // Critical issues: degraded VMs, TCP failures, unapproved reachable, expired unreachable
    const criticalIssues =
      vmCritical +
      network.filter(
        (n) =>
          n.observation?.tcp === "DOWN" ||
          n.overall === "POLICY_VALID_BUT_UNREACHABLE" ||
          n.overall === "POLICY_EXPIRED_AND_UNREACHABLE" ||
          n.overall === "POLICY_NOT_APPROVED_BUT_REACHABLE"
      ).length;

    return {
      vmTotal: vms.length,
      vmHealthy,
      vmWarning,
      vmCritical,
      networkTotal: network.length,
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
  }, [vms, network, software]);

  return (
    <>
      <PageHeader
        title="Infrastructure Overview"
        description="RPA platform operational status: declared firewall policies vs. observed Telegraf TCP telemetry."
        actions={
          <>
            <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[9px] text-[var(--muted)]">
              ● LIVE TELEMETRY · 1m
            </span>
            <Link
              href="/infrastructure/architecture"
              className="flex h-8 items-center gap-1 rounded-md bg-[#5750f1] px-2.5 text-[10px] font-medium !text-white dark:!text-white transition hover:bg-[#4938d6]"
            >
              Open Architecture <ArrowUpRightIcon className="h-3.5 w-3.5 text-white" />
            </Link>
          </>
        }
      />

      {/* 1. Core Summary Metrics Bar (All 8 Core Information Points) */}
      <SummaryStrip metrics={metrics} />

      {/* 2. Top Row: CPU/Memory/Disk Resource Trend + Control Signals */}
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_.65fr]">
        <Card>
          <CardHeader
            title="Resource Trend"
            description="Fleet average over last 24h"
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
          <CardHeader title="Control Signals" description="Immediate operational priorities" />
          <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
            {[
              ["TCP Failed", metrics.tcpFailed, "danger"],
              ["Critical VMs", metrics.vmCritical, "danger"],
              ["Policy Expiring", metrics.policyExpiring, "warning"],
              ["Policy Expired", metrics.policyExpired, "danger"],
              ["VM Attention", metrics.vmWarning + metrics.vmCritical, "warning"],
              ["EOSL Risk", metrics.eoslTotal, "warning"],
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
            <b className="text-[var(--text)]">Two-Dimensional Network Model:</b>
            <br />
            Declared Policy = <i>Should Be</i> · Telegraf TCP Probe = <i>Actual</i>.
            <br />
            Ping is diagnostic context only. Ping UP + TCP DOWN indicates service/firewall implementation failure.
          </div>
        </Card>
      </div>

      {/* 3. Middle Row: Recent Issues Table + VM Status Summary Table */}
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <CardHeader
            title="Recent Active Issues"
            description="Policy / actual mismatch, connectivity failure, and policy expiration"
            action={
              <Link href="/network/connectivity" className="text-[9px] font-medium text-[#5750f1] hover:underline">
                View All ({network.filter((s) => s.overall !== "NORMAL").length}) →
              </Link>
            }
          />
          <IssuesTable statuses={network} onSelect={setSelectedConnection} />
        </Card>

        <Card>
          <CardHeader
            title="VM Status Summary"
            description="Prioritizing warning/critical assets & high utilization"
            action={
              <Link href="/infrastructure/vms" className="text-[9px] font-medium text-[#5750f1] hover:underline">
                Full Inventory ({vms.length}) →
              </Link>
            }
          />
          <VmMiniTable vms={vms} onSelect={setSelectedVm} />
        </Card>
      </div>

      {/* 4. Bottom Row: Expiring Network Policies + EOSL Risk Summary */}
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader
            title="Expiring Network Policies"
            description="Approved firewall requests expiring within 30 days or overdue"
            action={
              <Link href="/network/connectivity" className="text-[9px] font-medium text-[#5750f1] hover:underline">
                Policy & Connectivity →
              </Link>
            }
          />
          <ExpiringPolicies statuses={network} onSelect={setSelectedConnection} />
        </Card>

        <Card>
          <CardHeader
            title="EOSL Risk Summary"
            description="Operating system & installed software approaching end-of-support"
            action={
              <Link href="/infrastructure/software" className="text-[9px] font-medium text-[#5750f1] hover:underline">
                Software & EOSL →
              </Link>
            }
          />
          <EoslRiskSummary vms={vms} software={software} onSelectVm={setSelectedVm} />
        </Card>
      </div>

      {/* Sliding Drawers */}
      <VmDrawer
        vm={selectedVm}
        network={network}
        software={software}
        sops={sops}
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
