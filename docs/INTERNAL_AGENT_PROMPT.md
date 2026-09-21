# Paste-ready prompt for the internal coding agent

Use the prompt below after giving the agent this repository plus the internal source files.

---

You are integrating company infrastructure data into an existing RPA Infrastructure Control Center.

FIRST read these files in order:
1. `AGENTS.md`
2. `docs/INTERNAL_AGENT_HANDOFF.md`
3. `docs/DATA_CONTRACT.md`
4. `samples/normalized-import.example.json`
5. `db/schema.sql`

NON-NEGOTIABLE:
- Do not redesign or restyle the UI.
- Do not change sidebar/header/layout/typography/density/Drawer UX.
- Do not rewrite architecture components unless required for a real-data field mapping bug.
- Do not invent missing VM, IP, port, approval, expiry, SW or EOSL values.
- Keep source provenance (`sourceRef`) for every record where possible.

TASK 1 — DATA NORMALIZATION
Inspect all supplied VM inventories, firewall-opening/approval files, SOP lists/documents and software inventories. Produce `data/internal-normalized.json` matching `samples/normalized-import.example.json` exactly.

Before writing the file, report:
- source files discovered
- VM count
- unique hostname/IP conflicts
- firewall records with missing source/target/port
- policies missing approval status or expiry
- duplicate policy candidates
- software entries lacking version/EOSL
- SOP documents that cannot be mapped to a VM/service

Resolve only deterministic mappings. Leave ambiguous values NULL/UNKNOWN and list them.

TASK 2 — VALIDATION
Validate:
- hostname/IP uniqueness
- sourceVmId/targetVmId references
- port range 1–65535
- protocol TCP/UDP
- expiry date format
- request IDs preserved
- sourceRef present when source is known

TASK 3 — MYSQL
Apply `db/schema.sql` if needed and run:
`npm run import:normalized -- data/internal-normalized.json`
Then compare DB row counts and samples against the source documents.

TASK 4 — INFLUX / TELEGRAF
Inspect the actual InfluxDB measurements/tags and current Telegraf config.
Map existing data into the domain expected by `src/services/server/influx-observations.ts` and `influx-resources.ts`.
Prefer adapting those two files over changing UI components.

For approved required network policies, determine whether source-side TCP probes already exist. If not, generate candidate configs with:
`npm run generate:telegraf -- data/internal-normalized.json`
Do NOT deploy configs automatically. Report what would be added per source VM.

TASK 5 — VERIFY APP
Set `DATA_SOURCE=mysql`, configure Influx environment variables and run:
- `npm run build`
- `npm run dev`

Verify these screens using real data:
- Dashboard
- Virtual Machines
- Architecture Overview / Service / VM drill-down
- Policy Registry
- Connectivity
- Software & EOSL
- SOP

Acceptance conditions:
- no hardcoded company IPs added to UI components
- unknown/missing data shown honestly
- VM/connection left Drawers still work
- architecture first view remains grouped
- approved policy and actual TCP status remain separate concepts
- TCP failure is not automatically labelled “firewall blocked”
- build passes

Only after all of the above, report remaining data gaps. Do not perform cosmetic redesign.

---
