# Internal Agent Handoff

## Goal

Do not redesign this application. Your job is to connect company data to the existing domain contract and preserve the current UX.

## Inputs you may receive

- VM inventory Excel/CSV/documents
- Firewall opening request/export files
- SOP documents/links
- Software inventories
- Existing InfluxDB/Telegraf measurement information
- Grafana dashboard URLs

## Required output from unstructured sources

First create one normalized JSON file matching `samples/normalized-import.example.json`. Do not write to MySQL directly until the JSON has been reviewed.

### Mapping rules

**VM**
- `id`: stable internal key. Prefer existing asset ID; otherwise normalized hostname.
- `hostname`, `ipAddress`: do not infer missing values.
- `zone`: one of WEB/APP/DB/CONTROL/BOT/VDI/SUPPORT or an explicitly agreed new zone.
- `service`: business/platform service, not OS process name.
- `sourceRef`: filename + sheet/page/row when possible.

**Network policy**
- One row = one source → target → protocol → port declared permission.
- `approvalStatus` reflects the request system, not observed network behavior.
- Preserve request/ticket ID and expiry date exactly.
- A target that is not one of our VMs may have `targetVmId=null` and still keep target name/IP.

**Software/EOSL**
- Do not assume EOSL from memory.
- If the source only has product/version and no EOSL mapping, leave `eoslDate=null`.
- EOSL enrichment can be a later verified dataset.

**SOP**
- Keep existing Confluence/file URL first.
- Do not rewrite SOP content unless requested.

## Influx mapping

The app wants this shape per policy:

```ts
{
  policyId,
  sourceVmId,
  targetIp,
  port,
  ping: "UP" | "DOWN" | "NO_DATA",
  tcp: "UP" | "DOWN" | "NO_DATA",
  pingLatencyMs,
  tcpLatencyMs,
  checkedAt
}
```

Map the company's actual measurement/tags into this contract. Keep raw time-series in InfluxDB; do not copy the full history into MySQL.

## Important diagnostic rule

- Policy valid + TCP UP = normal (or expiry warning)
- Policy valid + TCP DOWN = connectivity failure
- Ping UP + TCP DOWN = host reachable, port path/service needs investigation
- Ping DOWN + TCP DOWN = broader host/path/network investigation
- Policy expired + TCP DOWN = renewal lapse is a high-priority candidate, not an automatic root-cause verdict
- Policy expired + TCP UP = declared/actual mismatch

## Changes that are allowed

- adapters, SQL queries, Flux queries
- field mappings
- internal links
- environment variables
- filters required by real data

## Changes that require explicit approval

- sidebar structure
- typography/density
- architecture drill-down model
- Drawer direction/width/behavior
- color system
- replacing Next.js with separate backend/frontend
