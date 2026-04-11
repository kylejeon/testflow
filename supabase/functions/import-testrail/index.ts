/**
 * import-testrail Edge Function
 *
 * Proxies TestRail API calls server-side to avoid CORS issues.
 *
 * POST /functions/v1/import-testrail
 * Body:
 *   { action: 'connect',      credentials: { url, email, apiKey } }
 *   { action: 'get_sections', credentials: { url, email, apiKey }, project_id: number }
 *   { action: 'get_cases',    credentials: { url, email, apiKey }, project_id: number }
 *
 * Returns:
 *   connect:      { projects: TRProject[] }
 *   get_sections: { sections: TRSection[] }
 *   get_cases:    { cases: TRCase[] }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function trBase(url: string): string {
  let u = url.trim();
  if (u && !u.startsWith('http')) u = `https://${u}`;
  return u.replace(/\/$/, '');
}

function trAuth(email: string, apiKey: string): string {
  return `Basic ${btoa(`${email}:${apiKey}`)}`;
}

async function trGet(baseUrl: string, auth: string, path: string): Promise<Response> {
  return fetch(`${baseUrl}/index.php?/api/v2/${path}`, {
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
  });
}

/** Fetch all pages of a paginated TestRail endpoint. */
async function fetchAllPages<T>(
  baseUrl: string,
  auth: string,
  path: string,
  key: string,
): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  const limit = 250;

  while (true) {
    const sep = path.includes('?') ? '&' : '&';
    const resp = await trGet(baseUrl, auth, `${path}&limit=${limit}&offset=${offset}`);
    if (!resp.ok) {
      throw new Error(`TestRail API error: ${resp.status} on ${path}`);
    }
    const data = await resp.json();
    const items: T[] = data[key] ?? data ?? [];
    results.push(...items);

    // TestRail pagination: _links.next is null when done
    if (!data._links?.next || items.length < limit) break;
    offset += limit;
  }

  return results;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleConnect(credentials: { url: string; email: string; apiKey: string }) {
  const base = trBase(credentials.url);
  const auth = trAuth(credentials.email, credentials.apiKey);

  // Validate credentials
  const meResp = await trGet(base, auth, 'get_current_user');
  if (meResp.status === 401) {
    return json({ error: 'Invalid credentials. Please check your email and API key.' }, 401);
  }
  if (meResp.status === 404 || meResp.status === 0) {
    return json({ error: 'TestRail instance not found. Please verify the URL.' }, 404);
  }
  if (!meResp.ok) {
    return json({ error: `Could not connect to TestRail (HTTP ${meResp.status}).` }, 502);
  }

  // Fetch projects
  const projResp = await trGet(base, auth, 'get_projects');
  if (!projResp.ok) {
    return json({ error: `Failed to fetch projects (HTTP ${projResp.status}).` }, 502);
  }
  const projData = await projResp.json();
  const raw: any[] = projData.projects ?? projData ?? [];

  const projects = raw.map((p: any) => ({
    id: p.id as number,
    name: p.name as string,
    announcement: (p.announcement as string | null) ?? null,
  }));

  return json({ projects });
}

async function handleGetSections(
  credentials: { url: string; email: string; apiKey: string },
  projectId: number,
) {
  const base = trBase(credentials.url);
  const auth = trAuth(credentials.email, credentials.apiKey);

  const sections = await fetchAllPages<any>(
    base,
    auth,
    `get_sections/${projectId}?`,
    'sections',
  );

  return json({
    sections: sections.map((s: any) => ({
      id: s.id as number,
      name: s.name as string,
      parent_id: (s.parent_id as number | null) ?? null,
      depth: (s.depth as number) ?? 0,
    })),
  });
}

async function handleGetCases(
  credentials: { url: string; email: string; apiKey: string },
  projectId: number,
) {
  const base = trBase(credentials.url);
  const auth = trAuth(credentials.email, credentials.apiKey);

  const cases = await fetchAllPages<any>(
    base,
    auth,
    `get_cases/${projectId}?`,
    'cases',
  );

  const priorityMap: Record<number, string> = {
    1: 'low',
    2: 'medium',
    3: 'high',
    4: 'critical',
  };

  return json({
    cases: cases.map((c: any) => ({
      id: c.id as number,
      section_id: (c.section_id as number | null) ?? null,
      title: (c.title as string) || 'Untitled',
      priority_id: (c.priority_id as number) ?? 2,
      priority: priorityMap[c.priority_id as number] ?? 'medium',
      type_id: (c.type_id as number | null) ?? null,
      // Custom fields — TestRail stores these as custom_*
      preconditions: stripHtml(c.custom_preconds ?? c.custom_preconditions ?? ''),
      steps: stripHtml(c.custom_steps ?? c.custom_steps_separated ?? ''),
      expected_result: stripHtml(c.custom_expected ?? ''),
      estimate: (c.estimate as string | null) ?? null,
      is_automated: (c.custom_automation_type as number) === 1,
    })),
  });
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return String(html)
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: { action: string; credentials: any; project_id?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { action, credentials, project_id } = body;

  if (!credentials?.url || !credentials?.email || !credentials?.apiKey) {
    return json({ error: 'Missing credentials (url, email, apiKey required)' }, 400);
  }

  try {
    switch (action) {
      case 'connect':
        return await handleConnect(credentials);

      case 'get_sections':
        if (!project_id) return json({ error: 'project_id required' }, 400);
        return await handleGetSections(credentials, project_id);

      case 'get_cases':
        if (!project_id) return json({ error: 'project_id required' }, 400);
        return await handleGetCases(credentials, project_id);

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error('[import-testrail]', err);
    return json({ error: err?.message ?? 'Internal error' }, 500);
  }
});
