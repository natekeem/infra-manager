import type { ConnectivityObservation, NetworkOverallState, NetworkPolicy, NetworkStatus } from "./models";

const DAY_MS = 86_400_000;
export function daysUntil(date?: string | null, now = new Date()): number | null {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - now.getTime()) / DAY_MS);
}

export function evaluateNetworkStatus(policy: NetworkPolicy, observation?: ConnectivityObservation, now = new Date()): NetworkStatus {
  const daysToExpiry = daysUntil(policy.expiresAt, now);
  const expired = daysToExpiry !== null && daysToExpiry < 0;
  const expiring = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30;
  const approved = policy.approvalStatus === "APPROVED";
  const tcp = observation?.tcp ?? "NO_DATA";
  const ping = observation?.ping ?? "NO_DATA";
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
    diagnostic = ping === "UP"
      ? "Host reachable, required TCP connection failed. Check firewall implementation or target service. (Ping 정상이나 대상 포트 통신 실패)"
      : ping === "DOWN"
        ? "Ping과 TCP 모두 실패합니다. 대상 VM/경로/네트워크 가용성을 우선 확인하세요."
        : "정책은 유효하지만 TCP 통신이 실패합니다.";
  } else if (approved && !expired && tcp === "UP") {
    overall = expiring ? "EXPIRING" : "NORMAL";
    diagnostic = expiring ? `실제 통신은 정상이며 정책 만료가 ${daysToExpiry}일 남았습니다.` : "정책과 실제 통신 상태가 일치합니다.";
  } else if (tcp === "DOWN") {
    overall = "UNREACHABLE";
    diagnostic = ping === "UP" ? "호스트는 응답하지만 대상 Port 통신은 실패합니다." : "실제 통신이 실패합니다.";
  }
  return { policy, observation, overall, daysToExpiry, diagnostic };
}

export const severityRank: Record<NetworkOverallState, number> = {
  POLICY_EXPIRED_AND_UNREACHABLE: 0,
  POLICY_VALID_BUT_UNREACHABLE: 1,
  POLICY_NOT_APPROVED_BUT_REACHABLE: 2,
  POLICY_EXPIRED_BUT_REACHABLE: 3,
  UNREACHABLE: 4,
  EXPIRING: 5,
  UNKNOWN: 6,
  NORMAL: 7,
};
