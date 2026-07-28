import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: prazos, error } = await supabase.from('eventos_processuais').select('*').order('criado_em', { ascending: false });
  if (error) {
    console.log('ERRO FETCH:', error);
  } else {
    console.log('PRAZOS:', prazos.length);
    console.log('ULTIMO PRAZO:', prazos[0]);
  }
}
run();
