import "server-only";

/**
 * Minimal InfluxDB 2.x Flux HTTP adapter.
 * The actual measurement/tag names are intentionally configured at the company
 * because they are environment-specific. Until then the UI consumes mock data.
 */
export async function queryFlux(flux: string): Promise<string> {
  const url = process.env.INFLUX_URL;
  const token = process.env.INFLUX_TOKEN;
  const org = process.env.INFLUX_ORG;
  if (!url || !token || !org) throw new Error("InfluxDB environment variables are not configured");
  const response = await fetch(`${url.replace(/\/$/, "")}/api/v2/query?org=${encodeURIComponent(org)}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/vnd.flux",
      Accept: "application/csv",
    },
    body: flux,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`InfluxDB query failed: ${response.status}`);
  return response.text();
}

export function connectivityQuery(minutes = 10) {
  const bucket = process.env.INFLUX_BUCKET;
  const measurement = process.env.INFLUX_CONNECTIVITY_MEASUREMENT ?? "network_probe";
  if (!bucket) throw new Error("INFLUX_BUCKET is not configured");
  return `from(bucket: "${bucket}")
  |> range(start: -${minutes}m)
  |> filter(fn: (r) => r._measurement == "${measurement}")
  |> last()`;
}
