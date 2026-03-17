const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSQL() {
  const { data, error } = await supabase.rpc('get_eppgbm_balita_bermasalah', {
    p_periode: 'maret_2025',
    p_puskesmas: 'Semua',
    p_kelurahan: 'Semua',
    p_category: 'F'
  });
  console.log('Error:', JSON.stringify(error, null, 2));
  console.log('Result length:', data?.length);
}

fetchSQL();
