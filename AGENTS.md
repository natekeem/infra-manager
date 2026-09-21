# RPA Infrastructure Control Center — Agent Rules

This repository intentionally follows the current NextAdmin v2 project philosophy: Next.js App Router, modular feature folders, compact admin UI, Recharts/TanStack-style data surfaces, and strong separation between UI and data adapters.

## Non-negotiable product rules

1. **Do not redesign the UI.** Preserve current sidebar/header dimensions, compact typography, border radius, spacing and neutral color system.
2. **Do not create large gradient KPI cards, glassmorphism, neon effects, oversized headings, or consumer/SaaS landing-page styling.** This is an internal developer/operations console.
3. **Context Drawers open from the Right.** All contextual drawers (`VmDrawer`, `ConnectionDrawer`, `ClusterDrawer`, `NasDrawer`, `SoftwareDetailDrawer`) use `SlideDrawer` sliding in from the right (`right-0`, 460px width) so the left navigation sidebar remains completely unobstructed.
4. **Architecture default view stays grouped.** Never render all 30+ VMs on first load. Overview → Service → VM is the intended drill-down.
5. **Network truth model has exactly two primary dimensions:**
   - Declared/approved policy from MySQL or normalized source documents = SHOULD BE (supports `ONE_WAY` and `BIDIRECTIONAL`)
   - Source-side Telegraf TCP probe from InfluxDB = ACTUAL (checks forward and return probes for bidirectional policies)
   Ping is diagnostic context only.
6. A failed TCP probe must be labelled **connectivity failure**, not automatically "firewall blocked". Ping UP + TCP DOWN means check firewall implementation and target service first. If forward TCP is UP but return TCP is DOWN, label as **`RETURN_DIRECTION_FAILED`**.
7. Never invent missing infrastructure data. Use `null`, `UNKNOWN`, or `UNMAPPED`. Preserve `sourceRef` / import batch provenance.
8. Keep the app as one Next.js deployment. Do not introduce FastAPI/NestJS or a new service unless explicitly approved.
9. Do not install new packages unless the existing stack cannot reasonably solve the problem.
10. Internal data integration should replace adapters, not rewrite components.

## Route structure

### Operation & Overview
- `/` — executive + operator overview
- `/infrastructure/vms` — compact VM inventory
- `/infrastructure/architecture` — grouped React Flow topology with Probe Flow animation
- `/infrastructure/software` — 3-tier software catalog & EOSL lifecycle
- `/network/policies` — approved/declared firewall-opening registry
- `/network/connectivity` — Telegraf observed status
- `/operations/sop` — SOP links/content

### Management & Administration
- `/management/assets` — physical, VM, and NAS asset CRUD
- `/management/software` — software product and release catalog maintenance
- `/management/policies` — firewall opening policy registry with directionality
- `/management/topology` — logical service mappings and dependency definitions
- `/management/sops` — standard operating procedure runbooks registry
- `/management/import` — batch JSON dataset validation and ingestion

## Data integration order inside company

1. Normalize source files into `samples/normalized-import.example.json` shape.
2. Validate IDs/IPs/ports/expiry and keep `sourceRef`.
3. Import MySQL using `npm run import:normalized -- <file>`.
4. Implement MySQL reads behind `src/services/api/infrastructure/index.ts` without changing component props.
5. Map existing Influx measurement/tags to `ConnectivityObservation`.
6. Only after data is correct, replace mock resource metrics.
7. Keep demo/mock provider available for UI regression testing.

## Architecture UX

- Overview: grouped tiers and external dependencies.
- Double-click a tier: switch to VM view filtered to that tier.
- Click VM: right Drawer.
- Click connection/edge: right Drawer with policy + actual + diagnosis (forward & return).
- Click cluster: right ClusterDrawer (VIP, active/passive nodes).
- Click NAS: right NasDrawer (used/total TB capacity, mount targets).
- Probe Flow toggle: renders subtle SVG particle animation on active TCP probe paths.
- Issues-only toggle must remain available.
- Search must accept hostname/IP; later extend to port/request ID without changing the layout.

## Definition of done for internal migration

- All known VMs imported with source reference.
- Network policy records match the approved request records, including expiry dates and directionality.
- Source-side TCP probes are queryable for every required policy where feasible.
- No production page depends on manually hardcoded internal IPs.
- Missing data is visible as UNKNOWN rather than guessed.
- `npm run build` passes.

