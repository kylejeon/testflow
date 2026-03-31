# Dev2 개발 지시서 — 홈페이지 미구현 기능 P0 착수

**발신:** PM
**수신:** Dev2
**일시:** 2026-03-31
**상세 기획서:** `/Users/yonghyuk/testflow/pm/pm-plan-unimplemented-homepage-features.html`

---

## 작업 개요

홈페이지에 소개된 기능 중 **12건이 미구현/부분 구현** 상태.
P0 항목 4건부터 즉시 착수. **아래 순서대로** 진행.

---

## Task 1: "View Demo" 버튼 스크롤 앵커 (0.5일)

### 문제
Hero 섹션 "View Demo" 버튼이 `/auth`로 리다이렉트.
실제 데모가 없어 사용자 기대와 불일치.

### 수정 파일
**`src/pages/home/page.tsx` line ~1035**

```tsx
// 변경 전 (line ~1035):
onClick={() => navigate('/auth')}

// 변경 후:
onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
```

그리고 Features 섹션 (`featuresSection`)에 `id="features"` 추가:
```tsx
// line ~1100 부근, features 섹션 시작 div:
<section id="features" className="...">
```

---

## Task 2: 홈페이지/Features 카피 정정 (0.5일)

### 수정 파일 1: `src/pages/features/page.tsx`
| 줄 | 현재 | 변경 |
|-----|------|------|
| 13 | `'Structured folder hierarchy with drag-and-drop'` | `'Structured folder hierarchy'` |
| 16 | `'Preconditions and postconditions'` | `'Preconditions'` |
| 33 | `'Estimated workload tracking'` | 해당 줄 삭제 |
| 94 | `'Visual timeline view'` | 해당 줄 삭제 |
| 126 | `'Jira Cloud and Data Center support'` | `'Jira Cloud support'` |
| 128 | `'Bidirectional status sync'` | `'One-click Jira issue creation'` |
| 129 | `'Custom field mapping'` | 해당 줄 삭제 |

### 수정 파일 2: `src/pages/home/page.tsx`

| 줄 | 현재 | 변경 |
|-----|------|------|
| 107 | `'Automatically create Jira issues when tests fail. Map custom fields, sync status bidirectionally...'` | `'Create Jira issues directly from failed tests with full context — steps, screenshots, and environment info.'` |
| 170 | `'jiraTags: [... "Bidirectional sync", "Custom field mapping" ...]'` | `jiraTags: ['Auto issue creation', 'Project linking']` (2개 태그 제거) |
| 321 | `'including Slack, Discord, Microsoft Teams'` | `'including Slack and Microsoft Teams'` |

---

## Task 3: Jira 자동 이슈 생성 (3일) — **핵심 P0**

### 문제
홈페이지: "Automatically creates a Jira issue when tests fail"
실제: run-detail에서 사용자가 수동으로 "Create Jira Issue" 버튼 클릭

### 3-1. DB 마이그레이션 (신규 파일)
`supabase/migrations/YYYYMMDD_jira_auto_create.sql`:
```sql
ALTER TABLE jira_settings
  ADD COLUMN auto_create_on_failure TEXT DEFAULT 'disabled'
  CHECK (auto_create_on_failure IN ('disabled', 'all_failures', 'first_failure_only'));
```

### 3-2. Settings UI 변경

**파일:** `src/pages/settings/page.tsx` — Integrations 탭 → Jira 섹션

Jira 연동 설정 영역 하단에 추가:
```tsx
{/* Auto-create Issue on Failure */}
<div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
  <h4 className="text-sm font-semibold text-gray-900 mb-2">
    Auto-create Jira Issue
  </h4>
  <p className="text-xs text-gray-500 mb-3">
    Automatically create a Jira issue when a test case is marked as Failed.
  </p>
  <select
    value={jiraSettings.auto_create_on_failure || 'disabled'}
    onChange={(e) => handleUpdateJiraSetting('auto_create_on_failure', e.target.value)}
    className="w-full px-3 py-2 border rounded-lg text-sm"
  >
    <option value="disabled">Disabled (manual only)</option>
    <option value="all_failures">Create for all failures</option>
    <option value="first_failure_only">Create for first failure only</option>
  </select>
</div>
```

### 3-3. 자동 생성 트리거 로직

**파일:** `src/pages/run-detail/page.tsx` — `handleStatusUpdate` 함수 내부

현재 `handleStatusUpdate`에서 test_results에 INSERT 후, 자동 생성 로직 추가:

