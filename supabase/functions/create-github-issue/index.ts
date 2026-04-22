/**
 * create-github-issue Edge Function
 *
 * GitHub Issue를 생성합니다.
 *
 * POST body:
 *   {
 *     token: string,       -- GitHub PAT
 *     owner: string,       -- GitHub username or org
 *     repo: string,        -- Repository name
 *     title: string,       -- Issue title
 *     body?: string,       -- Issue body (markdown)
 *     labels?: string[],   -- Label names
 *     assignee?: string,   -- GitHub username to assign
 *   }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResp(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth (ES256-safe): x-user-token > Authorization Bearer ────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const userTokenHeader = req.headers.get('x-user-token');
    const authHeader = req.headers.get('Authorization');
    const token = userTokenHeader
      || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '');
    if (!token) return jsonResp({ error: 'Missing user token' }, 401);

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
      return jsonResp({ error: 'Invalid or expired token' }, 401);
    }

    const { data: { user }, error: authError } = await adminClient.auth.admin.getUserById(userId);
    if (authError || !user) {
      return jsonResp({ error: 'Unauthorized' }, 401);
    }

    // ── Tier 확인: Hobby(2)+ 만 GitHub Issue 생성 가능 ────────────────────────
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
      return jsonResp({
        error: 'GitHub Issue creation requires Hobby plan or higher.',
        required_tier: 2,
        current_tier: userTier,
      }, 403);
    }

    // ── 요청 파싱 ──────────────────────────────────────────────────────────────
    const body = await req.json();
    const { token: ghToken, owner, repo, title, body: issueBody, labels, assignee, test_result_id, run_id, project_id } = body as {
      token: string;
      owner: string;
      repo: string;
      title: string;
      body?: string;
      labels?: string[];
      assignee?: string;
      test_result_id?: string;
      run_id?: string;
      project_id?: string;
    };

    if (!ghToken) return jsonResp({ error: 'Missing required field: token' }, 400);
    if (!owner)   return jsonResp({ error: 'Missing required field: owner' }, 400);
    if (!repo)    return jsonResp({ error: 'Missing required field: repo' }, 400);
    if (!title)   return jsonResp({ error: 'Missing required field: title' }, 400);

    // ── GitHub Issue payload ──────────────────────────────────────────────────
    const payload: Record<string, any> = { title };
    if (issueBody) payload.body = issueBody;
    if (Array.isArray(labels) && labels.length > 0) payload.labels = labels;
    if (assignee) payload.assignees = [assignee];

    console.log('[create-github-issue] sending to GitHub:', JSON.stringify({ owner, repo, title, labelsCount: labels?.length }));

    const ghUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;
    const response = await fetch(ghUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('[create-github-issue] GitHub response status:', response.status);

    if (response.ok) {
      let data: any = {};
      try { data = JSON.parse(responseText); } catch (_) { /* ignore */ }

      const labelList: any[] = Array.isArray(data.labels) ? data.labels : [];
      let priority: string | null = null;
      for (const l of labelList) {
        const n: string = (typeof l === 'string' ? l : l?.name || '').toLowerCase();
        if (n.startsWith('priority/') || n.startsWith('priority-')) {
          priority = n.split(/[/-]/)[1] || null;
          break;
        }
      }
      const assigneeObj = Array.isArray(data.assignees) && data.assignees.length > 0 ? data.assignees[0] : null;
      const metadata = {
        number: data.number,
        url: data.html_url,
        repo: `${owner}/${repo}`,
        state: data.state || null,
        priority,
        assignee_login: assigneeObj?.login || null,
        assignee_display_name: assigneeObj?.login || null,
        assignee_avatar_url: assigneeObj?.avatar_url || null,
        last_synced_at: new Date().toISOString(),
      };

      if (test_result_id) {
        try {
          const { data: existing } = await adminClient
            .from('test_results')
            .select('github_issues')
            .eq('id', test_result_id)
            .maybeSingle();
          const existingGh: any[] = Array.isArray(existing?.github_issues) ? existing!.github_issues : [];
          const next = existingGh.some((g: any) => g?.number === data.number && g?.repo === metadata.repo)
            ? existingGh
            : [...existingGh, metadata];
          await adminClient
            .from('test_results')
            .update({ github_issues: next })
            .eq('id', test_result_id);
          if (project_id) {
            await adminClient.from('github_sync_log').insert({
              project_id,
              github_issue_number: String(data.number),
              github_repo: metadata.repo,
              direction: 'outbound',
              success: true,
              testably_run_id: run_id ?? null,
            }).then(() => null, () => null);
          }
        } catch (persistErr) {
          console.warn('[create-github-issue] persist error:', persistErr);
        }
      }

      return jsonResp({
        success: true,
        issue: {
          number: data.number,
          html_url: data.html_url,
          title: data.title,
          metadata,
        },
      });
    }

    let ghErrorMessage = `GitHub API error (HTTP ${response.status})`;
    try {
      const errData = JSON.parse(responseText);
      if (errData.message) ghErrorMessage = errData.message;
      if (Array.isArray(errData.errors) && errData.errors.length > 0) {
        ghErrorMessage += ': ' + errData.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ');
      }
    } catch (_) {
      ghErrorMessage = responseText || ghErrorMessage;
    }

    console.error('[create-github-issue] GitHub error:', ghErrorMessage);

    return jsonResp({ success: false, error: ghErrorMessage, githubStatus: response.status }, response.status);
  } catch (err: any) {
    console.error('[create-github-issue] unhandled error:', err);
    return jsonResp({ success: false, error: err?.message ?? 'Internal server error' }, 500);
  }
});
