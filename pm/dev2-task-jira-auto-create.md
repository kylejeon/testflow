# Dev2 구현 지시서: Jira Auto-Create 개선 (4가지)

## 개요

CEO 지시 확정. Jira Auto-Create Issue 기능을 4가지 항목으로 개선합니다.

**수정 대상 파일:**
1. `src/pages/run-detail/page.tsx` (2931 lines) — 지시 #1, #2, #4 + 지시 #3 일부
2. `src/pages/settings/page.tsx` — 지시 #3 Settings UI
3. DB: `jira_settings` 테이블 — 지시 #3 컬럼 추가

**구현 순서:** #4 → #2 → #1 → #3 (의존관계 순)

---

## 변경 사항 1 (Phase 1): Expected Result 누락 수정

**파일:** `src/pages/run-detail/page.tsx`
**위치:** line 572~579 `buildAutoJiraDescription` 함수
**난이도:** ⭐

**현재 코드 (line 572~579):**
```tsx
const buildAutoJiraDescription = (tc: TestCase): string => {
  const steps = tc.steps || 'No steps defined';
  return `*Auto-created by Testably*\n\n` +
    `Test Case: ${tc.title}\n` +
    `Run: ${run?.name || 'Unknown'}\n` +
    `Priority: ${tc.priority || 'Medium'}\n\n` +
    `--- Steps ---\n${steps}\n\n` +
    (tc.precondition ? `--- Precondition ---\n${tc.precondition}` : '');
};
```

**변경 후:**
```tsx
const buildAutoJiraDescription = (tc: TestCase): string => {
  const steps = tc.steps || 'No steps defined';
  const expectedResult = tc.expected_result || 'Not specified';
  return `*Auto-created by Testably*\n\n` +
    `Test Case: ${tc.title}\n` +
    `Run: ${run?.name || 'Unknown'}\n` +
    `Priority: ${tc.priority || 'Medium'}\n\n` +
    `--- Steps ---\n${steps}\n\n` +
    `--- Expected Result ---\n${expectedResult}\n\n` +
    (tc.precondition ? `--- Precondition ---\n${tc.precondition}` : '');
};
```
---

## 변경 사항 2 (Phase 2): Toast 알림 시스템 추가

**파일:** `src/pages/run-detail/page.tsx`
**난이도:** ⭐⭐

### 2-A: Toast state 추가

**위치:** 파일 상단, 기존 useState 선언부 근처

**추가할 코드:**
```tsx
const [toast, setToast] = useState<{type: 'success' | 'error'; message: string} | null>(null);
```

### 2-B: showToast 헬퍼 함수 추가

**위치:** handleStatusChange 함수 앞 (line 587 이전)

**추가할 코드:**
```tsx
const showToast = (type: 'success' | 'error', message: string) => {
  setToast({ type, message });
  setTimeout(() => setToast(null), type === 'success' ? 3000 : 5000);
};
```

### 2-C: 기존 handleStatusChange auto-create에 toast 적용

**위치:** line 612~645의 auto-create 블록 내부

**현재 코드 (성공 시, line 629~634 부근):**
```tsx
if (jiraData?.success && jiraData?.issue?.key && newResultData?.id) {
  await supabase.from('test_results')
    .update({ issues: [...existingIssues, jiraData.issue.key] })
    .eq('id', newResultData.id);
}
```

**변경 후:**
```tsx
if (jiraData?.success && jiraData?.issue?.key && newResultData?.id) {
  await supabase.from('test_results')
    .update({ issues: [...existingIssues, jiraData.issue.key] })
    .eq('id', newResultData.id);
  showToast('success', `Jira issue ${jiraData.issue.key} created automatically`);
}
```

**현재 코드 (실패 시, line 642 부근):**
```tsx
} catch (err) {
  console.warn('Auto Jira issue creation failed:', err);
}
```

**변경 후:**
```tsx
} catch (err) {
  console.warn('Auto Jira issue creation failed:', err);
  showToast('error', 'Failed to auto-create Jira issue');
}
```

### 2-D: Toast UI 컴포넌트 렌더링

