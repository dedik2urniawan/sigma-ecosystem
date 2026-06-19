import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const supabase = await createSupabaseServer();
        const { id: _id, created_at, ...updateData } = body;

        // DEBUG
        console.log("PATCH /api/mbg/supervisi/[id] - updateData:", Object.keys(updateData));

        const { data, error } = await supabase
            .from("mbg_supervisi")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();
            
        if (error) {
            console.error("Supabase update error:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ success: true, data });
    } catch (e: any) { 
        console.error("Server error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 }); 
    }
}

import { createClient } from "@supabase/supabase-js";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        
        // Use service role key to bypass RLS for deletion
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { data, error } = await supabaseAdmin
            .from("mbg_supervisi")
            .delete()
            .eq("id", id)
            .select();
            
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        if (!data || data.length === 0) return NextResponse.json({ error: "Gagal menghapus data" }, { status: 404 });
        
        return NextResponse.json({ success: true, data });
    } catch { 
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 }); 
    }
}