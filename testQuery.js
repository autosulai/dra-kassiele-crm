import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_KEY';

// Eu vou usar o .env manualmente
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if(line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('vw_kanban_funil').select('*').limit(5);
  console.log("LEADS:");
  console.log(JSON.stringify(data, null, 2));
}
run();
