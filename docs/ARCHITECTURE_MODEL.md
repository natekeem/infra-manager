# Architecture Topology & Entity Model Documentation

## 1. Overview & Principles

The RPA Infrastructure Control Center architecture canvas visualizes complex enterprise RPA deployments without initial visual clutter.
In accordance with `AGENTS.md`:
- **Default Grouped View**: Never renders all 30+ VM nodes on first load. The default view aggregates infrastructure by tiers (WEB, APP, DB, CONTROL, BOT, VDI, SUPPORT) and external dependencies.
- **Drill-Down Flow**: `Overview → Service → VM`. Double-clicking a tier group zooms into the VM drill-down view filtered to that tier.
- **Density & Bounds Control**: Custom React Flow node cards use explicit bounding boxes (`w: 230px, h: 125px`) with zero outer margins and orthogonal edge routing with `borderRadius: 8`, preventing node card clipping and label overlap.

---

## 2. Infrastructure Entity Hierarchy

The domain model distinguishes between physical/virtual compute assets, shared storage, and logical high-availability clusters:

### 2.1. Base Model: `InfraAsset`
Common attributes for all physical and virtual assets:
- `id`: Unique asset identifier (e.g. `vm-bot01`, `nas-01`)
- `assetType`: `"VM" | "PHYSICAL_SERVER" | "NAS" | "NETWORK_APPLIANCE" | "OTHER"`
- `hostname`, `ipAddress`, `environment` (`PROD`, `STG`, `DEV`), `role`, `service`, `zone`, `criticality`, `health`
- `sourceRef`: Provenance tracker (e.g. CMDB spreadsheet, vCenter export batch)

### 2.2. Virtual Machines: `VmAsset`
Extends `InfraAsset` with VM-specific compute metrics and OS details:
- `osName`, `osVersion`, `cpuCores`, `memoryGb`, `diskGb`
- Live resource metrics: `cpuPct`, `memoryPct`, `diskPct`
- `eoslDate`: Operating system vendor end-of-support date
- `grafanaPath`: Direct deep-link to host-level metric dashboards

### 2.3. Shared Storage: `NasAsset`
Dedicated model for network-attached storage appliances:
- `protocol`: `"NFS" | "SMB" | "iSCSI" | "MULTI"`
- `capacityTb`, `usedCapacityTb`: Storage capacity tracking
- `mountPath`: Shared path (e.g. `\\rpa-nas01.corp\rpa_logs`)
- `targetVms`: Array of client VMs mounting this storage

### 2.4. Logical Entity: `ClusterEntity`
Logical grouping for high-availability clusters (e.g. Windows Server Failover Cluster / MSCS MSSQL):
- `vip`: Virtual IP (e.g. `10.10.30.100`)
- `type`: `"MSCS" | "KUBERNETES" | "ORACLE_RAC" | "OTHER"`
- `members`: Member nodes with roles (`ACTIVE`, `PASSIVE`, `WITNESS`) and status (`ONLINE`, `STANDBY`)
- `services`: Clustered services (e.g. MSSQL Server on port 1433)

---

## 3. Custom Node Rendering & Canvas Layout

| Node Kind | Dimensions | Color Accent | Purpose |
|---|---|---|---|
| `GroupNode` | `w: 200px` | Neutral / Primary Ring | Tier aggregation showing healthy/warning/critical VM counts |
| `VmNode` | `w: 230px, h: 125px` | Neutral border | Dense card with hostname, IP, role, 3-metric gauges, OS |
| `ClusterNode` | `w: 230px, h: 135px` | Purple accent (`border-purple-500/40`) | Displays Cluster VIP, Active/Passive nodes, service ports |
| `NasNode` | `w: 220px, h: 120px` | Cyan accent (`border-cyan-500/40`) | Displays Protocol, Storage allocation progress bar, mount count |

---

## 4. Probe Flow Animation

The top control bar features a `[ Flow ]` toggle switch:
- **Strict Terminology**: Labeled as **Probe Flow** or **Connectivity Flow** (never "traffic", preserving the principle that probe status represents connectivity reachability).
- **Forward Probe UP**: Subtle SVG particle travels from Source to Target along the orthogonal path (`<animateMotion dur="2.4s" repeatCount="indefinite" />`).
- **Bidirectional UP**: Dual SVG particles travel in opposite directions simultaneously.
- **Probe Failure / DOWN**: Flow line is rendered as a dashed red stroke with no moving particles.

---

## 5. Right SlideDrawer UX

All contextual inspections slide out smoothly from the **right side** (`right-0 top-[52px] bottom-0`, width `460px`) via `SlideDrawer`:
1. `VmDrawer`: Tabbed inspection (`Overview`, `Network`, `Software`, `SOP`) with click-through to software details.
2. `ConnectionDrawer`: Policy vs. Actual comparison (Forward & Return probes for bidirectional policies).
3. `ClusterDrawer`: VIP, member failover priority, cluster services.
4. `NasDrawer`: Storage allocation gauge, connected client VMs.
5. `SoftwareDetailDrawer`: Catalog matching rules, vendor support dates, installed VM instances.
