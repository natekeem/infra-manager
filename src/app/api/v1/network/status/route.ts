import { NextResponse } from "next/server";
import { getNetworkStatuses } from "@/services/api/infrastructure";
export async function GET(){return NextResponse.json({data:await getNetworkStatuses(),generatedAt:new Date().toISOString()});}
