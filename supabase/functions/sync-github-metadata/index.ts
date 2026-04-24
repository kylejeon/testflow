// sync-github-metadata Edge Function
// -----------------------------------------------------------------------------
// Pulls state / labels / assignee metadata from GitHub for test_results whose
// `github_issues` JSONB contains {number, repo} objects, then merges the fresh
// values back into the JSONB with a `last_synced_at` timestamp.
//
// Auth (hybrid):
//   - `x-cron-secret: <CRON_SECRET>` → trusted cron caller, all projects.
//   - Bearer JWT → user must have Tester+ membership on every project whose
//     data is touched. `scope=all` is narrowed down to the caller's projects.
//
// Related spec: dev-spec §4-1-A, §6-1 (D). QA Blocker #1 fix (2026-04-19).
// -----------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  verifySyncCaller,
  getAuthorizedProjectIds,
  AuthError,
  SYNC_ALLOWED_ROLES,
} from '../_shared/auth.ts';
import { getEffectiveTier } from '../_shared/ai-usage.ts';
import {
  checkIssuesRefreshLimit,
  issuesRefreshRateLimitBody,
} from '../_shared/issues-refresh-limit.ts';
import {
  createGitHubUserNameCache,
  resolveAssigneeDisplayName,
} from '../_shared/github-user.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-user-token',
};

interface SyncBody {
  scope?: 'all' | 'run_ids' | 'project_id';
  run_ids?: string[];
  project_id?: string;
  only_stale?: boolean;
}

