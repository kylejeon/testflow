/**
 * fetch-jira-requirements Edge Function
 *
 * Jira Issue 목록을 가져와 requirements 테이블에 import (upsert).
 *
 * POST body:
 *   {
 *     project_id: string,              -- Testably 프로젝트 UUID
 *     jira_project_key?: string,       -- 가져올 Jira 프로젝트 키 (없으면 jira_settings의 project_key 사용)
 *     issue_types?: string[],          -- ["Story", "Epic"] 등 (기본값: ["Story", "Epic", "Task"])
 *     max_results?: number,            -- 최대 가져올 Issue 수 (기본값: 100)
 *     dry_run?: boolean,               -- true면 import 없이 preview 데이터만 반환
 *   }
 *
 * 응답 (dry_run=false):
 *   {
 *     success: true,
 *     imported: number,
 *     skipped: number,   -- 이미 매핑된 Issue
 *     issues: RequirementRow[]
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

/** Atlassian Document Format → plain text */
function adfToText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'mention') return node.attrs?.text || '';
  if (Array.isArray(node.content)) {
    const parts = node.content.map(adfToText).join('');
    const blockNodes = new Set(['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock']);
    if (blockNodes.has(node.type)) return parts + '\n';
    return parts;
  }
  return '';
}

/** Jira priority → Testably priority 매핑 */
function mapJiraPriority(jiraPriority: string | undefined): string {
  switch ((jiraPriority || '').toLowerCase()) {
    case 'highest':
    case 'critical':
    case 'blocker': return 'P1';
    case 'high':    return 'P2';
    case 'medium':
    case 'normal':  return 'P3';
    case 'low':
    case 'lowest':
    case 'minor':   return 'P4';
    default:        return 'P3';
  }
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
      jira_project_key,
      issue_types = ['Story', 'Epic', 'Task'],
      max_results = 100,
      dry_run = false,
    } = body as {
      project_id: string;
      jira_project_key?: string;
      issue_types?: string[];
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

    // ── Tier 확인: Starter(2)+ 만 Jira import 가능 ─────────────────────────────
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
        error: 'Jira import requires Starter plan or higher',
        requiredTier: 2,
        upgradeUrl: '/settings/billing',
      }, 403);
    }

    // ── Starter: 50개 제한 확인 ────────────────────────────────────────────────
    if (tier === 2) {
      const { data: countData } = await adminClient.rpc('count_active_requirements', { p_project_id: project_id });
      const currentCount = (countData as number) || 0;
      if (currentCount >= 50) {
        return jsonResponse({
          error: 'Starter plan is limited to 50 requirements per project. Upgrade to Professional for unlimited requirements.',
          limit: 50,
          current: currentCount,
          upgradeUrl: '/settings/billing',
        }, 403);
      }
    }

    // ── Jira 인증 정보 조회 ────────────────────────────────────────────────────
    const { data: jiraSettings } = await adminClient
      .from('jira_settings')
      .select('domain, email, api_token, project_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!jiraSettings?.domain || !jiraSettings?.email || !jiraSettings?.api_token) {
      return jsonResponse({
        error: 'Jira is not connected. Please configure Jira in Settings > Integrations.',
        type: 'not_connected',
      }, 422);
    }

    const projectKey = jira_project_key || jiraSettings.project_key;
    if (!projectKey) {
      return jsonResponse({ error: 'jira_project_key is required' }, 400);
    }

    const cleanDomain = jiraSettings.domain
      .replace(/^https?:?\/?\/?\/?/i, '')
      .replace(/\/+$/, '');
    const basicAuth = btoa(`${jiraSettings.email}:${jiraSettings.api_token}`);

    // ── Jira Issue 목록 JQL 조회 ───────────────────────────────────────────────
    const typeFilter = issue_types.map(t => `"${t}"`).join(', ');
    const jql = `project = "${projectKey}" AND issuetype in (${typeFilter}) ORDER BY created DESC`;
    const fields = 'summary,description,priority,status,issuetype,labels';
    const jiraUrl = `https://${cleanDomain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=${Math.min(max_results, 200)}`;

    const jiraResp = await fetch(jiraUrl, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
      },
    });

    if (jiraResp.status === 401 || jiraResp.status === 403) {
      return jsonResponse({ error: 'Jira credentials are invalid or expired. Please reconnect Jira.' }, 401);
    }
    if (!jiraResp.ok) {
      const errText = await jiraResp.text().catch(() => '');
      return jsonResponse({ error: `Jira API error (HTTP ${jiraResp.status}): ${errText.slice(0, 200)}` }, 502);
    }

    const jiraData = await jiraResp.json();
    const jiraIssues: any[] = jiraData.issues || [];

    if (jiraIssues.length === 0) {
      return jsonResponse({ success: true, imported: 0, skipped: 0, issues: [] });
    }

    // ── 이미 import된 external_id 조회 (중복 skip) ───────────────────────────
    const externalIds = jiraIssues.map((i: any) => i.key);
    const { data: existing } = await adminClient
      .from('requirements')
      .select('external_id')
      .eq('project_id', project_id)
      .eq('source', 'jira')
      .in('external_id', externalIds);

    const existingKeys = new Set((existing || []).map((r: any) => r.external_id));

    // ── Jira Issue → requirements 행 변환 ─────────────────────────────────────
    interface RequirementInsert {
      project_id: string;
      title: string;
      description: string | undefined;
      priority: string;
      category: string;
      status: string;
      source: string;
      external_id: string;
      external_url: string;
      external_status: string;
      external_type: string;
      last_synced_at: string;
      created_by: string;
    }

    const toInsert: RequirementInsert[] = [];
    const toUpdate: { external_id: string; external_status: string; last_synced_at: string }[] = [];

    for (const issue of jiraIssues) {
      const f = issue.fields || {};
      const descText = f.description ? adfToText(f.description).trim() : undefined;
      const issueUrl = `https://${cleanDomain}/browse/${issue.key}`;

      const row = {
        project_id,
        title: f.summary || issue.key,
        description: descText,
        priority: mapJiraPriority(f.priority?.name),
        category: f.issuetype?.name || '',
        status: 'active',
        source: 'jira',
        external_id: issue.key,
        external_url: issueUrl,
        external_status: f.status?.name || '',
        external_type: f.issuetype?.name || '',
        last_synced_at: new Date().toISOString(),
        created_by: user.id,
      };

      if (existingKeys.has(issue.key)) {
        // 이미 있으면 상태/동기화 시각만 갱신
        toUpdate.push({
          external_id: issue.key,
          external_status: row.external_status,
          last_synced_at: row.last_synced_at,
        });
      } else {
        toInsert.push(row);
      }
    }

    // Starter 제한: 삽입 가능한 수량 재계산
    if (tier === 2 && toInsert.length > 0) {
      const { data: countData } = await adminClient.rpc('count_active_requirements', { p_project_id: project_id });
      const currentCount = (countData as number) || 0;
      const remaining = 50 - currentCount;
      if (remaining <= 0) {
        return jsonResponse({
          error: 'Starter plan is limited to 50 requirements per project.',
          limit: 50,
          current: currentCount,
          upgradeUrl: '/settings/billing',
        }, 403);
      }
      toInsert.splice(remaining); // 허용 범위까지만 삽입
    }

    if (dry_run) {
      return jsonResponse({
        success: true,
        dry_run: true,
        toImport: toInsert.length,
        toSync: toUpdate.length,
        issues: [...toInsert.map(r => ({ ...r, is_new: true })), ...toUpdate.map(u => ({ ...u, is_new: false }))],
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
        console.error('[fetch-jira-requirements] insert error:', insertError);
        return jsonResponse({ error: 'Failed to import requirements: ' + insertError.message }, 500);
      }
      importedCount = inserted?.length || 0;

      // History 기록
      if (inserted && inserted.length > 0) {
        const historyRows = inserted.map((r: any) => ({
          requirement_id: r.id,
          user_id: user.id,
          action_type: 'imported',
          change_summary: `Imported from Jira: ${r.external_id}`,
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
        .eq('external_id', u.external_id);
    }

    // MV 새로고침 (import 후 커버리지 집계 갱신)
    await adminClient.rpc('refresh_requirement_coverage').catch(() => {
      // MV 새로고침 실패는 import 성공에 영향 없음 (background)
    });

    return jsonResponse({
      success: true,
      imported: importedCount,
      skipped: toUpdate.length,
      total_jira_issues: jiraIssues.length,
    });
  } catch (err: any) {
    console.error('[fetch-jira-requirements] unhandled error:', err);
    return jsonResponse({ error: err?.message || 'Internal server error' }, 500);
  }
});
