export type VmHealth = "healthy" | "warning" | "critical" | "unknown";
export type PolicyApprovalStatus = "APPROVED" | "PENDING" | "REJECTED" | "UNKNOWN";
export type PolicyDirection = "ONE_WAY" | "BIDIRECTIONAL";
export type ProbeState = "UP" | "DOWN" | "NO_DATA";
export type NetworkOverallState =
  | "NORMAL"
  | "EXPIRING"
  | "POLICY_EXPIRED_BUT_REACHABLE"
  | "POLICY_EXPIRED_AND_UNREACHABLE"
  | "POLICY_VALID_BUT_UNREACHABLE"
  | "POLICY_NOT_APPROVED_BUT_REACHABLE"
  | "RETURN_DIRECTION_FAILED"
  | "BIDIRECTIONAL_PARTIAL"
  | "UNREACHABLE"
  | "UNKNOWN";

// Top-Level Project Group Model
export interface ProjectGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  owner?: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

// Expanded Asset Types
export type AssetType =
  | "VM"
  | "PHYSICAL_SERVER"
  | "NAS"
  | "DBAAS"
  | "CONTAINER"
  | "K8S_WORKLOAD"
  | "NETWORK_APPLIANCE"
  | "OTHER";

export type LogicalEntityType = "CLUSTER" | "SERVICE" | "EXTERNAL_ENDPOINT" | "TOPOLOGY_GROUP";

// Generalized Asset Model (Unifies InfraAsset and VmAsset)
export interface Asset {
  id: string;
  projectGroupId?: string;
  assetType?: AssetType;
  name?: string;
  hostname: string;
  ipAddress: string;
  environment: string;
  domain?: string;
  system?: string;
  role: string;
  service: string;
  zone: string;
  criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  health: VmHealth;
  owner?: string;
  description?: string;
  lastVerifiedAt?: string | null;

  // OS & Compute metrics (retained for VM and Workload monitoring)
  osName?: string;
  osVersion?: string;
  cpuCores?: number;
  memoryGb?: number;
  diskGb?: number;
  cpuPct?: number;
  memoryPct?: number;
  diskPct?: number;
  eoslDate?: string | null;
  grafanaPath?: string | null;

  // Storage / NAS / Hardware optional attributes
  capacityTb?: number;
  usedCapacityTb?: number;
  protocol?: string;
  mountPath?: string;
  status?: string;
  targetVms?: string[];
  vendor?: string;
  model?: string;
  hardwareModel?: string;
  rackLocation?: string;
  serialNumber?: string;
}

// Compatibility Aliases
export type InfraAsset = Asset;
export type VmAsset = Asset;

export interface NasAsset extends Asset {
  assetType: "NAS";
  vendor?: string;
  model?: string;
  capacityTb: number;
  usedCapacityTb: number;
  protocol: "NFS" | "SMB" | "iSCSI" | "MULTI";
  mountPath?: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  targetVms?: string[];
}

export interface PhysicalServerAsset extends Asset {
  assetType: "PHYSICAL_SERVER";
  hardwareModel?: string;
  rackLocation?: string;
  serialNumber?: string;
}

// Cluster Member and Logical Cluster
export interface ClusterMember {
  clusterId: string;
  assetId: string;
  hostname: string;
  ipAddress: string;
  role: "ACTIVE" | "PASSIVE" | "WITNESS" | "WORKER";
  priority: number;
  status: "ONLINE" | "STANDBY" | "OFFLINE";
}

export interface ClusterServiceInstance {
  clusterId: string;
  serviceType: string;
  instanceName: string;
  port: number;
  version?: string;
}

export interface ClusterEntity {
  id: string;
  projectGroupId?: string;
  name: string;
  type: "MSCS" | "KUBERNETES" | "ORACLE_RAC" | "OTHER";
  vip: string;
  environment: string;
  domain?: string;
  system?: string;
  zone: string;
  status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  members: ClusterMember[];
  services: ClusterServiceInstance[];
  owner?: string;
  description?: string;
}

// Topology Group Model
export type TopologyGroupType =
  | "SYSTEM"
  | "DOMAIN"
  | "ENVIRONMENT"
  | "STACK"
  | "CLUSTER"
  | "RUNTIME"
  | "SERVICE_GROUP"
  | "CUSTOM";

