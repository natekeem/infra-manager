import "server-only";
import type { NetworkPolicy, SoftwareInstall, SopDocument, VmAsset } from "@/domain/models";
import { getMysqlPool } from "./mysql";
import type { RowDataPacket } from "mysql2";

export async function loadVmsFromMysql(): Promise<VmAsset[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`
    SELECT asset_key,hostname,ip_address,environment,role,service_name,zone_name,criticality,
           os_name,os_version,cpu_cores,memory_gb,disk_gb,owner,eosl_date,grafana_path,last_verified_at
    FROM vm_asset
    WHERE vm_status='ACTIVE'
    ORDER BY hostname
  `);

  return rows.map((r) => ({
    id: String(r.asset_key),
    hostname: String(r.hostname),
    ipAddress: String(r.ip_address),
    environment: String(r.environment),
    role: String(r.role ?? "Unknown"),
    service: String(r.service_name ?? "Unknown"),
    zone: String(r.zone_name ?? "SUPPORT"),
    criticality: r.criticality ?? "MEDIUM",
    osName: String(r.os_name ?? "Unknown"),
    osVersion: r.os_version ? String(r.os_version) : undefined,
    cpuCores: r.cpu_cores == null ? undefined : Number(r.cpu_cores),
    memoryGb: r.memory_gb == null ? undefined : Number(r.memory_gb),
    diskGb: r.disk_gb == null ? undefined : Number(r.disk_gb),
    health: "unknown",
    owner: r.owner ? String(r.owner) : undefined,
    eoslDate: r.eosl_date ? new Date(r.eosl_date).toISOString().slice(0, 10) : null,
    grafanaPath: r.grafana_path ? String(r.grafana_path) : null,
    lastVerifiedAt: r.last_verified_at ? new Date(r.last_verified_at).toISOString() : null,
  }));
}

export async function loadSoftwareFromMysql(): Promise<SoftwareInstall[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`
    SELECT vs.id,va.asset_key vm_key,sc.canonical_name,vs.version,sc.vendor,sc.category,vs.eosl_date
    FROM vm_software vs
    JOIN vm_asset va ON va.id=vs.vm_id
    JOIN software_catalog sc ON sc.id=vs.software_id
    ORDER BY va.hostname,sc.canonical_name
  `);

  return rows.map((r) => ({
    id: String(r.id),
    vmId: String(r.vm_key),
    name: String(r.canonical_name),
    version: r.version ? String(r.version) : undefined,
    vendor: r.vendor ? String(r.vendor) : undefined,
    category: r.category ? String(r.category) : undefined,
    eoslDate: r.eosl_date ? new Date(r.eosl_date).toISOString().slice(0, 10) : null,
  }));
}

export async function loadPoliciesFromMysql(): Promise<NetworkPolicy[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`
    SELECT np.policy_key,sv.asset_key source_vm_key,np.source_name,np.source_ip,
           tv.asset_key target_vm_key,np.target_name,np.target_ip,np.protocol,np.port,np.direction,
           np.approval_status,np.requested_at,np.approved_at,np.valid_from,np.expires_at,
           np.request_id,np.purpose,np.owner
    FROM network_policy np
    LEFT JOIN vm_asset sv ON sv.id=np.source_vm_id
    LEFT JOIN vm_asset tv ON tv.id=np.target_vm_id
    WHERE np.is_required=1
    ORDER BY np.source_name,np.target_name,np.port
  `);

  const date = (value: unknown) => value ? new Date(value as string | number | Date).toISOString().slice(0, 10) : null;
  return rows.map((r) => ({
    id: String(r.policy_key),
    sourceVmId: String(r.source_vm_key ?? r.source_name),
    sourceName: String(r.source_name),
    sourceIp: String(r.source_ip),
    targetVmId: r.target_vm_key ? String(r.target_vm_key) : null,
    targetName: String(r.target_name),
    targetIp: String(r.target_ip),
    protocol: r.protocol,
    port: Number(r.port),
    direction: r.direction ?? "ONE_WAY",
    approvalStatus: r.approval_status,
    requestedAt: date(r.requested_at),
    approvedAt: date(r.approved_at),
    validFrom: date(r.valid_from),
    expiresAt: date(r.expires_at),
    requestId: r.request_id ? String(r.request_id) : null,
    purpose: r.purpose ? String(r.purpose) : null,
    owner: r.owner ? String(r.owner) : null,
  }));
}

export async function loadSopsFromMysql(): Promise<SopDocument[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`
    SELECT sd.id,sd.sop_key,sd.title,sd.category,sd.document_url,sd.owner,sd.updated_at,va.asset_key vm_key
    FROM sop_document sd
    LEFT JOIN vm_sop_map m ON m.sop_id=sd.id
    LEFT JOIN vm_asset va ON va.id=m.vm_id
    ORDER BY sd.title
  `);

  const map = new Map<string, SopDocument>();
  for (const r of rows) {
    const key = String(r.sop_key);
    const item = map.get(key) ?? {
      id: key,
      title: String(r.title),
      category: String(r.category ?? "General"),
      owner: String(r.owner ?? "Unknown"),
      url: r.document_url ? String(r.document_url) : null,
      relatedVmIds: [],
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString().slice(0, 10) : "",
    };
    if (r.vm_key && !item.relatedVmIds.includes(String(r.vm_key))) item.relatedVmIds.push(String(r.vm_key));
    map.set(key, item);
  }
  return [...map.values()];
}
