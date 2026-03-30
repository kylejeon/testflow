# Dev2 개발 지시 — 홈페이지 미구현 기능 개발

**발신:** PM  
**수신:** Dev2 (local_045b18b7-2412-42d1-a879-6488fcd7bc72)  
**일시:** 2026-03-30  
**기획서:** `/Users/yonghyuk/testflow/pm/pm-plan-unimplemented-homepage-features.html`

---

## 배경

CEO 지시로 홈페이지(testably.app)에 소개된 기능 중 미구현 항목을 분석했습니다.
전체 39건 중 **12건이 미구현/부분 구현** 상태입니다.
상세 기획서(HTML)를 참고하여 아래 순서로 개발을 진행해주세요.

---

## Phase 1: 즉시 착수 (P0)

### 1-1. "View Demo" 버튼 스크롤 앵커 (0.5일)
- **파일:** `src/pages/home/page.tsx` line ~1035
- **변경:** `onClick={() => navigate('/auth')}` → `onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}`
- Features 섹션에 `id="features"` 추가 필요

### 1-2. 홈페이지/Features 카피 정정 (0.5일)
**CEO 승인 후 진행.** 정정 대상:
- `features/page.tsx` line 126: "Jira Cloud and Data Center support" → "Jira Cloud support"
- `features/page.tsx` line 128: "Bidirectional status sync" → "One-click Jira issue creation"  
- `features/page.tsx` line 129: "Custom field mapping" → 제거
- `features/page.tsx` line 13: "with drag-and-drop" → 제거
- `features/page.tsx` line 16: "and postconditions" → 제거
- `features/page.tsx` line 33: "Estimated workload tracking" → 제거
- `features/page.tsx` line 94: "Visual timeline view" → 제거
- `home/page.tsx` FAQ #11 (line 321): "Discord," → 제거
- `home/page.tsx` line 107: "Automatically create" → "Create"

### 1-3. Jira 자동 이슈 생성 (3일)
- **기획서 섹션:** S5 (F-003)
- jira_settings에 `auto_create_on_failure` 컬럼 추가
- Settings UI에 토글 추가
- 신규 Edge Function `auto-create-jira-issue` 또는 DB trigger
- 중복 방지 로직 (test_results.issues 배열 확인)

### 1-4. Jira 커스텀 필드 매핑 (3일)
- **기획서 섹션:** S4 (F-002)
- 신규 Edge Function `fetch-jira-fields` (Jira REST API GET /rest/api/3/field)
- jira_settings에 `field_mappings JSONB` 컬럼 추가
- Settings → Jira Integration에 "Field Mapping" UI 카드
- create-jira-issue Edge Function 수정 (동적 필드)

### 1-5. Jira 양방향 동기화 설계 (1.5일)
- **기획서 섹션:** S3 (F-001)
- PM과 함께 설계 → Phase 2에서 구현

---

## Phase 2: 2주 내 (P1)

### 2-1. Jira 양방향 동기화 구현 (3.5일)
- 신규 Edge Function `jira-webhook-handler`
- 신규 Edge Function `sync-jira-status`
- jira_settings에 `webhook_secret`, `sync_direction`, `status_mappings` 추가
- 신규 테이블 `jira_sync_log`

### 2-2. Discord Webhook (1일)
- `useWebhooks.ts`에 `buildDiscordPayload()` 추가 (Discord Embed 형식)
- Settings webhook type 드롭다운에 'discord' 옵션 추가

### 2-3. Jenkins CI/CD 스니펫 (0.5일)
- Settings → API 탭에 Jenkins Jenkinsfile 스니펫 탭 추가

### 2-4. Zephyr / Qase Import (3일)
- 신규: `src/utils/zephyrImport.ts`, `src/utils/qaseImport.ts`
- ExportImportModal.tsx에 소스 선택 드롭다운 추가

### 2-5. Folder DnD (3일) — Desi 디자인 필요
- @dnd-kit/core + @dnd-kit/sortable 도입
- TestCaseList.tsx에 DnD 적용
- **Desi에게 디자인 요청 완료**

### 2-6. Milestone Timeline View (5일) — Desi 디자인 필요
- project-milestones/page.tsx에 List|Timeline 뷰 토글
- **Desi에게 디자인 요청 완료**

---

## 참고
- 상세 구현 스펙 (DB 스키마, API, UI 위치): 기획서 HTML 참조
- 질문사항은 PM에게 문의
