import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://trislnewxcgaoawopeov.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyaXNsbmV3eGNnYW9hd29wZW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNDM5NzksImV4cCI6MjA3NzcxOTk3OX0.cVSUePXypxQpZOQgsgGzGCogXTC0Zngu-jWwrVnXRUY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: defaultData, error: defaultError } = await supabase.from('fct_tkpi').select('*').order('id');
    console.log("Default fetch row count:", defaultData?.length, "Error:", defaultError?.message);

    const { data: limitData, error: limitError } = await supabase.from('fct_tkpi').select('*').limit(3000).order('id');
    console.log("With limit 3000 row count:", limitData?.length, "Error:", limitError?.message);
    
    // specifically search for 'telur'
    const telur = limitData?.filter(t => t.nama_bahan_mentah.toLowerCase().includes('telur') || t.nama_bahan_mentah.toLowerCase().includes('telur ayam ras'));
    console.log("Found telur items count:", telur?.length);
    console.log("First few telur items:", telur?.slice(0, 5).map(t => t.nama_bahan_mentah));
}

test();
