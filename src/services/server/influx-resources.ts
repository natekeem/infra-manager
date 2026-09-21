import "server-only";
import type { VmAsset, VmHealth } from "@/domain/models";
import { queryFlux } from "./influx";

function parseCsvLine(line:string){const out:string[]=[];let cur="",q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===','&&!q){out.push(cur);cur="";}else cur+=c;}out.push(cur);return out;}
function parse(csv:string){const lines=csv.split(/\r?\n/).filter(l=>l&&!l.startsWith('#'));let headers:string[]|null=null;const rows:Record<string,string>[]=[];for(const l of lines){const cells=parseCsvLine(l);if(!headers||(cells.includes('_time')&&cells.includes('_value'))){headers=cells;continue;}if(!headers)continue;const r:Record<string,string>={};headers.forEach((h,i)=>r[h]=cells[i]??"");rows.push(r);}return rows;}

export interface ResourceSnapshot { cpuPct?:number; memoryPct?:number; diskPct?:number; checkedAt?:string }

export async function loadVmResourceSnapshotFromInflux(vms:VmAsset[]):Promise<Map<string,ResourceSnapshot>>{
  const bucket=process.env.INFLUX_BUCKET;if(!process.env.INFLUX_URL||!process.env.INFLUX_TOKEN||!process.env.INFLUX_ORG||!bucket)return new Map();
  const hostTag=process.env.INFLUX_HOST_TAG??"host";
  const cpuM=process.env.INFLUX_CPU_MEASUREMENT??"cpu";const memM=process.env.INFLUX_MEM_MEASUREMENT??"mem";const diskM=process.env.INFLUX_DISK_MEASUREMENT??"disk";
  const cpu=await queryFlux(`from(bucket:"${bucket}") |> range(start:-10m) |> filter(fn:(r)=>r._measurement=="${cpuM}" and r._field=="usage_idle" and r.cpu=="cpu-total") |> group(columns:["${hostTag}"]) |> last() |> map(fn:(r)=>({r with _value: 100.0 - r._value}))`);
  const mem=await queryFlux(`from(bucket:"${bucket}") |> range(start:-10m) |> filter(fn:(r)=>r._measurement=="${memM}" and r._field=="used_percent") |> group(columns:["${hostTag}"]) |> last()`);
  const disk=await queryFlux(`from(bucket:"${bucket}") |> range(start:-10m) |> filter(fn:(r)=>r._measurement=="${diskM}" and r._field=="used_percent") |> group(columns:["${hostTag}","path"]) |> last() |> group(columns:["${hostTag}"]) |> max(column:"_value")`);
  const map=new Map<string,ResourceSnapshot>();
  const apply=(csv:string,key:keyof ResourceSnapshot)=>{for(const r of parse(csv)){const host=r[hostTag];if(!host)continue;const cur=map.get(host.toLowerCase())??{};const value=Number(r._value);if(Number.isFinite(value))(cur as any)[key]=Math.round(value*10)/10;if(r._time)cur.checkedAt=r._time;map.set(host.toLowerCase(),cur)}};
  apply(cpu,"cpuPct");apply(mem,"memoryPct");apply(disk,"diskPct");
  // Also alias exact inventory hostnames for environments where tag casing differs only.
  for(const vm of vms){const found=map.get(vm.hostname.toLowerCase());if(found)map.set(vm.hostname,found)}
  return map;
}

export function healthFromResource(base:VmHealth,s?:ResourceSnapshot):VmHealth{
  if(!s)return base;const max=Math.max(s.cpuPct??0,s.memoryPct??0,s.diskPct??0);if(max>=95)return "critical";if(max>=85)return "warning";return base==="unknown"?"healthy":base;
}
