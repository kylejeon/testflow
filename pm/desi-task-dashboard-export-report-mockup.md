# Desi 디자인 목업 지시서: Dashboard Export Report

## 개요

CEO 확정. Project Detail(Dashboard) 페이지의 "Export Report" 버튼에 실제 export 기능을 구현합니다.
기획안 참고: `pm/pm-plan-dashboard-export-report.html`

**디자인 목업 5건을 제작해주세요.**

---

## 목업 1: Export Report 버튼 클릭 시 드롭다운 메뉴 (Default State)

**위치:** Project Detail 페이지 헤더 우측, 버튼 그룹의 맨 오른쪽

**현재 헤더 버튼 순서 (좌→우):**
```
[New TC (N)] [Continue Run (R)] [AI Assist] [Export Report]
```

**현재 Export Report 버튼 스타일:**
- 배경: `#6366F1` (indigo-500), 호버: `#4F46E5` (indigo-600)
- 텍스트: `white`, `text-[0.8125rem]` (13px), `font-medium`
- 아이콘: `ri-download-line`, 텍스트 왼쪽
- 패딩: `px-[0.875rem] py-[0.375rem]`
- 라운드: `rounded-[0.375rem]` (6px)

**디자인 요구사항 — 클릭 시 드롭다운:**
- 버튼 아래 오른쪽 정렬로 드롭다운 표시
- 드롭다운 스타일:
  - 배경: `white`
  - 테두리: `1px solid #E2E8F0`
  - 그림자: `shadow-lg` (0 10px 15px -3px rgba(0,0,0,0.1))
  - 모서리: `rounded-lg` (8px)
  - 너비: `w-64` (256px) — 항목 텍스트가 길어서 Run Detail 메뉴보다 넓게
  - 상단 여백: 버튼 하단에서 `4px` 간격

**메뉴 항목 (3개):**

| 순서 | 아이콘 | 텍스트 | 보조 텍스트 | 아이콘 색상 |
|------|--------|--------|-------------|-------------|
| 1 | `ri-file-pdf-line` | Export as PDF | Project summary report | `#EF4444` (red, PDF 연상) |
| 2 | `ri-file-excel-2-line` | Export Runs (CSV) | All runs with results | `#10B981` (green, CSV 연상) |
| 3 | `ri-file-excel-2-line` | Export Test Cases (CSV) | All test cases data | `#10B981` (green) |

**각 메뉴 항목 스타일:**
- 패딩: `px-3 py-3`
- 텍스트 (주): `text-[0.8125rem]` (13px), `text-[#334155]` (gray-700), `font-medium`
- 텍스트 (보조): `text-[0.6875rem]` (11px), `text-[#94A3B8]` (gray-400), 주 텍스트 아래
- 아이콘: `text-lg` (18px), 왼쪽 배치
- 레이아웃: 아이콘 | [주 텍스트 / 보조 텍스트] — 2줄 구조
- 항목 간 구분: `border-b border-[#F1F5F9]` (마지막 항목 제외)

**호버 상태:**
- 배경: `bg-[#F8FAFC]` (gray-50)
- 주 텍스트: `text-[#1E293B]` (gray-800) — 살짝 진해짐
- 전환: `transition-colors duration-150`
- 커서: `cursor-pointer`

---

## 목업 2: PDF 생성 중 로딩 상태

**시나리오:** 사용자가 "Export as PDF"를 클릭한 후

**상태 1: 드롭다운 닫히고 버튼이 로딩 상태로 전환**
- Export Report 버튼 텍스트가 "Exporting..." 으로 변경
- 아이콘: `ri-loader-4-line` + `animate-spin` (회전 애니메이션)
- 버튼 배경: `#818CF8` (indigo-400) — 약간 밝아짐 + `opacity-80`
- 버튼 클릭 비활성: `cursor-not-allowed`
- 다른 버튼들(New TC, Continue Run, AI Assist)은 정상 상태 유지

**상태 2: 생성 완료 후 원래 상태로 복원**
- 버튼이 "Export Report"로 복원
- 토스트 알림 표시 (목업 4 참고)

---

## 목업 3: 티어 게이팅 UI (Free 유저)

**시나리오:** Free 티어 유저가 Export Report 버튼 클릭 시

**Option A: 드롭다운 내 비활성 + 업그레이드 뱃지**
- 드롭다운 메뉴는 정상 표시
- 각 메뉴 항목 오른쪽에 잠금 아이콘 `ri-lock-line` + "Starter+" 뱃지 표시
- 뱃지 스타일: `bg-[#FEF3C7] text-[#D97706] text-[0.625rem] font-semibold px-1.5 py-0.5 rounded-full`
- 항목 텍스트: `text-[#94A3B8]` (gray-400) — 흐릿하게
- 호버 시: 배경 변경 없음 (비활성 느낌)
- 클릭 시: Upgrade 모달 표시 (기존 `showUpgradeModal` 사용)

