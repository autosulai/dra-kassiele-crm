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
  const { data: leads } = await supabase.from('leads').select('id, nome, cliente_id, telefone');
  const { data: clientes } = await supabase.from('clientes').select('id, nome, telefone');
  
  console.log("Leads sem cliente_id:");
  const leadsOrfaos = leads.filter(l => !l.cliente_id);
  
  for(let l of leadsOrfaos) {
     const c = clientes.find(c => c.nome === l.nome || c.telefone === l.telefone);
     if(c) {
        console.log(`Atualizando lead ${l.nome} com cliente_id ${c.id}`);
        await supabase.from('leads').update({ cliente_id: c.id }).eq('id', l.id);
     } else {
        console.log(`Apagando lead ${l.nome} (sem cliente correspondente e sem id)`);
        await supabase.from('leads').delete().eq('id', l.id);
     }
  }
  console.log("Pronto!");
}
run();
