/**
 * SIGMA RCS API — Shared handler for ON_DEVELOPMENT endpoints
 * Returns 503 with informative message
 */
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/apiKeyMiddleware";

function devHandler(indicatorName: string, endpoint: string) {
    return async function GET(req: NextRequest) {
        const auth = await validateApiKey(req, endpoint);
        if (!auth.ok) return auth.error!;

        return NextResponse.json(
            {
                success: false,
                error: "Endpoint belum tersedia.",
                code: "ENDPOINT_UNDER_DEVELOPMENT",
                indicator: indicatorName,
                status: "ON_DEVELOPMENT",
                message: `Indikator ${indicatorName} saat ini sedang dalam tahap pengembangan dan standarisasi data. Endpoint ini akan dibuka secara bertahap. Pantau dokumentasi API untuk update terbaru.`,
                estimated_release: "Q2 2025",
                contact: "api-support@dinkes-malangkab.go.id",
            },
            {
                status: 503,
                headers: {
                    "Retry-After": "3600",
                    "X-API-Status": "ON_DEVELOPMENT",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    };
}

export { devHandler };