```tsx
// handleStatusUpdate 함수 내부, test_results INSERT 성공 후:
if (newStatus === 'failed' && jiraSettings?.auto_create_on_failure !== 'disabled') {
  // 중복 체크: 이 TC+Run에 이미 Jira issue가 있는지
  const existingIssues = latestResult?.issues || [];
  const shouldCreate =
    jiraSettings.auto_create_on_failure === 'all_failures' ||
    (jiraSettings.auto_create_on_failure === 'first_failure_only' && existingIssues.length === 0);

  if (shouldCreate) {
    try {
      const { data } = await supabase.functions.invoke('create-jira-issue', {
        body: {
          domain: jiraSettings.domain,
          email: jiraSettings.email,
          apiToken: jiraSettings.api_token,
          projectKey: jiraSettings.project_key,
          summary: `[Auto] Test Failed: ${currentTestCase.title}`,
          description: buildAutoJiraDescription(currentTestCase, run),
          issueType: jiraSettings.issue_type || 'Bug',
          priority: mapTestPriorityToJira(currentTestCase.priority),
        },
      });
      if (data?.success && data?.issue?.key) {
        // test_results.issues 배열에 자동 추가
        await supabase.from('test_results')
          .update({ issues: [...existingIssues, data.issue.key] })
          .eq('id', newResultId);
        // 사용자에게 토스트 알림
        showToast(`Jira issue ${data.issue.key} auto-created`, 'success');
      }
    } catch (err) {
      console.warn('Auto Jira issue creation failed:', err);
    }
  }
}
```

### 3-4. 헬퍼 함수 추가 (같은 파일 상단)

```tsx
function buildAutoJiraDescription(tc: TestCase, run: Run): string {
  const steps = tc.steps?.map((s, i) =>
    `Step ${i+1}: ${s.action}\nExpected: ${s.expected}`
  ).join('\n\n') || 'No steps defined';

  return `*Auto-created by Testably*\n\n` +
    `Test Case: ${tc.title}\n` +
    `Run: ${run.name}\n` +
    `Priority: ${tc.priority || 'Medium'}\n\n` +
    `--- Steps ---\n${steps}\n\n` +
    (tc.precondition ? `--- Precondition ---\n${tc.precondition}` : '');
}

function mapTestPriorityToJira(priority?: string): string {
  const map: Record<string, string> = {
    critical: 'Highest', high: 'High', medium: 'Medium', low: 'Low'
  };
  return map[priority?.toLowerCase() || 'medium'] || 'Medium';
}
```

### 3-5. jiraSettings fetch 수정

`fetchJiraSettings` 함수에서 `auto_create_on_failure` 필드도 함께 조회하도록 select문 수정:
```tsx
// settings/page.tsx 또는 run-detail에서 jira 설정 fetch 시:
.select('domain, email, api_token, project_key, issue_type, auto_create_on_failure')
```

---

## Task 4: Jira 커스텀 필드 매핑 (3일) — **핵심 P0**

### 문제
홈페이지: "Map custom fields, choose which custom fields to populate"
실제: create-jira-issue Edge Function에 summary/description/priority/labels만 하드코딩

### 4-1. 신규 Edge Function: `fetch-jira-fields`

