import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, api_access_token',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only allow proxying to chatwoot
    if (!targetUrl.includes('chatwoot')) {
       return new Response(JSON.stringify({ error: 'Not allowed domain' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chatwootToken = req.headers.get('api_access_token');

    if (!chatwootToken) {
      return new Response(JSON.stringify({ error: 'Missing api_access_token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'api_access_token': chatwootToken,
        'Content-Type': 'application/json',
      },
      // Only include body if it's not a GET or HEAD request
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });

    const data = await response.text(); // Get raw text to handle any format

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
