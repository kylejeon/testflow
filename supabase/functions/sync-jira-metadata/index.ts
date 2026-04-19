// sync-jira-metadata Edge Function
// -----------------------------------------------------------------------------
// Pulls priority / status / assignee metadata from Jira for all test_results
// whose `jira_issues_meta` JSONB contains one or more keys, then updates the
// JSONB element with the fresh values and a `last_synced_at` timestamp.
//
// Called by:
//  - pg_cron every 6 hours (scope=all, only_stale=true) — auth via `x-cron-secret` header
//  - Manual refresh from IssuesList component (scope=run_ids) — auth via user JWT
//
// Auth (hybrid):
//   - `x-cron-secret: <CRON_SECRET>` → trusted cron caller, all projects.
//   - Bearer JWT → user must have Tester+ membership on every project whose
//     data is touched. `scope=all` is narrowed down to the caller's projects.
//
// Related spec: dev-spec §4-1-A, §6-1 (C). QA Blocker #1 fix (2026-04-19).
// -----------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  verifySyncCaller,
  getAuthorizedProjectIds,
  AuthError,
  SYNC_ALLOWED_ROLES,
} from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface SyncBody {
  scope?: 'all' | 'run_ids' | 'project_id';
  run_ids?: string[];
  project_id?: string;
  only_stale?: boolean;
}

