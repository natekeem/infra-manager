# Architecture Topology & Entity Model Documentation

## 1. Overview & Generalized Architecture Engine

The RPA Infrastructure Control Center architecture canvas visualizes multi-project enterprise deployments without initial visual clutter.
In accordance with `AGENTS.md` and the multi-project generalization:
- **Default Grouped View**: Never renders all 30+ VM nodes on first load. The default view aggregates infrastructure into high-level topology groups, domains, and systems with aggregate health indicators.
- **Drill-Down Flow**: `Overview → Group → Service → Asset`. Double-clicking a group or selecting from breadcrumbs zooms smoothly into the targeted asset/VM or service view.
- **Generic Engine (Zero Hardcoded Domain Logic)**: The canvas engine handles any project topology dynamically (`ProjectGroup` -> `TopologyGroup` -> `Asset` & `ArchitectureRelation`) without hardcoded RPA-specific conditional checks like `if (domain === "MEMORY")`.
- **Density & Bounds Control**: Custom React Flow node cards use explicit compact bounding boxes (`GroupNode`: `w: 220px, min-h: 120px`, `VmNode`: `w: 230px, h: 125px`) with zero outer margins and orthogonal smoothstep / bezier edge routing (`borderRadius: 8`), preventing node clipping and label overlap.

---

## 2. Infrastructure Entity Hierarchy

The domain model distinguishes between physical/virtual compute assets, shared storage, containerized workloads, and logical groupings:

### 2.1. Base Asset Model: `Asset` (`VmAsset`, `InfraAsset`)
Common attributes for all infrastructure resources across projects:
- `id`: Unique asset identifier (e.g. `vm-rpa-p-mem-ap01`, `nas-rpa-p01`)
- `projectGroupId`: Project isolation ID (e.g. `"rpa"`, `"mes"`, `"ai"`, `"data"`)
- `assetType`: `"VM" | "PHYSICAL_SERVER" | "NAS" | "DBAAS" | "CONTAINER" | "K8S_WORKLOAD" | "NETWORK_APPLIANCE" | "OTHER"`
- `hostname`, `ipAddress`, `environment` (`PROD`, `QA`, `DEV`, `STG`), `domain` (`MEMORY`, `FOUNDRY`, `COMMON`, etc.), `system` (`A360`, `PORTAL`, `APM`, `COMMON`)
- `role`, `service`, `zone`, `criticality`, `health` (`HEALTHY`, `WARNING`, `CRITICAL`, `UNKNOWN`)
- Live resource metrics: `cpuPct`, `memoryPct`, `diskPct`
- OS & lifecycle: `osName`, `osVersion`, `eoslDate`, `grafanaPath`

### 2.2. Shared Storage: `NasAsset`
Dedicated model for network-attached storage appliances:
- `protocol`: `"NFS" | "SMB" | "iSCSI" | "MULTI"`
- `capacityTb`, `usedCapacityTb`: Storage capacity tracking
- `mountPath`: Shared path (e.g. `\\rpa-nas01.corp\rpa_share`)
- `targetVms`: Array of client VMs/workloads mounting this storage

### 2.3. Logical Clusters: `ClusterEntity`
Logical grouping for high-availability clusters (e.g. Windows Server Failover Cluster / MSCS MSSQL, Kubernetes ingress):
- `vip`: Virtual IP (e.g. `10.10.30.100`)
- `type`: `"MSCS" | "KUBERNETES" | "ORACLE_RAC" | "OTHER"`
- `members`: Member nodes with roles (`ACTIVE`, `PASSIVE`, `WITNESS`) and status (`ONLINE`, `STANDBY`)
- `services`: Clustered services (e.g. MSSQL Server on port 1433)

### 2.4. Topology Groups: `TopologyGroup`
Logical grouping for architecture canvas rendering:
- `id`: Unique identifier (e.g. `grp-rpa-prod-mem`, `grp-rpa-k8s`)
- `projectGroupId`: Reference to owning project
- `name`: Human-readable label (e.g. `"A360 Memory (PROD)"`)
- `groupType`: `"DOMAIN" | "SYSTEM" | "ENVIRONMENT" | "CLUSTER" | "TIER" | "EXTERNAL"`
- `domain`, `system`, `environment`: Group hierarchy tags
- `assetIds`: Array of member asset identifiers

