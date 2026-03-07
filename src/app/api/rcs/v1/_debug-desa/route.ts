/**
 * Temporary debug route — returns first row of data_bultim_desa to inspect actual DB column names
 * REMOVE THIS AFTER FIXING THE BALITA-DESA ROUTE
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
);

export async function GET(_req: NextRequest) {
    const { data, error } = await supabase
        .from("data_bultim_desa")
        .select("*")
        .limit(1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
    return NextResponse.json({ columns, sample: data?.[0] });
}