**위치:** return JSX 최상단 (첫 번째 `<div>` 바로 안쪽)

**추가할 코드:**
```tsx
{/* Toast Notification */}
{toast && (
  <div
    className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
      toast.type === 'success'
        ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]'
        : 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
    }`}
  >
    <i className={toast.type === 'success' ? 'ri-check-line text-[#10B981]' : 'ri-error-warning-line text-[#EF4444]'} />
    <span className="text-[0.8125rem] font-medium">{toast.message}</span>
    <button onClick={() => setToast(null)} className="ml-2 text-current opacity-50 hover:opacity-100 cursor-pointer">
      <i className="ri-close-line" />
    </button>
  </div>
)}
```
---

## 변경 사항 3 (Phase 3): handleSubmitResult에 Auto-create 추가

**파일:** `src/pages/run-detail/page.tsx`
**위치:** `handleSubmitResult` 함수 내부, line 927 이후 (test_results INSERT 성공 직후)
**난이도:** ⭐⭐

### 현재 구조 참고

`handleSubmitResult`는 Add Result 모달에서 Submit 시 호출됩니다. 주요 흐름:
- line 877: 함수 시작
- line 895: resultStatus 변수 (모달에서 선택한 상태)
- line 910~925: test_results INSERT (supabase.from('test_results').insert)
- line 927: INSERT 성공 후 로직 시작 — **여기에 auto-create 추가**
- line 970: 함수 끝

### 추가할 코드

**위치:** line 927 이후, 기존 후속 로직(state 업데이트) 전에 삽입

```tsx
// Auto-create Jira issue on failure (from Add Result modal)
if (resultStatus === 'failed' && jiraSettings?.auto_create_on_failure && jiraSettings.auto_create_on_failure !== 'disabled' && jiraSettings.project_key) {
  const tc = testCases.find(t => t.id === selectedTestCaseId);
  if (tc) {
    const existingIssues = data?.issues || [];
    const shouldCreate =
      jiraSettings.auto_create_on_failure === 'all_failures' ||
      (jiraSettings.auto_create_on_failure === 'first_failure_only' && existingIssues.length === 0);

    if (shouldCreate) {
      try {
        const { data: jiraData } = await supabase.functions.invoke('create-jira-issue', {
          body: {
            domain: jiraSettings.domain,
            email: jiraSettings.email,
            apiToken: jiraSettings.api_token,
            projectKey: jiraSettings.project_key,
            summary: `[Auto] Test Failed: ${tc.title}`,
            description: buildAutoJiraDescription(tc),
            issueType: jiraSettings.issue_type || 'Bug',
            priority: mapTestPriorityToJira(tc.priority),
          },
        });
        if (jiraData?.success && jiraData?.issue?.key && data?.id) {
          await supabase.from('test_results')
            .update({ issues: [...existingIssues, jiraData.issue.key] })
            .eq('id', data.id);
          showToast('success', `Jira issue ${jiraData.issue.key} created automatically`);
        }
      } catch (err) {
        console.warn('Auto Jira issue creation failed:', err);
        showToast('error', 'Failed to auto-create Jira issue');
      }
    }
  }
}
```

> **중요:** `data`는 line 910~925에서 INSERT 후 반환된 result 객체입니다. `selectedTestCaseId`는 현재 선택된 TC의 ID입니다. 기존 변수를 그대로 사용합니다.
---

## 변경 사항 4 (Phase 4): 템플릿 시스템

### 4-A: DB 마이그레이션 (Supabase SQL Editor에서 실행)

```sql
ALTER TABLE jira_settings
ADD COLUMN auto_issue_summary_template text
  DEFAULT '[Auto] Test Failed: {tc_title}';

ALTER TABLE jira_settings
ADD COLUMN auto_issue_description_template text
  DEFAULT '*Auto-created by Testably*

Test Case: {tc_title}
Run: {run_name}
Priority: {priority}

--- Steps ---
{steps}

--- Expected Result ---
{expected_result}

