const url = 'https://jfscummcmmbgkogfvplc.supabase.co/rest/v1/leads?or=(funil_slug.eq.,funil_slug.is.null)';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmc2N1bW1jbW1iZ2tvZ2Z2cGxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQwMDgzOCwiZXhwIjoyMDk5OTc2ODM4fQ.P6BVSkdjNVumSt4bjkSV7qGDE1L3WSU0Xo1axo-PGCE';

fetch(url, {
  method: 'PATCH',
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({ funil_slug: 'INDEFINIDO' })
}).then(res => res.json()).then(data => {
  console.log('Updated leads:', data);
}).catch(console.error);
