import { PageHeader } from "@/components/common/page-header";
import { VmInventory } from "@/components/infrastructure/vm-inventory";
import { getNetworkStatuses, getSoftware, getSops, getVmAssets } from "@/services/api/infrastructure";

export default async function VmPage(){const [vms,network,software,sops]=await Promise.all([getVmAssets(),getNetworkStatuses(),getSoftware(),getSops()]);return <><PageHeader title="가상 머신 목록" description="VM 인벤토리 목록입니다. 행을 클릭하면 상세 정보를 확인할 수 있습니다."/><VmInventory vms={vms} network={network} software={software} sops={sops}/></>}
