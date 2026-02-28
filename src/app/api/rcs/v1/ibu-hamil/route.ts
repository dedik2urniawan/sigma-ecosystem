import { NextRequest, NextResponse } from "next/server";
import { devHandler } from "../_devHandler";
const GET = devHandler("Indikator Ibu Hamil", "/api/rcs/v1/ibu-hamil");
export { GET };
export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "X-API-Key, Content-Type" } });
}
