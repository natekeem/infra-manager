export type VmHealth = "healthy" | "warning" | "critical" | "unknown";
export type PolicyApprovalStatus = "APPROVED" | "PENDING" | "REJECTED" | "UNKNOWN";
export type ProbeState = "UP" | "DOWN" | "NO_DATA";
export type NetworkOverallState =
  | "NORMAL"
  | "EXPIRING"
  | "POLICY_EXPIRED_BUT_REACHABLE"
  | "POLICY_EXPIRED_AND_UNREACHABLE"
  | "POLICY_VALID_BUT_UNREACHABLE"
  | "POLICY_NOT_APPROVED_BUT_REACHABLE"
  | "UNREACHABLE"
  | "UNKNOWN";

export interface VmAsset {
  id: string;
  hostname: string;
  ipAddress: string;
  environment: string;
  role: string;
  service: string;
  zone: string;
  criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  osName: string;
  osVersion?: string;
  cpuCores?: number;
  memoryGb?: number;
  diskGb?: number;
  cpuPct?: number;
  memoryPct?: number;
  diskPct?: number;
  health: VmHealth;
  owner?: string;
  eoslDate?: string | null;
  grafanaPath?: string | null;
  sourceRef?: string | null;
  lastVerifiedAt?: string | null;
}

export interface SoftwareInstall {
  id: string;
  vmId: string;
  name: string;
  version?: string;
  vendor?: string;
  category?: string;
  eoslDate?: string | null;
  sourceRef?: string | null;
}

export interface NetworkPolicy {
  id: string;
  sourceVmId: string;
  sourceName: string;
  sourceIp: string;
  targetVmId?: string | null;
  targetName: string;
  targetIp: string;
  protocol: "TCP" | "UDP";
  port: number;
  approvalStatus: PolicyApprovalStatus;
  requestedAt?: string | null;
  approvedAt?: string | null;
  validFrom?: string | null;
  expiresAt?: string | null;
  requestId?: string | null;
  purpose?: string | null;
  owner?: string | null;
  sourceRef?: string | null;
}

export interface ConnectivityObservation {
  policyId: string;
  sourceVmId: string;
  targetIp: string;
  port: number;
  ping: ProbeState;
  tcp: ProbeState;
  pingLatencyMs?: number | null;
  tcpLatencyMs?: number | null;
  checkedAt: string;
}

export interface NetworkStatus {
  policy: NetworkPolicy;
  observation?: ConnectivityObservation;
  overall: NetworkOverallState;
  daysToExpiry?: number | null;
  diagnostic: string;
}

export interface SopDocument {
  id: string;
  title: string;
  category: string;
  owner: string;
  url?: string | null;
  relatedVmIds: string[];
  updatedAt: string;
}

export interface ResourcePoint {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
}
