import "server-only";
import type {
  AssetSoftwareInstallation, NetworkPolicy, ProjectSoftwareScope, SoftwareInstall,
  SoftwareCatalogImportBatch, SoftwareLifecyclePhase, SoftwareProduct, SoftwareProductAlias,
  SoftwareRelease, SoftwareReleaseLifecycleHistory, SopDocument, VmAsset,
} from "@/domain/models";
import { getMysqlPool } from "./mysql";
import type { RowDataPacket } from "mysql2";

const dateOnly = (value: unknown) => value ? new Date(value as string | number | Date).toISOString().slice(0, 10) : null;
const dateTime = (value: unknown) => value ? new Date(value as string | number | Date).toISOString() : null;

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

export async function loadSoftwareProductsFromMysql(): Promise<SoftwareProduct[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`
    SELECT id,canonical_name,vendor,category,description,catalog_status,last_catalog_seen_at,external_key
    FROM software_catalog ORDER BY canonical_name
  `);
  return rows.map((r) => ({ id: String(r.id), name: String(r.canonical_name), vendor: String(r.vendor ?? "Unknown"),
    category: String(r.category ?? "General"), description: r.description ? String(r.description) : undefined,
    catalogStatus: r.catalog_status ?? "ACTIVE", lastCatalogSeenAt: dateTime(r.last_catalog_seen_at),
    externalKey: r.external_key ? String(r.external_key) : null }));
}

export async function loadSoftwareReleasesFromMysql(): Promise<SoftwareRelease[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`
    SELECT sr.id,sr.software_id,sc.canonical_name,sc.vendor,sr.version,sr.release_date,sr.support_end_date,
           sr.security_support_end_date,sr.extended_support_end_date,sr.eosl_date,sr.version_match_rule,
           sr.match_pattern,sr.successor_release_id,sr.catalog_status,sr.last_catalog_seen_at
    FROM software_release sr JOIN software_catalog sc ON sc.id=sr.software_id
    ORDER BY sc.canonical_name,sr.release_date,sr.version
  `);
  return rows.map((r) => ({ id: String(r.id), productId: String(r.software_id), productName: String(r.canonical_name),
    version: String(r.version), vendor: String(r.vendor ?? "Unknown"), releaseDate: dateOnly(r.release_date) ?? undefined,
    supportEndDate: dateOnly(r.support_end_date) ?? undefined, securitySupportEndDate: dateOnly(r.security_support_end_date),
    extendedSupportEndDate: dateOnly(r.extended_support_end_date), eoslDate: dateOnly(r.eosl_date), status: "SUPPORTED",
    versionMatchRule: r.version_match_rule, matchPattern: r.match_pattern ? String(r.match_pattern) : undefined,
    successorReleaseId: r.successor_release_id ? String(r.successor_release_id) : null,
    catalogStatus: r.catalog_status ?? "ACTIVE", lastCatalogSeenAt: dateTime(r.last_catalog_seen_at) }));
}

export async function loadSoftwareLifecyclePhasesFromMysql(): Promise<SoftwareLifecyclePhase[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`
    SELECT id,release_id,phase_type,start_date,end_date,label FROM software_lifecycle_phase ORDER BY start_date
  `);
  return rows.map((r) => ({ id: String(r.id), releaseId: String(r.release_id), phaseType: r.phase_type,
    startDate: dateOnly(r.start_date)!, endDate: dateOnly(r.end_date)!, label: String(r.label) }));
}

export async function loadSoftwareProductAliasesFromMysql(): Promise<SoftwareProductAlias[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`
    SELECT id,product_id,alias,match_type FROM software_product_alias ORDER BY alias
  `);
  return rows.map((r) => ({ id: String(r.id), productId: String(r.product_id), alias: String(r.alias), matchType: r.match_type }));
}

export async function loadAssetSoftwareInstallationsFromMysql(): Promise<AssetSoftwareInstallation[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`
    SELECT vs.id,va.asset_key,va.project_group_id,vs.software_id,sc.canonical_name,vs.detected_product_name,
           vs.version,vs.matched_release_id,sr.version matched_version,sc.vendor,sc.category,vs.installed_at,vs.last_verified_at
    FROM vm_software vs JOIN vm_asset va ON va.id=vs.vm_id
    JOIN software_catalog sc ON sc.id=vs.software_id LEFT JOIN software_release sr ON sr.id=vs.matched_release_id
    ORDER BY va.hostname,sc.canonical_name
  `);
  return rows.map((r) => ({ id: String(r.id), projectGroupId: r.project_group_id ? String(r.project_group_id) : undefined,
    assetId: String(r.asset_key), productId: String(r.software_id), productName: String(r.canonical_name),
    detectedProductName: r.detected_product_name ? String(r.detected_product_name) : String(r.canonical_name),
    detectedVersion: String(r.version ?? "Unknown"), matchedReleaseId: r.matched_release_id ? String(r.matched_release_id) : null,
    matchedReleaseVersion: r.matched_version ? String(r.matched_version) : null, lifecycleStatus: "UNMAPPED",
    matchStatus: r.matched_release_id ? "MATCHED" : "UNMAPPED", vendor: r.vendor ? String(r.vendor) : undefined,
    category: r.category ? String(r.category) : undefined, installedAt: dateOnly(r.installed_at) ?? undefined,
    lastVerifiedAt: dateTime(r.last_verified_at) ?? undefined }));
}

export async function loadProjectSoftwareScopeFromMysql(): Promise<ProjectSoftwareScope[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`
    SELECT id,project_group_id,product_id,preferred_release_id,scope_source,usage_status,owner,criticality,created_at
    FROM project_software_scope ORDER BY created_at
  `);
  return rows.map((r) => ({ id: String(r.id), projectGroupId: String(r.project_group_id), productId: String(r.product_id),
    preferredReleaseId: r.preferred_release_id ? String(r.preferred_release_id) : null, scopeSource: r.scope_source,
    usageStatus: r.usage_status, owner: r.owner ? String(r.owner) : null, criticality: r.criticality ?? null,
    createdAt: dateTime(r.created_at)! }));
}

export async function loadSoftwareCatalogImportBatchesFromMysql(): Promise<SoftwareCatalogImportBatch[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`SELECT * FROM software_catalog_import_batch ORDER BY imported_at DESC LIMIT 50`);
  return rows.map((r) => ({ id: String(r.id), importedAt: dateTime(r.imported_at)!, fileName: String(r.file_name),
    totalRows: Number(r.total_rows), newCount: Number(r.new_count), changedCount: Number(r.changed_count),
    unchangedCount: Number(r.unchanged_count), missingCount: Number(r.missing_count) }));
}

export async function loadSoftwareLifecycleHistoryFromMysql(): Promise<SoftwareReleaseLifecycleHistory[]> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(`SELECT * FROM software_release_lifecycle_history ORDER BY changed_at DESC LIMIT 200`);
  return rows.map((r) => ({ id: String(r.id), releaseId: String(r.release_id), fieldName: String(r.field_name),
    oldValue: r.old_value == null ? null : String(r.old_value), newValue: r.new_value == null ? null : String(r.new_value),
    changedAt: dateTime(r.changed_at)!, importBatchId: String(r.import_batch_id) }));
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

  const date = dateOnly;
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
