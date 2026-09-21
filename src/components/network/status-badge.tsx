import { Badge } from "@/components/tailgrids/core/badge";
import type { NetworkOverallState } from "@/domain/models";

export function StatusBadge({ state }: { state: NetworkOverallState }) {
  const map: Record<NetworkOverallState, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
    NORMAL: { label: "NORMAL", tone: "success" },
    EXPIRING: { label: "EXPIRING", tone: "warning" },
    POLICY_EXPIRED_BUT_REACHABLE: { label: "POLICY EXPIRED / TCP UP", tone: "warning" },
    POLICY_EXPIRED_AND_UNREACHABLE: { label: "POLICY EXPIRED / TCP DOWN", tone: "danger" },
    POLICY_VALID_BUT_UNREACHABLE: { label: "POLICY VALID / TCP DOWN", tone: "danger" },
    POLICY_NOT_APPROVED_BUT_REACHABLE: { label: "POLICY PENDING / TCP UP", tone: "danger" },
    UNREACHABLE: { label: "UNREACHABLE", tone: "danger" },
    UNKNOWN: { label: "UNKNOWN", tone: "neutral" },
  };

  const v = map[state] ?? { label: state, tone: "neutral" };
  return <Badge tone={v.tone} dot>{v.label}</Badge>;
}
