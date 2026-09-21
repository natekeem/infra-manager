# Network Truth Model & Bidirectional Policy Specification

## 1. Network Truth Model Principles

The network status model has exactly two primary dimensions:
1. **Declared / Approved Policy (SHOULD BE)**:
   - Stored in MySQL or normalized import sources.
   - Represents security-approved firewall openings, ports, protocol, request IDs, and expiration dates.
   - Supports directionality: `ONE_WAY` (Source → Target) or `BIDIRECTIONAL` (Source ⇄ Target).
2. **Observed Probes (ACTUAL)**:
   - Source-side Telegraf TCP and ICMP Ping probes collected via InfluxDB.
   - For bidirectional flows, probes run in both directions:
     - Forward Probe: `A → B` (TCP port + ICMP Ping)
     - Return Probe: `B → A` (TCP port + ICMP Ping)
3. **Diagnostic Role of Ping**:
   - ICMP Ping provides diagnostic context only.
   - Ping UP + TCP DOWN indicates that the host operating system is reachable, but the firewall policy or target application service is not responding.
   - TCP probe failures are classified as **connectivity failure**, not automatically assumed to be "firewall blocked".

---

## 2. Status Evaluation States & Severity Matrix

The `evaluateNetworkStatus` domain function evaluates combinations of approval, expiration, forward TCP, and return TCP:

| State Key | Label | Severity Rank | Diagnosis Summary |
|---|---|---|---|
| `POLICY_EXPIRED_AND_UNREACHABLE` | POLICY EXPIRED / TCP DOWN | 0 (Critical) | Policy expired and probe failed. Missing renewal or decommission required. |
| `POLICY_VALID_BUT_UNREACHABLE` | POLICY VALID / TCP DOWN | 1 (Critical) | Policy is active but TCP failed. Check firewall or target service. |
| `RETURN_DIRECTION_FAILED` | RETURN FAILED | 2 (Critical) | Forward TCP succeeded, but return probe failed on bidirectional policy. |
| `POLICY_NOT_APPROVED_BUT_REACHABLE` | POLICY PENDING / TCP UP | 3 (Warning) | Port reachable without approved security ticket (compliance breach). |
| `POLICY_EXPIRED_BUT_REACHABLE` | POLICY EXPIRED / TCP UP | 4 (Warning) | Policy expired but port remains open on firewall. Revocation required. |
| `UNREACHABLE` | UNREACHABLE | 5 (Warning) | TCP probe failed with unapproved policy. |
| `EXPIRING` | EXPIRING (D-30) | 6 (Attention) | TCP is healthy, but policy expires within 30 days. Renewal ticket required. |
| `UNKNOWN` | UNKNOWN | 7 (Neutral) | Insufficient telemetry or policy metadata. Never guess values. |
| `NORMAL` | NORMAL | 8 (Healthy) | Policy is approved and active; all forward (and return) probes are UP. |

---

## 3. Bidirectional Flow Handling

Enterprise applications often declare two-way communication (e.g. database client connection with asynchronous callback, clustered heartbeat, or domain authentication):
- In `NetworkPolicy`, `direction` is set to `"BIDIRECTIONAL"`.
- The evaluation engine checks:
  1. `observation.tcp === "UP"` (Forward `A → B` reachability)
  2. `observation.reverseTcp === "UP"` (Return `B → A` reachability)
- If `tcp === "UP"` but `reverseTcp === "DOWN"`, the state is flagged as **`RETURN_DIRECTION_FAILED`**.
- Diagnosis message:
  `"Return direction failed (출발→대상 연결은 성공했으나 대상→출발 회신 방향 TCP 연결 실패. 방화벽 회신 정책 확인 필요)"`
- In `ConnectionDrawer`, two distinct cards are rendered side-by-side:
  - **Forward: Source → Target** (Ping, Ping RTT, TCP, TCP RTT)
  - **Return: Target → Source** (Ping, TCP, TCP RTT)

---

## 4. Telegraf InfluxDB Tag Schema

```influx
# Forward measurement
net_response,source_host=RPA-APP03,target_host=RPA-DB01,port=1433,direction=forward result_code=0,response_time_ms=2.1

# Return measurement (from target side)
net_response,source_host=RPA-DB01,target_host=RPA-APP03,port=1433,direction=return result_code=1,response_time_ms=0
```
Missing observations are marked as `NO_DATA` rather than assumed healthy or blocked.