--- Precondition ---
{precondition}';
```

### 4-B: run-detail/page.tsx — JiraSettings 인터페이스 수정

**위치:** line 63~70

**현재 코드:**
```tsx
interface JiraSettings {
  domain: string;
  email: string;
  api_token: string;
  project_key: string;
  issue_type: string;
  auto_create_on_failure: string;
}
```

**변경 후:**
```tsx
interface JiraSettings {
  domain: string;
  email: string;
  api_token: string;
  project_key: string;
  issue_type: string;
  auto_create_on_failure: string;
  auto_issue_summary_template?: string;
  auto_issue_description_template?: string;
}
```

### 4-C: run-detail/page.tsx — fetchJiraSettings 쿼리 수정

**위치:** line 251 부근 (supabase select)

**현재 코드:**
```tsx
.select('domain, email, api_token, issue_type, auto_create_on_failure')
```

**변경 후:**
```tsx
.select('domain, email, api_token, issue_type, auto_create_on_failure, auto_issue_summary_template, auto_issue_description_template')
```

### 4-D: run-detail/page.tsx — applyTemplate 함수 추가

**위치:** `buildAutoJiraDescription` 바로 아래 (line 579 이후)

**추가할 코드:**
```tsx
const applyTemplate = (template: string, tc: TestCase): string => {
  return template
    .replace(/\{tc_title\}/g, tc.title || '')
    .replace(/\{run_name\}/g, run?.name || 'Unknown')
    .replace(/\{priority\}/g, tc.priority || 'Medium')
    .replace(/\{steps\}/g, tc.steps || 'No steps defined')
    .replace(/\{expected_result\}/g, tc.expected_result || 'Not specified')
    .replace(/\{precondition\}/g, tc.precondition || 'None');
};
```

### 4-E: run-detail/page.tsx — auto-create 호출 시 template 적용

**두 곳** 모두 수정 (handleStatusChange + handleSubmitResult):

**현재 코드 (summary/description 부분):**
```tsx
summary: `[Auto] Test Failed: ${tc.title}`,
description: buildAutoJiraDescription(tc),
```

**변경 후:**
```tsx
summary: jiraSettings.auto_issue_summary_template
  ? applyTemplate(jiraSettings.auto_issue_summary_template, tc)
  : `[Auto] Test Failed: ${tc.title}`,
description: jiraSettings.auto_issue_description_template
  ? applyTemplate(jiraSettings.auto_issue_description_template, tc)
  : buildAutoJiraDescription(tc),
