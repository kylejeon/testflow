# Desi 디자인 목업 지시서: Run Detail "..." More Actions 메뉴

## 개요

CEO 확정. Run Detail 페이지의 "..." 버튼에 드롭다운 메뉴 기능을 추가합니다.
기획안 참고: `pm/pm-plan-run-detail-more-actions.html`

**디자인 목업 4건을 제작해주세요.**

---

## 목업 1: "..." 드롭다운 메뉴 (Default State)

**위치:** Run Detail 페이지 헤더 — Focus Mode 버튼 바로 왼쪽의 "..." 버튼

**현재 상태:**
- 버튼: `ri-more-2-fill` 아이콘, 흰 배경, `border: 1px solid #E2E8F0`, 라운드 `rounded-lg`
- Focus Mode 버튼(보라색 `#6366F1`)과 나란히 배치
- 클릭해도 아무 반응 없음 (현재)

**디자인 요구사항 — 클릭 시 드롭다운:**
- 버튼 아래 오른쪽 정렬로 드롭다운 표시
- 드롭다운 스타일:
  - 배경: `white`
  - 테두리: `1px solid #E2E8F0`
  - 그림자: `shadow-lg` (0 10px 15px -3px rgba(0,0,0,0.1))
  - 모서리: `rounded-lg` (8px)
  - 너비: `w-56` (224px)
  - 상단 여백: 버튼 하단에서 `4px` 간격

**메뉴 항목 (2개):**

| 순서 | 아이콘 | 텍스트 | 아이콘 색상 |
|------|--------|--------|-------------|
| 1 | `ri-file-pdf-line` | Export Run Report (PDF) | `#64748B` (gray-500) |
| 2 | `ri-file-excel-2-line` | Export Results (CSV) | `#64748B` (gray-500) |

**각 메뉴 항목 스타일:**
- 패딩: `px-3 py-2.5`
- 텍스트: `text-[0.8125rem]` (13px), `text-[#334155]` (gray-700), `font-medium`
- 아이콘: `text-base` (16px), 텍스트 왼쪽, `gap-2.5`
- 아이콘과 텍스트 사이: `gap-2.5` (10px)

---

## 목업 2: 드롭다운 Hover State

**각 메뉴 항목의 호버 상태:**
- 배경: `bg-[#F8FAFC]` (gray-50)
- 텍스트 색상: `text-[#1E293B]` (gray-800) — 살짝 진해짐
- 아이콘 색상: `text-[#6366F1]` (indigo-500) — 호버 시 보라색으로 변경
- 전환: `transition-colors duration-150`
- 커서: `cursor-pointer`

**목업에 표시할 것:**
- "Export Run Report (PDF)" 항목에 호버 상태 적용된 모습
- 나머지 항목은 기본 상태

---

## 목업 3: "..." 버튼 Active State (메뉴 열린 상태)

**메뉴가 열려있을 때 "..." 버튼 자체의 상태 변화:**
- 배경: `bg-[#F1F5F9]` (gray-100) — 눌린 느낌
- 테두리: `border-[#CBD5E1]` (gray-300) — 약간 진해짐
- 이렇게 하면 사용자가 어떤 버튼을 통해 메뉴가 열렸는지 인지 가능

---

## 목업 4: 에디터 툴바 Before/After

**Before (현재 상태):**
- Note 입력 에디터 상단 툴바에 Bold, Italic, Underline, Strikethrough, List 등의 포맷팅 버튼이 있고, 맨 오른쪽에 `ri-more-2-fill` 아이콘 버튼이 존재
- 버튼 스타일: `w-7 h-7`, `text-gray-600`, `hover:bg-gray-200`, `rounded`
- 이 버튼은 onClick 핸들러가 없어 dead code

**After (변경 후):**
- 에디터 툴바에서 "..." 버튼을 완전히 제거
- 나머지 포맷팅 버튼들은 그대로 유지
- 툴바 레이아웃이 자연스럽게 보이는지 확인 (ml-auto로 오른쪽 정렬되던 버튼 제거 시 영향 없음)

---

## 디자인 참고 사항

### 기존 디자인 시스템 컬러 (일관성 유지)
- Primary (보라): `#6366F1` / hover `#4F46E5`
- Gray-50: `#F8FAFC` / Gray-100: `#F1F5F9` / Gray-200: `#E2E8F0`
- Gray-500: `#64748B` / Gray-700: `#334155` / Gray-900: `#0F172A`
- Success (초록): `#10B981`
- Danger (빨강): `#EF4444`

### 아이콘 시스템
- Remix Icon 사용 (ri-xxx 클래스)
- 드롭다운 아이콘: `ri-file-pdf-line`, `ri-file-excel-2-line`
- 기본 크기: `text-base` (16px)

### 기존 드롭다운 참고
- `project-runs/page.tsx`에 유사한 "..." 드롭다운이 이미 구현되어 있음 (Run 카드의 더보기 메뉴)
- 해당 디자인과 동일한 스타일을 유지해야 함

### Run Detail 헤더 레이아웃 컨텍스트
```
[← Back] [Run 이름]                    [...] [Focus Mode]
[Milestone 뱃지] [날짜] [Assignees]
```
- "..." 버튼은 Focus Mode 버튼 바로 왼쪽, 우측 상단에 위치
- 헤더 높이, 버튼 높이가 Focus Mode와 동일해야 함

---

## 납품물

1. 드롭다운 Default 상태 목업 (PNG 또는 Figma)
2. 드롭다운 Hover 상태 목업
3. "..." 버튼 Active 상태 (메뉴 열린 상태)
4. 에디터 툴바 Before/After 비교 목업

**목업 저장 위치:** `pm/mockups/` 폴더 또는 Figma 링크