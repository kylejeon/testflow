# Dev2 구현 지시서: Footer Product 4개 페이지 텍스트 수정

## 개요

CEO 승인 완료. 홈페이지 Footer Product 섹션 4개 페이지의 텍스트 컨텐츠를 수정합니다.
모두 텍스트 변경만 필요하며, UI 레이아웃 변경은 없습니다.

---

## 🔴 긴급: Roadmap 페이지 (`src/pages/roadmap/page.tsx`, 222 lines)

### 수정 1: navigate 미정의 → 런타임 크래시 버그 수정

**현재 코드 (line 1):**
```tsx
import MarketingLayout from '../../components/marketing/MarketingLayout';
```

**변경 후:**
```tsx
import { useNavigate } from 'react-router-dom';
import MarketingLayout from '../../components/marketing/MarketingLayout';
```

그리고 컴포넌트 함수 내부에 `navigate` 선언을 추가합니다.

**현재 코드 (line 138~139):**
```tsx
export default function RoadmapPage() {
  return (
```

**변경 후:**
```tsx
export default function RoadmapPage() {
  const navigate = useNavigate();
  return (
```

### 수정 2: Jira "Data Center" 제거

**현재 코드 (line 32):**
```tsx
desc: 'Connect to Jira Cloud and Data Center. Auto-create issues on test failure.',
```

**변경 후:**
```tsx
desc: 'Connect to Jira Cloud. Auto-create issues on test failure with full context.',
```

---

## Features 페이지 (`src/pages/features/page.tsx`, 239 lines)

### 수정 3: Discovery Logs 엔트리 타입 수정

**현재 코드 (line 53):**
```tsx
'Passed / Failed / Note entry types',
```

**변경 후:**
```tsx
'Note / Bug / Observation / Step entry types',
```

### 수정 4: Jira "Data Center" 제거

**현재 코드 (line 122):**
```tsx
description: 'Connect to Jira Cloud or Data Center. Auto-create issues on test failure with full context.',
```

**변경 후:**
```tsx
description: 'Connect to Jira Cloud. Auto-create issues on test failure with full context.',
```

---

## Changelog 페이지 (`src/pages/changelog/page.tsx`, 205 lines)

### 수정 5: Jira "Bidirectional status sync" 삭제

**현재 코드 (line 62~65):**
```tsx
bullets: [
  'Auto issue creation with full context',
  'Bidirectional status sync',
  'Custom field mapping',
],
```

**변경 후:**
```tsx
bullets: [
  'Auto issue creation with full context',
  'One-click Jira issue creation from test results',
  'Custom field mapping',
],
```

> "Bidirectional status sync"는 미구현이므로 삭제하고, 실제 구현된 기능인 "One-click Jira issue creation from test results"로 교체합니다.

### 수정 6: Discovery Logs 엔트리 타입 수정

**현재 코드 (line 75):**
```tsx
'Passed / Failed / Note entries',
```

**변경 후:**
```tsx
'Note / Bug / Observation / Step entries',
```

---

## Pricing 페이지 (`src/pages/pricing/page.tsx`, 480 lines)

### 수정 7: FAQ 연간 결제 문구 수정

**현재 코드 (line 174~176):**
```tsx
{
  q: 'Do you offer annual billing?',
  a: 'Annual billing with a 20% discount is coming soon. Subscribe to our newsletter for updates.',
},
```

**변경 후:**
```tsx
{
  q: 'Do you offer annual billing?',
  a: 'Yes! Annual billing is available with a 20% discount on all paid plans. You can switch to annual billing from your account settings at any time.',
},
```

---

## 수정 요약 체크리스트

| # | 파일 | 라인 | 변경 내용 | 심각도 |
|---|------|------|-----------|--------|
| 1 | roadmap/page.tsx | 1 | useNavigate import 추가 | 🔴 크래시 |
| 1b | roadmap/page.tsx | 138~139 | navigate 선언 추가 | 🔴 크래시 |
| 2 | roadmap/page.tsx | 32 | Jira "Data Center" 제거 | 🟡 |
| 3 | features/page.tsx | 53 | Discovery Logs 타입 수정 | 🟡 |
| 4 | features/page.tsx | 122 | Jira "Data Center" 제거 | 🟡 |
| 5 | changelog/page.tsx | 63 | "Bidirectional status sync" → 교체 | 🟡 |
| 6 | changelog/page.tsx | 75 | Discovery Logs 타입 수정 | 🟡 |
| 7 | pricing/page.tsx | 175 | FAQ 연간 결제 문구 수정 | 🟡 |

---

## 테스트

수정 후 확인 사항:
1. `/roadmap` 페이지 접근 → "Get Started Free" 버튼 클릭 → /auth로 이동하는지 확인 (크래시 안 하는지)
2. `/features` 페이지 → Discovery Logs 카드와 Jira 카드 텍스트 확인
3. `/changelog` 페이지 → Jira 엔트리와 Discovery Logs 엔트리 텍스트 확인
4. `/pricing` 페이지 → FAQ "Do you offer annual billing?" 답변 확인

---

## 커밋 & 푸시

```bash
git add src/pages/roadmap/page.tsx src/pages/features/page.tsx src/pages/changelog/page.tsx src/pages/pricing/page.tsx
git commit -m "fix: correct misleading content on marketing pages

- Fix navigate crash bug on roadmap page (missing useNavigate import)
- Remove false Jira Data Center claims (roadmap, features)
- Remove false bidirectional sync claim (changelog)
- Fix Discovery Logs entry type labels (features, changelog)
- Update annual billing FAQ to reflect current Paddle availability"
git push origin HEAD
```