**Option B: 버튼 자체에 업그레이드 팝오버 (대안)**
- Export Report 버튼 클릭 시 드롭다운 대신 작은 팝오버 표시
- 팝오버 내용:
  - 아이콘: `ri-lock-line` (24px, `#D97706`)
  - 텍스트: "Export Report is available on Starter plan and above"
  - 버튼: "Upgrade Now" (indigo 배경)
- 팝오버 스타일: `w-72`, 같은 shadow-lg, `rounded-lg`

**PM 의견:** Option A 권장 — 유저가 어떤 export 옵션이 있는지 미리 볼 수 있어 업그레이드 동기 부여에 유리

---

## 목업 4: Export 완료 시 Toast 알림

**성공 Toast:**
- 위치: 화면 상단 중앙 (`fixed top-4 left-1/2 -translate-x-1/2 z-50`)
- 배경: `#ECFDF5` (green-50), 테두리: `1px solid #A7F3D0`
- 아이콘: `ri-check-line` `text-[#10B981]`
- 텍스트 (PDF): "PDF report exported successfully" — `text-[#065F46] text-[0.8125rem] font-medium`
- 텍스트 (CSV): "CSV data exported successfully"
- 닫기 버튼: `ri-close-line`, 오른쪽 배치
- 자동 사라짐: 3초

**실패 Toast:**
- 배경: `#FEF2F2` (red-50), 테두리: `1px solid #FECACA`
- 아이콘: `ri-error-warning-line` `text-[#EF4444]`
- 텍스트: "Failed to export report. Please try again."
- 텍스트 색상: `text-[#991B1B]`
- 자동 사라짐: 5초 (실패는 더 오래 표시)

**참고:** Run Detail의 Jira auto-create toast와 동일한 디자인 시스템 사용 (일관성 유지)

---

## 목업 5: Export Report 버튼 Active State (메뉴 열린 상태)

**메뉴가 열려있을 때 버튼 상태 변화:**
- 배경: `#4F46E5` (indigo-600) — 더 진하게
- 아이콘: `ri-download-line` → `ri-arrow-up-s-line` 으로 전환 (드롭다운 열림 표시)
- 그 외 동일

**메뉴가 닫힐 때:**
- 아이콘 원래대로 `ri-download-line` 복원
- 배경 원래대로 `#6366F1`

---

## 디자인 참고 사항

### 기존 디자인 시스템 컬러 (일관성 유지)
- Primary (보라): `#6366F1` / hover `#4F46E5` / light `#EEF2FF`
- Gray-50: `#F8FAFC` / Gray-100: `#F1F5F9` / Gray-200: `#E2E8F0`
- Gray-400: `#94A3B8` / Gray-500: `#64748B` / Gray-700: `#334155`
- Success (초록): `#10B981` / light `#ECFDF5`
- Danger (빨강): `#EF4444` / light `#FEF2F2`
- Warning (노랑): `#F59E0B` / light `#FFFBEB`

### 아이콘 시스템
- Remix Icon 사용 (`ri-xxx` 클래스)
- PDF 아이콘: `ri-file-pdf-line` (빨강 계열)
- CSV 아이콘: `ri-file-excel-2-line` (초록 계열)
- 로딩: `ri-loader-4-line` + `animate-spin`
- 잠금: `ri-lock-line`
- 기본 크기: `text-base` (16px), 메뉴 아이콘: `text-lg` (18px)

### Dashboard 헤더 컨텍스트
```
[프로젝트명]
[탭: Overview | Test Cases | Runs | ...]
                            [New TC (N)] [Continue Run (R)] [AI Assist] [Export Report ▼]
```
- Export Report는 헤더 버튼 그룹의 맨 오른쪽, primary 스타일 (indigo 배경)
- 인접 버튼: AI Assist (violet-500 배경), New TC / Continue Run (white 배경, gray 텍스트)
- 드롭다운은 우측 정렬하여 화면 밖으로 넘치지 않도록

### 기존 유사 드롭다운 참고
- **Run Detail "..." 메뉴** — 같은 세션에서 디자인 중 (desi-task-run-detail-more-actions-mockup.md)
- **Milestone PDF Export 버튼** — project-runs에서 `ri-file-pdf-line` 아이콘 사용
- 두 디자인과 스타일 일관성 유지 필요

---

## 납품물

1. 드롭다운 Default + Hover 상태 목업
2. PDF 생성 중 로딩 상태 목업
3. 티어 게이팅 UI (Option A: 드롭다운 내 비활성 + 뱃지)
4. Export 완료 Toast 알림 (성공/실패)
5. Export Report 버튼 Active 상태 (메뉴 열린 상태)

**목업 저장 위치:** `pm/mockups/` 폴더 또는 Figma 링크
**참고 기획안:** `pm/pm-plan-dashboard-export-report.html`