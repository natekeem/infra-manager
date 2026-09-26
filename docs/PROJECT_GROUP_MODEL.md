# Multi-Project Group Model Documentation

## 1. Overview & Purpose

The **Project Group** represents the top-level boundary in the Infrastructure Portal. The portal is designed as a generalized infrastructure operations control center supporting multiple independent enterprise systems and project fleets:

- **RPA Platform**: Enterprise Robotic Process Automation (A360, Portal on Kubernetes, APM, Common Function).
- **MES Production**: Manufacturing Execution System and smart factory shop-floor compute.
- **AI Platform**: Large language model inference fleet, GPU training nodes, and model registry.
- **Data Platform**: Enterprise lakehouse analytics, real-time Kafka streaming, and ingestion pipelines.

---

## 2. Optional Hierarchy Model

The system enforces an **optional and flexible hierarchy**. It does **not** force every project to define every layer:

```
[Project Group]
       │
       ▼ (Optional)
   [System]
       │
       ▼ (Optional)
 [Environment]
       │
       ▼ (Optional)
    [Domain]
       │
       ▼ (Optional)
 [Logical Group / Cluster]
       │
       ▼
    [Asset]
```

### Flexibility Examples:
- **Full RPA Platform Hierarchy**:
  `Project Group (RPA)` → `System (A360)` → `Environment (PROD)` → `Domain (MEMORY)` → `Logical Cluster (MSSQL-P-MEM)` → `Asset (RPA-P-MEM-DB01)`
- **Simple Microservice Project Hierarchy**:
  `Project Group (Data Platform)` → `System (Kafka)` → `Asset (DATA-INGEST-01)`
- **Flat Fleet Hierarchy**:
  `Project Group (AI Platform)` → `Asset (AI-GPU-NODE01)`

---

## 3. Data Schema: `ProjectGroup`

```typescript
export interface ProjectGroup {
  id: string;          // e.g. "rpa", "mes", "ai", "data"
  name: string;        // Human-readable title: "RPA Platform"
  code: string;        // Short capital identifier: "RPA"
  description?: string;// Scope and purpose
  owner?: string;      // Operational team: "Automation COE"
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}
```

All primary operational entities reference `projectGroupId: string`:
- `Asset`
- `TopologyGroup`
- `ClusterEntity`
- `ArchitectureRelation`
- `NetworkPolicy`
- `AssetSoftwareInstallation`
- `SopDocument`

---

## 4. Scoping & Multi-Tenancy Behavior

1. **Global Sidebar Switcher**:
   Positioned at the top of the left sidebar, the Project Group selector updates the active project context (`useProjectGroup()`).
2. **Context Propagation**:
   The active project ID is persisted in `localStorage` (`infra-portal:active-project-id`) and instantly filters:
   - Dashboard summary cards and active alerts.
   - Asset inventory table.
   - React Flow architecture canvas.
   - Network policy baseline and Telegraf probe telemetry.
   - Software catalog and installed release matching.
   - Standard Operating Procedures (SOP) runbooks.
3. **No Hardcoded Logic**:
   The portal engines remain strictly generic. New project groups can be registered via `/management/projects` and will immediately render without requiring custom React code or conditional domain strings (`if (domain === "MEMORY")` is strictly prohibited).
