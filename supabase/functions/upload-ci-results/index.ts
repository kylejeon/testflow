import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';
import { checkRateLimit, rateLimitResponse, addRateLimitHeaders, RATE_CONFIGS } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TestResult {
  test_case_id: string;
  status: 'passed' | 'failed' | 'blocked' | 'untested';
  note?: string;
  elapsed?: number;
  author?: string;
}

interface RequestBody {
  run_id: string;
  results?: TestResult[];
  format?: 'json' | 'junit';
  junit_xml?: string;
}

interface UploadRecord {
  run_id: string;
  test_case_id: string;
  status: string;
  note: string;
  elapsed: number;
  author: string;
  resolved_at?: string;
}

interface DlqEntry {
  run_id: string;
  ci_token_id: string;
  user_id: string;
  raw_record: UploadRecord;
  error_message: string;
  error_code?: string;
}

/** UUID 형식인지 확인 */
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Professional 이상 티어인지 확인 (subscription_tier >= 3) */
async function checkProfessionalTier(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ allowed: boolean; tier: number }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_tier, is_trial, trial_ends_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return { allowed: false, tier: 0 };

  let tier = data.subscription_tier || 1;
  if (data.is_trial && data.trial_ends_at) {
    if (new Date() > new Date(data.trial_ends_at)) tier = 1;
  }
  return { allowed: tier >= 3, tier };
}

/**
 * 벌크 upsert 시도 → 실패 시 개별 upsert fallback (Partial Success)
 * 개별 실패 레코드는 DLQ에 기록
 *
 * 반환: { succeeded: UploadRecord[], failed: DlqEntry[] }
 */
async function upsertWithPartialSuccess(
  supabase: ReturnType<typeof createClient>,
  records: UploadRecord[],
  ciTokenId: string,
  userId: string,
): Promise<{ succeeded: UploadRecord[]; failed: DlqEntry[] }> {
  // ── Fast path: 벌크 upsert ────────────────────────────────
  const { error: bulkError } = await supabase
    .from('test_results')
    .upsert(records, { onConflict: 'run_id,test_case_id' });

  if (!bulkError) {
    return { succeeded: records, failed: [] };
  }

  // ── Slow path: 개별 upsert fallback ──────────────────────
  console.warn(`[upload-ci-results] Bulk upsert failed (${bulkError.message}), falling back to individual upserts`);

  const succeeded: UploadRecord[] = [];
  const failed: DlqEntry[] = [];

  for (const record of records) {
    const { error: singleError } = await supabase
      .from('test_results')
      .upsert(record, { onConflict: 'run_id,test_case_id' });

    if (singleError) {
      failed.push({
        run_id:       record.run_id,
        ci_token_id:  ciTokenId,
        user_id:      userId,
        raw_record:   record,
        error_message: singleError.message,
        error_code:   singleError.code,
      });
    } else {
      succeeded.push(record);
    }
  }

  return { succeeded, failed };
}

