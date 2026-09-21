import { PageHeader } from "@/components/common/page-header";
import { ArchitectureCanvas } from "@/components/topology/architecture-canvas";
import { getNetworkStatuses, getSoftware, getSops, getVmAssets } from "@/services/api/infrastructure";

export default async function ArchitecturePage(){const [vms,statuses,software,sops]=await Promise.all([getVmAssets(),getNetworkStatuses(),getSoftware(),getSops()]);return <><PageHeader title="Live Architecture" description="Default view is intentionally grouped. Drill into a tier only when VM-level detail is required."/><ArchitectureCanvas vms={vms} statuses={statuses} software={software} sops={sops}/></>}
