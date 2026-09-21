import { evaluateNetworkStatus, severityRank } from "@/domain/network-status";
import type { ConnectivityObservation, NetworkPolicy, NetworkStatus, SoftwareInstall, SopDocument, VmAsset } from "@/domain/models";
import { observations as mockObservations, policies as mockPolicies, sops as mockSops, software as mockSoftware, vms as mockVms } from "./mock-data";
import { loadPoliciesFromMysql, loadSoftwareFromMysql, loadSopsFromMysql, loadVmsFromMysql } from "@/services/server/repository";
import { loadConnectivityFromInflux } from "@/services/server/influx-observations";
import { healthFromResource, loadVmResourceSnapshotFromInflux } from "@/services/server/influx-resources";

const useMysql = () => process.env.DATA_SOURCE === "mysql";

export async function getVmAssets(): Promise<VmAsset[]> {
  if(!useMysql()) return mockVms;
  const vms=await loadVmsFromMysql();
  const snapshots=await loadVmResourceSnapshotFromInflux(vms);
  return vms.map(vm=>{const r=snapshots.get(vm.hostname)??snapshots.get(vm.hostname.toLowerCase());return {...vm,cpuPct:r?.cpuPct,memoryPct:r?.memoryPct,diskPct:r?.diskPct,health:healthFromResource(vm.health,r),lastVerifiedAt:r?.checkedAt??vm.lastVerifiedAt};});
}
export async function getSoftware(): Promise<SoftwareInstall[]> {
  return useMysql() ? loadSoftwareFromMysql() : mockSoftware;
}
export async function getSops(): Promise<SopDocument[]> {
  return useMysql() ? loadSopsFromMysql() : mockSops;
}
async function getPolicies(): Promise<NetworkPolicy[]> {
  return useMysql() ? loadPoliciesFromMysql() : mockPolicies;
}
async function getObservations(policies:NetworkPolicy[]): Promise<ConnectivityObservation[]> {
  if(!useMysql()) return mockObservations;
  return loadConnectivityFromInflux(policies);
}
export async function getNetworkStatuses(): Promise<NetworkStatus[]> {
  const policies=await getPolicies();const observations=await getObservations(policies);const byPolicy=new Map(observations.map(o=>[o.policyId,o]));
  return policies.map(p=>evaluateNetworkStatus(p,byPolicy.get(p.id))).sort((a,b)=>severityRank[a.overall]-severityRank[b.overall]);
}
export async function getVmBundle(vmId:string){const [vms,network,software,sops]=await Promise.all([getVmAssets(),getNetworkStatuses(),getSoftware(),getSops()]);return {vm:vms.find(v=>v.id===vmId)??null,network:network.filter(n=>n.policy.sourceVmId===vmId||n.policy.targetVmId===vmId),installed:software.filter(s=>s.vmId===vmId),docs:sops.filter(s=>s.relatedVmIds.includes(vmId))};}
