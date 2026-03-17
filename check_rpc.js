const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error } = await supabase.rpc("get_eppgbm_distribusi_demografi", {
      p_periode: "maret_2025",
      p_puskesmas: "Semua",
      p_kelurahan: "Semua",
  });
  
  if (error) {
    console.error('Error fetching RPC data:', error);
  } else {
    console.log('RPC result:', data);
  }
}

checkData();
