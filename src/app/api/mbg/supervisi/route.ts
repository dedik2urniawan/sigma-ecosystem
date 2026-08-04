import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const supabase = await createSupabaseServer();

        const { data, error } = await supabase
            .from('mbg_supervisi')
            .insert([payload])
            .select();

        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        console.error('API Route Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const role = searchParams.get('role');
        const puskesmas = searchParams.get('puskesmas');
        
        const supabase = await createSupabaseServer();

        let query = supabase
            .from('mbg_supervisi')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (role === 'admin_puskesmas' && puskesmas) {
            // Use exact match (ilike without wildcards) to prevent
            // e.g. "Lawang" from matching "Bululawang"
            query = query.ilike('puskesmas', puskesmas);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        console.error('API Route Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
