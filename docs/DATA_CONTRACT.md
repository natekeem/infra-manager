# Data Contract

The application deliberately separates **declared state** from **observed state**.

## MySQL: declared state

MySQL stores VM assets, software inventory/EOSL, approved network-opening policies, service dependencies and SOP mapping. Source provenance is retained via `source_ref` and `import_batch`.

## InfluxDB: observed state

InfluxDB stores Telegraf time series:

- source-side ping result/latency
- source-side TCP reachability/latency to the approved target port
- CPU / memory / disk / network metrics already collected by the existing Telegraf estate

## Join key

Preferred join key for network observations: `policy_id` as a Telegraf tag. If that is impossible, map a composite key:

`source_vm_id + target_ip + protocol + port`

Do not join only by target IP because one target may expose several required ports.

## Freshness

UI should show the most recent probe timestamp. A future implementation should classify stale observations separately; do not treat a missing/stale probe as DOWN.

## Standard resource adapter

When `DATA_SOURCE=mysql`, the app also attempts to enrich VM rows from standard Telegraf measurements in InfluxDB:

- `cpu / usage_idle / cpu=cpu-total` → CPU usage
- `mem / used_percent` → memory usage
- `disk / used_percent` → highest filesystem utilization
- `host` tag → VM hostname join

Override measurement/tag names through `.env` if the internal schema differs. The UI contract does not change.
