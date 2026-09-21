# 3-Tier Software Lifecycle & Catalog Model Documentation

## 1. Architectural Philosophy

In enterprise RPA environments, running outdated or unpatched software across worker bots, orchestrator web nodes, and database servers poses severe security and operational risks.
The RPA Infrastructure Control Center implements a **3-tier software lifecycle catalog model** that decouples generic products, specific releases with vendor support end dates, and individual asset installations.

---

## 2. The 3-Tier Data Model

### Tier 1: Software Product (`SoftwareProduct`)
Represents the software item independent of version:
- `id`: Unique product ID (e.g. `sp-uipath-robot`, `sp-mssql`)
- `name`: Display name (e.g. `"UiPath Robot"`, `"CrowdStrike Sensor"`)
- `vendor`: Software publisher (e.g. `"UiPath"`, `"Microsoft"`, `"CrowdStrike"`)
- `category`: Classification (e.g. `"RPA"`, `"Database"`, `"Security"`, `"OS"`)

### Tier 2: Software Release (`SoftwareRelease`)
Represents a vendor version with certified lifecycle milestones:
- `id`: Release ID (e.g. `sr-uipath-2023-10`)
- `productId`: Reference to parent `SoftwareProduct`
- `version`: Version string (e.g. `"2023.10"`)
- `releaseDate`, `supportEndDate`: Vendor commercial support milestones
- `eoslDate`: Vendor End of Support / Life date (`YYYY-MM-DD` or `null`)
- `status`: Lifecycle milestone (`"SUPPORTED" | "D180" | "D90" | "D30" | "EOSL"`)
- `versionMatchRule`: `"exact" | "prefix" | "regex" | "range"`
- `matchPattern`: Pattern used to match detected installations (e.g. `"2023.10.*"`)

### Tier 3: Asset Software Installation (`AssetSoftwareInstallation`)
Represents an instance of software discovered on an asset:
- `assetId`: Target VM or server ID
- `detectedVersion`: Raw version string reported by discovery agent/scanner
- `matchedReleaseId`: Link to certified `SoftwareRelease` if match succeeds
- `lifecycleStatus`: `"SUPPORTED" | "D180" | "D90" | "D30" | "EOSL" | "UNMAPPED"`

---

## 3. Version Matching Engine & Non-Guessing Principle

The `matchVersionRule(detected, release)` function evaluates whether an asset's installed version belongs to a catalog release:
1. **`exact`**: Strict string equality (`detected === release.version`).
2. **`prefix`**: Detected string begins with pattern prefix (e.g. pattern `2023.10` matches `2023.10.4`).
3. **`regex`**: Regular expression test.
4. **`range`**: Semantic or numeric range parsing.

### Strict Non-Guessing Policy
If a detected software installation does not match any certified release in the catalog:
- Its status is **strictly set to `UNMAPPED`**.
- It is **never** assumed to be `SUPPORTED` or given a guessed EOSL date.
- It appears in the **Unmapped / Catalog Review** bucket on the Lifecycle Matrix so operations engineers can review and register missing versions.

---

## 4. UI Surfaces & Views

The `/infrastructure/software` page provides 3 operational tabs:
1. **By Asset**: Searchable, dense inventory linking hostnames, IP addresses, software names, detected versions, and lifecycle status badges.
2. **Software Catalog**: Catalog of approved releases, vendor support dates, matching rules, and the count of VMs running each release.
3. **Lifecycle Matrix**: Triaged risk breakdown:
   - **Immediate Risk**: `EOSL` (expired) and `D-30` (expires within 30 days).
   - **Upcoming Expiry**: `D-90` and `D-180`.
   - **Catalog Review**: `UNMAPPED` software instances requiring rule registration.

Clicking any asset or catalog row slides out `SoftwareDetailDrawer` from the right with detailed match rules, dates, and connected asset lists.
