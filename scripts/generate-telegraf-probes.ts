import fs from "node:fs";
import path from "node:path";

type Policy = {
  id: string;
  sourceVmId: string;
  sourceName: string;
  sourceIp: string;
  targetVmId?: string | null;
  targetName: string;
  targetIp: string;
  protocol: "TCP" | "UDP";
  port: number;
  direction?: "ONE_WAY" | "BIDIRECTIONAL";
  approvalStatus: string;
};

type ImportFile = { networkPolicies?: Policy[] };

type ProbeTarget = {
  sourceVmId: string;
  sourceName: string;
  sourceIp: string;
  targetVmId?: string | null;
  targetName: string;
  targetIp: string;
  protocol: "TCP" | "UDP";
  port: number;
};

const arg = process.argv[2] ?? "samples/normalized-import.example.json";
const inputPath = path.resolve(arg);
const raw = JSON.parse(fs.readFileSync(inputPath, "utf8")) as ImportFile;
const policies = (raw.networkPolicies ?? []).filter((p) => p.approvalStatus === "APPROVED");

// Policy is the probe-definition baseline, but Telegraf output is intentionally policy-ID independent.
// A bidirectional internal policy produces two directional probes.
const probes: ProbeTarget[] = [];
for (const policy of policies) {
  probes.push({
    sourceVmId: policy.sourceVmId,
    sourceName: policy.sourceName,
    sourceIp: policy.sourceIp,
    targetVmId: policy.targetVmId,
    targetName: policy.targetName,
    targetIp: policy.targetIp,
    protocol: policy.protocol,
    port: policy.port,
  });

  if (policy.direction === "BIDIRECTIONAL" && policy.targetVmId) {
    probes.push({
      sourceVmId: policy.targetVmId,
      sourceName: policy.targetName,
      sourceIp: policy.targetIp,
      targetVmId: policy.sourceVmId,
      targetName: policy.sourceName,
      targetIp: policy.sourceIp,
      protocol: policy.protocol,
      port: policy.port,
    });
  }
}

const deduped = new Map<string, ProbeTarget>();
for (const probe of probes) {
  const key = `${probe.sourceVmId}|${probe.targetIp}|${probe.protocol}|${probe.port}`.toLowerCase();
  deduped.set(key, probe);
}

const grouped = new Map<string, ProbeTarget[]>();
for (const probe of deduped.values()) {
  grouped.set(probe.sourceVmId, [...(grouped.get(probe.sourceVmId) ?? []), probe]);
}

const outDir = path.resolve("generated-telegraf");
fs.mkdirSync(outDir, { recursive: true });

for (const [sourceVmId, rows] of grouped) {
  const pingTargets = [...new Set(rows.map((p) => p.targetIp))];
  const lines: string[] = [
    `# generated for ${rows[0]?.sourceName ?? sourceVmId}`,
    `# Copy this file only to the source VM represented by this file.`,
    `# Ping is diagnostic context. TCP probe is the primary actual-connectivity signal.`,
    `# Observations are joined to policy by source + target + protocol + port (not by policy ID).`,
    "",
  ];

  if (pingTargets.length) {
    lines.push("[[inputs.ping]]");
    lines.push(`  urls = [${pingTargets.map((ip) => `\"${ip}\"`).join(", ")}]`);
    lines.push('  method = "native"');
    lines.push("  count = 2");
    lines.push('  deadline = "3s"');
    lines.push('  interval = "60s"');
    lines.push("  [inputs.ping.tags]");
    lines.push(`    source_vm_id = "${sourceVmId}"`);
    lines.push(`    source_name = "${rows[0]?.sourceName ?? sourceVmId}"`);
    lines.push(`    source_ip = "${rows[0]?.sourceIp ?? ""}"`);
    lines.push("");
  }

  for (const p of rows) {
    lines.push("[[inputs.net_response]]");
    lines.push(`  protocol = "${p.protocol.toLowerCase()}"`);
    lines.push(`  address = "${p.targetIp}:${p.port}"`);
    lines.push('  timeout = "3s"');
    lines.push('  interval = "60s"');
    lines.push("  [inputs.net_response.tags]");
    lines.push(`    source_vm_id = "${p.sourceVmId}"`);
    lines.push(`    source_name = "${p.sourceName}"`);
    lines.push(`    source_ip = "${p.sourceIp}"`);
    if (p.targetVmId) lines.push(`    target_vm_id = "${p.targetVmId}"`);
    lines.push(`    target_name = "${p.targetName}"`);
    lines.push(`    target_ip = "${p.targetIp}"`);
    lines.push(`    target_port = "${p.port}"`);
    lines.push(`    probe_protocol = "${p.protocol}"`);
    lines.push(`    connection_key = "${p.sourceVmId}|${p.targetIp}|${p.protocol}|${p.port}"`);
    lines.push("");
  }

  fs.writeFileSync(path.join(outDir, `${sourceVmId}.conf`), lines.join("\n"));
}

console.log(`Generated ${grouped.size} source-VM Telegraf files in ${outDir}`);
