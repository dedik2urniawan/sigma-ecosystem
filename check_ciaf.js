const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSQL() {
  const { data, error } = await supabase.rpc('get_eppgbm_ciaf_comprehensive', {
    p_periode: 'maret_2025',
    p_puskesmas: 'Semua',
    p_kelurahan: 'Semua'
  });
  console.log('Error:', error);
  console.log('Result:', JSON.stringify(data, null, 2));
}

fetchSQL();
