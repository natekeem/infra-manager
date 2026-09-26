import { evaluateNetworkStatus, policyForwardKey, policyReverseKey, severityRank, connectivityKey } from "@/domain/network-status";
import type {
  ArchitectureRelation,
  AssetSoftwareInstallation,
  ClusterEntity,
  ConnectivityObservation,
  NasAsset,
  NetworkPolicy,
  NetworkStatus,
  ProjectGroup,
  SoftwareInstall,
  SoftwareProduct,
  SoftwareRelease,
  SopDocument,
  TopologyGroup,
  VmAsset,
} from "@/domain/models";
import {
  assetSoftwareInstallations as mockAssetSoftwareInstallations,
  clusters as mockClusters,
  nasAssets as mockNasAssets,
  observations as mockObservations,
  policies as mockPolicies,
  projectGroups as mockProjectGroups,
  relations as mockRelations,
  software as mockSoftware,
  softwareProducts as mockSoftwareProducts,
  softwareReleases as mockSoftwareReleases,
  sops as mockSops,
  topologyGroups as mockTopologyGroups,
  vms as mockVms,
} from "./mock-data";
import { loadPoliciesFromMysql, loadSoftwareFromMysql, loadSopsFromMysql, loadVmsFromMysql } from "@/services/server/repository";
import { loadConnectivityFromInflux } from "@/services/server/influx-observations";
import { healthFromResource, loadVmResourceSnapshotFromInflux } from "@/services/server/influx-resources";
import { enrichInstallations, enrichLegacySoftware } from "@/domain/software-lifecycle";

const useMysql = () => process.env.DATA_SOURCE === "mysql";

export async function getProjectGroups(): Promise<ProjectGroup[]> {
  return mockProjectGroups;
}

export async function getTopologyGroups(projectGroupId?: string): Promise<TopologyGroup[]> {
  if (!projectGroupId) return mockTopologyGroups;
  return mockTopologyGroups.filter((g) => g.projectGroupId === projectGroupId);
}

export async function getRelations(projectGroupId?: string): Promise<ArchitectureRelation[]> {
  if (!projectGroupId) return mockRelations;
  return mockRelations.filter((r) => r.projectGroupId === projectGroupId);
}

export async function getVmAssets(projectGroupId?: string): Promise<VmAsset[]> {
  const allVms = !useMysql()
    ? mockVms
    : await (async () => {
        const vms = await loadVmsFromMysql();
        const snapshots = await loadVmResourceSnapshotFromInflux(vms);
        return vms.map((vm) => {
          const r = snapshots.get(vm.hostname) ?? snapshots.get(vm.hostname.toLowerCase());
          return {
            ...vm,
            cpuPct: r?.cpuPct,
            memoryPct: r?.memoryPct,
            diskPct: r?.diskPct,
            health: healthFromResource(vm.health, r),
            lastVerifiedAt: r?.checkedAt ?? vm.lastVerifiedAt,
          };
        });
      })();

  if (!projectGroupId) return allVms;
  return allVms.filter((v) => !v.projectGroupId || v.projectGroupId === projectGroupId);
}

export async function getNasAssets(projectGroupId?: string): Promise<NasAsset[]> {
  if (!projectGroupId) return mockNasAssets;
  return mockNasAssets.filter((n) => !n.projectGroupId || n.projectGroupId === projectGroupId);
}

export async function getClusters(projectGroupId?: string): Promise<ClusterEntity[]> {
  if (!projectGroupId) return mockClusters;
  return mockClusters.filter((c) => !c.projectGroupId || c.projectGroupId === projectGroupId);
}

export async function getSoftware(): Promise<SoftwareInstall[]> {
  const software = useMysql() ? await loadSoftwareFromMysql() : mockSoftware;
  return enrichLegacySoftware(software, mockSoftwareProducts, mockSoftwareReleases);
}

export async function getSoftwareProducts(): Promise<SoftwareProduct[]> {
  return mockSoftwareProducts;
}

export async function getSoftwareReleases(): Promise<SoftwareRelease[]> {
  return mockSoftwareReleases;
}

export async function getAssetSoftwareInstallations(projectGroupId?: string): Promise<AssetSoftwareInstallation[]> {
  const enriched = enrichInstallations(mockAssetSoftwareInstallations, mockSoftwareReleases);
  if (!projectGroupId) return enriched;
  return enriched.filter((i) => !i.projectGroupId || i.projectGroupId === projectGroupId);
}

export async function getSops(projectGroupId?: string): Promise<SopDocument[]> {
  const allSops = useMysql() ? await loadSopsFromMysql() : mockSops;
  if (!projectGroupId) return allSops;
  return allSops.filter((s) => !s.projectGroupId || s.projectGroupId === projectGroupId);
}

export async function getPolicies(projectGroupId?: string): Promise<NetworkPolicy[]> {
  const allPolicies = useMysql() ? await loadPoliciesFromMysql() : mockPolicies;
  if (!projectGroupId) return allPolicies;
  return allPolicies.filter((p) => !p.projectGroupId || p.projectGroupId === projectGroupId);
}

async function getObservations(): Promise<ConnectivityObservation[]> {
  if (!useMysql()) return mockObservations;
  return loadConnectivityFromInflux();
}

function latestByConnection(observations: ConnectivityObservation[]) {
  const byKey = new Map<string, ConnectivityObservation>();
  for (const observation of observations) {
    const key = connectivityKey(observation);
    const current = byKey.get(key);
    if (!current || new Date(observation.checkedAt).getTime() >= new Date(current.checkedAt).getTime()) {
      byKey.set(key, observation);
    }
  }
  return byKey;
}

export async function getNetworkStatuses(projectGroupId?: string): Promise<NetworkStatus[]> {
  const policies = await getPolicies(projectGroupId);
  const observations = await getObservations();
  const byConnection = latestByConnection(observations);

  return policies
    .map((policy) => {
      const forward = byConnection.get(policyForwardKey(policy));
      const reverseKey = policyReverseKey(policy);
      const reverse = reverseKey ? byConnection.get(reverseKey) : undefined;
      return evaluateNetworkStatus(policy, forward, reverse);
    })
    .sort((a, b) => severityRank[a.overall] - severityRank[b.overall]);
}

export async function getVmBundle(vmId: string) {
  const [vms, network, software, sops] = await Promise.all([
    getVmAssets(),
    getNetworkStatuses(),
    getSoftware(),
    getSops(),
  ]);
  return {
    vm: vms.find((v) => v.id === vmId) ?? null,
    network: network.filter((n) => n.policy.sourceVmId === vmId || n.policy.targetVmId === vmId),
    installed: software.filter((s) => s.vmId === vmId),
    docs: sops.filter((s) => s.relatedVmIds.includes(vmId)),
  };
}
