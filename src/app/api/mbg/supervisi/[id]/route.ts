import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const supabase = await createSupabaseServer();
        const { id: _id, created_at, ...updateData } = body;
        const { data, error } = await supabase
            .from("mbg_supervisi")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true, data });
    } catch { return NextResponse.json({ error: "Internal Server Error" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseServer();
        const { error } = await supabase.from("mbg_supervisi").delete().eq("id", id);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
    } catch { return NextResponse.json({ error: "Internal Server Error" }, { status: 500 }); }
}