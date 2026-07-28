import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jfscummcmmbgkogfvplc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmc2N1bW1jbW1iZ2tvZ2Z2cGxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQwMDgzOCwiZXhwIjoyMDk5OTc2ODM4fQ.P6BVSkdjNVumSt4bjkSV7qGDE1L3WSU0Xo1axo-PGCE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('vw_agenda_prazos').select('*').limit(1);
  console.log('View output keys:', Object.keys(data[0] || {}));
}
run();
