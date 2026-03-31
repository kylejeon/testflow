# Dev1 구현 지시서: Discovery Log 세션 상태 관리 개선

## 개요

CEO 승인 완료. Discovery Log 세션의 Completed 상태 관리를 개선합니다.

**현재 문제:**
1. Completed(closed) 세션에서 Note/Bug/Obs/Step 입력이 여전히 가능함
2. Completed 상태를 In Progress로 되돌릴 수 없음

**구현 방향: 하이브리드 (입력 차단 + Reopen 허용)**
- Completed 세션은 모든 입력을 차단 (잠금 상태)
- "Reopen Session" 버튼을 제공하여 In Progress로 복귀 가능

## 수정 대상 파일

**`src/pages/session-detail/page.tsx`** (1825 lines) — 이 파일만 수정하면 됩니다.

DB 스키마 변경 없음. 기존 `status: 'active' | 'closed'` 그대로 사용.

---

## 변경 사항 1: handleAddLog에 상태 가드 추가

**위치:** 350번째 줄 `const handleAddLog = async () => {`

**현재 코드 (line 350~352):**
```tsx
const handleAddLog = async () => {
    let content = '';
    let type: 'note' | 'passed' | 'failed' | 'blocked';
```

**변경 후:**
```tsx
const handleAddLog = async () => {
    // Guard: block input when session is completed
    if (session.status === 'closed') return;

    let content = '';
    let type: 'note' | 'passed' | 'failed' | 'blocked';
```

---

## 변경 사항 2: handleReopenSession 함수 추가

**위치:** `handleCloseSession` 함수 다음 (line 758 이후, `getLogTypeColor` 함수 앞)

**추가할 코드:**
```tsx
const handleReopenSession = async () => {
  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'active',
        ended_at: null,
        paused_at: null,
        updated_at: now,
      })
      .eq('id', sessionId);

    if (error) throw error;

    setSession((prev: any) => ({
      ...prev,
      status: 'active',
      ended_at: null,
      paused_at: null,
      updated_at: now,
    }));
    setShowReopenConfirmModal(false);
  } catch (error) {
    console.error('세션 재개 오류:', error);
    alert('Failed to reopen session.');
  }
};
```

> **참고:** 기존 `handleResumeSession` (line 700~727)은 Paused → In Progress 전환용이고, 이 함수는 Completed → In Progress 전환용입니다. 혼동하지 마세요.

---

## 변경 사항 3: Reopen 확인 모달 상태 추가

**위치:** 기존 state 선언부 (파일 상단, 다른 useState 선언들 근처)

**추가할 코드:**
```tsx
const [showReopenConfirmModal, setShowReopenConfirmModal] = useState(false);
```

---

## 변경 사항 4: Entry Bottom Bar 영역 입력 차단

### 4-A: 엔트리 입력 폼 전체를 조건부 렌더링

**위치:** line 1065 `{/* Entry Bottom Bar */}`

**현재 코드 (line 1065~1066):**
```tsx
{/* Entry Bottom Bar */}
<div className="flex-shrink-0">
```

**변경 후:**
```tsx
{/* Entry Bottom Bar */}
{session.status !== 'closed' ? (
<div className="flex-shrink-0">
```

그리고 Entry Bottom Bar `</div>` 닫는 태그 (line 1227 부근) 뒤에 else 분기를 추가합니다:

**현재 코드 (line 1227):**
```tsx
            </div>
```

**변경 후:**
```tsx
            </div>
) : (
  /* Completed state: show locked message */
  <div className="flex-shrink-0 border-t border-[#E2E8F0] px-5 py-4">
    <div className="flex items-center justify-center gap-2 text-[#94A3B8] text-[0.8125rem]">
      <i className="ri-lock-line" />
      <span>This session is completed. Reopen to add entries.</span>
    </div>
  </div>
)}
```

---

## 변경 사항 5: Controls 영역에 Reopen 버튼 추가

**위치:** line 1386~1389 (Completed 상태의 disabled 버튼)

**현재 코드:**
```tsx
) : session.status === 'closed' ? (
  <button disabled className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#D1D5DB] text-[#6B7280] text-[0.75rem] font-semibold rounded-[6px] cursor-not-allowed">
    <i className="ri-check-line" />Completed
  </button>
```

**변경 후:**
```tsx
) : session.status === 'closed' ? (
  <button
    onClick={() => setShowReopenConfirmModal(true)}
    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#6366F1] text-white text-[0.75rem] font-semibold rounded-[6px] hover:bg-[#4F46E5] cursor-pointer transition-colors"
  >
    <i className="ri-refresh-line" />Reopen Session
  </button>
```

---

## 변경 사항 6: Reopen 확인 모달 추가

