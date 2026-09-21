import { PageHeader } from "@/components/common/page-header";
import { NetworkTable } from "@/components/network/network-table";
import { getNetworkStatuses } from "@/services/api/infrastructure";
export default async function Page(){const statuses=await getNetworkStatuses();return <><PageHeader title="Connectivity" description="Observed state from source-side Telegraf Ping + TCP probes. TCP is the primary reachability signal."/><NetworkTable statuses={statuses} mode="connectivity"/></>}
