# Topology Group Model Documentation

## 1. Overview & Generalization

In earlier versions, infrastructure was rigidly aggregated by static network tiers (`WEB`, `APP`, `DB`, `CONTROL`, `BOT`, `VDI`, `SUPPORT`). 

The modernized portal generalises this concept into **Topology Groups**, allowing recursive parent-child grouping based on business domain, physical environment, logical system, application stack, or runtime container platform.

---

## 2. Group Types & Semantics

```typescript
export type TopologyGroupType =
  | "SYSTEM"          // Logical system boundary (e.g. A360 Platform, RPA Portal, APM)
  | "DOMAIN"          // Business domain (e.g. MEMORY, FOUNDRY, COMMON)
  | "ENVIRONMENT"     // Deployment tier (e.g. PROD, QA, DEV)
  | "STACK"           // Technical stack (e.g. LAMP, Spring-Microservices)
  | "CLUSTER"         // Logical cluster container (e.g. MSCS Failover, Kubernetes Namespace)
  | "RUNTIME"         // Container or serverless runtime pool (e.g. Frontend Pod Pool)
  | "SERVICE_GROUP"   // Functional grouping of collaborating services
  | "CUSTOM";         // Ad-hoc user-defined grouping
```

---

## 3. Data Schema: `TopologyGroup`

```typescript
export interface TopologyGroup {
  id: string;              // e.g. "tg-a360-prod-mem"
  projectGroupId: string;  // e.g. "rpa"
  parentGroupId?: string | null; // Self-referential tree structure
  name: string;            // "MEMORY PROD"
  groupType: TopologyGroupType;
  environment?: string;    // "PROD" | "QA" | "DEV"
  domain?: string;         // "MEMORY"
  system?: string;         // "A360"
  description?: string;
  assetIds?: string[];     // Optional direct asset membership mapping
}
```

---

## 4. Group Card Rendering & Metrics

In the React Flow canvas, group cards (`GroupNode`) render compact aggregated metrics:
- **Title & Sublabel**: Group name + deployment context tags.
- **Asset Composition Chips**:
  - `AP`: Number of Application Servers.
  - `DB`: Number of Database Nodes.
  - `NAS`: Number of Shared Storage appliances.
  - `K8s`: Number of containerized workload replicas.
- **Health Indicators**: Count of Healthy, Warning, and Critical nodes.
- **Connection Counts**: Active incoming and outgoing logical flows.

---

## 5. Interaction Patterns

1. **Single-Click**:
   Slides open the **`GroupDrawer`** from the right edge (`width: 460px`):
   - **Overview**: Metadata, asset counts, network summary.
   - **Assets**: Detailed inventory of assets with direct click-through to `VmDrawer`.
   - **Network**: Evaluated firewall policies vs. TCP observations.
   - **Software**: Catalog matching and EOSL statuses.
   - **SOP**: Runbooks tagged to assets in this group.
2. **Double-Click**:
   Switches the canvas view to **Asset View**, focusing directly on the assets of the selected group and updating the top Breadcrumb trail.
