import { PageHeader } from "@/components/common/page-header";
import { NetworkTable } from "@/components/network/network-table";
import { getNetworkStatuses } from "@/services/api/infrastructure";

export default async function Page() {
  const statuses = await getNetworkStatuses();
  return (
    <>
      <PageHeader
        title="Policy & Connectivity"
        description="Firewall policy is the baseline (Should Be). Source-side Telegraf Ping/TCP probes are joined as the observed state (Actual)."
      />
      <NetworkTable statuses={statuses} />
    </>
  );
}
