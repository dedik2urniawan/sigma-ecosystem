const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error } = await supabase
    .from('data_eppgbm')
    .select('usia_saatukur, tgl_lahir, tgl_ukur')
    .limit(10);
  
  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('Sample data:', data);
  }
}

checkData();
