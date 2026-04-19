// sync-jira-metadata Edge Function
// -----------------------------------------------------------------------------
// Pulls priority / status / assignee metadata from Jira for all test_results
// whose `jira_issues_meta` JSONB contains one or more keys, then updates the
// JSONB element with the fresh values and a `last_synced_at` timestamp.
//
// Called by:
//  - pg_cron every 6 hours (scope=all, only_stale=true)
//  - Manual refresh from IssuesList component (scope=run_ids)
//
// Related spec: dev-spec §4-1-A, §6-1 (C).
// -----------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const body: SyncBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const scope = body.scope || 'all';
    const onlyStale = body.only_stale !== false;

    // 1. Select candidate test_results
    let resultsQuery = admin
      .from('test_results')
      .select('id, run_id, jira_issues_meta, test_runs!inner(project_id, milestone_id)')
      .not('jira_issues_meta', 'is', null);

    if (scope === 'run_ids' && Array.isArray(body.run_ids) && body.run_ids.length > 0) {
      resultsQuery = resultsQuery.in('run_id', body.run_ids);
    } else if (scope === 'project_id' && body.project_id) {
      resultsQuery = resultsQuery.eq('test_runs.project_id', body.project_id);
    }
    resultsQuery = resultsQuery.limit(500);

    const { data: rows, error: rowsErr } = await resultsQuery;
    if (rowsErr) {
      console.error('[sync-jira-metadata] select error:', rowsErr);
      return jsonResp({ success: false, error: rowsErr.message }, 500);
    }

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
      const { data: settings } = await admin
        .from('jira_settings')
        .select('domain, email, api_token')
        .eq('project_id', projectId)
        .maybeSingle();

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
