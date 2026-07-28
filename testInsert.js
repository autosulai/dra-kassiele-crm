import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const payload = {
    nome: 'Teste de Inserção',
    telefone: '5599999999',
    email: 'teste@email.com',
    doc_cpf_cnpj: '00000000000',
    area: 'Previdenciário',
    tipo: 'PF',
    origem: 'Manual',
    status: 'ativo'
  };

  const { data, error } = await supabase.from('clientes').insert([payload]).select();
  if (error) {
    console.log('ERRO DO SUPABASE:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCESSO:', data);
  }
}
run();
