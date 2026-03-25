import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

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

/** UUID 형식인지 확인 */
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Professional 이상 티어인지 확인 (subscription_tier >= 3) */
async function checkProfessionalTier(supabase: ReturnType<typeof createClient>, userId: string): Promise<{ allowed: boolean; tier: number }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_tier, is_trial, trial_ends_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return { allowed: false, tier: 0 };
  }

  let tier = data.subscription_tier || 1;
  const isTrial = data.is_trial || false;

  // 체험 기간 만료 여부 확인
  if (isTrial && data.trial_ends_at) {
    const now = new Date();
    const trialEnd = new Date(data.trial_ends_at);
    if (now > trialEnd) {
      // 만료된 체험 → Free 티어로 처리
      tier = 1;
    }
  }

  // Professional(3) 이상이어야 CI/CD 사용 가능
  return { allowed: tier >= 3, tier };
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // POST 메서드만 허용
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('ci_tokens')
      .select('id, user_id')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ 구독 티어 검증 — Professional(3) 이상만 허용
    const { allowed, tier } = await checkProfessionalTier(supabase, tokenData.user_id);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'CI/CD integration requires a Professional plan or higher.',
          current_tier: tier,
          required_tier: 3,
          message: '현재 구독 플랜에서는 CI/CD 기능을 사용할 수 없습니다. Professional 이상으로 업그레이드하세요.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at
    await supabase
      .from('ci_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    const body: RequestBody = await req.json();
    const { run_id, results, format = 'json', junit_xml } = body;

    if (!run_id) {
      return new Response(
        JSON.stringify({ error: 'run_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify run exists and user has access
    const { data: runData, error: runError } = await supabase
      .from('test_runs')
      .select('id, project_id')
      .eq('id', run_id)
      .maybeSingle();

    if (runError || !runData) {
      return new Response(
        JSON.stringify({ error: 'Run not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user has access to project
    const { data: memberData } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', runData.project_id)
      .eq('user_id', tokenData.user_id)
      .maybeSingle();

    if (!memberData) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedResults: TestResult[] = [];

    // Parse results based on format
    if (format === 'junit' && junit_xml) {
      parsedResults = parseJUnitXML(junit_xml);
    } else if (results && Array.isArray(results)) {
      parsedResults = results;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid results format. Provide either results array or junit_xml' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (parsedResults.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No test results to upload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // custom_id → UUID 변환
    const customIds = parsedResults
      .map(r => r.test_case_id)
      .filter(id => !isUUID(id));

    let customIdMap: Record<string, string> = {};

    if (customIds.length > 0) {
      const { data: tcRows, error: tcError } = await supabase
        .from('test_cases')
        .select('id, custom_id')
        .eq('project_id', runData.project_id)
        .in('custom_id', customIds);

      if (tcError) {
        console.error('custom_id 조회 오류:', tcError);
        return new Response(
          JSON.stringify({ error: 'Failed to resolve custom test case IDs', details: tcError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      for (const row of (tcRows || [])) {
        if (row.custom_id) {
          customIdMap[row.custom_id] = row.id;
        }
      }

      const notFound = customIds.filter(cid => !customIdMap[cid]);
      if (notFound.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'Some test case IDs could not be found in this project',
            not_found: notFound,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // test_case_id를 UUID로 변환
    const resolvedResults = parsedResults.map(result => ({
      ...result,
      test_case_id: isUUID(result.test_case_id)
        ? result.test_case_id
        : customIdMap[result.test_case_id],
    }));

    // Fetch existing results to determine resolved_at for transitions
    const tcIds = resolvedResults.map(r => r.test_case_id).filter(Boolean);
    let existingStatusMap: Record<string, string> = {};
    if (tcIds.length > 0) {
      const { data: existingResults } = await supabase
        .from('test_results')
        .select('test_case_id, status')
        .eq('run_id', run_id)
        .in('test_case_id', tcIds);
      (existingResults ?? []).forEach(r => {
        existingStatusMap[r.test_case_id] = r.status;
      });
    }

    const now = new Date().toISOString();

    // Insert/update test results
    const resultsToInsert = resolvedResults.map(result => {
      const prevStatus = existingStatusMap[result.test_case_id];
      const isResolution = (result.status === 'passed' || result.status === 'retest')
        && (prevStatus === 'failed' || prevStatus === 'blocked');
      return {
        run_id,
        test_case_id: result.test_case_id,
        status: result.status,
        note: result.note || '',
        elapsed: result.elapsed || 0,
        author: result.author || 'CI/CD',
        ...(isResolution ? { resolved_at: now } : {}),
      };
    });

    const { error: insertError } = await supabase
      .from('test_results')
      .upsert(resultsToInsert, {
        onConflict: 'run_id,test_case_id',
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save test results', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update run statistics
    const stats = {
      passed: resolvedResults.filter(r => r.status === 'passed').length,
      failed: resolvedResults.filter(r => r.status === 'failed').length,
      blocked: resolvedResults.filter(r => r.status === 'blocked').length,
      untested: resolvedResults.filter(r => r.status === 'untested').length,
    };

    const { error: updateError } = await supabase
      .from('test_runs')
      .update({
        passed: stats.passed,
        failed: stats.failed,
        blocked: stats.blocked,
        untested: stats.untested,
        updated_at: new Date().toISOString(),
      })
      .eq('id', run_id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test results uploaded successfully',
        stats,
        uploaded_count: resolvedResults.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        if (idProp) {
          testCaseId = idProp.getAttribute('value') || '';
        }
      }

      if (!testCaseId) {
        const customMatch = name.match(/[A-Z]+-\d+/i);
        const uuidMatch = name.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (customMatch) {
          testCaseId = customMatch[0];
        } else if (uuidMatch) {
          testCaseId = uuidMatch[0];
        }
      }

      if (!testCaseId) {
        console.warn(`Skipping testcase without ID: ${name}`);
        return;
      }

      let status: 'passed' | 'failed' | 'blocked' | 'untested' = 'passed';
      let note = '';

      const failure = testcase.querySelector('failure');
      const error = testcase.querySelector('error');
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
