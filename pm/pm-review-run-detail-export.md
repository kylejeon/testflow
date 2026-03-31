# PM 검토: Run Detail Export (PDF + CSV) 품질 리뷰

## 검토 대상
- **PDF:** `runrun.pdf` (291KB, 2페이지, 40 TC)
- **CSV:** `runrun-results.csv` (3.2KB, 41줄)

---

## 항목별 검토 결과

### 1. PDF 테이블 TC 제목 줄바꿈 처리
**결과: ✅ 양호**

코드에서 `max-width: 280px`가 설정되어 있어 긴 제목은 자동 줄바꿈됩니다 (line 277). PDF 스크린샷에서 SUI-29 "Login fails when both email and password fields are empty"와 SUI-32 "Login page shows appropriate error message for failed attempts"가 2줄로 잘 표시됨을 확인했습니다. 행 높이도 자연스럽게 확장됩니다.

**개선 제안 없음.**

---

### 2. Status 뱃지 색상 — 앱 내 색상과 일치 여부
**결과: ⚠️ 부분 불일치**

| Status | PDF Export 색상 | 앱 UI 색상 (run-detail) | 일치 여부 |
|--------|----------------|------------------------|----------|
| Passed | `#16A34A` (text) / `#DCFCE7` (bg) | `#16A34A` / `#DCFCE7` | ✅ 일치 |
| Failed | `#DC2626` / `#FEE2E2` | `#DC2626` / `#FEE2E2` | ✅ 일치 |
| Blocked | `#D97706` / `#FEF3C7` | `#D97706` / `#FEF3C7` | ✅ 일치 |
| Retest | `#7C3AED` / `#EDE9FE` | `#7C3AED` / `#EDE9FE` | ✅ 일치 |
| Untested | `#64748B` / `#F1F5F9` | `#64748B` / `#F1F5F9` | ✅ 일치 |

**PDF 요약 박스 색상도 확인:**

| Status | 요약 박스 색상 | 앱 진행률 바 색상 | 일치 |
|--------|---------------|-------------------|------|
| Passed | `#16A34A` | `#22C55E` | ⚠️ 미세 차이 |
| Failed | `#DC2626` | `#EF4444` | ⚠️ 미세 차이 |
| Blocked | `#D97706` | `#94A3B8` | ❌ 불일치 |
| Retest | `#7C3AED` | `#FACC15` | ❌ 불일치 |
| Untested | `#64748B` | `#E2E8F0` | ⚠️ 차이 |

**분석:** 요약 박스는 `statusColors` 맵 (line 254~260)을 사용하고, 앱 UI 진행률 바는 별도 색상 (line 2156~2160)을 사용합니다. 테이블 뱃지와 요약 박스에 동일한 색상을 쓰는 것은 문서 내 일관성 측면에서 오히려 좋으므로, **이 부분은 현재대로 유지해도 무방합니다.** 앱과의 미세 차이는 인쇄용 PDF의 가독성을 위한 의도적 선택으로 볼 수 있습니다.

**개선 제안: 없음 (현재대로 유지).**

---

### 3. Priority 색상 dot 표시
**결과: ❌ 개선 필요**

**현재:** PDF에서 Priority는 텍스트로만 표시 ("medium", "high", "critical", "low") — 색상 dot 없음.

**앱 UI:** Priority 옆에 색상 dot이 표시됨 (line 2327~2332):
- Critical: `#EF4444` (빨강)
- High: `#F59E0B` (주황)
- Medium: `#6366F1` (보라)
- Low: `#94A3B8` (회색)

**개선 필요:** PDF에서도 Priority 앞에 색상 dot (●)을 추가하여 시각적 구분을 제공해야 합니다. 또한 현재 첫 글자가 소문자인데, 앱처럼 첫 글자 대문자로 표시해야 합니다.

---

### 4. 페이지 번호
**결과: ❌ 개선 필요**

**현재:** 페이지 번호 없음. 푸터에는 "Testably — Run Report" (좌)과 "runrun · 40 test cases" (우)만 표시. 2페이지짜리 PDF에서 페이지 구분이 불가능합니다.

**개선 필요:** 푸터 중앙 또는 우측에 "Page 1 of 2" 형태의 페이지 번호를 추가해야 합니다.