**파일:** `supabase/functions/fetch-jira-fields/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { domain, email, apiToken, projectKey } = await req.json();

  // Jira REST API: 프로젝트의 이슈 생성 메타데이터 가져오기
  const auth = btoa(`${email}:${apiToken}`);
  const resp = await fetch(
    `https://${domain}/rest/api/3/issue/createmeta/${projectKey}/issuetypes`,
    { headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' } }
  );

  if (!resp.ok) {
    return new Response(JSON.stringify({ error: 'Failed to fetch Jira fields' }), {
      status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const data = await resp.json();
  // 각 issueType의 fields 목록 추출
  const fields = data.values?.flatMap((it: any) =>
    Object.entries(it.fields || {}).map(([key, meta]: [string, any]) => ({
      id: key,
      name: meta.name,
      required: meta.required,
      type: meta.schema?.type,
      custom: key.startsWith('customfield_'),
    }))
  ) || [];

  // 중복 제거
  const unique = [...new Map(fields.map((f: any) => [f.id, f])).values()];

  return new Response(JSON.stringify({ fields: unique }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

### 4-2. DB 마이그레이션

`supabase/migrations/YYYYMMDD_jira_field_mappings.sql`:
```sql
ALTER TABLE jira_settings
  ADD COLUMN field_mappings JSONB DEFAULT '[]';
-- 형태: [{"testably_field":"tc_priority","jira_field_id":"priority","jira_field_name":"Priority"}, ...]
```

### 4-3. Settings UI — 필드 매핑 카드

**파일:** `src/pages/settings/page.tsx` — Integrations 탭 Jira 섹션 하단

Jira 연결 완료 상태일 때만 표시:
```tsx
{jiraSettings?.domain && (
  <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-semibold text-gray-900">Field Mapping</h4>
      <button
        onClick={handleFetchJiraFields}
        className="text-xs font-medium px-3 py-1.5 rounded-md border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
      >
        <i className="ri-refresh-line mr-1" />Fetch Jira Fields
      </button>
    </div>

    {/* 기본 매핑 (읽기 전용) */}
    <table className="w-full text-xs mb-3">
      <thead>
        <tr className="text-gray-500 border-b">
          <th className="text-left py-1.5">Testably Field</th>
          <th className="text-left py-1.5">→</th>
          <th className="text-left py-1.5">Jira Field</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Test Case Title</td><td>→</td><td className="text-gray-400">summary (auto)</td></tr>
        <tr><td>Description + Steps</td><td>→</td><td className="text-gray-400">description (auto)</td></tr>
        <tr><td>Priority</td><td>→</td><td className="text-gray-400">priority (auto)</td></tr>
      </tbody>
    </table>

    {/* 커스텀 매핑 */}
    {(jiraSettings.field_mappings || []).map((mapping, idx) => (
      <div key={idx} className="flex items-center gap-2 mb-2">
        <select className="flex-1 text-xs px-2 py-1.5 border rounded">
          <option value="tc_tags">Tags</option>
          <option value="tc_precondition">Precondition</option>
          <option value="milestone_name">Milestone Name</option>
          <option value="run_name">Run Name</option>
          <option value="custom_text">Custom Text</option>
        </select>
        <span className="text-gray-400">→</span>
        <select className="flex-1 text-xs px-2 py-1.5 border rounded">
          {availableJiraFields.map(f => (
            <option key={f.id} value={f.id}>{f.name} {f.custom ? '(custom)' : ''}</option>
          ))}
        </select>
        <button onClick={() => removeFieldMapping(idx)} className="text-red-400 hover:text-red-600">
          <i className="ri-delete-bin-line" />
        </button>
      </div>
    ))}
    <button onClick={addFieldMapping} className="text-xs text-indigo-600 font-medium mt-1">
      + Add Custom Field Mapping
    </button>
  </div>
)}
```

### 4-4. create-jira-issue Edge Function 수정

**파일:** `supabase/functions/create-jira-issue/index.ts`

기존 하드코딩 body 구성 부분을 동적으로 변경:

```typescript
// 기존: 고정 필드만
const issueBody = {
  fields: {
    project: { key: projectKey },
    summary,
    description: { type: 'doc', version: 1, content: [...] },
    issuetype: { name: issueType },
    priority: { name: priority },
    labels: labels || [],
  }
};

// 변경: field_mappings 적용
// 1. DB에서 jira_settings.field_mappings 조회
// 2. 동적 필드 추가
if (fieldMappings?.length > 0) {
  for (const mapping of fieldMappings) {
    const value = resolveTestablyFieldValue(mapping.testably_field, context);
    if (value) {
      issueBody.fields[mapping.jira_field_id] = value;
    }
  }
}

function resolveTestablyFieldValue(field: string, ctx: any): any {
  switch (field) {
    case 'tc_tags': return ctx.tags?.join(', ');
    case 'tc_precondition': return ctx.precondition;
    case 'milestone_name': return ctx.milestoneName;
    case 'run_name': return ctx.runName;
    case 'custom_text': return ctx.customValue;
    default: return null;
  }
}
```

---

## Task 5: Jira 양방향 동기화 — 설계 단계 (1.5일)

이 Task는 PM과 함께 설계 후 Phase 2에서 구현합니다.

### 5-1. 설계해야 할 항목
1. **Inbound Webhook**: Jira Cloud에서 이슈 상태 변경 시 POST → Supabase Edge Function
2. **상태 매핑 테이블**: Testably status ↔ Jira transition 매핑 (사용자 설정)
3. **Sync Log 테이블**: 동기화 이력 추적
4. **충돌 처리**: 양쪽에서 동시 변경 시 우선순위 규칙

### 5-2. 필요한 DB 스키마 (사전 설계)
```sql
-- jira_settings에 추가
ALTER TABLE jira_settings
  ADD COLUMN webhook_secret TEXT,
  ADD COLUMN sync_direction TEXT DEFAULT 'outbound'
    CHECK (sync_direction IN ('outbound', 'inbound', 'bidirectional')),
  ADD COLUMN status_mappings JSONB DEFAULT '[]';

-- 신규 테이블
CREATE TABLE jira_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jira_issue_key TEXT NOT NULL,
  jira_status TEXT,
  testably_run_id UUID,
  testably_tc_id UUID,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  synced_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT true,
  error_message TEXT
);
```

### 5-3. Edge Function 설계 (Phase 2 구현)
- `jira-webhook-handler`: Jira → Testably (인바운드)
- `sync-jira-status`: Testably → Jira (아웃바운드 상태 변경)

---

## 작업 완료 기준

각 Task 완료 시:
1. 로컬에서 정상 동작 확인
2. 관련 페이지에서 기능 테스트
3. 콘솔 에러 없음
4. PM에게 완료 보고