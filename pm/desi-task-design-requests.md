# Desi 디자인 요청서 — 미구현 기능 UI 디자인

**발신:** PM
**수신:** Desi (local_a2550f2f-b198-4d4b-910e-2f21259cda13)
**일시:** 2026-03-31
**상세 기획서:** `/Users/yonghyuk/testflow/pm/pm-plan-unimplemented-homepage-features.html`

---

## 디자인 시스템 참고

Testably 기존 디자인 토큰:
- Primary: indigo `#6366F1`, hover `#4F46E5`
- Background: `#F8FAFC`, Card: `#FFFFFF`
- Border: `#E2E8F0`, hover border: `#C7D2FE`
- Text: `#0F172A`, Sub: `#64748B`, Muted: `#94A3B8`
- Success: `#16A34A`, Error: `#DC2626`, Warning: `#D97706`
- Border radius: `rounded-lg` (0.5rem), Card: `rounded-xl`
- Font: system (-apple-system, BlinkMacSystemFont)

---

## 요청 1: Jira Integration 설정 화면 확장 (P0 — 최우선)

### 위치
Settings 페이지 → Integrations 탭 → Jira Integration 섹션
현재 UI: domain, email, API token, issue type 4개 필드만 있음

### 디자인 필요 항목

**A. 자동 이슈 생성 토글 (간단)**
- 카드 형태로 Jira 설정 하단에 배치
- "Auto-create Jira Issue" 타이틀
- Select 드롭다운: Disabled / All failures / First failure only
- 설명 텍스트: "Automatically create a Jira issue when a test is marked as Failed"

**B. 커스텀 필드 매핑 UI (핵심)**
- 카드 형태, Jira 연결 완료 시에만 표시
- 상단: "Field Mapping" 타이틀 + "Fetch Jira Fields" 버튼
- 기본 매핑 테이블 (읽기 전용, 회색):
  - Test Case Title → summary
  - Description + Steps → description  
  - Priority → priority
- 커스텀 매핑 영역:
  - 각 행: [Testably 필드 드롭다운] → [Jira 필드 드롭다운] [삭제 버튼]
  - "+ Add Custom Field Mapping" 버튼
- 참고 이미지: Jira admin의 field mapping UI 느낌

**C. 동기화 방향 설정 (Phase 2이지만 디자인 미리)**
- Radio 그룹: Outbound only / Inbound only / Bidirectional
- 각 옵션에 화살표 아이콘 (→, ←, ↔)
- Bidirectional 선택 시:
  - Webhook URL 표시 (monospace, 복사 버튼 포함)
  - "Register this URL in your Jira webhook settings" 안내 텍스트

**D. 상태 매핑 테이블**
- 4행 테이블: Passed/Failed/Blocked/Retest
- 각 행: [Testably 상태 뱃지] ↔ [Jira Transition 드롭다운]
- 상태 뱃지 색상: Passed(green) / Failed(red) / Blocked(amber) / Retest(blue)

---

## 요청 2: Folder Drag-and-Drop 시각 피드백 (P1)

### 위치
Test Cases 페이지 (`/projects/:id/testcases`) 좌측 폴더 트리

### 디자인 필요 항목

**A. 드래그 시작 시**
- 드래그 대상 TC/폴더: 반투명 ghost 아이템 (opacity 0.6)
- 원래 위치: placeholder (점선 border, 회색 배경)
- 다중 선택 시: ghost 아이템에 "3 items" 뱃지 (indigo, rounded-full)

**B. 드롭 타겟 하이라이트**
- 유효한 폴더 위 hover: border-indigo-400, bg-indigo-50 (살짝 하이라이트)
- 무효한 위치: 기본 상태 유지 (변화 없음)
- 폴더 열림 자동: 폴더 위에 0.5초 이상 hover 시 자동 펼침

**C. 드롭 완료**
- 짧은 애니메이션: 아이템이 새 위치로 슬라이드
- 성공 피드백: 이동된 아이템 배경 잠시 indigo-50 flash (0.5초)

### 참고
- 현재 폴더 트리는 좌측 패널 (width ~220px)
- 기존 폴더 아이콘: ri-folder-3-line (indigo)
- 기존 TC 아이템: 한 줄에 제목 + priority 뱃지

---

## 요청 3: Milestone Timeline View (P1)

### 위치
Milestone 리스트 페이지 (`/projects/:id/milestones`)
현재: 카드 리스트 뷰만 있음. 타임라인 뷰 추가.

### 디자인 필요 항목

**A. 뷰 토글 버튼**
- 위치: 기존 탭 바 우측 ("New Milestone" 버튼 좌측)
- 스타일: 2개 아이콘 토글 (List icon | Timeline icon)
- 활성 뷰: indigo 배경, 비활성: gray
- 아이콘: ri-list-check-3 (리스트) / ri-time-line (타임라인)

**B. 타임라인 레이아웃**
- 수평 시간축: 상단에 월 단위 눈금 (Jan / Feb / Mar ...)
- 좌측: Milestone 이름 리스트 (세로 정렬)
- 메인 영역: 수평 바 차트
  - 각 Milestone = start_date ~ end_date 길이의 수평 바
  - 바 높이: ~28px, rounded-md, gap: 8px
- 상태별 색상:
  - Upcoming: `#DBEAFE` (blue-100) + `#2563EB` border
  - In Progress: `#EEF2FF` (indigo-50) + `#6366F1` border
  - Completed: `#F0FDF4` (green-50) + `#16A34A` border, opacity 0.7
  - Past Due: `#FEF2F2` (red-50) + `#DC2626` border

**C. Sub-milestone 표현**
- Parent 바 아래에 들여쓰기 (left padding ~24px)
- 더 얇은 바 (height ~20px)
- 세로 커넥터 라인 (기존 리스트 뷰의 패턴 참고)

**D. 인터랙션**
- 바 hover: tooltip 팝업 (이름, 기간, 진행률 %, 상태 뱃지)
- 바 클릭: Milestone Detail로 네비게이션
- 오늘 날짜: 빨간 점선 수직선 (Today 라벨)
- 스크롤: 수평 스크롤 가능 (기간이 화면보다 긴 경우)

**E. 빈 상태**
- Milestone이 없을 때: "No milestones yet" + 이모지
- 날짜 없는 Milestone: 타임라인에 표시하지 않고 하단에 "No date set" 리스트

### 참고 레이아웃 (ASCII)
```
┌──────────────────────────────────────────────────────────┐
│  [List] [Timeline]                    [+ New Milestone]  │
├────────────┬─────────────────────────────────────────────┤
│            │  Mar        Apr        May        Jun       │
│ Sprint 1   │  ████████████                               │
│  ├ Login   │    ██████                                   │
│  └ Signup  │         ████████                            │
│ Sprint 2   │              ████████████████               │
│ Release    │                        ██████████████████   │
│            │              │ ← Today (red dashed line)    │
└────────────┴─────────────────────────────────────────────┘
```

---

## 산출물 형식

각 요청에 대해:
1. React 컴포넌트 `.jsx` 파일 (실제 렌더링 가능)
2. 색상/사이즈 토큰 명시
3. 반응형 breakpoint 고려 (모바일에서는 타임라인 → 리스트로 fallback)

산출물 저장 위치: `/Users/yonghyuk/testflow/pm/designs/`

---

## 우선순위

1. **요청 1 (Jira 설정 화면)** — P0, Dev2가 즉시 개발 중이므로 최우선
2. **요청 3 (Timeline View)** — P1, Dev2가 Phase 2에서 사용
3. **요청 2 (Folder DnD)** — P1, Dev2가 Phase 2에서 사용