```
### 4-F: settings/page.tsx — JiraSettings state에 template 필드 추가

**위치:** jiraSettings state 초기값 (line 187 부근)

기존 state에 추가:
```tsx
autoIssueSummaryTemplate: '[Auto] Test Failed: {tc_title}',
autoIssueDescriptionTemplate: '*Auto-created by Testably*\n\nTest Case: {tc_title}\nRun: {run_name}\nPriority: {priority}\n\n--- Steps ---\n{steps}\n\n--- Expected Result ---\n{expected_result}\n\n--- Precondition ---\n{precondition}',
```

### 4-G: settings/page.tsx — 템플릿 UI 추가

**위치:** Auto-create 드롭다운 (line 1850) 바로 아래

**조건:** `jiraSettings.autoCreateOnFailure !== 'disabled'`일 때만 표시

**추가할 코드:**
```tsx
{jiraSettings.autoCreateOnFailure !== 'disabled' && (
  <div className="mt-6 space-y-4">
    {/* Summary Template */}
    <div>
      <label className="block text-[0.8125rem] font-medium text-[#334155] mb-1.5">
        Auto-create Summary Template
      </label>
      <p className="text-[0.75rem] text-[#94A3B8] mb-2">
        Click a variable to insert it at cursor position
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {['{tc_title}', '{run_name}', '{priority}'].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => {
              const input = document.getElementById('summary-template-input') as HTMLInputElement;
              if (input) {
                const pos = input.selectionStart || input.value.length;
                const newVal = input.value.slice(0, pos) + v + input.value.slice(pos);
                setJiraSettings((prev: any) => ({ ...prev, autoIssueSummaryTemplate: newVal }));
              }
            }}
            className="px-2 py-0.5 bg-[#DBEAFE] text-[#1D4ED8] text-[0.75rem] font-mono rounded cursor-pointer hover:bg-[#BFDBFE] transition-colors"
          >
            {v}
          </button>
        ))}
      </div>
      <input
        id="summary-template-input"
        type="text"
        value={jiraSettings.autoIssueSummaryTemplate}
        onChange={(e) => setJiraSettings((prev: any) => ({ ...prev, autoIssueSummaryTemplate: e.target.value }))}
        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[0.875rem] font-mono focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
      />
    </div>

    {/* Description Template */}
    <div>
      <label className="block text-[0.8125rem] font-medium text-[#334155] mb-1.5">
        Auto-create Description Template
      </label>
      <p className="text-[0.75rem] text-[#94A3B8] mb-2">
        Click a variable to insert it at cursor position
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {['{tc_title}', '{run_name}', '{priority}', '{steps}', '{expected_result}', '{precondition}'].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => {
              const textarea = document.getElementById('desc-template-textarea') as HTMLTextAreaElement;
              if (textarea) {
                const pos = textarea.selectionStart || textarea.value.length;
                const newVal = textarea.value.slice(0, pos) + v + textarea.value.slice(pos);
                setJiraSettings((prev: any) => ({ ...prev, autoIssueDescriptionTemplate: newVal }));
              }
            }}
            className="px-2 py-0.5 bg-[#DBEAFE] text-[#1D4ED8] text-[0.75rem] font-mono rounded cursor-pointer hover:bg-[#BFDBFE] transition-colors"
          >
            {v}
          </button>
        ))}
      </div>
      <textarea
        id="desc-template-textarea"
        rows={8}
        value={jiraSettings.autoIssueDescriptionTemplate}
        onChange={(e) => setJiraSettings((prev: any) => ({ ...prev, autoIssueDescriptionTemplate: e.target.value }))}
        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[0.875rem] font-mono focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] resize-vertical"
      />
    </div>

    {/* Reset to Default */}
    <button
      type="button"
      onClick={() => setJiraSettings((prev: any) => ({
        ...prev,
        autoIssueSummaryTemplate: '[Auto] Test Failed: {tc_title}',
        autoIssueDescriptionTemplate: '*Auto-created by Testably*\n\nTest Case: {tc_title}\nRun: {run_name}\nPriority: {priority}\n\n--- Steps ---\n{steps}\n\n--- Expected Result ---\n{expected_result}\n\n--- Precondition ---\n{precondition}',
      }))}
      className="text-[0.8125rem] text-[#6366F1] hover:text-[#4F46E5] font-medium cursor-pointer"
    >
      ↩ Reset to Default Templates
    </button>
  </div>
)}
```
### 4-H: settings/page.tsx — Save 로직에 template 포함

**위치:** UPDATE path (line 698~708) 및 INSERT path (line 714~722)

두 곳 모두에 추가할 필드:
```tsx
auto_issue_summary_template: jiraSettings.autoIssueSummaryTemplate,
auto_issue_description_template: jiraSettings.autoIssueDescriptionTemplate,
```

### 4-I: settings/page.tsx — Fetch 로직에 template 포함

**위치:** 기존 Jira settings fetch 쿼리의 select 문

현재 select에 추가:
```
, auto_issue_summary_template, auto_issue_description_template
```

fetch 후 state 매핑에도 추가:
```tsx
autoIssueSummaryTemplate: data.auto_issue_summary_template || '[Auto] Test Failed: {tc_title}',
autoIssueDescriptionTemplate: data.auto_issue_description_template || '...(기본값)',
```

---

## 변경 사항 요약 체크리스트

| # | 변경 | 파일 | 난이도 |
|---|------|------|--------|
| 1 | `buildAutoJiraDescription`에 expected_result 추가 | run-detail/page.tsx | ⭐ |
| 2-A | Toast state 추가 | run-detail/page.tsx | ⭐ |
| 2-B | showToast 헬퍼 함수 추가 | run-detail/page.tsx | ⭐ |
| 2-C | handleStatusChange에 toast 호출 추가 | run-detail/page.tsx | ⭐ |
| 2-D | Toast UI 렌더링 추가 | run-detail/page.tsx | ⭐ |
| 3 | handleSubmitResult에 auto-create 블록 추가 | run-detail/page.tsx | ⭐⭐ |
| 4-A | DB 마이그레이션 | Supabase SQL | ⭐ |
| 4-B | JiraSettings interface 수정 | run-detail/page.tsx | ⭐ |
| 4-C | fetchJiraSettings select 수정 | run-detail/page.tsx | ⭐ |
| 4-D | applyTemplate 함수 추가 | run-detail/page.tsx | ⭐ |
| 4-E | auto-create 호출에 template 적용 (2곳) | run-detail/page.tsx | ⭐ |
| 4-F | Settings state에 template 추가 | settings/page.tsx | ⭐ |
| 4-G | 템플릿 UI 추가 | settings/page.tsx | ⭐⭐ |
| 4-H | Save 로직에 template 포함 | settings/page.tsx | ⭐ |
| 4-I | Fetch 로직에 template 포함 | settings/page.tsx | ⭐ |

---

## 테스트 시나리오

### 1. Expected Result 확인 (#4→Phase 1)
- expected_result가 있는 TC에서 Quick Status=Failed → Jira description에 "--- Expected Result ---" 섹션 포함 확인
- expected_result가 없는 TC → "Not specified"로 표시

### 2. Toast 알림 확인 (#2→Phase 2)
- Auto-create 성공 시: 초록색 토스트 "Jira issue PROJ-123 created automatically" 3초간 표시
- Jira 연동 에러 시: 빨간색 토스트 "Failed to auto-create Jira issue" 5초간 표시
- 닫기(X) 버튼으로 수동 닫기 가능

### 3. Add Result 모달 Auto-create (#1→Phase 3)
- Settings: auto_create_on_failure = 'all_failures'
- Add Result 모달 → Status=Failed → Submit
- Jira issue 자동 생성 + Toast 표시 + issues 배열에 key 추가
- Settings: first_failure_only → 이미 issue 있는 TC에서는 미생성
- Settings: disabled → Failed 선택해도 미생성

### 4. 템플릿 시스템 (#3→Phase 4)
- Settings에서 Summary template 수정: "[Bug] {tc_title} - {priority}" → Save
- Auto-create 시 수정된 Summary가 Jira에 적용되는지 확인
- Description template 수정 → 변수가 올바르게 치환되는지 확인
- 변수 태그 버튼 클릭 → 커서 위치에 삽입
- "Reset to Default" → 기본 템플릿 복원
- 빈 템플릿 → fallback (하드코딩 기본값) 동작 확인

### 5. Edge Cases
- Jira settings가 없는 상태에서 Failed → auto-create 시도하지 않음 (에러 없음)
- auto_create_on_failure = 'disabled' → 어떤 경로에서도 auto-create 미동작
- 네트워크 에러 시 catch에서 error toast 표시 (crash 없음)

---

## 커밋 & 푸시

**Phase 1~3 완료 후 (run-detail만 변경):**
```bash
git add src/pages/run-detail/page.tsx
git commit -m "feat: improve jira auto-create with toast notifications and add-result support

- Fix buildAutoJiraDescription to include expected_result
- Add toast notification on auto-create success/failure
- Add auto-create trigger in handleSubmitResult (Add Result modal)
- Support both all_failures and first_failure_only modes"
git push origin HEAD
```

**Phase 4 완료 후 (settings + run-detail + DB):**
```bash
git add src/pages/run-detail/page.tsx src/pages/settings/page.tsx
git commit -m "feat: add customizable jira auto-create templates

- Add summary/description template fields to jira_settings
- Add template editor UI in Settings with variable insertion
- Apply templates in auto-create flow with fallback to defaults
- Support variables: {tc_title}, {run_name}, {priority}, {steps}, {expected_result}, {precondition}"
git push origin HEAD
```

> **DB 마이그레이션은 코드 커밋 전에 Supabase SQL Editor에서 먼저 실행하세요.**