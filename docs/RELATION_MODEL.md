# Architecture Relation & Network Truth Model Documentation

## 1. The Strict 3-Way Separation Principle

A foundational architecture rule of the Control Center is the strict separation between:

1. **Architecture Relation**: Logical connectivity intent in application architecture (*"This AP connects to that MSSQL Cluster"*).
2. **Network Policy**: Formally requested and approved firewall rule (*"Port 1433 approved between 10.20.10.11 and 10.20.10.10 until 2027-01-15"*).
3. **Actual Observation**: Ground-truth telemetry collected by Telegraf TCP probes (*"Probe confirms TCP handshake succeeds on port 1433 with 2.4ms RTT"*).

> [!CAUTION]
> Never merge these three entities into a single table or domain object. Architecture relations document dependencies; Network policies document security authorizations; Observations document operational reachability.

---

## 2. Data Schema: `ArchitectureRelation`

```typescript
export type RelationType =
  | "SERVICE"     // Microservice / REST / RPC calls (e.g. Frontend -> Backend)
  | "DATABASE"    // Relational or NoSQL query traffic (e.g. Backend -> DBaaS)
  | "STORAGE"     // NFS / SMB / iSCSI volume mounts (e.g. AP -> NAS)
  | "MONITORING"  // APM / Prometheus / Telegraf metric scraping
  | "MANAGEMENT"  // Orchestration / Administration APIs (e.g. Portal -> A360)
  | "CLUSTER"     // Internal heartbeat / sync between cluster members
  | "EXTERNAL"    // Outbound integration to third-party endpoints
  | "OTHER";

export interface ArchitectureRelation {
  id: string;
  projectGroupId: string;
  sourceEntityType: "ASSET" | "CLUSTER" | "TOPOLOGY_GROUP" | "COMPONENT" | "EXTERNAL";
  sourceEntityId: string;
  targetEntityType: "ASSET" | "CLUSTER" | "TOPOLOGY_GROUP" | "COMPONENT" | "NAS" | "EXTERNAL";
  targetEntityId: string;
  relationType: RelationType;
  protocol?: "TCP" | "UDP" | "HTTP" | "HTTPS" | "NFS" | "SMB" | string;
  port?: number;
  description?: string;
}
```

---

## 3. Relation Layer Filtering & Clean Canvas Control

To prevent visual clutter on the React Flow canvas (especially when dozens of APM agents probe target servers):
- The control toolbar provides selective checkboxes:
  - `[✓] Service`
  - `[✓] Database`
  - `[✓] Storage`
  - `[ ] Monitoring` *(Default OFF so APM probes do not overwhelm the view)*
  - `[✓] Management`
- Toggling the checkboxes immediately adds or removes edge paths without altering node positions.

---

## 4. Join Identity & Status Evaluation

Observed telemetry is joined dynamically to security policies using a 4-tuple key:

$$\text{Key} = \text{sourceVmId} + \text{targetIp} + \text{protocol} + \text{port}$$

### Status Evaluation Hierarchy:
1. `RETURN_DIRECTION_FAILED`: Bidirectional policy where forward TCP probe is UP but return TCP probe is DOWN.
2. `POLICY_VALID_BUT_UNREACHABLE`: Approved policy where TCP probe fails (connectivity failure).
3. `POLICY_EXPIRED_BUT_REACHABLE`: Expired policy where port remains open (firewall policy cleanup needed).
4. `EXPIRING`: Approved policy within 30 days of expiration.
5. `NORMAL`: Approved policy with active TCP probe UP.
