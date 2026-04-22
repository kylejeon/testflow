import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Tier 체크: Hobby(tier=2)+ 만 Jira Issue 생성 가능 ────────
    // ES256-safe auth: x-user-token > Authorization Bearer
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const userTokenHeader = req.headers.get('x-user-token');
    const authHeader = req.headers.get('Authorization');
    const token = userTokenHeader
      || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let userId: string;
    try {
      const [, payloadB64] = token.split('.');
      const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(
        new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))),
      );
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
      userId = payload.sub;
      if (!userId) throw new Error('No sub');
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: { user }, error: authError } = await adminClient.auth.admin.getUserById(userId);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { data: profile } = await adminClient
      .from('profiles')
      .select('subscription_tier, is_trial, trial_ends_at')
      .eq('id', user.id)
      .maybeSingle();
    let userTier = profile?.subscription_tier || 1;
    if (profile?.is_trial && profile?.trial_ends_at) {
      if (new Date() > new Date(profile.trial_ends_at)) userTier = 1;
    }
    if (userTier < 2) {
      return new Response(
        JSON.stringify({ error: 'Jira Issue 생성은 Hobby 플랜 이상에서 사용할 수 있습니다.', required_tier: 2, current_tier: userTier }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    // ─────────────────────────────────────────────────────────────

    const body = await req.json();

    const {
      domain,
      email,
      apiToken,
      projectKey,
      summary,
      description,
      issueType,
      priority,
      labels,
      assignee,
      components,
      fieldMappings,
      fieldContext,
      test_result_id,
      run_id,
    } = body;

    // Log received params for debugging (masks token)
    console.log('[create-jira-issue] received params:', {
      domain,
      email,
      apiToken: apiToken ? `${String(apiToken).slice(0, 8)}...` : null,
      projectKey,
      summary,
      issueType,
      priority,
      labelsCount: Array.isArray(labels) ? labels.length : labels,
      hasDescription: !!description,
    });

    // Validate required fields individually for precise error messages
    if (!domain)      return json400('Missing required field: domain');
    if (!email)       return json400('Missing required field: email');
    if (!apiToken)    return json400('Missing required field: apiToken');
    if (!projectKey)  return json400('Missing required field: projectKey');
    if (!summary)     return json400('Missing required field: summary');

    const cleanDomain = String(domain)
      .replace(/^https?:?\/?\/?\/?/i, '')
      .replace(/\/+$/, '')
      .trim();

    const auth = btoa(`${email}:${apiToken}`);

    // Build Jira issue payload (Jira REST API v3)
    const issueData: Record<string, any> = {
      fields: {
        project:   { key: String(projectKey).trim() },
        summary:   stripHtml(String(summary)),
        issuetype: { name: issueType || 'Bug' },
      },
    };

    // description → must be ADF (Atlassian Document Format) for API v3
    if (description) {
      issueData.fields.description = textToADF(stripHtml(String(description)));
    }

    // priority → must be { name: "High" } object for Jira REST API v3
    // Handle both string "High" and pre-formatted { name: "High" } inputs defensively
    if (priority) {
      let priorityName: string;
      if (typeof priority === 'object' && priority !== null) {
        // Caller already passed { name: "High" } — extract the name
        priorityName = String((priority as Record<string, unknown>).name ?? '');
      } else {
        priorityName = String(priority);
      }
      if (priorityName) {
        issueData.fields.priority = { name: priorityName };
      }
    }

    // labels → plain string array (no spaces allowed per Jira spec)
    if (Array.isArray(labels) && labels.length > 0) {
      issueData.fields.labels = labels.map((l: any) => String(l).replace(/\s+/g, '-'));
    }

    // assignee
    if (assignee) {
      issueData.fields.assignee = String(assignee).includes('@')
        ? { emailAddress: assignee }
        : { accountId: assignee };
    }

    // components
    if (Array.isArray(components) && components.length > 0) {
      issueData.fields.components = components.map((name: string) => ({ name }));
    }

    // custom field mappings
    if (Array.isArray(fieldMappings) && fieldMappings.length > 0 && fieldContext) {
      for (const mapping of fieldMappings) {
        const value = resolveTestablyFieldValue(mapping.testably_field, fieldContext);
        if (value && mapping.jira_field_id) {
          issueData.fields[mapping.jira_field_id] = value;
        }
      }
    }

    // Log the exact request body being sent to Jira
    console.log('[create-jira-issue] sending to Jira:', JSON.stringify(issueData, null, 2));

    const jiraUrl = `https://${cleanDomain}/rest/api/3/issue`;
    const response = await fetch(jiraUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept':        'application/json',
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(issueData),
    });

    const responseText = await response.text();
    console.log('[create-jira-issue] Jira response status:', response.status);
    console.log('[create-jira-issue] Jira response body:', responseText);

    if (response.ok) {
      let data: any = {};
      try { data = JSON.parse(responseText); } catch (_) { /* ignore */ }

      // ── Fetch metadata (priority/status/assignee) for the new issue ──────
      let metadata: any = null;
      try {
        const metaUrl = `https://${cleanDomain}/rest/api/3/issue/${data.key}?fields=priority,status,assignee`;
        const metaRes = await fetch(metaUrl, {
          headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
        });
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          metadata = {
            priority: metaJson?.fields?.priority?.name || null,
            status: metaJson?.fields?.status?.name || null,
            assignee_account_id: metaJson?.fields?.assignee?.accountId || null,
            assignee_display_name: metaJson?.fields?.assignee?.displayName || null,
            assignee_avatar_url: metaJson?.fields?.assignee?.avatarUrls?.['48x48'] || null,
          };
        }
      } catch (metaErr) {
        console.warn('[create-jira-issue] metadata fetch failed:', metaErr);
      }

      // ── Persist metadata to test_results.jira_issues_meta ────────────────
      if (test_result_id) {
        try {
          const { data: existing } = await adminClient
            .from('test_results')
            .select('jira_issues_meta, issues')
            .eq('id', test_result_id)
            .maybeSingle();
          const existingMeta: any[] = Array.isArray(existing?.jira_issues_meta) ? existing!.jira_issues_meta : [];
          const existingIssues: string[] = Array.isArray(existing?.issues) ? existing!.issues : [];
          const newEntry = {
            key: data.key,
            url: `https://${cleanDomain}/browse/${data.key}`,
            priority: metadata?.priority ?? priority ?? null,
            status: metadata?.status ?? null,
            assignee_account_id: metadata?.assignee_account_id ?? null,
            assignee_display_name: metadata?.assignee_display_name ?? null,
            assignee_avatar_url: metadata?.assignee_avatar_url ?? null,
            last_synced_at: new Date().toISOString(),
          };
          // Avoid dup by key
          const nextMeta = existingMeta.some((m: any) => m?.key === data.key)
            ? existingMeta
            : [...existingMeta, newEntry];
          const nextIssues = existingIssues.includes(data.key)
            ? existingIssues
            : [...existingIssues, data.key];
          await adminClient
            .from('test_results')
            .update({ jira_issues_meta: nextMeta, issues: nextIssues })
            .eq('id', test_result_id);
        } catch (persistErr) {
          console.warn('[create-jira-issue] persist error:', persistErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          issue: { key: data.key, id: data.id, self: data.self, metadata },
          run_id: run_id ?? null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Jira returned an error ---
    let jiraErrorMessage = `Jira API error (HTTP ${response.status})`;
    let jiraErrorDetails: any = {};

    try {
      const errorData = JSON.parse(responseText);
      jiraErrorDetails = errorData;

      // Field-level errors e.g. { "errors": { "description": "Field ... unknown." } }
      if (errorData.errors && Object.keys(errorData.errors).length > 0) {
        jiraErrorMessage = Object.entries(errorData.errors)
          .map(([field, msg]) => `[${field}] ${msg}`)
          .join(' | ');
      } else if (Array.isArray(errorData.errorMessages) && errorData.errorMessages.length > 0) {
        jiraErrorMessage = errorData.errorMessages.join(' | ');
      } else if (errorData.message) {
        jiraErrorMessage = errorData.message;
      }
    } catch (_) {
      jiraErrorMessage = responseText || jiraErrorMessage;
    }

    console.error('[create-jira-issue] Jira error:', jiraErrorMessage, jiraErrorDetails);

    return new Response(
      JSON.stringify({
        success: false,
        error: jiraErrorMessage,
        jiraStatus: response.status,
        details: jiraErrorDetails,
      }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err: any) {
    console.error('[create-jira-issue] unhandled error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function json400(message: string): Response {
  console.warn('[create-jira-issue] 400:', message);
  return new Response(
    JSON.stringify({ error: message }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

/**
 * Converts plain text (with \n line breaks) to Atlassian Document Format (ADF).
 *
 * Jira REST API v3 requires ADF for the description field.
 * Rules:
 *   - `text` nodes must NOT contain \n characters
 *   - \n\n (blank line) → new paragraph node
 *   - \n  (single line break) → hardBreak node inside a paragraph
 */
function textToADF(text: string): Record<string, any> {
  const emptyDoc = {
    type: 'doc', version: 1,
    content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
  };

  if (!text || !text.trim()) return emptyDoc;

  // Split into paragraph blocks on 2+ consecutive newlines
  const blocks = text.split(/\n{2,}/).filter(b => b.trim());
  if (blocks.length === 0) return emptyDoc;

  const content = blocks.map(block => {
    const lines = block.split('\n');
    const inlineNodes: any[] = [];

    lines.forEach((line, idx) => {
      // Only push text node if line is non-empty
      if (line) {
        inlineNodes.push({ type: 'text', text: line });
      }
      // Insert hardBreak between lines (not after the last line of the block)
      if (idx < lines.length - 1 && inlineNodes.length > 0) {
        inlineNodes.push({ type: 'hardBreak' });
      }
    });

    return {
      type: 'paragraph',
      content: inlineNodes.length > 0 ? inlineNodes : [{ type: 'text', text: '' }],
    };
  });

  return { type: 'doc', version: 1, content };
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveTestablyFieldValue(field: string, ctx: any): any {
  switch (field) {
    case 'tc_tags':        return ctx.tags?.join(', ') || null;
    case 'tc_precondition': return ctx.precondition   || null;
    case 'milestone_name': return ctx.milestoneName   || null;
    case 'run_name':       return ctx.runName         || null;
    case 'custom_text':    return ctx.customValue     || null;
    default:               return null;
  }
}