**위치:** 기존 Close 확인 모달 (`showCloseConfirmModal`) 근처에 추가. 파일 하단 return JSX 내부, 기존 모달 코드 바로 아래에 삽입.

**추가할 코드:**
```tsx
{/* Reopen Confirm Modal */}
{showReopenConfirmModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-xl shadow-xl p-6 w-[400px] max-w-[90vw]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center">
          <i className="ri-refresh-line text-[#6366F1] text-lg" />
        </div>
        <div>
          <h3 className="text-[0.9375rem] font-semibold text-[#0F172A]">Reopen Session</h3>
          <p className="text-[0.8125rem] text-[#64748B]">This will change the status back to In Progress.</p>
        </div>
      </div>
      <p className="text-[0.8125rem] text-[#475569] mb-5">
        The session timer will resume from where it left off. You can add new entries and close the session again when finished.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setShowReopenConfirmModal(false)}
          className="px-4 py-2 text-[0.8125rem] font-medium text-[#64748B] bg-[#F1F5F9] rounded-lg hover:bg-[#E2E8F0] cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleReopenSession}
          className="px-4 py-2 text-[0.8125rem] font-semibold text-white bg-[#6366F1] rounded-lg hover:bg-[#4F46E5] cursor-pointer transition-colors"
        >
          Reopen
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 변경 사항 7: 타이머 로직 조정 (Reopen 시 재개)

**위치:** 타이머 useEffect (line 177~213 부근)

현재 타이머는 `session.status === 'closed'`일 때 고정 시간을 보여줍니다. Reopen 후 `status`가 `'active'`로 바뀌고 `ended_at`이 `null`이 되면 기존 로직이 자동으로 타이머를 재개합니다. **별도 수정 불필요** — 기존 조건분기가 이미 올바르게 처리합니다.

확인 포인트:
- `status === 'closed'` && `ended_at` 존재 → 고정 시간 표시
- `status === 'active'` && `ended_at === null` → 타이머 실시간 진행
- `paused_duration`은 Reopen 시 유지됨 (이전 누적 pause 시간 보존)

---

## 변경 사항 요약 체크리스트

| # | 변경 | 위치 | 난이도 |
|---|------|------|--------|
| 1 | `handleAddLog` 가드 추가 | line 350 | ⭐ |
| 2 | `handleReopenSession` 함수 추가 | line 758 이후 | ⭐⭐ |
| 3 | `showReopenConfirmModal` state 추가 | state 선언부 | ⭐ |
| 4 | Entry Bottom Bar 조건부 렌더링 | line 1065~1227 | ⭐⭐ |
| 5 | Completed 버튼 → Reopen 버튼 교체 | line 1386~1389 | ⭐ |
| 6 | Reopen 확인 모달 추가 | 기존 모달 근처 | ⭐⭐ |
| 7 | 타이머 로직 확인 (수정 불필요) | line 177~213 | - |

---

## 테스트 시나리오

구현 완료 후 다음 시나리오를 반드시 테스트하세요:

1. **Completed 세션 입력 차단 확인**
   - 세션을 Close하고 → 브라우저 뒤로가기로 재진입
   - Note/Bug/Obs/Step 버튼이 보이지 않고 잠금 메시지가 표시되는지 확인
   - 직접 URL로 closed 세션 접근 시에도 동일하게 차단되는지 확인

2. **Reopen 플로우 확인**
   - Completed 세션에서 "Reopen Session" 버튼 클릭
   - 확인 다이얼로그 표시 → Cancel 시 변화 없음
   - 확인 다이얼로그 → Reopen 클릭 시:
     - 상태가 "In Progress"로 변경
     - 타이머가 재개 (이전 시간 이어서)
     - 입력 폼이 활성화
     - Note/Bug/Obs/Step 입력 가능

3. **재완료(Re-close) 플로우 확인**
   - Reopen 후 추가 엔트리 입력
   - Pause / Close 버튼이 정상 표시
   - Close 시 기존 플로우와 동일하게 동작
   - 다시 Completed 상태가 되면 입력 차단 + Reopen 버튼 표시

4. **Edge Case**
   - Not Started 세션에서는 Reopen 버튼이 안 보이는지 확인
   - Paused 세션에서는 기존 Resume/Close 버튼이 유지되는지 확인

---

## 커밋 & 푸시

모든 테스트 통과 후:

```bash
git add src/pages/session-detail/page.tsx
git commit -m "feat: add session reopen and completed state input blocking

- Block note/bug/obs/step input when session is completed
- Add Reopen Session button with confirmation dialog
- Show locked message in entry bar for completed sessions
- Timer resumes correctly on reopen with preserved pause duration"
git push origin HEAD
```