const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6h

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
      // If scope=project_id, enforce caller has access to it.
      if (scope === 'project_id' && body.project_id && !authorizedProjectIds.includes(body.project_id)) {
        return jsonResp({ success: false, error: 'Forbidden — project not accessible' }, 403);
      }
    }

    // 1. Select candidate test_results
    let resultsQuery = admin
      .from('test_results')
      .select('id, run_id, jira_issues_meta, test_runs!inner(project_id, milestone_id)')
      .not('jira_issues_meta', 'is', null);

    if (scope === 'run_ids' && Array.isArray(body.run_ids) && body.run_ids.length > 0) {
      resultsQuery = resultsQuery.in('run_id', body.run_ids);
    } else if (scope === 'project_id' && body.project_id) {
      resultsQuery = resultsQuery.eq('test_runs.project_id', body.project_id);
    } else if (caller.kind === 'user' && authorizedProjectIds) {
      // scope=all for user → narrow to their projects
      resultsQuery = resultsQuery.in('test_runs.project_id', authorizedProjectIds);
    }
    resultsQuery = resultsQuery.limit(500);

    const { data: rows, error: rowsErr } = await resultsQuery;
    if (rowsErr) {
      console.error('[sync-jira-metadata] select error:', rowsErr);
      return jsonResp({ success: false, error: rowsErr.message }, 500);
    }

    // For user callers, also drop any row whose project they're not authorized for
    // (defence-in-depth against scope=run_ids with runs from unrelated projects).
    const authorizedSet = authorizedProjectIds ? new Set(authorizedProjectIds) : null;

    // 2. Group by project_id → fetch jira_settings → fetch issues in bulk
    const byProject = new Map<string, Array<{ resultId: string; key: string; idx: number }>>();
    const resultSnapshots = new Map<string, any[]>();
    const nowIso = new Date().toISOString();
    const now = Date.now();

    (rows || []).forEach((row: any) => {
      const meta: any[] = Array.isArray(row.jira_issues_meta) ? row.jira_issues_meta : [];
      resultSnapshots.set(row.id, meta);
      const projectId: string = row.test_runs?.project_id;
      if (!projectId) return;
      if (authorizedSet && !authorizedSet.has(projectId)) return;
      meta.forEach((m: any, i: number) => {
        if (!m?.key) return;
        if (onlyStale && m.last_synced_at) {
          const lastSync = new Date(m.last_synced_at).getTime();
          if (!isNaN(lastSync) && now - lastSync < STALE_THRESHOLD_MS) return;
        }
        const arr = byProject.get(projectId) || [];
        arr.push({ resultId: row.id, key: m.key, idx: i });
        byProject.set(projectId, arr);
      });
    });

    let synced = 0;
    const failed: string[] = [];

    for (const [projectId, items] of byProject.entries()) {
      // jira_settings is per-user (user_id keyed), not per-project.
      // Find a project member whose jira_settings are configured — prefer
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

      let settings: { domain: string; email: string; api_token: string } | null = null;
      if (memberIds.length > 0) {
        const { data: candidateSettings } = await admin
          .from('jira_settings')
          .select('user_id, domain, email, api_token')
          .in('user_id', memberIds);
        if (Array.isArray(candidateSettings) && candidateSettings.length > 0) {
          const byUser = new Map(candidateSettings.map((s: any) => [s.user_id, s]));
          for (const uid of memberIds) {
            const s: any = byUser.get(uid);
            if (s?.domain && s?.email && s?.api_token) {
              settings = { domain: s.domain, email: s.email, api_token: s.api_token };
              break;
            }
          }
        }
      }

      if (!settings?.domain || !settings?.email || !settings?.api_token) {
        failed.push(...items.map(it => `${it.key}(no jira_settings)`));
        continue;
      }

      const cleanDomain = String(settings.domain).replace(/^https?:?\/?\/?\/?/i, '').replace(/\/+$/, '').trim();
      const auth = btoa(`${settings.email}:${settings.api_token}`);

      // Bulk fetch via JQL: key in (...)
      const uniqueKeys = Array.from(new Set(items.map(it => it.key)));
      // Batch 50 at a time (JQL limit)
      const metaByKey = new Map<string, any>();
      for (let i = 0; i < uniqueKeys.length; i += 50) {
        const batch = uniqueKeys.slice(i, i + 50);
        const jql = `key in (${batch.map(k => `"${k}"`).join(',')})`;
        const url = `https://${cleanDomain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=priority,status,assignee&maxResults=50`;

        let attempt = 0;
        let res: Response | null = null;
        while (attempt < 3) {
          res = await fetch(url, {
            headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
          });
          if (res.status !== 429) break;
          await sleep(1000 * Math.pow(2, attempt));
          attempt++;
        }
        if (!res || !res.ok) {
          batch.forEach(k => failed.push(k));
          continue;
        }
        const data = await res.json();
        const issues: any[] = Array.isArray(data?.issues) ? data.issues : [];
        issues.forEach(iss => {
          const key = iss.key;
          metaByKey.set(key, {
            priority: iss.fields?.priority?.name || null,
            status: iss.fields?.status?.name || null,
            assignee_account_id: iss.fields?.assignee?.accountId || null,
            assignee_display_name: iss.fields?.assignee?.displayName || null,
            assignee_avatar_url: iss.fields?.assignee?.avatarUrls?.['48x48'] || null,
            url: `https://${cleanDomain}/browse/${key}`,
            last_synced_at: nowIso,
          });
        });
        // Mark keys that weren't returned as "not_found"
        for (const k of batch) {
          if (!metaByKey.has(k)) {
            metaByKey.set(k, { error: 'not_found', last_synced_at: nowIso });
          }
        }
      }

      // 3. Apply updates per test_result
      const resultIdsTouched = new Set(items.map(it => it.resultId));
      for (const resultId of resultIdsTouched) {
        const baseMeta = resultSnapshots.get(resultId) || [];
        const merged = baseMeta.map((m: any) => {
          if (!m?.key || !metaByKey.has(m.key)) return m;
          const fresh = metaByKey.get(m.key);
          if (fresh.error === 'not_found') {
            return { ...m, error: 'not_found', last_synced_at: fresh.last_synced_at };
          }
          // Remove error flag if present
          const { error: _omit, ...rest } = m as any;
          return { ...rest, ...fresh };
        });
        const { error: updErr } = await admin
          .from('test_results')
          .update({ jira_issues_meta: merged })
          .eq('id', resultId);
        if (!updErr) synced += 1;
      }

      // 4. Sync log
      try {
        for (const it of items) {
          const fresh = metaByKey.get(it.key);
          await admin.from('jira_sync_log').insert({
            project_id: projectId,
            jira_issue_key: it.key,
            direction: 'inbound',
            success: !fresh?.error,
            error_message: fresh?.error ?? null,
          });
        }
      } catch (logErr) {
        console.warn('[sync-jira-metadata] log insert failed:', logErr);
      }
    }

    return jsonResp({ success: true, synced_count: synced, failed_keys: failed, skipped_fresh: 0 });
  } catch (err: any) {
    console.error('[sync-jira-metadata] unhandled:', err);
    return jsonResp({ success: false, error: err?.message || 'Internal error' }, 500);
  }
});

function jsonResp(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
