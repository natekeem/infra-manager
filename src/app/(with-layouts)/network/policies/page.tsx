import { PageHeader } from "@/components/common/page-header";
import { NetworkTable } from "@/components/network/network-table";
import { getNetworkStatuses } from "@/services/api/infrastructure";
export default async function Page(){const statuses=await getNetworkStatuses();return <><PageHeader title="Policy Registry" description="Approved firewall-opening requests are the declared state (Should Be)."/><NetworkTable statuses={statuses} mode="policy"/></>}
