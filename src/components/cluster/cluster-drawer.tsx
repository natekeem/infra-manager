"use client";

import type { ClusterEntity } from "@/domain/models";
import { SlideDrawer } from "@/components/common/slide-drawer";
import { Badge } from "@/components/tailgrids/core/badge";

export function ClusterDrawer({
  cluster,
  open,
  onClose,
}: {
  cluster: ClusterEntity | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!cluster) return null;

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={cluster.name}
      subtitle={`${cluster.type} Cluster · VIP: ${cluster.vip}`}
    >
      <div className="p-4 space-y-4">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <Badge
            tone={
              cluster.status === "HEALTHY"
                ? "success"
                : cluster.status === "DEGRADED"
                  ? "warning"
                  : "danger"
            }
            dot
          >
            {cluster.status}
          </Badge>
          <span className="font-mono text-[9px] text-[var(--muted)]">
            {cluster.sourceRef ?? "CLUSTER REGISTRY"}
          </span>
        </div>

        {/* Cluster Information */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            Cluster Specification
          </h3>
          <div className="text-[10px]">
            <KV k="Cluster Type" v={cluster.type} />
            <KV k="Virtual IP (VIP)" v={<span className="font-mono font-bold text-[var(--primary)]">{cluster.vip}</span>} />
            <KV k="Environment" v={cluster.environment} />
            <KV k="Zone" v={cluster.zone} />
            <KV k="Owner" v={cluster.owner ?? "-"} />
          </div>
        </section>

        {/* Member Nodes */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              Member Nodes ({cluster.members.length})
            </h3>
            <span className="text-[9px] text-[var(--muted)]">Active / Passive Model</span>
          </div>

          <div className="space-y-2">
            {cluster.members.map((m) => (
              <div
                key={m.assetId}
                className={`rounded border p-2.5 ${
                  m.role === "ACTIVE"
                    ? "border-[var(--primary)]/30 bg-[var(--surface-2)]"
                    : "border-[var(--border)] bg-[var(--surface-1)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-[var(--foreground)]">
                      {m.hostname}
                    </span>
                    <Badge
                      tone={
                        m.role === "ACTIVE"
                          ? "primary"
                          : m.role === "PASSIVE"
                            ? "neutral"
                            : "info"
                      }
                    >
                      {m.role}
                    </Badge>
                  </div>
                  <Badge
                    tone={
                      m.status === "ONLINE"
                        ? "success"
                        : m.status === "STANDBY"
                          ? "info"
                          : "danger"
                    }
                    dot
                  >
                    {m.status}
                  </Badge>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-[var(--muted)]">
                  <div>
                    IP: <span className="font-mono text-[var(--foreground)]">{m.ipAddress}</span>
                  </div>
                  <div>
                    Priority: <span className="font-mono text-[var(--foreground)]">{m.priority}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Services & Instances */}
        {cluster.services && cluster.services.length > 0 && (
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              Clustered Services ({cluster.services.length})
            </h3>
            <div className="space-y-1.5">
              {cluster.services.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 text-[10px]"
                >
                  <div>
                    <div className="font-medium text-[var(--foreground)]">{s.instanceName}</div>
                    <div className="text-[9px] text-[var(--muted)]">{s.serviceType}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[var(--primary)]">Port {s.port}</span>
                    {s.version && (
                      <div className="text-[9px] text-[var(--muted)]">{s.version}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Guidance / SOP Tip */}
        <div className="rounded-md border border-dashed border-[var(--border-strong)] p-3 text-[9px] text-[var(--muted)] leading-relaxed">
          고가용성(HA) 클러스터는 VIP를 통해 요청을 수신하며, Active 노드 장애 발생 시 페일오버(Failover) 정책에 따라 Passive 노드로 리소스가 자동 전환됩니다.
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
