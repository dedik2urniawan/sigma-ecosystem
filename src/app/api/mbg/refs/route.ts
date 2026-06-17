import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const { data: pData, error: pError } = await supabaseAdmin
            .from("ref_puskesmas")
            .select("id, nama")
            .order("nama");

        if (pError) throw pError;

        const { data: dData, error: dError } = await supabaseAdmin
            .from("ref_desa")
            .select("id, desa_kel, puskesmas, puskesmas_id")
            .order("desa_kel");

        if (dError) throw dError;

        return NextResponse.json({
            success: true,
            data: {
                puskesmas: pData,
                desa: dData
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
