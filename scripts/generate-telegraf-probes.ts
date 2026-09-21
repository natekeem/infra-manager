import fs from "node:fs";
import path from "node:path";

type Policy = {
  id: string;
  sourceVmId: string;
  sourceName: string;
  sourceIp: string;
  targetName: string;
  targetIp: string;
  protocol: "TCP" | "UDP";
  port: number;
  approvalStatus: string;
};

type ImportFile = { networkPolicies?: Policy[] };

const arg = process.argv[2] ?? "samples/normalized-import.example.json";
const inputPath = path.resolve(arg);
const raw = JSON.parse(fs.readFileSync(inputPath, "utf8")) as ImportFile;
const policies = (raw.networkPolicies ?? []).filter((p) => p.approvalStatus === "APPROVED");
const grouped = new Map<string, Policy[]>();
for (const p of policies) grouped.set(p.sourceVmId, [...(grouped.get(p.sourceVmId) ?? []), p]);

const outDir = path.resolve("generated-telegraf");
fs.mkdirSync(outDir, { recursive: true });

for (const [sourceVmId, rows] of grouped) {
  const pingTargets = [...new Set(rows.map((p) => p.targetIp))];
  const lines: string[] = [
    `# generated for ${rows[0]?.sourceName ?? sourceVmId}`,
    `# Copy this file only to the source VM represented by this file.`,
    `# Ping is diagnostic context. TCP probe is the primary actual-connectivity signal.`,
    "",
  ];

  if (pingTargets.length) {
    lines.push("[[inputs.ping]]");
    lines.push(`  urls = [${pingTargets.map((ip) => `\"${ip}\"`).join(", ")}]`);
    lines.push('  method = "native"');
    lines.push("  count = 2");
    lines.push('  deadline = "3s"');
    lines.push('  interval = "60s"');
    lines.push('  [inputs.ping.tags]');
    lines.push(`    source_vm_id = "${sourceVmId}"`);
    lines.push(`    source_name = "${rows[0]?.sourceName ?? sourceVmId}"`);
    lines.push("");
  }

  for (const p of rows) {
    lines.push("[[inputs.net_response]]");
    lines.push(`  protocol = "${p.protocol.toLowerCase()}"`);
    lines.push(`  address = "${p.targetIp}:${p.port}"`);
    lines.push('  timeout = "3s"');
    lines.push('  interval = "60s"');
    lines.push(`  [inputs.net_response.tags]`);
    lines.push(`    policy_id = "${p.id}"`);
    lines.push(`    source_vm_id = "${p.sourceVmId}"`);
    lines.push(`    source_name = "${p.sourceName}"`);
    lines.push(`    target_name = "${p.targetName}"`);
    lines.push(`    target_ip = "${p.targetIp}"`);
    lines.push(`    target_port = "${p.port}"`);
    lines.push("");
  }
  fs.writeFileSync(path.join(outDir, `${sourceVmId}.conf`), lines.join("\n"));
}

console.log(`Generated ${grouped.size} source-VM Telegraf files in ${outDir}`);
