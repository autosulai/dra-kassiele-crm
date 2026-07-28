import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: cliDb, error } = await supabase.from('clientes').select('*').order('criado_em', { ascending: false });
  if (error) {
    console.log('ERRO FETCH:', error);
  } else {
    console.log('CLIENTES:', cliDb.length);
    console.log('ULTIMO CLIENTE:', cliDb[0]);
  }
}
run();
