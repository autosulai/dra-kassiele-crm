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
  const { data, error } = await supabase.from('leads').select('id, nome, cliente_id, criado_em, status').order('criado_em', { ascending: false }).limit(5);
  console.log("Últimos Leads:");
  console.log(data);
}
run();
