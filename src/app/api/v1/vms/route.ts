import { NextResponse } from "next/server";
import { getVmAssets } from "@/services/api/infrastructure";
export async function GET(){return NextResponse.json({data:await getVmAssets()});}
