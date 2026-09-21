# Infrastructure Management Subsystem Documentation

## 1. Architectural Principles

The Management subsystem allows operators to register, update, and audit infrastructure assets, firewall policies, software catalog rules, and operational runbooks directly through the admin console.
Key principles:
1. **Decoupled Repository Pattern**:
   - UI views interact strictly with the `ManagementRepository` interface.
   - Operations are currently backed by `MockManagementRepository` in memory, allowing complete UI and validation verification without live MySQL or InfluxDB connections.
   - Switching to MySQL persistence requires implementing the same interface without modifying component code or props.
2. **Compact Admin Console Design**:
   - Strictly preserves NextAdmin v2 compact styling (dense tables, 10~11px fonts, 32~36px row heights, subtle borders, no large SaaS KPI gradients).
   - In-page modal forms enable quick record creation and editing without disrupting the operator's workflow.
3. **Data Provenance**:

---

## 2. Management Routes & Capabilities

### 2.1. `/management/assets` — Asset Registry
- **Entity Types**: Virtual Machines (`VM`), Shared Storage (`NAS`), Physical Servers (`PHYSICAL_SERVER`).
- **Capabilities**:
  - Filter by asset type and search across hostname, IP, service, role, and owner.
  - Register new asset with tier/zone assignment, criticality classification (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), and CMDB provenance reference.
  - Edit or decommission (delete) existing asset records.

### 2.2. `/management/software` — Software Catalog Management
- **Capabilities**:
  - Maintain certified software catalog releases under products.
  - Configure version matching algorithms: `exact`, `prefix`, `regex`, or `range`.
  - Set vendor support end dates and certified End of Support / Life (`eoslDate`).
  - Automatically calculates real-time asset installation match counts.

### 2.3. `/management/policies` — Network Policy Management
- **Capabilities**:
  - Manage approved firewall opening requests (`SHOULD BE`).
  - Configure directional intent:
    - `ONE_WAY`: Unidirectional Source → Target flow.
    - `BIDIRECTIONAL`: Two-way Source ⇄ Target communication.
  - Set approval status (`APPROVED`, `PENDING`, `REJECTED`), expiration dates, port, protocol, and request ticket IDs.

### 2.4. `/management/topology` — Topology & Service Mapping
- **Capabilities**:
  - Define functional services (e.g. `RPA-CORE`, `OCR-SERVICE`, `DB-MSSQL`, `VDI-FARMS`).
  - Map services to primary architectural tiers (WEB, APP, DB, CONTROL, BOT, VDI, SUPPORT).
  - Declare upstream and external dependencies (e.g. `ERP-GATEWAY`, `TAX-INVOICING-API`, `SAN-STORAGE`).

### 2.5. `/management/sops` — SOP Registry
- **Capabilities**:
  - Register operational standard procedures and emergency recovery runbooks.
  - Categorize by operational domain (`RECOVERY`, `MAINTENANCE`, `NETWORK`, `SECURITY`, `MONITORING`).
  - Link procedures directly to relevant VM asset IDs, enabling immediate access inside `VmDrawer` during incident triage.

### 2.6. `/management/import` — Batch Data Ingestion
- **Capabilities**:
  - Paste normalized JSON datasets matching enterprise export formats.
  - **Validate & Dry Run**: Validates schema syntax, mandatory keys (hostname, IP, port), and reports discrepancies before ingestion.
  - **Execute Batch Import**: Ingests assets, policies, releases, and SOPs into the repository with an instant audit report.
