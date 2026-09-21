# Telegraf Probe Design

Use existing Telegraf agents. No new inbound port is required on VMs for this portal.

For each **approved and required** source → target policy:

1. Source VM performs Ping to target IP (diagnostic only).
2. Source VM performs TCP connect to target IP:port (primary actual-connectivity signal).
3. Telegraf writes results into the existing InfluxDB path.
4. Portal reads InfluxDB and compares the latest result to the declared policy in MySQL.

Do not scan every VM against every port. Generate probes only for connections that are expected/approved to exist.

`npm run generate:telegraf -- samples/normalized-import.example.json` generates one `.conf` per source VM. Review plugin syntax against the exact Telegraf version deployed internally before mass deployment.
