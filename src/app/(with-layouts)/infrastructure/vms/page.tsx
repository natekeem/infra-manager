import { PageHeader } from "@/components/common/page-header";
import { VmInventory } from "@/components/infrastructure/vm-inventory";
import { getNetworkStatuses, getSoftware, getSops, getVmAssets } from "@/services/api/infrastructure";

export default async function VmPage(){const [vms,network,software,sops]=await Promise.all([getVmAssets(),getNetworkStatuses(),getSoftware(),getSops()]);return <><PageHeader title="Virtual Machines" description="30-node sample inventory. Click any row to inspect it without leaving the table."/><VmInventory vms={vms} network={network} software={software} sops={sops}/></>}
