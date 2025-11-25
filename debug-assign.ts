
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; // From supabase status

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Calling auto-assign-buoy...');
  
  const { data, error } = await supabase.functions.invoke('auto-assign-buoy', {
    body: { res_date: '2025-11-25', time_period: 'AM' }
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', JSON.stringify(data, null, 2));
  }
}

main();
