import { NextRequest, NextResponse } from "next/server";
import { fetchMultiDomainEvidence, EvidenceScopeFilter } from "@/lib/dddm/dddmEvidenceEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = (searchParams.get("level") || "kabupaten") as "kabupaten" | "puskesmas";
    const puskesmas = searchParams.get("puskesmas") || undefined;
    const tahun = searchParams.get("tahun") ? parseInt(searchParams.get("tahun")!) : 2026;

    const scope: EvidenceScopeFilter = {
      level,
      puskesmas,
      tahun,
    };

    const evidenceList = await fetchMultiDomainEvidence(scope);

    return NextResponse.json({
      success: true,
      data: evidenceList,
      meta: {
        total: evidenceList.length,
        scope,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("API /api/dddm/evidence error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch multi-domain evidence" },
      { status: 500 }
    );
  }
}
