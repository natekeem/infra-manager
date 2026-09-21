# RPA Infrastructure Control Center — NextAdmin-style Starter

A near-production starter for an internal RPA infrastructure operations portal.

The UI is intentionally a **compact developer/admin console**, not a generated SaaS landing dashboard. It follows the current NextAdmin v2 design/development direction (Next.js 16, route-group shell, modular feature components, compact admin surfaces, Recharts) while adding RPA-specific infrastructure functionality.

> Creation note: the build environment used for this package could inspect the current public NextAdmin v2 repository/documentation but could not clone GitHub directly. This package is therefore an independent NextAdmin-compatible starter rather than a byte-for-byte fork. See `docs/NEXTADMIN_NOTES.md`.

## What is already implemented

### Dashboard

- 30-VM realistic sample inventory
- compact VM / network / EOSL / freshness summary strip
- resource trend chart
- active issue table
- VM pressure table
- direct architecture link

### VM inventory

- dense table suitable for 30+ VMs
- hostname/IP/service search
- role filter
- row click → **left sliding Drawer**
- Drawer includes resource snapshot, asset metadata, network status, installed software/EOSL, SOP and Grafana link

### Architecture

- React Flow canvas
- **Overview → Service → VM** drill-down
- first screen shows grouped tiers rather than all VMs
- tier double-click → VM view filtered to that tier
- issue-only filter
- VM/IP search
- VM click → left Drawer
- edge click → left Connection Drawer
- aggregate service/tier flows on high-level views
- per-connection TCP/expiry labels on VM view

### Network model

Exactly two primary truths are compared:

1. **Policy / Should Be** — approved opening request, validity and expiry from MySQL/source records
2. **Observed / Actual** — source-side Telegraf TCP probe from InfluxDB

Ping is retained as diagnostic context only.

The status engine covers:

- normal
- expiring
- policy expired but still reachable
- policy expired and unreachable
- policy valid but unreachable
- unapproved but reachable
- no data / unknown

A TCP failure is never automatically labelled as a firewall block.

### Data / backend

- one Next.js deployment; no separate API server required
- MySQL schema for VM, SW/EOSL, network policy, service dependencies and SOP
- MySQL repository implementation
- InfluxDB 2.x HTTP/Flux adapter scaffold
- mock mode for home/demo development
- JSON normalization contract for internal migration
- JSON → MySQL importer
- Telegraf probe config generator
- API routes for future refresh/client integration

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

The default is:

```env
DATA_SOURCE=mock
```

so all screens work without MySQL/InfluxDB.

## Switch to internal data

### 1. Create schema

```bash
mysql -u <user> -p < db/schema.sql
```

### 2. Normalize existing files

Use `samples/normalized-import.example.json` as the strict output contract. Internal agents should read `AGENTS.md` and `docs/INTERNAL_AGENT_HANDOFF.md` first.

### 3. Import

```bash
npm run import:normalized -- /path/to/normalized.json
```

### 4. Enable MySQL

```env
DATA_SOURCE=mysql
```

### 5. Map Telegraf / Influx

If generated probe configs are adopted, keep these tags on `net_response`:

- `policy_id`
- `source_vm_id`
- `source_name`
- `target_name`
- `target_ip`
- `target_port`

Generate candidate configs:

```bash
npm run generate:telegraf -- /path/to/normalized.json
```

Review against the exact internal Telegraf version before deployment.

Configure:

```env
INFLUX_URL=http://influx.internal:8086
INFLUX_TOKEN=...
INFLUX_ORG=...
INFLUX_BUCKET=...
INFLUX_CONNECTIVITY_MEASUREMENT=net_response
```

`src/services/server/influx-observations.ts` already maps the generated tag convention into the application's `ConnectivityObservation` contract. If the existing company measurement differs, change that adapter only — do not rewrite the UI.

## Main routes

| Route | Purpose |
|---|---|
| `/` | Infrastructure overview |
| `/infrastructure/vms` | VM inventory |
| `/infrastructure/architecture` | grouped/live topology |
| `/infrastructure/software` | software + EOSL |
| `/network/connectivity` | policy baseline + Telegraf observed connectivity (joined view) |
| `/network/policies` | compatibility redirect to joined network view |
| `/operations/sop` | SOP library |

## Important files for the internal coding agent

- `AGENTS.md` — non-negotiable UI/data rules
- `docs/INTERNAL_AGENT_HANDOFF.md` — company migration instructions
- `docs/DATA_CONTRACT.md` — MySQL vs Influx responsibility
- `docs/TELEGRAF_PROBES.md` — probe architecture
- `docs/EXECUTIVE_DEMO_SCRIPT.md` — report/demo flow
- `db/schema.sql` — DB schema
- `samples/normalized-import.example.json` — normalization target
- `src/domain/network-status.ts` — status judgement engine
- `src/services/server/repository.ts` — MySQL mapping
- `src/services/server/influx-observations.ts` — Influx mapping

## Recommended next internal tasks — in order

1. Map real VM/firewall/SOP files to normalized JSON.
2. Import MySQL and verify counts/IP/expiry against originals.
3. Inspect current Telegraf/Influx measurement names and adapt only the Influx adapter if necessary.
4. Add source-side probes for required policies not currently measured.
5. Map current VM resource measurement into the dashboard/VM Drawer.
6. Replace sample Grafana/SOP URLs.
7. Keep UI changes last and minimal.

## Executive demo

See `docs/EXECUTIVE_DEMO_SCRIPT.md`. The strongest story is not “another dashboard”; it is:

**approved policy (should be) + source-side live connectivity (actual) + topology + expiry + EOSL + SOP in one operational view.**
