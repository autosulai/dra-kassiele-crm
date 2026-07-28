import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const payload = {
      tipo_id: null,
      cliente_id: '61408579-7566-4bb8-a9c8-59e19c56aa47',
      lead_id: null,
      processo_id: null,
      advogado_id: null,
      titulo: 'Prazo Teste',
      duracao_min: 60,
      data_hora: new Date().toISOString(),
      local_tipo: 'Agência INSS',
      local_detalhe: null,
      obs: null
    };

  const { data, error } = await supabase.from('eventos_processuais').insert([payload]).select();
  if (error) {
    console.log('ERRO PRAZO:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCESSO PRAZO:', data);
  }
}
run();
