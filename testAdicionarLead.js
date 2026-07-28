import { createClient } from '@supabase/supabase-js';

import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if(line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  const { data: escData } = await supabase.from('escritorio').select('id').limit(1);
  const escritorio_id = escData?.[0]?.id || null;

  const novoLead = {
    nome: "Teste Enviar Funil",
    telefone: "555581643118",
    funil_slug: "BPC_LOAS",
    etapa_slug: "assinatura",
    cliente_id: "7ebb4b6f-1ac8-4ffe-a96e-453621ced21c", // Kassiele ID
    cpf: null,
    status: 'aberto',
    origem: 'Inclusão Manual (Kanban)',
    escritorio_id
  };

  const { data, error } = await supabase.from('leads').insert([novoLead]).select('id').single();
  console.log(data, error);
}
run();
