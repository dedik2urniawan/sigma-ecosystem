const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSQL() {
  const { data, error } = await supabase.rpc('get_eppgbm_ciaf_summary', {
    p_periode: 'maret_2025',
    p_puskesmas: 'Semua',
    p_kecamatan: 'Semua'
  });
  console.log('Result:', data);
}

fetchSQL();