/** 실패 레코드를 DLQ에 저장 (서비스 롤 클라이언트 사용) */
async function writeToDlq(
  supabase: ReturnType<typeof createClient>,
  entries: DlqEntry[],
): Promise<void> {
  if (entries.length === 0) return;

  const rows = entries.map(e => ({
    run_id:        e.run_id,
    ci_token_id:   e.ci_token_id,
    user_id:       e.user_id,
    raw_record:    e.raw_record,
    error_message: e.error_message,
    error_code:    e.error_code ?? null,
    status:        'pending',
  }));

  const { error } = await supabase.from('failed_uploads_dlq').insert(rows);
  if (error) {
    // DLQ 저장 실패는 로그만 남김 — 응답 자체를 막지 않음
    console.error('[upload-ci-results] DLQ write failed:', error.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl      = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── CI 토큰 검증 ──────────────────────────────────────────
    const { data: tokenData, error: tokenError } = await supabase
      .from('ci_tokens')
      .select('id, user_id')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 구독 티어 검증 ────────────────────────────────────────
    const { allowed, tier } = await checkProfessionalTier(supabase, tokenData.user_id);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'CI/CD integration requires a Professional plan or higher.',
          current_tier: tier,
          required_tier: 3,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Rate Limiting ─────────────────────────────────────────
    const rlConfig = RATE_CONFIGS['ci_upload'];
    const rlResult = await checkRateLimit(supabase, tokenData.id, 'ci_upload', rlConfig);
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult, corsHeaders);
    }

    // last_used_at 갱신 (비동기, 응답 지연 없음)
    supabase.from('ci_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenData.id)
      .then(() => {});

    const body: RequestBody = await req.json();
    const { run_id, results, format = 'json', junit_xml } = body;

    if (!run_id) {
      return new Response(
        JSON.stringify({ error: 'run_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Run 존재 & 접근 권한 확인 ─────────────────────────────
    const { data: runData, error: runError } = await supabase
      .from('test_runs')
      .select('id, project_id')
      .eq('id', run_id)
      .maybeSingle();

    if (runError || !runData) {
      return new Response(
        JSON.stringify({ error: 'Run not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: memberData } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', runData.project_id)
      .eq('user_id', tokenData.user_id)
      .maybeSingle();

    if (!memberData) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 결과 파싱 ─────────────────────────────────────────────
    let parsedResults: TestResult[] = [];
    if (format === 'junit' && junit_xml) {
      parsedResults = parseJUnitXML(junit_xml);
    } else if (results && Array.isArray(results)) {
      parsedResults = results;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid results format. Provide either results array or junit_xml' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (parsedResults.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No test results to upload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── custom_id → UUID 변환 ─────────────────────────────────
    const customIds = parsedResults.map(r => r.test_case_id).filter(id => !isUUID(id));
    const customIdMap: Record<string, string> = {};

    if (customIds.length > 0) {
      const { data: tcRows, error: tcError } = await supabase
        .from('test_cases')
        .select('id, custom_id')
        .eq('project_id', runData.project_id)
        .in('custom_id', customIds);

      if (tcError) {
        return new Response(
          JSON.stringify({ error: 'Failed to resolve custom test case IDs', details: tcError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      for (const row of (tcRows || [])) {
        if (row.custom_id) customIdMap[row.custom_id] = row.id;
      }

      const notFound = customIds.filter(cid => !customIdMap[cid]);
      if (notFound.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Some test case IDs could not be found in this project', not_found: notFound }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // UUID로 변환
    const resolvedResults = parsedResults.map(r => ({
      ...r,
      test_case_id: isUUID(r.test_case_id) ? r.test_case_id : customIdMap[r.test_case_id],
    }));

    // ── 기존 결과 조회 (resolved_at 전이 판단용) ──────────────
    const tcIds = resolvedResults.map(r => r.test_case_id).filter(Boolean);
    const existingStatusMap: Record<string, string> = {};
    if (tcIds.length > 0) {
      const { data: existingResults } = await supabase
        .from('test_results')
        .select('test_case_id, status')
        .eq('run_id', run_id)
        .in('test_case_id', tcIds);
      (existingResults ?? []).forEach(r => { existingStatusMap[r.test_case_id] = r.status; });
    }

    const now = new Date().toISOString();
    const recordsToInsert: UploadRecord[] = resolvedResults.map(result => {
      const prevStatus = existingStatusMap[result.test_case_id];
      const isResolution = (result.status === 'passed' || result.status === 'retest')
        && (prevStatus === 'failed' || prevStatus === 'blocked');
      return {
        run_id,
        test_case_id: result.test_case_id,
        status:       result.status,
        note:         result.note || '',
        elapsed:      result.elapsed || 0,
        author:       result.author || 'CI/CD',
        ...(isResolution ? { resolved_at: now } : {}),
      };
    });

    // ── Partial Success upsert + DLQ ──────────────────────────
    const { succeeded, failed } = await upsertWithPartialSuccess(
      supabase,
      recordsToInsert,
      tokenData.id,
      tokenData.user_id,
    );

    // 실패 레코드 DLQ 저장 (비동기)
    await writeToDlq(supabase, failed);

    // ── Run 통계 업데이트 ─────────────────────────────────────
    const stats = {
      passed:   succeeded.filter(r => r.status === 'passed').length,
      failed:   succeeded.filter(r => r.status === 'failed').length,
      blocked:  succeeded.filter(r => r.status === 'blocked').length,
      untested: succeeded.filter(r => r.status === 'untested').length,
    };

    await supabase
      .from('test_runs')
      .update({ ...stats, updated_at: now })
      .eq('id', run_id);

    // ── 응답 ──────────────────────────────────────────────────
    const hasPartialFailure = failed.length > 0;
    const responseHeaders = addRateLimitHeaders(
      { ...corsHeaders, 'Content-Type': 'application/json' },
      rlResult,
      rlConfig,
    );

    return new Response(
      JSON.stringify({
        success:        true,
        partial_failure: hasPartialFailure,
        message:        hasPartialFailure
          ? `Uploaded ${succeeded.length} records. ${failed.length} records failed and were queued for retry.`
          : 'All test results uploaded successfully.',
        stats,
        uploaded_count: succeeded.length,
        failed_count:   failed.length,
        // 실패한 test_case_id 목록 반환 (재업로드 안내용)
        ...(hasPartialFailure && {
          failed_test_case_ids: failed.map(f => f.raw_record.test_case_id),
        }),
      }),
      // 부분 성공: 207 Multi-Status, 전체 성공: 200
      { status: hasPartialFailure ? 207 : 200, headers: responseHeaders },
    );

  } catch (error) {
    console.error('[upload-ci-results] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

function parseJUnitXML(xml: string): TestResult[] {
  const results: TestResult[] = [];

  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (!doc) return results;

    const testcases = doc.querySelectorAll('testcase');

    testcases.forEach((testcase) => {
      const name = testcase.getAttribute('name') || '';
      const time = parseFloat(testcase.getAttribute('time') || '0');

      let testCaseId = '';
      const properties = testcase.querySelector('properties');
      if (properties) {
        const idProp = properties.querySelector('property[name="test_case_id"]');
        if (idProp) testCaseId = idProp.getAttribute('value') || '';
      }

      if (!testCaseId) {
        const customMatch = name.match(/[A-Z]+-\d+/i);
        const uuidMatch   = name.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (customMatch)    testCaseId = customMatch[0];
        else if (uuidMatch) testCaseId = uuidMatch[0];
      }

      if (!testCaseId) {
        console.warn(`Skipping testcase without ID: ${name}`);
        return;
      }

      let status: 'passed' | 'failed' | 'blocked' | 'untested' = 'passed';
      let note = '';

      const failure = testcase.querySelector('failure');
      const error   = testcase.querySelector('error');
      const skipped = testcase.querySelector('skipped');

      if (failure) {
        status = 'failed';
        note = failure.getAttribute('message') || failure.textContent || 'Test failed';
      } else if (error) {
        status = 'failed';
        note = error.getAttribute('message') || error.textContent || 'Test error';
      } else if (skipped) {
        status = 'blocked';
        note = skipped.getAttribute('message') || 'Test skipped';
      }

      results.push({
        test_case_id: testCaseId,
        status,
        note: note.substring(0, 1000),
        elapsed: Math.round(time * 1000),
        author: 'CI/CD',
      });
    });
  } catch (error) {
    console.error('Error parsing JUnit XML:', error);
  }

  return results;
}