### 2.5. Architecture Relations: `ArchitectureRelation`
Defines logical and functional dependencies between nodes:
- `id`: Unique relation identifier
- `projectGroupId`: Reference to owning project
- `sourceId`, `targetId`: Asset or group IDs
- `relationType`: `"SERVICE" | "DATABASE" | "STORAGE" | "MONITORING" | "MANAGEMENT"`
- `port`: Optional target communication port
- `protocol`: `"TCP" | "UDP" | "HTTP" | "HTTPS"`
- `description`: Functional summary (e.g. `"AP to DB connection"`)

---

## 3. Four Architecture Canvas View Modes

The toolbar features a 4-segment View Mode switcher:

```
[ Overview ] [ Group ] [ Service ] [ Asset ]
```

### 3.1. Overview Mode
- Single-screen executive layout representing high-level subsystems, domains, and external integrations.
- Nodes represent `TopologyGroup` entities (or external systems) formatted as compact `GroupNode` cards.
- Displays aggregate healthy / warning / critical counters, AP/DB/Storage composition, and cross-group connectivity health.
- Double-clicking any group immediately switches view to that group's internal assets.

### 3.2. Group Mode (`groupBy` Selector)
Dynamic group-level layout grouped by operational dimensions:
- `Domain`: Groups assets by operational domain (e.g. `MEMORY`, `FOUNDRY`, `COMMON`).
- `Environment`: Groups assets by deployment tier (`PROD`, `QA`, `DEV`).
- `System`: Groups assets by software system (`A360`, `PORTAL`, `APM`, `COMMON`).
- `Cluster`: Groups assets by high-availability cluster membership.
- `Runtime`: Groups assets by compute runtime (`VM`, `K8S_WORKLOAD`, `DBAAS`, `NAS`).

### 3.3. Service Mode
- Visualizes logical services (e.g. `Control Room Web`, `Bot Runner Service`, `MSSQL Clustered Engine`, `K8s Ingress Controller`) and inter-service dependencies.
- Edges indicate functional dependency relationships rather than raw hardware connections.

### 3.4. Asset Mode
- Detailed asset topology displaying individual `VmNode`, `NasNode`, and `ClusterNode` elements.
- Can be viewed globally or scoped to a specific parent group selected via drill-down or breadcrumbs.
- Includes 3-metric live resource mini-gauges (CPU, Memory, Disk), IP badges, OS badges, and status rings.

---

## 4. Breadcrumb Navigation Hierarchy

The canvas header features an interactive breadcrumb bar:
```
Project Group  >  System  >  Environment  >  Domain  >  Logical Group  >  Asset
```
- Example: `RPA Portal > A360 > PROD > Memory > A360 Memory (PROD)`
- Clicking any parent segment navigates back to that level without losing pan/zoom state.
- A "Reset View" button returns directly to the top-level Overview canvas.

---

## 5. Relation Types & Edge Filtering

Architecture relations connect nodes based on functional roles. Because dense enterprise environments have high edge density (especially APM monitoring probes), the canvas toolbar provides granular checkboxes:

| Relation Type | Default | Edge Stroke / Styling | Purpose |
|---|---|---|---|
| `SERVICE` | **ON** | Solid `#98a2b3` / Status color | Client-to-Application, Web-to-App, Ingress routing |
| `DATABASE` | **ON** | Solid `#5750f1` / Status color | Application server to database queries |
| `STORAGE` | **ON** | Cyan dashed / Status color | NAS share mounts (NFS/SMB) |
| `MONITORING` | **OFF** | Amber dotted / Status color | APM / Telegraf probe reachability (APM to all targets) |
| `MANAGEMENT` | **ON** | Purple solid / Status color | Active Directory, NTP, DNS, Bastion/Jumpbox access |

By defaulting `MONITORING` to OFF, the default canvas avoids edge crossing mesh clutter while allowing monitoring engineers to toggle probe topology on-demand.

---

## 6. Realistic Enterprise RPA Architecture Layout

The mock topology accurately models a major enterprise Automation Anywhere A360 production architecture:

