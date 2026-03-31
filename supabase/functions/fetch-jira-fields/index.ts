import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { domain, email, apiToken, projectKey } = await req.json();

    if (!domain || !email || !apiToken || !projectKey) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const auth = btoa(`${email}:${apiToken}`);
    const resp = await fetch(
      `https://${domain}/rest/api/3/issue/createmeta/${projectKey}/issuetypes`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!resp.ok) {
      const errorText = await resp.text();
      return new Response(JSON.stringify({ error: 'Failed to fetch Jira fields', detail: errorText }), {
        status: resp.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const fields = data.values?.flatMap((it: any) =>
      Object.entries(it.fields || {}).map(([key, meta]: [string, any]) => ({
        id: key,
        name: meta.name,
        required: meta.required,
        type: meta.schema?.type,
        custom: key.startsWith('customfield_'),
      }))
    ) || [];

    // Deduplicate by field id
    const unique = [...new Map(fields.map((f: any) => [f.id, f])).values()];

    return new Response(JSON.stringify({ fields: unique }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