> **참고:** 현재 구현은 `window.open` + `window.print()` 방식 (브라우저 인쇄)으로, CSS `@page` counter는 브라우저 인쇄 시 자동으로 적용되지 않습니다. CSS의 `counter(page)` / `counter(pages)`는 `position: fixed` 요소에서만 일부 브라우저에서 작동합니다. 안정적인 페이지 번호를 위해서는 html2canvas + jsPDF 방식으로 전환하거나, CSS의 `@bottom-center { content: counter(page) " / " counter(pages); }` 를 시도할 수 있습니다.

---

### 5. CSV Author 컬럼이 비어있는 문제
**결과: ❌ 개선 필요**

**현재 CSV (전체 40행):** Author 컬럼이 모든 행에서 비어있음.

**PDF에서는:** Assignee 컬럼에 "Kyle Jeon"이 모든 TC에 표시됨.

**분석:** PDF는 `runAssignees.get(tc.id) || (tc as any).assignee` (line 273)를 사용하여 Assignee를 가져오고 있고 잘 동작합니다. CSV export 코드에서는 Author 컬럼에 동일한 데이터를 매핑하지 않고 있는 것으로 보입니다.

**개선 필요:** CSV의 "Author" 컬럼에 PDF와 동일한 `runAssignees` 또는 `assignee` 데이터를 넣어야 합니다. 또한 컬럼명을 "Author"에서 "Assignee"로 변경하는 것이 PDF와 일관성 있습니다.

---

### 6. CSV Note, Elapsed, Date 컬럼이 비어있는 건
**결과: ✅ 정상 (데이터 미입력 TC)**

**분석:** 40개 TC 중 28개가 "untested" 상태이고, 결과가 입력된 12개 TC에서도 Note는 비어있는 것이 맞습니다 (테스트 시 메모를 입력하지 않은 경우). Elapsed와 Date도 result가 없는 TC에서는 빈 값이 정상입니다.

다만 **결과가 입력된 12개 TC** (passed 6, failed 5, retest 1)에서도 Note/Elapsed/Date가 모두 비어있는 점은 확인이 필요합니다:
- Note에 `""` (빈 따옴표)가 들어있는 것은 데이터가 없음을 의미하여 정상
- **Date 컬럼이 결과가 있는 TC에서도 비어있는 것은 의심스러움** — result의 `created_at` timestamp가 매핑되지 않고 있을 수 있음

**개선 제안:** 결과가 입력된 TC의 Date 컬럼에 result `created_at`이 올바르게 매핑되는지 CSV export 코드를 확인해야 합니다.

---

### 7. 전체 PDF 디자인 퀄리티
**결과: ✅ 프로덕트 수준 (일부 개선 여지)**

**잘 된 점:**
- 깔끔한 헤더 (Run명, 프로젝트명, 날짜)
- 6칸 요약 박스가 한눈에 진행 상황을 보여줌
- 인디고 진행률 바가 브랜드 컬러와 일치
- 테이블 헤더 보라색 (#6366F1) 배경이 브랜드 아이덴티티 유지
- 짝수/홀수 행 색상 교차 (white / #F8FAFC) — 가독성 좋음
- Status 뱃지 pill 디자인이 앱과 일관
- 푸터 "Testably — Run Report" 브랜딩
- 2페이지 자연스러운 페이지 넘김

**개선 여지:**
- Priority에 색상 dot 추가 (항목 3)
- 페이지 번호 추가 (항목 4)
- (선택) 요약 박스에 아이콘이나 미니 바 차트 추가 시 더 풍부한 비주얼

---

## 최종 개선 사항 요약

| # | 항목 | 심각도 | 수정 대상 |
|---|------|--------|----------|
| 1 | Priority 색상 dot 추가 (PDF) | ⭐⭐ Medium | run-detail/page.tsx (PDF HTML 템플릿) |
| 2 | 페이지 번호 추가 (PDF) | ⭐⭐ Medium | run-detail/page.tsx (CSS @page or footer) |
| 3 | CSV "Author" → "Assignee" 이름 변경 + 데이터 매핑 | ⭐⭐⭐ High | run-detail/page.tsx (CSV export 함수) |
| 4 | CSV Date 컬럼에 result created_at 매핑 확인 | ⭐⭐ Medium | run-detail/page.tsx (CSV export 함수) |

**디자인 변경 필요 여부:** 변경 불필요. 모두 코드 레벨 수정으로 해결 가능합니다.