```
+-----------------------------------------------------------------------------------+
|                              EXTERNAL INTEGRATIONS                                |
|   ERP (SAP) [10.10.100.10]    Groupware [10.10.100.20]    Legacy Core [10.10.100.30]  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                        RPA PORTAL (KUBERNETES WORKLOAD)                           |
|   Portal Web (K8s Pods) [10.10.40.11]  ──▶  Portal DB (DBaaS MySQL) [10.10.40.21]    |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                        A360 PRODUCTION DOMAINS (PROD)                             |
|                                                                                   |
|  [MEMORY DOMAIN]              [FOUNDRY DOMAIN]               [COMMON DOMAIN]      |
|  - AP01/AP02 (A360 CR)        - AP01/AP02 (A360 CR)          - AP01/AP02 (A360 CR)|
|  - DB01/DB02 (MSSQL Cluster)  - DB01/DB02 (MSSQL Cluster)    - DB01/DB02 (Cluster)|
|  - Bot Runners (3 VMs)        - Bot Runners (2 VMs)          - Bot Runners (2 VMs)|
|  (Memory AP02 RAM 91% Alert)  (Foundry DB02 Disk 89% Alert)  (AP01 Expiring D-7)  |
+-----------------------------------------------------------------------------------+
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
+-------------------------------+              +------------------------------------+
|    A360 QA & DEV TIERS        |              |       COMMON INFRASTRUCTURE        |
|  - QA Tier: AP01, DB01        |              |  - APM Monitoring Server           |
|    (Policy Expired, TCP UP)   |              |  - Shared Enterprise NAS           |
|  - DEV Tier: AP01, DB01       |              |  - Active Directory & DNS          |
|    (Policy Approved, TCP DOWN)|              |                                    |
+-------------------------------+              +------------------------------------+
```

---

## 7. Custom Node Rendering & Card Specifications

| Node Kind | Dimensions | Header / Border | Content & Indicators |
|---|---|---|---|
| `GroupNode` | `w: 220px, min-h: 120px` | Neutral border / primary ring on select | Group Type badge, total count, Healthy/Warning/Critical dot pills, AP/DB/NAS breakdown, "Inspect Group" action button |
| `VmNode` | `w: 230px, h: 125px` | Border tinted by health status | Hostname, IP, Role, 3-metric mini-bars (CPU/Mem/Disk), OS badge, EOSL pill |
| `ClusterNode` | `w: 230px, h: 135px` | Purple accent (`border-purple-500/40`) | Cluster VIP, Member count, Active/Passive node status, Port tags |
| `NasNode` | `w: 220px, h: 120px` | Cyan accent (`border-cyan-500/40`) | Protocol badge (`SMB`/`NFS`), Storage progress bar (used/total TB), connected client count |

---

## 8. Probe Flow Animation

The top control bar features a `[ Flow ]` toggle switch:
- **Strict Terminology**: Labeled as **Probe Flow** or **Connectivity Flow** (never "traffic", preserving the principle that probe status represents reachability).
- **Forward Probe UP**: Subtle SVG particle travels from Source to Target along the path (`<animateMotion dur="2.4s" repeatCount="indefinite" />`).
- **Bidirectional UP**: Dual SVG particles travel in opposite directions simultaneously.
- **Probe Failure / DOWN**: Flow line is rendered as a dashed red stroke with no moving particles.

---

## 9. Right SlideDrawer UX

All contextual inspections slide out smoothly from the **right side** (`right-0 top-[52px] bottom-0`, width `460px`) via `SlideDrawer`:
1. `GroupDrawer`: Comprehensive group inspection with 5 dedicated tabs:
   - `Overview`: Group metadata, system, environment, health tally, AP/DB breakdown.
   - `Assets`: Tabular inventory of all member assets with status pills, IP, role, and quick-jump.
   - `Network`: Ingress and egress firewall policies / connections linked to this group.
   - `Software`: Software products, versions, and EOSL dates installed within the group.
   - `SOP`: Standard Operating Procedure runbooks relevant to this group.
2. `VmDrawer`: Tabbed asset inspection (`Overview`, `Network`, `Software`, `SOP`) with click-through to software details.
3. `ConnectionDrawer`: Policy vs. Actual comparison (Forward & Return probes for bidirectional policies).
4. `ClusterDrawer`: VIP, member failover priority, cluster services.
5. `NasDrawer`: Storage allocation gauge, connected client VMs.
6. `SoftwareDetailDrawer`: Catalog matching rules, vendor support dates, installed VM instances.
