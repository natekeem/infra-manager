import "server-only";
import type { ConnectivityObservation, NetworkPolicy } from "@/domain/models";
import { queryFlux } from "./influx";

function parseCsvLine(line: string): string[] {
  const out:string[]=[]; let cur=""; let quote=false;
  for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quote&&line[i+1]==='"'){cur+='"';i++;}else quote=!quote;}else if(ch===','&&!quote){out.push(cur);cur="";}else cur+=ch;}out.push(cur);return out;
}
function rowsFromAnnotatedCsv(csv:string):Record<string,string>[] {
  const lines=csv.split(/\r?\n/).filter(l=>l&& !l.startsWith('#'));
  const result:Record<string,string>[]=[];let headers:string[]|null=null;
  for(const line of lines){const cells=parseCsvLine(line);if(!headers||cells.includes('_time')&&cells.includes('_value')){headers=cells;continue;}if(!headers)continue;const row:Record<string,string>={};headers.forEach((h,i)=>row[h]=cells[i]??"");result.push(row)}return result;
}

export async function loadConnectivityFromInflux(policies: NetworkPolicy[]): Promise<ConnectivityObservation[]> {
  const bucket=process.env.INFLUX_BUCKET;
  if(!process.env.INFLUX_URL||!process.env.INFLUX_TOKEN||!process.env.INFLUX_ORG||!bucket) return [];
  const netMeasurement=process.env.INFLUX_CONNECTIVITY_MEASUREMENT??"net_response";
  const netCsv=await queryFlux(`from(bucket: "${bucket}")
  |> range(start: -10m)
  |> filter(fn:(r)=>r._measurement == "${netMeasurement}" and (r._field == "result_code" or r._field == "response_time"))
  |> group(columns:["policy_id","_field"])
  |> last()`);
  const pingCsv=await queryFlux(`from(bucket: "${bucket}")
  |> range(start: -10m)
  |> filter(fn:(r)=>r._measurement == "ping" and (r._field == "percent_packet_loss" or r._field == "average_response_ms"))
  |> group(columns:["source_vm_id","url","_field"])
  |> last()`);
  const net=new Map<string,{code?:number;latencyMs?:number;time?:string}>();
  for(const r of rowsFromAnnotatedCsv(netCsv)){const id=r.policy_id;if(!id)continue;const x=net.get(id)??{};if(r._field==='result_code')x.code=Number(r._value);if(r._field==='response_time'){const value=Number(r._value);x.latencyMs=Number.isFinite(value)?value*1000:undefined;}if(r._time)x.time=r._time;net.set(id,x)}
  const ping=new Map<string,{loss?:number;latencyMs?:number;time?:string}>();
  for(const r of rowsFromAnnotatedCsv(pingCsv)){const key=`${r.source_vm_id}|${r.url}`;const x=ping.get(key)??{};if(r._field==='percent_packet_loss')x.loss=Number(r._value);if(r._field==='average_response_ms')x.latencyMs=Number(r._value);if(r._time)x.time=r._time;ping.set(key,x)}
  return policies.map(p=>{const n=net.get(p.id);const pg=ping.get(`${p.sourceVmId}|${p.targetIp}`);return {policyId:p.id,sourceVmId:p.sourceVmId,targetIp:p.targetIp,port:p.port,ping:pg?.loss==null?'NO_DATA':pg.loss<100?'UP':'DOWN',tcp:n?.code==null?'NO_DATA':n.code===0?'UP':'DOWN',pingLatencyMs:pg?.latencyMs??null,tcpLatencyMs:n?.latencyMs??null,checkedAt:n?.time??pg?.time??new Date().toISOString()}});
}
