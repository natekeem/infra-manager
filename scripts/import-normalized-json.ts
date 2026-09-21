import fs from "node:fs";
import mysql from "mysql2/promise";

const file = process.argv[2];
if (!file) throw new Error("Usage: npm run import:normalized -- <normalized.json>");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
});

await db.beginTransaction();
try {
  const [batchResult] = await db.execute<mysql.ResultSetHeader>(
    "INSERT INTO import_batch(source_name, source_type, imported_by, notes) VALUES(?,?,?,?)",
    [file, "NORMALIZED_JSON", process.env.USER ?? "agent", "Normalized import contract"],
  );
  const batchId = batchResult.insertId;
  const vmIdByKey = new Map<string, number>();

  for (const v of data.vms ?? []) {
    await db.execute(
      `INSERT INTO vm_asset(asset_key,hostname,ip_address,environment,role,service_name,zone_name,criticality,os_name,os_version,cpu_cores,memory_gb,disk_gb,owner,eosl_date,grafana_path,import_batch_id,last_verified_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE hostname=VALUES(hostname),ip_address=VALUES(ip_address),environment=VALUES(environment),role=VALUES(role),service_name=VALUES(service_name),zone_name=VALUES(zone_name),criticality=VALUES(criticality),os_name=VALUES(os_name),os_version=VALUES(os_version),cpu_cores=VALUES(cpu_cores),memory_gb=VALUES(memory_gb),disk_gb=VALUES(disk_gb),owner=VALUES(owner),eosl_date=VALUES(eosl_date),grafana_path=VALUES(grafana_path),import_batch_id=VALUES(import_batch_id),last_verified_at=VALUES(last_verified_at)`,
      [v.id,v.hostname,v.ipAddress,v.environment,v.role,v.service,v.zone,v.criticality,v.osName,v.osVersion??null,v.cpuCores??null,v.memoryGb??null,v.diskGb??null,v.owner??null,v.eoslDate??null,v.grafanaPath??null,batchId,v.lastVerifiedAt??null],
    );
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT id FROM vm_asset WHERE asset_key=?", [v.id]);
    vmIdByKey.set(v.id, Number(rows[0].id));
  }

  const softwareIdByKey = new Map<string, number>();
  for (const sw of data.software ?? []) {
    const key = `${sw.name}::${sw.vendor ?? ""}`;
    if (!softwareIdByKey.has(key)) {
      await db.execute("INSERT INTO software_catalog(canonical_name,vendor,category) VALUES(?,?,?) ON DUPLICATE KEY UPDATE category=VALUES(category)",[sw.name,sw.vendor??null,sw.category??null]);
      const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT id FROM software_catalog WHERE canonical_name=? AND vendor <=> ?",[sw.name,sw.vendor??null]);
      softwareIdByKey.set(key,Number(rows[0].id));
    }
    const vmId=vmIdByKey.get(sw.vmId); if(!vmId) continue;
    await db.execute("INSERT INTO vm_software(vm_id,software_id,version,eosl_date,import_batch_id) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE eosl_date=VALUES(eosl_date),import_batch_id=VALUES(import_batch_id)",[vmId,softwareIdByKey.get(key),sw.version??null,sw.eoslDate??null,batchId]);
  }

  for (const p of data.networkPolicies ?? []) {
    await db.execute(
      `INSERT INTO network_policy(policy_key,source_vm_id,source_name,source_ip,target_vm_id,target_name,target_ip,protocol,port,direction,approval_status,requested_at,approved_at,valid_from,expires_at,request_id,purpose,owner,import_batch_id)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE source_vm_id=VALUES(source_vm_id),source_name=VALUES(source_name),source_ip=VALUES(source_ip),target_vm_id=VALUES(target_vm_id),target_name=VALUES(target_name),target_ip=VALUES(target_ip),protocol=VALUES(protocol),port=VALUES(port),direction=VALUES(direction),approval_status=VALUES(approval_status),expires_at=VALUES(expires_at),request_id=VALUES(request_id),purpose=VALUES(purpose),owner=VALUES(owner),import_batch_id=VALUES(import_batch_id)`,
      [p.id,vmIdByKey.get(p.sourceVmId)??null,p.sourceName,p.sourceIp,p.targetVmId?vmIdByKey.get(p.targetVmId)??null:null,p.targetName,p.targetIp,p.protocol,p.port,p.direction??"ONE_WAY",p.approvalStatus,p.requestedAt??null,p.approvedAt??null,p.validFrom??null,p.expiresAt??null,p.requestId??null,p.purpose??null,p.owner??null,batchId],
    );
  }

  for (const s of data.sops ?? []) {
    await db.execute("INSERT INTO sop_document(sop_key,title,category,document_url,owner,import_batch_id,last_verified_at) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),category=VALUES(category),document_url=VALUES(document_url),owner=VALUES(owner),import_batch_id=VALUES(import_batch_id),last_verified_at=VALUES(last_verified_at)",[s.id,s.title,s.category??null,s.url??null,s.owner??null,batchId,s.updatedAt??null]);
    const [rows]=await db.execute<mysql.RowDataPacket[]>("SELECT id FROM sop_document WHERE sop_key=?",[s.id]); const sopId=Number(rows[0].id);
    for(const vmKey of s.relatedVmIds??[]){const vmId=vmIdByKey.get(vmKey);if(vmId) await db.execute("INSERT IGNORE INTO vm_sop_map(vm_id,sop_id) VALUES(?,?)",[vmId,sopId]);}
  }

  await db.commit();
  console.log(`Imported normalized data from ${file}; batch=${batchId}`);
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
