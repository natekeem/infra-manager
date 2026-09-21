import { NextResponse } from "next/server";
import { getNetworkStatuses, getVmAssets } from "@/services/api/infrastructure";
export async function GET(){const [vms,network]=await Promise.all([getVmAssets(),getNetworkStatuses()]);return NextResponse.json({data:{vmTotal:vms.length,vmAttention:vms.filter(v=>v.health!=="healthy").length,networkTotal:network.length,tcpFailed:network.filter(n=>n.observation?.tcp==="DOWN").length,expiring:network.filter(n=>n.overall==="EXPIRING").length},generatedAt:new Date().toISOString()});}
