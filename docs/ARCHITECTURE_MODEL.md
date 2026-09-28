# Architecture Topology & Entity Model Documentation

## 1. Overview & Generalized Architecture Engine

The RPA Infrastructure Control Center architecture canvas visualizes multi-project enterprise deployments without initial visual clutter.
In accordance with `AGENTS.md` and the multi-project generalization:
- **Default Grouped View**: Never renders all 30+ VM nodes on first load. The default view aggregates infrastructure into high-level topology groups, domains, and systems with aggregate health indicators.
- **Inline Expansion Flow**: `Project → System → Environment → Domain/Runtime → Asset`. `expandedGroupIds` controls independent `+ / −` expansion while every top-level system remains on the same canvas.
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

## 3. Architecture Canvas View Modes

The current toolbar intentionally exposes two operator-facing modes:

```
[ 전체 구성 ] [ Dependency ]
```

### 3.1. 전체 구성
- Grouped relationship-first layout representing systems, environments, domains, runtimes and leaf assets.
- Nodes represent `TopologyGroup` entities (or external systems) formatted as compact `GroupNode` cards.
- Displays aggregate healthy / warning / critical counters, AP/DB/Storage composition, and cross-group connectivity health.
- A group becomes a real React Flow parent container when expanded; its children use `parentId`, `extent="parent"`, and relative coordinates.
- Multiple groups may be expanded together. Double-click and `+ / −` perform the same inline toggle; there is no scope navigation or Back control.

### 3.2. Dependency
- Searchable targets include assets, groups, clusters, NAS, DBaaS and external endpoints.
- Dependency reuses the complete topology and current positions. Cycle-safe traversal produces highlight metadata rather than an isolated node subset.
- Operators choose only a target and connection range. Direction is explained by `영향 대상` and `필요 자원` styling.
- Dependency does not run a separate layout; the selected target and both traversal directions are styled on the shared full-topology coordinates.
- A calculated blast-radius summary and the right context drawer combine related SOP, software/EOSL and policy/actual evidence without merging their source models.

Both views share 20px-snapped manual corrections and project-level persistence. Only explicit structure triggers and Auto Layout recalculate node positions.

---

## 4. Inline Expansion Hierarchy

The canvas always retains every root system. A group card toggles between its compact summary and a compound parent container through `+ / −` or double-click. Each expanded container may expose child groups, or leaf assets when no child group exists. Multiple branches stay open together; `Collapse all` returns to the grouped first view and `Expand one level` expands only the currently visible group tier.

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

## 6. Realistic Enterprise RPA Architecture Dataset

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
