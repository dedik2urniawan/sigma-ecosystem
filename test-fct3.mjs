import { createClient } from "@supabase/supabase-js";

// SIGMA DB
const sigmaUrl = "https://gmcbjhxvpnbtsnfszuyj.supabase.co";
const sigmaKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtY2JqaHh2cG5idHNuZnN6dXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjYxNTcsImV4cCI6MjA4Njc0MjE1N30.JH-zn5cW-KHl_knknSJgXzXS-_qjO_46zvLVZE_qNk0";
const sigmaSb = createClient(sigmaUrl, sigmaKey);

async function test() {
    let allData = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while(hasMore) {
        console.log(`Fetching from ${from} to ${from + step - 1}`);
        const { data, error } = await sigmaSb.from('fct_tkpi').select('*').order('nama_bahan_mentah').range(from, from + step - 1);
        if (error) {
            console.error("Error:", error.message);
            break;
        }
        if (data && data.length > 0) {
            allData.push(...data);
            if (data.length < step) {
                hasMore = false;
            } else {
                from += step;
            }
        } else {
            hasMore = false;
        }
    }
    console.log("Total Fetched:", allData.length);
    const telur = allData.filter(t => t.nama_bahan_mentah.toLowerCase().includes('telur'));
    console.log("Telur Count:", telur.length);
    console.log("Sample:", telur.slice(0, 7).map(t => t.nama_bahan_mentah));
}

test();
