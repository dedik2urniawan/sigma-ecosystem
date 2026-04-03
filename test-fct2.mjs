import { createClient } from "@supabase/supabase-js";

// PKMK DB
const pkmkUrl = "https://trislnewxcgaoawopeov.supabase.co";
const pkmkKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyaXNsbmV3eGNnYW9hd29wZW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNDM5NzksImV4cCI6MjA3NzcxOTk3OX0.cVSUePXypxQpZOQgsgGzGCogXTC0Zngu-jWwrVnXRUY";
const pkmkSb = createClient(pkmkUrl, pkmkKey);

// SIGMA DB
const sigmaUrl = "https://gmcbjhxvpnbtsnfszuyj.supabase.co";
const sigmaKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtY2JqaHh2cG5idHNuZnN6dXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjYxNTcsImV4cCI6MjA4Njc0MjE1N30.JH-zn5cW-KHl_knknSJgXzXS-_qjO_46zvLVZE_qNk0";
const sigmaSb = createClient(sigmaUrl, sigmaKey);

async function test() {
    console.log("Testing PKMK DB...");
    const res1 = await pkmkSb.from('fct_tkpi').select('*').limit(10);
    console.log("PKMK:", res1.data?.length, res1.error?.message);

    console.log("Testing SIGMA DB...");
    const res2 = await sigmaSb.from('fct_tkpi').select('*').limit(3000);
    console.log("SIGMA:", res2.data?.length, res2.error?.message);

    if (res2.data) {
        const telur = res2.data.filter(t => t.nama_bahan_mentah.toLowerCase().includes('telur'));
        console.log("SIGMA Telur Count:", telur.length);
        console.log("Sample:", telur.slice(0, 5).map(t => t.nama_bahan_mentah));
    }
}

test();
