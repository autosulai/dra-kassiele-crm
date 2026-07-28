import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jfscummcmmbgkogfvplc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmc2N1bW1jbW1iZ2tvZ2Z2cGxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQwMDgzOCwiZXhwIjoyMDk5OTc2ODM4fQ.P6BVSkdjNVumSt4bjkSV7qGDE1L3WSU0Xo1axo-PGCE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('eventos_processuais').select(`
    *,
    tipos_evento ( slug, nome, cor, exige_presenca ),
    clientes ( nome, telefone ),
    leads ( nome, telefone ),
    processos ( numero_cnj, protocolo_inss, beneficio )
  `).order('data_hora', { ascending: true });
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data[data.length - 1], null, 2));
}
run();