const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── Auth: trusted cron OR authenticated user with Tester+ role ──────────
    let caller;
    try {
      caller = await verifySyncCaller(req, admin);
    } catch (err) {
      if (err instanceof AuthError) return jsonResp({ success: false, error: err.message }, err.status);
      throw err;
    }

    const body: SyncBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const scope = body.scope || 'all';
    const onlyStale = body.only_stale !== false;

    // For user callers, resolve the set of projects they're allowed to touch.
    let authorizedProjectIds: string[] | null = null;
    if (caller.kind === 'user') {
      authorizedProjectIds = await getAuthorizedProjectIds(admin, caller.userId, SYNC_ALLOWED_ROLES);
      if (authorizedProjectIds.length === 0) {
        return jsonResp({ success: false, error: 'Forbidden — no eligible projects' }, 403);
      }
      if (scope === 'project_id' && body.project_id && !authorizedProjectIds.includes(body.project_id)) {
        return jsonResp({ success: false, error: 'Forbidden — project not accessible' }, 403);
      }

      // f012 — Plan-aware rate limit for manual refresh (scope=run_ids | project_id).
      if (scope === 'run_ids' || scope === 'project_id') {
        const { tier, ownerId } = await getEffectiveTier(admin, caller.userId);
        const rate = await checkIssuesRefreshLimit(admin, ownerId, tier);
        if (!rate.allowed) {
          return jsonResp(issuesRefreshRateLimitBody(rate, tier), 429);
        }
      }
    }

    let query = admin
      .from('test_results')
      .select('id, run_id, github_issues, test_runs!inner(project_id)')
      .not('github_issues', 'is', null);
    if (scope === 'run_ids' && Array.isArray(body.run_ids) && body.run_ids.length > 0) {
      query = query.in('run_id', body.run_ids);
    } else if (scope === 'project_id' && body.project_id) {
      query = query.eq('test_runs.project_id', body.project_id);
    } else if (caller.kind === 'user' && authorizedProjectIds) {
      // scope=all for user → narrow to their projects
      query = query.in('test_runs.project_id', authorizedProjectIds);
    }
    query = query.limit(500);

    const { data: rows, error: rowsErr } = await query;
    if (rowsErr) {
      console.error('[sync-github-metadata] select error:', rowsErr);
      return jsonResp({ success: false, error: rowsErr.message }, 500);
    }

    const now = Date.now();
    const nowIso = new Date().toISOString();
    let synced = 0;
    const failed: string[] = [];

    const authorizedSet = authorizedProjectIds ? new Set(authorizedProjectIds) : null;

    // Group by project to re-use github_settings lookups
    const byProject = new Map<string, any[]>();
    (rows || []).forEach((row: any) => {
      const projectId: string = row.test_runs?.project_id;
      if (!projectId) return;
      if (authorizedSet && !authorizedSet.has(projectId)) return;
      const arr = byProject.get(projectId) || [];
      arr.push(row);
      byProject.set(projectId, arr);
    });

    for (const [projectId, projRows] of byProject.entries()) {
      // github_settings is per-user (user_id keyed), not per-project.
      // Find a project member whose github_settings are configured — prefer
      // owner/admin roles so the "official" integration owner is used.
      const { data: memberRows } = await admin
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId);

      const memberIds = (memberRows || [])
        .sort((a: any, b: any) => {
          const rank: Record<string, number> = { owner: 0, admin: 1, manager: 2, tester: 3, viewer: 4, guest: 5 };
          return (rank[a.role] ?? 99) - (rank[b.role] ?? 99);
        })
        .map((r: any) => r.user_id);

      let settings: { token: string; owner: string; repo: string } | null = null;
      if (memberIds.length > 0) {
        const { data: candidateSettings } = await admin
          .from('github_settings')
          .select('user_id, token, owner, repo')
          .in('user_id', memberIds);
        if (Array.isArray(candidateSettings) && candidateSettings.length > 0) {
          // Preserve member rank order
          const byUser = new Map(candidateSettings.map((s: any) => [s.user_id, s]));
          for (const uid of memberIds) {
            const s: any = byUser.get(uid);
            if (s?.token && s?.owner && s?.repo) {
              settings = { token: s.token, owner: s.owner, repo: s.repo };
              break;
            }
          }
        }
      }

      if (!settings?.token) {
        // Skip all rows for this project
        projRows.forEach((row: any) => {
          const gi = Array.isArray(row.github_issues) ? row.github_issues : [];
          gi.forEach((i: any) => i?.number && failed.push(String(i.number)));
        });
        continue;
      }

      // f014 — 실명(User.name) 조회 결과를 이 project 의 sync 전체에서 재사용.
      // 여러 row 가 같은 assignee login 을 가리키는 케이스가 흔함.
      const nameCache = createGitHubUserNameCache();

      for (const row of projRows) {
        const gi: any[] = Array.isArray(row.github_issues) ? row.github_issues : [];
        if (gi.length === 0) continue;

        const merged: any[] = [];
        for (const item of gi) {
          if (!item?.number) { merged.push(item); continue; }
          if (onlyStale && item.last_synced_at) {
            const lastSync = new Date(item.last_synced_at).getTime();
            if (!isNaN(lastSync) && now - lastSync < STALE_THRESHOLD_MS) {
              merged.push(item);
              continue;
            }
          }
          const owner = item.owner || settings.owner;
          const repo = item.repo || settings.repo;
          if (!owner || !repo) { merged.push(item); continue; }

          const url = `https://api.github.com/repos/${owner}/${repo}/issues/${item.number}`;
          let attempt = 0;
          let res: Response | null = null;
          while (attempt < 3) {
            res = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${settings.token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
            });
            if (res.status !== 429 && res.status !== 403) break;
            // 403 with X-RateLimit-Remaining: 0 → backoff
            await sleep(1000 * Math.pow(2, attempt));
            attempt++;
          }

          if (!res || !res.ok) {
            const err = res?.status === 404 ? 'not_found' : res?.status === 403 ? 'forbidden' : 'api_error';
            merged.push({ ...item, error: err, last_synced_at: nowIso });
            failed.push(String(item.number));
            // log failure
            await admin.from('github_sync_log').insert({
              project_id: projectId,
              github_issue_number: String(item.number),
              github_repo: `${owner}/${repo}`,
              direction: 'inbound',
              success: false,
              error_message: err,
              testably_run_id: row.run_id,
            }).then(() => null, () => null);
            // 100ms between calls (BR-6 rate limit)
            await sleep(100);
            continue;
          }

          const data = await res.json();
          const assignee = Array.isArray(data.assignees) && data.assignees.length > 0 ? data.assignees[0] : null;
          const labels: any[] = Array.isArray(data.labels) ? data.labels : [];
          let priority: string | null = null;
          for (const l of labels) {
            const n: string = (typeof l === 'string' ? l : l?.name || '').toLowerCase();
            if (n.startsWith('priority/') || n.startsWith('priority-')) {
              priority = n.split(/[/-]/)[1] || null;
              break;
            }
          }

          const { error: _omitErr, ...rest } = item as any;
          // f014 — login (username) 대신 GitHub User.name (실명) 우선 사용.
          // nameCache 로 같은 project 안 동일 login 반복 조회 방지. 실명 null 이면
          // login fallback (미설정 유저 대응).
          const assigneeDisplayName = await resolveAssigneeDisplayName(
            assignee?.login ?? null,
            settings.token,
            nameCache,
          );
          merged.push({
            ...rest,
            state: data.state || null,
            priority,
            assignee_login: assignee?.login || null,
            assignee_display_name: assigneeDisplayName,
            assignee_avatar_url: assignee?.avatar_url || null,
            url: data.html_url || item.url || null,
            last_synced_at: nowIso,
          });

          await admin.from('github_sync_log').insert({
            project_id: projectId,
            github_issue_number: String(item.number),
            github_repo: `${owner}/${repo}`,
            direction: 'inbound',
            success: true,
            testably_run_id: row.run_id,
          }).then(() => null, () => null);
          await sleep(100);
        }

        const { error: updErr } = await admin
          .from('test_results')
          .update({ github_issues: merged })
          .eq('id', row.id);
        if (!updErr) synced += 1;
      }
    }

    return jsonResp({ success: true, synced_count: synced, failed_keys: failed, skipped_fresh: 0 });
  } catch (err: any) {
    console.error('[sync-github-metadata] unhandled:', err);
    return jsonResp({ success: false, error: err?.message || 'Internal error' }, 500);
  }
});

function jsonResp(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