export interface TopologyGroup {
  id: string;
  projectGroupId: string;
  parentGroupId?: string | null;
  name: string;
  groupType: TopologyGroupType;
  environment?: string;
  domain?: string;
  system?: string;
  description?: string;
  assetIds?: string[];
}

// Relation Model (Logical Architecture Dependencies)
export type RelationType =
  | "SERVICE"
  | "DATABASE"
  | "STORAGE"
  | "MONITORING"
  | "MANAGEMENT"
  | "CLUSTER"
  | "EXTERNAL"
  | "OTHER";

export interface ArchitectureRelation {
  id: string;
  projectGroupId: string;
  sourceEntityType: "ASSET" | "CLUSTER" | "TOPOLOGY_GROUP" | "COMPONENT" | "EXTERNAL";
  sourceEntityId: string;
  targetEntityType: "ASSET" | "CLUSTER" | "TOPOLOGY_GROUP" | "COMPONENT" | "NAS" | "EXTERNAL";
  targetEntityId: string;
  relationType: RelationType;
  protocol?: "TCP" | "UDP" | "HTTP" | "HTTPS" | "NFS" | "SMB" | string;
  port?: number;
  description?: string;
  name?: string;
}

// 3-Tier Software Lifecycle Model
export interface SoftwareProduct {
  id: string;
  name: string;
  vendor: string;
  category: string;
  description?: string;
}

export interface SoftwareRelease {
  id: string;
  productId: string;
  productName: string;
  version: string;
  vendor: string;
  releaseDate?: string;
  supportEndDate?: string;
  eoslDate: string | null;
  status: "SUPPORTED" | "D180" | "D90" | "D30" | "EOSL";
  versionMatchRule: "exact" | "prefix" | "regex" | "range";
  matchPattern?: string;
}

export interface AssetSoftwareInstallation {
  id: string;
  projectGroupId?: string;
  assetId: string;
  productId: string;
  productName: string;
  detectedVersion: string;
  matchedReleaseId?: string | null;
  matchedReleaseVersion?: string | null;
  eoslDate?: string | null;
  lifecycleStatus: "SUPPORTED" | "D180" | "D90" | "D30" | "EOSL" | "UNMAPPED";
  vendor?: string;
  category?: string;
  installedAt?: string;
  lastVerifiedAt?: string;
}

// Legacy SoftwareInstall (kept for backward compatibility)
export interface SoftwareInstall {
  id: string;
  vmId: string;
  name: string;
  version?: string;
  vendor?: string;
  category?: string;
  eoslDate?: string | null;
}

export interface NetworkPolicy {
  id: string;
  projectGroupId?: string;
  sourceVmId: string;
  sourceName: string;
  sourceIp: string;
  targetVmId?: string | null;
  targetName: string;
  targetIp: string;
  protocol: "TCP" | "UDP";
  port: number;
  direction?: PolicyDirection;
  approvalStatus: PolicyApprovalStatus;
  requestedAt?: string | null;
  approvedAt?: string | null;
  validFrom?: string | null;
  expiresAt?: string | null;
  requestId?: string | null;
  purpose?: string | null;
  owner?: string | null;
  domain?: string;
  system?: string;
}

export interface ConnectivityObservation {
  /**
   * Observed connectivity is independent from a firewall policy.
   * It is joined to the policy by source + target + protocol + port.
   */
  sourceVmId: string;
  sourceName?: string;
  sourceIp?: string | null;
  targetVmId?: string | null;
  targetName?: string;
  targetIp: string;
  protocol: "TCP" | "UDP";
  port: number;
  ping: ProbeState;
  tcp: ProbeState;
  pingLatencyMs?: number | null;
  tcpLatencyMs?: number | null;
  checkedAt: string;
}

export interface NetworkStatus {
  /** Policy is the primary/declared row. */
  policy: NetworkPolicy;
  /** Source -> Target Telegraf observation joined by connection identity. */
  observation?: ConnectivityObservation;
  /** Target -> Source observation for an internal BIDIRECTIONAL policy. */
  reverseObservation?: ConnectivityObservation;
  overall: NetworkOverallState;
  daysToExpiry?: number | null;
  diagnostic: string;
  isBidirectional?: boolean;
  reverseOverall?: NetworkOverallState;
  reverseDiagnostic?: string;
}

export interface SopDocument {
  id: string;
  projectGroupId?: string;
  title: string;
  category: string;
  owner: string;
  url?: string | null;
  relatedVmIds: string[];
  updatedAt: string;
  summary?: string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface ResourcePoint {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
}
