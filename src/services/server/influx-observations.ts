import "server-only";
import type { ConnectivityObservation } from "@/domain/models";
import { queryFlux } from "./influx";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quote = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quote = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function rowsFromAnnotatedCsv(csv: string): Record<string, string>[] {
  const lines = csv.split(/\r?\n/).filter((line) => line && !line.startsWith("#"));
  const result: Record<string, string>[] = [];
  let headers: string[] | null = null;

  for (const line of lines) {
    const cells = parseCsvLine(line);
    if (!headers || (cells.includes("_time") && cells.includes("_value"))) {
      headers = cells;
      continue;
    }
    if (!headers) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, i) => (row[header] = cells[i] ?? ""));
    result.push(row);
  }
  return result;
}

/**
 * Reads observed connectivity as an independent dataset.
 * No firewall policy ID is required. The application joins this with policy rows later by:
 * source_vm_id + target_ip + protocol + port.
 */
export async function loadConnectivityFromInflux(): Promise<ConnectivityObservation[]> {
  const bucket = process.env.INFLUX_BUCKET;
  if (!process.env.INFLUX_URL || !process.env.INFLUX_TOKEN || !process.env.INFLUX_ORG || !bucket) return [];

  const netMeasurement = process.env.INFLUX_CONNECTIVITY_MEASUREMENT ?? "net_response";
  const pingMeasurement = process.env.INFLUX_PING_MEASUREMENT ?? "ping";

  const netCsv = await queryFlux(`from(bucket: "${bucket}")
  |> range(start: -10m)
  |> filter(fn:(r)=>r._measurement == "${netMeasurement}" and (r._field == "result_code" or r._field == "response_time"))
  |> group(columns:["source_vm_id","source_name","source_ip","target_vm_id","target_name","target_ip","target_port","probe_protocol","_field"])
  |> last()`);

  const pingCsv = await queryFlux(`from(bucket: "${bucket}")
  |> range(start: -10m)
  |> filter(fn:(r)=>r._measurement == "${pingMeasurement}" and (r._field == "percent_packet_loss" or r._field == "average_response_ms"))
  |> group(columns:["source_vm_id","url","_field"])
  |> last()`);

  const ping = new Map<string, { loss?: number; latencyMs?: number; time?: string }>();
  for (const row of rowsFromAnnotatedCsv(pingCsv)) {
    const key = `${row.source_vm_id}|${row.url}`;
    const value = ping.get(key) ?? {};
    if (row._field === "percent_packet_loss") value.loss = Number(row._value);
    if (row._field === "average_response_ms") value.latencyMs = Number(row._value);
    if (row._time) value.time = row._time;
    ping.set(key, value);
  }

  type NetValue = {
    sourceVmId: string;
    sourceName?: string;
    sourceIp?: string;
    targetVmId?: string;
    targetName?: string;
    targetIp: string;
    protocol: "TCP" | "UDP";
    port: number;
    code?: number;
    latencyMs?: number;
    time?: string;
  };

  const net = new Map<string, NetValue>();
  for (const row of rowsFromAnnotatedCsv(netCsv)) {
    const sourceVmId = row.source_vm_id;
    const targetIp = row.target_ip || row.server;
    const port = Number(row.target_port || row.port);
    const protocol = (row.probe_protocol || row.protocol || "TCP").toUpperCase() as "TCP" | "UDP";
    if (!sourceVmId || !targetIp || !Number.isFinite(port)) continue;

    const key = `${sourceVmId}|${targetIp}|${protocol}|${port}`.toLowerCase();
    const value =
      net.get(key) ??
      ({
        sourceVmId,
        sourceName: row.source_name || undefined,
        sourceIp: row.source_ip || undefined,
        targetVmId: row.target_vm_id || undefined,
        targetName: row.target_name || undefined,
        targetIp,
        protocol,
        port,
      } satisfies NetValue);

    if (row._field === "result_code") value.code = Number(row._value);
    if (row._field === "response_time") {
      const seconds = Number(row._value);
      value.latencyMs = Number.isFinite(seconds) ? seconds * 1000 : undefined;
    }
    if (row._time) value.time = row._time;
    net.set(key, value);
  }

  return [...net.values()].map((value) => {
    const pingValue = ping.get(`${value.sourceVmId}|${value.targetIp}`);
    return {
      sourceVmId: value.sourceVmId,
      sourceName: value.sourceName,
      sourceIp: value.sourceIp,
      targetVmId: value.targetVmId,
      targetName: value.targetName,
      targetIp: value.targetIp,
      protocol: value.protocol,
      port: value.port,
      ping: pingValue?.loss == null ? "NO_DATA" : pingValue.loss < 100 ? "UP" : "DOWN",
      tcp: value.code == null ? "NO_DATA" : value.code === 0 ? "UP" : "DOWN",
      pingLatencyMs: pingValue?.latencyMs ?? null,
      tcpLatencyMs: value.latencyMs ?? null,
      checkedAt: value.time ?? pingValue?.time ?? new Date().toISOString(),
    };
  });
}
