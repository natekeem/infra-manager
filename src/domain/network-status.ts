import type { ConnectivityObservation, NetworkOverallState, NetworkPolicy, NetworkStatus } from "./models";

const DAY_MS = 86_400_000;

export function daysUntil(date?: string | null, now = new Date()): number | null {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - now.getTime()) / DAY_MS);
}

/**
 * Canonical identity used to join declared firewall policy with observed Telegraf connectivity.
 * Policy IDs are intentionally not part of this key because the observed probe is an independent fact.
 */
export function connectivityKey(input: {
  sourceVmId: string;
  targetIp: string;
  protocol: "TCP" | "UDP";
  port: number;
}): string {
  return `${input.sourceVmId.trim().toLowerCase()}|${input.targetIp.trim().toLowerCase()}|${input.protocol}|${input.port}`;
}

export function policyForwardKey(policy: NetworkPolicy): string {
  return connectivityKey({
    sourceVmId: policy.sourceVmId,
    targetIp: policy.targetIp,
    protocol: policy.protocol,
    port: policy.port,
  });
}

export function policyReverseKey(policy: NetworkPolicy): string | null {
  if (policy.direction !== "BIDIRECTIONAL" || !policy.targetVmId) return null;
  return connectivityKey({
    sourceVmId: policy.targetVmId,
    targetIp: policy.sourceIp,
    protocol: policy.protocol,
    port: policy.port,
  });
}

export function evaluateNetworkStatus(
  policy: NetworkPolicy,
  observation?: ConnectivityObservation,
  reverseObservation?: ConnectivityObservation,
  now = new Date()
): NetworkStatus {
  const daysToExpiry = daysUntil(policy.expiresAt, now);
  const expired = daysToExpiry !== null && daysToExpiry < 0;
  const expiring = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30;
  const approved = policy.approvalStatus === "APPROVED";
  const tcp = observation?.tcp ?? "NO_DATA";
  const ping = observation?.ping ?? "NO_DATA";
  const isBidirectional = policy.direction === "BIDIRECTIONAL";
  const expectsReverseProbe = isBidirectional && Boolean(policy.targetVmId);
  const reverseTcp = reverseObservation?.tcp ?? "NO_DATA";

  let overall: NetworkOverallState = "UNKNOWN";
  let diagnostic = "정책 또는 실측 데이터가 충분하지 않습니다.";

  if (!approved && tcp === "UP") {
    overall = "POLICY_NOT_APPROVED_BUT_REACHABLE";
    diagnostic = "정책상 승인되지 않았지만 실제 TCP 통신은 성공합니다. 정책/현황 불일치 확인이 필요합니다.";
  } else if (expired && tcp === "UP") {
    overall = "POLICY_EXPIRED_BUT_REACHABLE";
    diagnostic = "정책 만료 후에도 실제 TCP 통신이 가능합니다. 정책 갱신 또는 회수 여부를 확인하세요.";
  } else if (expired && tcp === "DOWN") {
    overall = "POLICY_EXPIRED_AND_UNREACHABLE";
    diagnostic = "정책이 만료되었고 실제 TCP 통신도 실패합니다. 필요한 연결이면 갱신 누락 여부를 우선 확인하세요.";
  } else if (approved && !expired && tcp === "DOWN") {
    overall = "POLICY_VALID_BUT_UNREACHABLE";
    diagnostic =
      ping === "UP"
        ? "Host reachable, required TCP connection failed. Check firewall implementation or target service. (Ping 정상이나 대상 포트 통신 실패)"
        : ping === "DOWN"
          ? "Ping과 TCP 모두 실패합니다. 대상 VM/경로/네트워크 가용성을 우선 확인하세요."
          : "정책은 유효하지만 TCP 통신이 실패합니다.";
  } else if (approved && !expired && tcp === "UP") {
    if (expectsReverseProbe && reverseTcp === "DOWN") {
      overall = "RETURN_DIRECTION_FAILED";
      diagnostic = "양방향 정책이지만 Target→Source 방향 TCP probe가 실패했습니다. 반대 방향 방화벽 반영 또는 대상 서비스를 확인하세요.";
    } else if (expectsReverseProbe && reverseTcp === "NO_DATA") {
      overall = "BIDIRECTIONAL_PARTIAL";
      diagnostic = "양방향 정책의 Source→Target 통신은 정상이나 Target→Source 실측 데이터가 없습니다. 반대 방향 Telegraf probe 구성을 확인하세요.";
    } else {
      overall = expiring ? "EXPIRING" : "NORMAL";
      diagnostic = expiring
        ? `실제 통신은 정상이며 정책 만료가 ${daysToExpiry}일 남았습니다.`
        : isBidirectional && reverseTcp === "UP"
          ? "양방향 정책과 실제 양방향 TCP 통신이 모두 정상입니다."
          : "정책과 실제 통신 상태가 일치합니다.";
    }
  } else if (tcp === "DOWN") {
    overall = "UNREACHABLE";
    diagnostic = ping === "UP" ? "호스트는 응답하지만 대상 Port 통신은 실패합니다." : "실제 통신이 실패합니다.";
  }

  return {
    policy,
    observation,
    reverseObservation,
    overall,
    daysToExpiry,
    diagnostic,
    isBidirectional,
  };
}

export const severityRank: Record<NetworkOverallState, number> = {
  POLICY_EXPIRED_AND_UNREACHABLE: 0,
  POLICY_VALID_BUT_UNREACHABLE: 1,
  RETURN_DIRECTION_FAILED: 2,
  POLICY_NOT_APPROVED_BUT_REACHABLE: 3,
  POLICY_EXPIRED_BUT_REACHABLE: 4,
  UNREACHABLE: 5,
  BIDIRECTIONAL_PARTIAL: 6,
  EXPIRING: 7,
  UNKNOWN: 8,
  NORMAL: 9,
};
