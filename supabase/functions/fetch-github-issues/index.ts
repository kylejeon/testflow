/**
 * fetch-github-issues Edge Function
 *
 * GitHub Issues를 가져와 requirements 테이블에 import (upsert).
 *
 * POST body:
 *   {
 *     project_id: string,       -- Testably 프로젝트 UUID
 *     label_filter?: string,    -- 특정 label로 필터 (없으면 전체)
 *     state?: string,           -- "open" | "closed" | "all" (기본값: "open")
 *     max_results?: number,     -- 최대 가져올 Issue 수 (기본값: 100)
 *     dry_run?: boolean,        -- true면 import 없이 preview 데이터만 반환
 *   }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const supabaseUrl      = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey  = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── 요청 파싱 ──────────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      project_id,
      label_filter,
      state = 'open',
      max_results = 100,
      dry_run = false,
    } = body as {
      project_id: string;
      label_filter?: string;
      state?: string;
      max_results?: number;
      dry_run?: boolean;
    };

    if (!project_id) {
      return jsonResponse({ error: 'project_id is required' }, 400);
    }

    // ── 프로젝트 접근 권한 확인 ─────────────────────────────────────────────────
    const { data: memberCheck } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: projectData } = await adminClient
      .from('projects')
      .select('id, created_by')
      .eq('id', project_id)
      .maybeSingle();

    if (!projectData) {
      return jsonResponse({ error: 'Project not found' }, 404);
    }

    if (!memberCheck && projectData.created_by !== user.id) {
      return jsonResponse({ error: 'Access denied' }, 403);
    }

    // ── Tier 확인: Hobby(2)+ 만 GitHub import 가능 ─────────────────────────────
    const { data: profile } = await adminClient
      .from('profiles')
      .select('subscription_tier, is_trial, trial_ends_at')
      .eq('id', user.id)
      .maybeSingle();

    let tier = profile?.subscription_tier || 1;
    if (profile?.is_trial && profile?.trial_ends_at) {
      if (new Date() > new Date(profile.trial_ends_at)) tier = 1;
    }

    if (tier < 2) {
      return jsonResponse({
        error: 'GitHub import requires Hobby plan or higher',
        requiredTier: 2,
        upgradeUrl: '/settings/billing',
      }, 403);
    }

    // ── Starter 제한: requirements 50개 ───────────────────────────────────────
    if (tier === 2) {
      const { data: countData } = await adminClient.rpc('count_active_requirements', { p_project_id: project_id });
      const currentCount = (countData as number) || 0;
      if (currentCount >= 50) {
        return jsonResponse({
          error: 'Hobby plan is limited to 50 requirements per project. Upgrade to Starter for unlimited requirements.',
          limit: 50,
          current: currentCount,
          upgradeUrl: '/settings/billing',
        }, 403);
      }
    }

    // ── GitHub 인증 정보 조회 ──────────────────────────────────────────────────
    const { data: ghSettings } = await adminClient
      .from('github_settings')
      .select('token, owner, repo')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!ghSettings?.token || !ghSettings?.owner || !ghSettings?.repo) {
      return jsonResponse({
        error: 'GitHub is not connected. Please configure GitHub in Settings > Integrations.',
        type: 'not_connected',
      }, 422);
    }

    // ── GitHub Issues API 호출 ─────────────────────────────────────────────────
    const params = new URLSearchParams({
      state: state || 'open',
      per_page: String(Math.min(max_results, 100)),
    });
    if (label_filter) params.set('labels', label_filter);

    const ghUrl = `https://api.github.com/repos/${ghSettings.owner}/${ghSettings.repo}/issues?${params}`;

    const ghResp = await fetch(ghUrl, {
      headers: {
        Authorization: `Bearer ${ghSettings.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (ghResp.status === 401 || ghResp.status === 403) {
      return jsonResponse({ error: 'GitHub token is invalid or expired. Please reconnect GitHub.' }, 401);
    }
    if (!ghResp.ok) {
      const errText = await ghResp.text().catch(() => '');
      return jsonResponse({ error: `GitHub API error (HTTP ${ghResp.status}): ${errText.slice(0, 200)}` }, 502);
    }

    const ghIssues: any[] = await ghResp.json();

    // GitHub Issues API는 Pull Requests도 반환하므로 PR 제외
    const issues = ghIssues.filter((i: any) => !i.pull_request);

    if (issues.length === 0) {
      return jsonResponse({ success: true, imported: 0, skipped: 0, issues: [] });
    }

    // ── 이미 import된 external_id 조회 ───────────────────────────────────────
    const externalIds = issues.map((i: any) => String(i.number));
    const { data: existing } = await adminClient
      .from('requirements')
      .select('external_id')
      .eq('project_id', project_id)
      .eq('source', 'github')
      .in('external_id', externalIds);

    const existingKeys = new Set((existing || []).map((r: any) => r.external_id));

    // ── GitHub Issue → requirements 행 변환 ───────────────────────────────────
    const toInsert: any[] = [];
    const toUpdate: any[] = [];

    for (const issue of issues) {
      const issueNumber = String(issue.number);
      const issueUrl = issue.html_url;
      const labels = (issue.labels || []).map((l: any) => l.name).join(', ');
      const state = issue.state || 'open';

      const row = {
        project_id,
        title: issue.title || `#${issueNumber}`,
        description: issue.body || undefined,
        priority: 'P3',
        category: labels || '',
        status: 'active',
        source: 'github',
        external_id: issueNumber,
        external_url: issueUrl,
        external_status: state,
        external_type: 'Issue',
        last_synced_at: new Date().toISOString(),
        created_by: user.id,
      };

      if (existingKeys.has(issueNumber)) {
        toUpdate.push({
          external_id: issueNumber,
          external_status: row.external_status,
          last_synced_at: row.last_synced_at,
          title: row.title,
          category: row.category,
        });
      } else {
        toInsert.push(row);
      }
    }

    // Tier 제한: 삽입 가능한 수량 재계산
    if (tier === 2 && toInsert.length > 0) {
      const { data: countData } = await adminClient.rpc('count_active_requirements', { p_project_id: project_id });
      const currentCount = (countData as number) || 0;
      const remaining = 50 - currentCount;
      if (remaining <= 0) {
        return jsonResponse({
          error: 'Hobby plan is limited to 50 requirements per project.',
          limit: 50,
          current: currentCount,
          upgradeUrl: '/settings/billing',
        }, 403);
      }
      toInsert.splice(remaining);
    }

    if (dry_run) {
      return jsonResponse({
        success: true,
        dry_run: true,
        toImport: toInsert.length,
        toSync: toUpdate.length,
        issues: [
          ...toInsert.map(r => ({ ...r, is_new: true })),
          ...toUpdate.map(u => ({ ...u, is_new: false })),
        ],
      });
    }

    // ── DB Insert ──────────────────────────────────────────────────────────────
    let importedCount = 0;
    if (toInsert.length > 0) {
      const { data: inserted, error: insertError } = await adminClient
        .from('requirements')
        .insert(toInsert)
        .select('id, custom_id, external_id, title');

      if (insertError) {
        console.error('[fetch-github-issues] insert error:', insertError);
        return jsonResponse({ error: 'Failed to import requirements: ' + insertError.message }, 500);
      }
      importedCount = inserted?.length || 0;

      if (inserted && inserted.length > 0) {
        const historyRows = inserted.map((r: any) => ({
          requirement_id: r.id,
          user_id: user.id,
          action_type: 'imported',
          change_summary: `Imported from GitHub: #${r.external_id}`,
        }));
        await adminClient.from('requirement_history').insert(historyRows);
      }
    }

    // ── DB Update (상태 동기화) ────────────────────────────────────────────────
    for (const u of toUpdate) {
      await adminClient
        .from('requirements')
        .update({ external_status: u.external_status, last_synced_at: u.last_synced_at })
        .eq('project_id', project_id)
        .eq('external_id', u.external_id)
        .eq('source', 'github');
    }

    await adminClient.rpc('refresh_requirement_coverage').catch(() => {});

    return jsonResponse({
      success: true,
      imported: importedCount,
      skipped: toUpdate.length,
      total_github_issues: issues.length,
    });
  } catch (err: any) {
    console.error('[fetch-github-issues] unhandled error:', err);
    return jsonResponse({ error: err?.message || 'Internal server error' }, 500);
  }
});
