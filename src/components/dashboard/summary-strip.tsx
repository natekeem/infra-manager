import { Badge } from "@/components/tailgrids/core/badge";

export interface SummaryMetrics {
  vmTotal: number;
  vmHealthy: number;
  vmWarning: number;
  vmCritical: number;
  networkTotal: number;
  tcpReachable: number;
  tcpFailed: number;
  policyExpiring: number;
  policyExpired: number;
  eoslTotal: number;
  eoslExpired: number;
  eoslD90: number;
  eoslD180: number;
  criticalIssues: number;
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

interface SummaryItem {
  label: string;
  value: number | string;
  sublabel: string;
  tag: string;
  tone: Tone;
}

export function SummaryStrip({ metrics }: { metrics: SummaryMetrics }) {
  const items: SummaryItem[] = [
    {
      label: "VM 현황",
      value: metrics.vmTotal,
      sublabel: `${metrics.vmHealthy} 정상 · ${metrics.vmWarning} 주의 · ${metrics.vmCritical} 위험`,
      tag: metrics.vmCritical > 0 ? "CRITICAL" : metrics.vmWarning > 0 ? "WARNING" : "HEALTHY",
      tone: metrics.vmCritical > 0 ? "danger" : metrics.vmWarning > 0 ? "warning" : "success",
    },
    {
      label: "TCP 실측",
      value: metrics.networkTotal,
      sublabel: `${metrics.tcpReachable} 도달 가능 · ${metrics.tcpFailed} 프로브 실패`,
      tag: metrics.tcpFailed > 0 ? `${metrics.tcpFailed} FAILED` : "ALL UP",
      tone: metrics.tcpFailed > 0 ? "danger" : "success",
    },
    {
      label: "정책 만료",
      value: metrics.policyExpiring + metrics.policyExpired,
      sublabel: `${metrics.policyExpiring} 만료 예정 (≤30일) · ${metrics.policyExpired} 만료됨`,
      tag: metrics.policyExpired > 0 ? "EXPIRED" : metrics.policyExpiring > 0 ? "ATTN" : "STABLE",
      tone: metrics.policyExpired > 0 ? "danger" : metrics.policyExpiring > 0 ? "warning" : "success",
    },
    {
      label: "EOSL 위험",
      value: metrics.eoslTotal,
      sublabel: `${metrics.eoslExpired} expired · ${metrics.eoslD90} D90 · ${metrics.eoslD180} D180`,
      tag: metrics.eoslExpired > 0 ? "REPLACE" : metrics.eoslTotal > 0 ? "RISK" : "SUPPORTED",
      tone: metrics.eoslExpired > 0 ? "danger" : metrics.eoslTotal > 0 ? "warning" : "success",
    },
    {
      label: "긴급 이슈",
      value: metrics.criticalIssues,
      sublabel: "TCP 실패, VM 이상, 정책 불일치",
      tag: metrics.criticalIssues > 0 ? "ACTION REQ" : "NORMAL",
      tone: metrics.criticalIssues > 0 ? "danger" : "success",
    },
  ];

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] lg:grid-cols-5">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`px-3 py-2.5 ${index > 0 ? "border-t border-[var(--border)] sm:border-t-0 lg:border-l" : ""}`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-semibold tracking-[0.06em] text-[var(--muted)]">{item.label}</span>
            <Badge tone={item.tone} dot>{item.tag}</Badge>
          </div>
          <div className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.03em] tabular-nums">
            {item.value}
          </div>
          <div className="mt-1 truncate text-[10px] text-[var(--muted)]" title={item.sublabel}>
            {item.sublabel}
          </div>
        </div>
      ))}
    </div>
  );
}
