const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error } = await supabase
    .from('data_eppgbm')
    .select('usia_saatukur')
    .limit(100);
  
  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('Sample data (first 50):', data.slice(0, 50));
    
    // Check for any weird formats
    const weirdFormats = data.filter(d => isNaN(Number(d.usia_saatukur)));
    console.log('Rows that are NOT numbers:', weirdFormats);
  }
}

checkData();
