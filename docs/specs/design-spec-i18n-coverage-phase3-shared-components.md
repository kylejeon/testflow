# Design Spec: i18n 커버리지 Phase 3 — 공유 컴포넌트 카피 치팅시트

> **작성일:** 2026-04-21
> **작성자:** @designer
> **상태:** Draft → Review → Approved
> **관련 Dev Spec:** `docs/specs/dev-spec-i18n-coverage-phase3-shared-components.md` (Phase 3 — 키 구조 확정, AC-1~AC-16)
> **상속:**
> - Phase 1: `docs/specs/design-spec-i18n-coverage.md`
>   - §2 톤앤매너
>   - §3 고유명사 / 도메인 용어 고정 번역
>   - §4-1 상대시간 (`common.time.*` + `formatRelativeTime`)
>   - §4-2 절대 날짜 (`formatShortDate`)
>   - §5 Plural / Interpolation 규칙
>   - §6 AC-9 AI 비번역 원칙
> - Phase 2a (plan-detail): 포맷·톤 참고
> - Phase 2b (run-detail): `runs.detail.*` 서브트리 확장 패턴 참고
> **병행 스펙:** 없음 (Phase 3 Epic 단독)
> **Figma:** N/A — 레이아웃 무변경, 카피만 교체
> **대상 파일 6종:**
> - `src/components/DetailPanel.tsx` (1,370 줄)
> - `src/components/ExportModal.tsx` (224 줄)
> - `src/components/FocusMode.tsx` (1,583 줄)
> - `src/components/StatusBadge.tsx` (43 줄)
> - `src/components/Avatar.tsx` (187 줄)
> - `src/components/ProjectHeader.tsx` (433 줄)

---

## 0. 이 문서를 읽는 법

Phase 3 은 6 개 공유 컴포넌트 내부의 하드코딩 영문 ~121 건 (DetailPanel ≈ 40 / ExportModal ≈ 10 / FocusMode ≈ 50 / StatusBadge = 5 / Avatar = 1 / ProjectHeader ≈ 15) 을 기존 네임스페이스(`common` / `runs` / `projects`) 편입으로 번역 이관한다. 본 Design Spec 은 Developer 가 Dev Spec §10 의 키 구조에 **그대로 복사해 붙여넣을 수 있는** EN/KO 치팅시트다.

**Developer 워크플로우:**
1. §2 상속 원칙 확인 — Phase 1 §2~§6 의 모든 규칙이 유효
2. §3 용어 사전 — Phase 1 §3 고정 번역 + Phase 3 신규 4 용어(Focus Mode / Detail Panel / Export / Avatar) 숙지
3. §4 재사용 맵 — 기존 common/runs 키와의 1:1 대응을 먼저 확인 (신규 키 만들기 전 필수)
4. §5 번들 트리 배치 도식 — 최종 `common.ts` / `runs.ts` 의 계층 구조
5. §6 ~ §11 파일별 매핑 표 — Dev Spec §4-1 스코프 / §10 키 구조에 1:1 대응
6. §12 Plural / Interpolation 규칙 재명시 (Phase 1 §5 승계)
7. §13 AC-9 AI 비번역 — 본 스펙 해당 없음 재확인
8. §14 최종 키 집계 (AC-6 검증: 80~160 범위)

---

## 1. 레이아웃

**레이아웃 변경 없음.** 본 스펙은 Phase 2a / Phase 2b 와 동일하게 **순수 텍스트 교체 리팩토링**. DOM 구조, Tailwind 클래스, CSS 변수, Grid/Flex, 여백, breakpoint, 다크모드 토큰(현재 명시적 다크모드 없음) 모두 무변경.

### 1-1. 텍스트 길이 리스크 체크포인트 (Phase 3 특화)

| 위치 | EN 기준 | KO 예상 | 변동 | 완화 |
|------|--------|---------|-----|-----|
| DetailPanel Meta label `Priority` | 8 char | `우선순위` 4 char | 단축 | OK |
| DetailPanel Meta label `Folder` | 6 char | `폴더` 2 char | 단축 | OK |
| DetailPanel Meta label `Last Run` | 8 char | `마지막 실행` 6 char | 단축 | OK |
| DetailPanel tab `Comments` | 8 char | `댓글` 2 char | 단축 | OK |
| DetailPanel button `Pass & Next` | 11 char | `통과 후 다음` 6 char | 단축 | OK |
| DetailPanel button `Link Existing Issue` | 19 char | `기존 이슈 연결` 7 char | 단축 | OK |
| DetailPanel upsell `Jira integration requires Hobby+` | 32 char | `Jira 연동은 Hobby 플랜부터 가능합니다` 23 char | 단축 | OK |
| DetailPanel empty `No linked issues` | 16 char | `연결된 이슈 없음` 8 char | 단축 | OK |
| DetailPanel history `{{author}} marked as {{status}} in {{runName}}` | ~40 char | `{{author}}님이 {{runName}}에서 {{status}}로 기록` ~35 char | 비슷 | OK |
| ExportModal header `Export` | 6 char | `내보내기` 4 char | 단축 | OK |
| ExportModal section `Status Filter` | 13 char | `상태 필터` 5 char | 단축 | OK |
| ExportModal `(empty = all tags)` | 16 char | `(비우면 전체 태그)` 10 char | 단축 | OK |
| ExportModal `{{current}} of {{total}} test cases will be exported` | ~45 char | `테스트 케이스 {{total}}건 중 {{current}}건이 내보내집니다` ~30 char | 단축 | OK |
| ExportModal `Include AI Summary` | 18 char | `AI 요약 포함` 8 char | 단축 | OK |
| ExportModal `Prepends risk level, metrics, failure patterns & recommendations` | 62 char | `리스크 수준, 지표, 실패 패턴, 권장 조치를 문서 앞쪽에 추가합니다` 36 char | 단축 | OK (1줄 유지 가능, sonner·modal wrap 허용) |
| FocusMode sidebar chip `Untested` | 8 char | `미수행` 3 char | 단축 | OK |
| FocusMode header counter `{{index}} / {{total}}` | 포맷 기호 | 포맷 기호 | 동일 | OK |
| FocusMode keyboard hint `Sidebar` | 7 char | `사이드바` 4 char | 단축 | OK |
| FocusMode progress `{{count}} / {{total}} completed` | ~15 char | `{{total}}개 중 {{count}}개 완료` ~16 char | 비슷 | OK |
| FocusMode empty sidebar `No test cases match` | 19 char | `일치하는 테스트 케이스 없음` 13 char | 단축 | OK |
| FocusMode previous badge `Previously {{status}}` | 15+ char | `이전 결과: {{status}}` ~12 char | 비슷 | OK |
| FocusMode note hint `⌘ + Enter to save with status` | 28 char | `⌘ + Enter 로 상태와 함께 저장` 22 char | 단축 | OK |
| FocusMode footer `Last test — press any status key to complete the run` | 52 char | `마지막 테스트 — 상태 키를 눌러 실행을 완료하세요` 26 char | 단축 | OK |
| FocusMode dismiss `Locked to preserve test results` | 31 char | `테스트 결과 보존을 위해 잠김` 14 char | 단축 | OK |
| ProjectHeader nav `Test Cases` | 10 char | `테스트 케이스` 6 char | 단축 | OK |
| ProjectHeader nav `Steps Library` | 13 char | `스텝 라이브러리` 8 char | 단축 | OK |
| ProjectHeader nav `Requirements` | 12 char | `요구사항` 4 char | 단축 | OK |
| ProjectHeader nav `Traceability` | 12 char | `추적성` 3 char | 단축 | OK |
| ProjectHeader nav `Exploratory` | 11 char | `탐색` 2 char | 단축 | OK |
| ProjectHeader dropdown `Switch project` | 14 char | `프로젝트 전환` 6 char | 단축 | OK |
| ProjectHeader tooltip `Keyboard Shortcuts (?)` | 22 char | `단축키 (?)` 7 char | 단축 | OK |
| StatusBadge label (all 5) | ≤8 char | ≤4 char | 단축 | OK (Phase 1 재사용) |
| Avatar fallback alt `Avatar` | 6 char | `프로필 이미지` 7 char | 동급 | OK (단 img alt 는 UI 노출 안됨) |

> **결론:** 한국어가 EN 대비 평균 **40~50% 단축**. Phase 3 전 영역에서 레이아웃 오버플로 리스크 없음. 가장 긴 케이스(ExportModal AI 옵션 설명 1줄)도 `max-w-sm` (384px) 모달 안에서 자연스러운 2줄 wrap 이 이미 허용되어 있음. ProjectHeader nav 9 개 라벨은 overflow-x-auto 로 모바일 스크롤이 보장되어 안전.

---

## 2. Phase 1 상속 원칙 (재선언)

본 스펙은 Phase 1 Design Spec 의 다음 항목을 **무수정 계승**합니다. Developer 는 `design-spec-i18n-coverage.md` 해당 섹션을 기준 문서로 참고하세요. Phase 2a / 2b 와 동일 패턴.

| Phase 1 섹션 | 제목 | 상속 여부 | 본 스펙 적용 포인트 |
|------|------|-----------|-------------------|
| §2-1 ~ §2-4 | KO/EN 톤앤매너 · 종결 컨벤션 · 지양/선호 표현 | **100% 상속** | 6 파일 모든 카피에 동일 적용. 특히 §2-2 KO 종결 `~됩니다 / ~하세요` 규칙 준수 |
| §3-1 | 브랜드명 (Testably / Jira / GitHub / Claude / Supabase / Slack / Paddle 등) | **100% 상속** | AC-1 제외 항목. `Jira integration requires Hobby+` 의 `Jira`, `Hobby` 는 interpolation 변수로 유지 (AC-16) |
| §3-2 | 도메인 용어 고정 번역 표 | **100% 상속 + 확장** | 본 스펙 §3-1 에서 공유 컴포넌트 신규 용어(Focus Mode / Detail Panel / Export / Avatar) 추가 |
| §3-3 | "Run" 혼용 주의 (기존 `sections.runs='런'` 유지) | **100% 상속** | 본 스펙에서 "Run" 은 **`실행`** (DetailPanel history 탭의 `in {{runName}}` → `{{runName}}에서`). 네비 `Runs` → `common.runsAndResults` 재사용 (값 `실행 및 결과`) |
| §4-1 | 상대시간 헬퍼 `formatRelativeTime(iso, t)` + `common.time.*` | **재사용만, 신규 키 없음** | DetailPanel `getTimeAgo()` 제거 → `formatRelativeTime` 호출 (AC-14). 본 스펙 신규 시간 키 0 |
| §4-2 | 절대날짜 `formatShortDate(iso, language)` | **재사용 + Phase 2b 헬퍼 재사용** | DetailPanel 의 `toLocaleDateString('en-US', ...)` 5 곳 → `formatShortDate` · `formatShortDateTime` · `formatShortTime` · `formatLongDateTime` 재사용 (AC-14). 신규 date 헬퍼 도입 금지 |
| §4-3 | 퍼센트 / 숫자 / 소수점 | **100% 상속** | ExportModal `{{current}} of {{total}}` 에 숫자 주입, 포맷 기호 언어 무관 |
| §4-4 | 단위 (TCs / runs / days / sec) | **100% 상속** | DetailPanel steps/attachments count, FocusMode progress `{{count}}/{{total}}` |
| §5-1 | Plural `_one` / `_other` | **100% 상속** | 본 스펙 §12 plural 표 |
| §5-2 | Interpolation `{{name}}` camelCase | **100% 상속** | 본 스펙 내 모든 변수 camelCase. 단축키 파라미터는 `{{shortcut}}` (AC-15) |
| §6 | AI 비번역 원칙 (AC-9) | **100% 상속 — 본 스펙 해당 없음** | 본 스펙 6 컴포넌트는 **AI 응답을 직접 렌더하지 않는다**. Claude 본문 렌더 영역은 Phase 1 의 AIRunSummaryPanel / AiRiskAnalysisCard 전담. §13 재확인 |

### 2-1. 이번 Phase 범위에서 Phase 1 / 2 와 **다른 점**

| 항목 | Phase 1 | Phase 2a (plan) | Phase 2b (run) | Phase 3 |
|------|---------|-----------------|----------------|---------|
| 대상 | 20개 컴포넌트 분산 | 1 파일 (plan-detail) | 1 파일 (run-detail) | **6 공유 컴포넌트** (여러 페이지에서 참조) |
| 네임스페이스 | `common.*` + `milestones.*` + `runs.aiSummary.*` | `milestones.planDetail.*` | `runs.detail.*` + `runs.toast.*` | **기존 편입만** — `common.nav.*` / `common.detailPanel.*` / `common.exportModal.*` / `common.avatar.*` / `runs.detail.focusMode.*` |
| 한국어 하드코딩 | 거의 없음 | 0건 | ~22건 | **0건** (주석 2건 제외, AC-2) |
| 신규 키 범위 | ~90 | ~160 | ~200 | **80~160 (AC-6)** — Phase 2 대비 작은 이유: 공유 컴포넌트 특성상 재사용 비율이 매우 높음 |
| AI 응답 렌더 | AIRunSummaryPanel + AiRiskAnalysisCard | — | — | **없음** (§13 재확인) |
| 단축키 interpolation | X | X | `Cmd+Shift+F`, `Enter` | **신규 규칙** — `{{shortcut}}` = `'['` / `'/'` 등 단일 문자 (AC-15) |
| 상수 블록 리팩토링 | X | STATUS_CONFIG / PRIORITY_CONFIG (useMemo) | X | **STATUS_CONFIG(Badge) / STATUS_BUTTONS / FILTER_CHIPS / 키보드 힌트 3배열 useMemo 이동** (AC-8, AC-10, AC-14) |
| 상태 라벨 대문자화 로직 제거 | 일부 | 전부 | 전부 | **DetailPanel 5 곳 / ExportModal 1 곳 / FocusMode history 1 곳** (AC-14) 모두 제거 후 `common.passed|failed|blocked|retest|untested` 룩업으로 전환 |

---

## 3. 고유명사 / 도메인 용어 (Phase 1 §3 연장)

### 3-1. 공유 컴포넌트 특화 용어 — 고정 번역

Phase 1 §3-2 표를 그대로 유지하면서, 본 Phase 에서 처음 등장하는 용어를 추가합니다.

| EN | KO 확정 번역 | 대체 후보 (NG) | 사용 위치 |
|----|-------------|---------------|---------|
| **Focus Mode** | `Focus Mode` (고유명사 유지) | ~~집중 모드~~, ~~포커스 모드~~ | FocusMode 컴포넌트 전반. Phase 2b §3-1 상속 — 실행 플로우의 **제품 기능명**, 브랜드-like. header 라벨·exit 버튼 근처에는 그대로 `Focus Mode`. 단 **화면 내 설명 문장** (예: `Focus Mode (Cmd+Shift+F)`) 도 `Focus Mode` 영문 유지 |
| **Detail Panel** | `세부 정보` (문장 내) / `상세 패널` (컴포넌트명 언급 시, 거의 노출 없음) | ~~디테일 패널~~, ~~디테일 창~~ | DetailPanel 이 UI 상 명시적으로 "Detail Panel" 이라는 라벨로 노출되지는 않음. 내부 탭/라벨 개별 번역 (§6 표) |
| **Export** | `내보내기` | ~~익스포트~~ | ExportModal 헤더. `common.export` 재사용 (Phase 0) |
| **Profile / Avatar** | `프로필 이미지` (alt 속성 fallback 전용) | ~~아바타~~, ~~프로필~~ | Avatar 컴포넌트 `img alt` fallback 1 건. `common.avatar.altFallback` |
| **Comments** (탭) | `댓글` | ~~코멘트~~, ~~의견~~ | DetailPanel Comments 탭 헤더 |
| **Results** (탭) | `결과` | ~~리절트~~, ~~테스트 결과~~ (후자는 ResultDetailModal 전용) | DetailPanel Results 탭 헤더 |
| **Issues** (탭) | `이슈` | — | DetailPanel Issues 탭 헤더. Phase 1 재사용 (`common.issues.*` 전체) |
| **History** (탭) | `이력` | ~~히스토리~~, ~~기록~~ | DetailPanel History 탭 헤더 |
| **Post** (버튼, 댓글 게시) | `게시` | ~~포스트~~, ~~올리기~~ | DetailPanel Comments 탭 Post 버튼 |
| **Pass & Next** | `통과 후 다음` | ~~패스 & 다음~~ | DetailPanel Quick Actions. `&amp;` HTML entity 는 번들에서 `&` 로 |
| **Add Result** | `결과 추가` | ~~결과 추가하기~~ | DetailPanel Quick Actions. Phase 2b `runs.detail.addResult.title = '결과 추가'` 와 동일 — **재사용 검토 권장** (단 DetailPanel 은 `runs` ns 를 import 하지 않음, `common.detailPanel.*` 에 별도 키 권장) |
| **Link Existing Issue** | `기존 이슈 연결` | ~~링크 기존 이슈~~ | DetailPanel Issues 탭 |
| **Create Jira Issue** / **Create GitHub Issue** | `Jira 이슈 생성` / `GitHub 이슈 생성` | — | DetailPanel Issues 탭 + FocusMode GitHub modal. Phase 2b `runs.detail.addResult.issues.createJira = 'Jira 이슈 생성'` 존재 — **카피 동일. ns 가 다르므로 `common.detailPanel.*` 에 복제** (prop drilling 회피) |
| **No comments yet** / **No linked issues** / **No test results yet** / **No history yet** / **No steps defined** | `아직 댓글이 없습니다` / `연결된 이슈 없음` / `아직 테스트 결과가 없습니다` / `아직 이력이 없습니다` / `정의된 스텝 없음` | ~~댓글 없음~~(너무 짧음) | DetailPanel empty states 5 종. Phase 1 §2-2 Empty state 종결 `~없습니다` 규칙 |
| **Precondition** | `사전 조건` | ~~전제 조건~~, ~~프리컨디션~~ | DetailPanel Steps / FocusMode body. ISTQB 한국어 표준 |
| **Expected Result** | `예상 결과` | ~~기대 결과~~ | DetailPanel Steps (expected_result fallback). 값 "Expected Result" 1건만 |
| **Attachments** | `첨부` / `첨부 파일` (count 포함 시) | ~~어태치먼트~~ | DetailPanel Steps / FocusMode body. Phase 2b 재사용 (`runs.detail.addResult.attachments.label = '첨부 파일'`) 권장 — 단 공유 컴포넌트 ns 분리로 `common.detailPanel.steps.attachments`·`runs.detail.focusMode.body.attachmentsHeader` 복제 |
| **Test Steps** | `테스트 스텝` | ~~테스트 단계~~ | FocusMode body. Phase 2b 용어 `Step = 스텝` 승계 |
| **Previously {{status}}** | `이전 결과: {{status}}` | ~~이전: {{status}}~~ | FocusMode previously-status pill. interpolation `{{status}}` 는 `common.passed|failed|blocked` 룩업 결과 주입 |
| **Preview** (Lightbox alt) | `미리보기` | ~~프리뷰~~ | FocusMode Lightbox `alt="Preview"` |
| **Sidebar** (keyboard hint) | `사이드바` | ~~측면 패널~~ | FocusMode header kbd hint |
| **Progress** (sidebar) | `진행률` | ~~진행도~~ | FocusMode sidebar. Phase 2b `runs.detail.progress.title = '진행률'` 과 맥락 다름 (이 곳은 sidebar 전용) — 별도 키 `runs.detail.focusMode.sidebar.progress` |
| **Search TC...** (placeholder) | `TC 검색…` | ~~TC 찾기~~ | FocusMode sidebar search |
| **No test cases match** | `일치하는 테스트 케이스 없음` | ~~매치되는 TC 없음~~ | FocusMode sidebar empty |
| **Open sidebar ([)** | `사이드바 열기 ({{shortcut}})` | ~~사이드바 보기~~ | FocusMode collapsed tab tooltip. `{{shortcut}}` = `'['` (AC-15) |
| **Pass this step** / **Fail this step** | `이 스텝 통과` / `이 스텝 실패` | ~~통과하기~~, ~~실패하기~~ | FocusMode step row title. 단축키 아님 |
| **Update** (SS banner) | `업데이트` | ~~갱신~~ | FocusMode SS banner + DetailPanel SS diff. Phase 2b `runs.detail.addResult.steps.updateButton = '업데이트'` 재사용 권장 |
| **View changes** / **Hide changes** | `변경 보기` / `변경 숨기기` | ~~변경점 보기~~ | FocusMode SS banner toggle |
| **Dismiss** | `닫기` | ~~해제~~, ~~무시~~ | FocusMode SS banner. `common.close = '닫기'` 와 값 같음 — **재사용 검토**. 단 Dismiss 는 banner 영구 무시 의도이고 close 는 모달 일회성 → Phase 2b 에서 `runs.detail.ssBanner.dismiss = '닫기'` 별도 키 유지 — 본 스펙도 `runs.detail.focusMode.ssBanner.dismiss` 별도 키 |
| **Exit** | `나가기` | ~~종료~~ | FocusMode header. 상단 `Esc` kbd tag 와 조합 |
| **Note** (optional) | `메모` (`(선택 사항)` 주석) | ~~노트~~ | FocusMode note label. Phase 2b `runs.detail.addResult.note.label = '메모'` — 복제 (ns 분리) |
| **Describe what you observed...** (placeholder) | `관찰한 내용을 기록하세요…` | ~~무엇을 봤는지 쓰세요~~ | FocusMode note textarea |
| **Creating...** | `생성 중…` | ~~크리에이팅~~ | FocusMode GitHub modal + DetailPanel link button. Phase 2b `runs.detail.githubIssue.footer.creating = '생성 중...'` 존재 — 복제 |
| **Create Issue** | `이슈 생성` | ~~이슈 만들기~~ | FocusMode GitHub modal footer. Phase 2b `runs.detail.githubIssue.footer.submit = '이슈 생성'` — 복제 |
| **Title** (label) | `제목` | — | FocusMode GitHub modal + any "Title" field. Phase 2b `runs.detail.githubIssue.titleField.label = '제목'` — 복제 |
| **Will be created in** | `생성 위치:` | ~~다음에 생성됩니다~~ | FocusMode GitHub modal hint. Phase 2b `runs.detail.githubIssue.willBeCreatedInPrefix = '생성 위치: '` — 복제 (trailing space 유지) |
| **Dashboard** (nav) | `대시보드` | ~~홈~~ | ProjectHeader nav tab |
| **Steps Library** (nav) | `스텝 라이브러리` | ~~스텝 라이브러리~~ (동일), ~~공유 스텝 라이브러리~~ | ProjectHeader nav tab |
| **Requirements** (nav) | `요구사항` | ~~리퀴어먼트~~, ~~요구 사항~~ (공백 버전) | ProjectHeader nav tab |
| **Traceability** (nav) | `추적성` | ~~트레이서빌리티~~, ~~추적 매트릭스~~ | ProjectHeader nav tab |
| **Documents** (nav) | `문서` | ~~도큐먼트~~ | ProjectHeader nav tab. `common.documentation = '문서'` 와 동일 값 — 단 navigation 전용 키 `common.nav.documents` 유지 (맥락 분리) |
| **Switch project** | `프로젝트 전환` | ~~프로젝트 변경~~, ~~프로젝트 바꾸기~~ | ProjectHeader project dropdown header |
| **Keyboard Shortcuts (?)** | `단축키 (?)` | ~~키보드 단축키~~, ~~핫키~~ | ProjectHeader top-right icon tooltip. `?` 문자는 화면에 그대로 노출되는 단축키 힌트 — **interpolation 불필요** (고정 문자열, AC-15 예외) |
| **User** (fallback) | `사용자` | ~~유저~~ | ProjectHeader profile dropdown `{full_name || email || 'User'}` fallback |
| **No projects found** | `프로젝트가 없습니다` | ~~프로젝트 못 찾음~~ | ProjectHeader project dropdown empty. **기존 `projects.noProjects` 재사용** (값 `'No projects found' / '프로젝트가 없습니다'`) |
| **Profile image** (avatar alt fallback) | `프로필 이미지` | ~~아바타 이미지~~, ~~사진~~ | Avatar `img alt={name \|\| email \|\| 'Avatar'}`. UI 스크린에는 노출 안되지만 screen reader 접근성용 — §2-1 톤 `명사` |

### 3-2. Plan 이름 재확인 (AC-13)

`TIER_INFO.{1..7}.name` 의 7 개 값은 **영문 고정** (브랜드-like). 본 스펙에서도 **번역 대상 아님**. Dev Spec AC-13 확정.

| Tier | name | KO 노출 값 |
|------|------|-----------|
| 1 | `Free` | `Free` (영문 고정) |
| 2 | `Hobby` | `Hobby` |
| 3 | `Starter` | `Starter` |
| 4 | `Professional` | `Professional` |
| 5 | `Enterprise S` | `Enterprise S` |
| 6 | `Enterprise M` | `Enterprise M` |
| 7 | `Enterprise L` | `Enterprise L` |

> **이유:** Phase 1 §3-1 브랜드-like 원칙 승계. "Starter 플랜 필요" / "Starter 플랜이 필요합니다" 식으로 tier 이름은 고정하고 조사·설명만 번역. 본 스펙은 TIER_INFO 를 읽기만 하므로 `tierInfo.name` 값을 JSX 에 `{tierInfo.name}` 그대로 렌더.

---

## 4. 재사용 맵 (기존 번들 존재 여부 전수 매트릭스)

Dev Spec §4-3 "키 재사용 맵" + Phase 2b §3-2 패턴 확장. 작업 전 Developer 는 이 표로 **신규 vs 재사용** 을 즉시 판별.

### 4-1. `common.*` 기존 키 존재 매트릭스 (Phase 3 소비 영역)

| 용도 | 기존 키 | 값 (en / ko) | 본 스펙 처리 |
|------|--------|-------------|-------------|
| Pass / Fail / Blocked / Retest / Untested | ✅ `common.passed` / `common.failed` / `common.blocked` / `common.retest` / `common.untested` | `Passed / 통과`, `Failed / 실패`, `Blocked / 차단됨`, `Retest / 재테스트`, `Untested / 미테스트` | **재사용 필수** — StatusBadge AC-8, DetailPanel 5 곳 AC-14, ExportModal AC-11, FocusMode STATUS_BUTTONS AC-10 / FILTER_CHIPS / history 모두 같은 키 |
| Cancel / Save / Close / Create / Edit / Delete / Add / Search / Filter / Export / Download / Upload / Logout | ✅ `common.cancel` / `.save` / `.close` / `.create` / `.edit` / `.delete` / `.add` / `.search` / `.filter` / `.export` / `.download` / `.upload` / `.logout` | Phase 0 기존 | **재사용** — DetailPanel footer / ExportModal Cancel / ProjectHeader Log out 모두 동일 |
| Settings | ✅ `common.settings` | `Settings / 설정` | **재사용** — ProjectHeader profile dropdown |
| Test Cases / Runs / Milestones / Exploratory (Sessions) / Projects | ✅ `common.testCases` / `common.runsAndResults` / `common.milestones` / `common.sessions` / `common.projects` | `Test Cases / 테스트 케이스`, `Runs / 실행 및 결과`, `Milestones / 마일스톤`, `Exploratory / 디스커버리 로그`, `Projects / 프로젝트` | **재사용** — ProjectHeader navItems 9 개 중 4 개. 단 `common.sessions` KO 값 `디스커버리 로그` 는 네비 맥락상 너무 긴 감 — **Designer 재검토 권고: 기존 값 유지하되 시각 확인 후 과하면 `common.nav.exploratory` 별도 키 분기** (AC-12 엣지 §8 승계). 본 스펙 **초기 권장: 재사용 유지** (Phase 5 에서 일괄 `탐색` 으로 shortening) |
| Priority / Status / Assignee / Name / Description | ✅ `common.priority` / `common.status` / `common.assignee` / `common.name` / `common.description` | Phase 0 기존 | **재사용** — DetailPanel meta grid |
| Owner / Members / Created at / Updated at / Start date / End date / Due date | ✅ `common.owner` / `common.members` / `common.createdAt` / `common.updatedAt` / `common.startDate` / `common.endDate` / `common.dueDate` | Phase 0 기존 | 재사용 가능하나 DetailPanel 의 `Created` / `Last Run` 은 **의미 차이** — `common.createdAt = 'Created at'` (KO `생성일`) 로 `at` 이 붙어 메타 grid 세로 라벨로 과함. **Designer 권고: 신규 `common.detailPanel.meta.created = 'Created' / '생성'`** (짧은 meta grid 라벨). `common.detailPanel.meta.lastRun = 'Last Run' / '마지막 실행'` 신규 |
| Loading... | ✅ `common.loading` | `Loading... / Loading...` (KO 값 이스케이프 미해결 — Phase 2b QA W-2 기록. 본 스펙 건드리지 않음) | DetailPanel 4 곳 (link btn spin + diff loading + comments loading + history loading) / FocusMode 2 곳 (comments/history loading) 모두 `common.loading` 재사용 가능. **단 Phase 2b `runs.detail.tcDiff.loading = 'Loading…' / '로딩 중…'` 존재** — FocusMode `Loading...` 은 맥락 동일 (comments/history collapsible panel) → 재사용 권장 `common.loading`. DetailPanel 은 맥락 별도 (SS Diff) → Phase 2b `runs.detail.addResult.steps.diffLoading` 재사용 |
| Time (relative) | ✅ `common.time.*` (justNow / minutesAgo / hoursAgo / daysAgo / monthsAgo / yearsAgo, `_one`/`_other` 페어) | Phase 1 기존 | **재사용 필수** — DetailPanel `getTimeAgo()` 삭제 후 `formatRelativeTime(iso, t)` 호출. FocusMode 는 이미 inline `d === 0 ? 'today' : …` 로 직접 계산 (AC-14 대상 아님? — Dev Spec §4-5-2 는 DetailPanel 한정. FocusMode comments/history `relTime` 은 **본 스펙 범위 외**로 Designer 판단: 신규 범위에 포함하여 `common.time.*` 로 통일 권장). 본 스펙 **§7-7-2 에서 포함** |
| Unknown error | ✅ `common.unknownError` | `Unknown error / 알 수 없는 오류` (Phase 2b 신규) | FocusMode `Failed to save result. Please try again.` fallback 및 GitHub issue error `err.message \|\| 'Unknown error'` 패턴 재사용 |
| Shared toast (saved / saveFailed / networkError / somethingWentWrong) | ✅ `common.toast.*` | Phase 0 기존 | FocusMode setFocusToast 맥락 (3 곳) 은 **신규 `runs.detail.focusMode.toast.*`** 권장 (Phase 2b 와 톤 분리) |
| Issues sources / filters | ✅ `common.issues.all` / `common.issues.priority.*` / `common.issues.status.*` / `common.issues.assignee.unassigned` | Phase 1 기존 | **재사용** — FocusMode FILTER_CHIPS 의 `All` → `common.issues.all` (값 `All / 전체`) 재사용 가능. DetailPanel `— Unassigned —` 는 양쪽 em-dash 래핑 포함 — `common.issues.assignee.unassigned` 값 `Unassigned / 미지정` 과 래핑 다름. **신규 `common.detailPanel.meta.unassignedOption = '— Unassigned —' / '— 미지정 —'`** (AC-14 브라우저 `<select>` 옵션이라 별도 키 유지. Phase 2b 도 `runs.detail.tcList.assigneeDropdown.unassigned = '— Unassigned —'` 로 별도 키 유지한 선례) |

### 4-2. `runs.*` / `projects.*` 기존 키 존재 매트릭스

| 용도 | 기존 키 | 본 스펙 처리 |
|------|--------|-------------|
| No projects found | ✅ `projects.noProjects = 'No projects found' / '프로젝트가 없습니다'` | **재사용** — ProjectHeader project dropdown empty (AC-12) |
| SS Diff banner: Locked / View changes / Hide changes / Update / Dismiss / Current(v) / Latest(v) / Version history unavailable | ✅ `runs.detail.addResult.steps.lockedBanner` / `runs.detail.ssBanner.*` / `runs.detail.addResult.steps.diffCurrent|Latest|Unavailable|Loading` | **재사용** — DetailPanel SS Diff 영역 (라인 830~848, 832) + FocusMode SS banner (라인 930~995). 카피 동일 → ns 다르지만 `common` 이 아닌 `runs.*` 를 import 하는 컴포넌트이므로 runs ns 재사용 가능 (DetailPanel 은 이미 runs 데이터를 props 로 받고 있음. `useTranslation('common', 'runs')` 다중 ns 사용) |
| GitHub Issue Quick-Create modal: Title / Create Issue / Creating... / Cancel / Will be created in | ✅ `runs.detail.githubIssue.titleField.label` / `runs.detail.githubIssue.footer.submit` / `runs.detail.githubIssue.footer.creating` / `common.cancel` / `runs.detail.githubIssue.willBeCreatedInPrefix` | **재사용 가능 — 단 FocusMode 맥락이 다름** (quick-create = 간소화). Designer 판단: 카피 100% 동일 → **재사용** (중복 키 제거). 단 modal 타이틀 `Create GitHub Issue` 는 Phase 2b `runs.detail.githubIssue.title = 'Create GitHub Issue' / 'GitHub 이슈 생성'` 재사용. 본 스펙에서 신규 `runs.detail.focusMode.githubIssueModal.*` 은 **0 키** 로 축소 → 전부 기존 `runs.detail.githubIssue.*` 재사용 (Dev Spec §4-2 의 "중복 80% 이상이면 공통 키로 승격" 분기 발동) |
| Locked to preserve test results (body inline) | ✅ `runs.detail.addResult.steps.lockedBanner = 'Locked to preserve test results' / '테스트 결과 보존을 위해 잠김'` (또는 동등) | **재사용** — FocusMode SS banner 및 DetailPanel SS diff 양쪽 동일 카피 |
| Linked Issues (섹션 라벨) | ✅ `runs.detail.addResult.issues.label = 'Linked Issues' / '연결된 이슈'` | **재사용** — FocusMode "GitHub/Jira Issue creation — shown when TC is failed" 섹션 (라인 1361) + DetailPanel issues 탭 내부 (위치 없음 — 참고만) |
| New version available for {name} (v{version}) | ✅ `runs.detail.ssBanner.headline` (plural) | 카피 살짝 다름 — FocusMode 는 이모지 🔄 포함 `🔄 New version available for {custom_id} '{name}' (v{version})`. **신규 키 `runs.detail.focusMode.ssBanner.newVersionPrefix`** interpolation `{{customId}}`, `{{name}}`, `{{version}}`. 이모지 포함 |
| Back to (페이지 이동) | ❌ `common.back` 없음 (Phase 2b `runs.detail.page.backToRuns` 전용) | ProjectHeader 에는 back 버튼 없음 — 무관 |

### 4-3. 신규 `common.*` 보강 요청 (본 스펙 필요 분)

Dev Spec §10 "필요 시 보강" 중 실제 필요분:

| 신규 키 | EN | KO | 근거 |
|--------|----|----|-----|
| `common.user` 또는 `common.nav.userFallback` | `User` | `사용자` | ProjectHeader profile dropdown fallback. **Designer 결정: `common.nav.userFallback`** (nav 전용 맥락) |

> **주의:** `common.passed|failed|blocked|retest|untested` 는 **그대로 재사용** (Phase 2b AC-7, Phase 3 AC-8 승계). 신규 `common.status.*` 생성 금지.

### 4-4. 중복 생성 금지 목록 (PR 리뷰 체크리스트)

Developer 가 PR 작성 시 다음 영문 값이 본 스펙 신규 키 후보로 올라오면 **기존 키 재사용** 으로 전환:

- `Cancel`, `Close`, `Save`, `Edit`, `Delete`, `Add`, `Post` (→ `common.*`)
- `Passed`, `Failed`, `Blocked`, `Retest`, `Untested` (→ `common.*`)
- `Priority`, `Status`, `Assignee`, `Description`, `Name` (→ `common.*`)
- `Test Cases`, `Runs`, `Milestones`, `Exploratory`, `Settings`, `Log out` (→ `common.testCases` / `common.runsAndResults` / `common.milestones` / `common.sessions` / `common.settings` / `common.logout`)
- `No projects found` (→ `projects.noProjects`)
- `{{count}}m ago`, `{{count}}h ago`, `{{count}}d ago`, `just now` (→ `common.time.*`)
- `Create Jira Issue`, `Create GitHub Issue`, `Create Issue`, `Creating...`, `Title`, `Will be created in` (→ `runs.detail.jiraIssue.*` / `runs.detail.githubIssue.*`)
- `Update`, `Locked to preserve test results`, `Version history unavailable`, `Current (v...)`, `Latest (v...)`, `Loading...` (SS Diff) (→ `runs.detail.addResult.steps.*` / `runs.detail.ssBanner.*`)

**PR 리뷰어 체크:** 신규 키 PR 에서 영문 값이 위 목록 중 하나와 100% 일치하면 **재사용으로 수정 요청**.

---

## 5. 번들 트리 배치 도식

Dev Spec §10 / §4-2 네임스페이스 배치와 동일. 실제 `src/i18n/local/en/{common,runs,projects}.ts` 의 최종 트리 구조:

### 5-1. `en/common.ts` (ko 미러)

```
common (existing root)
├── overview / milestones / documentation / testCases / ... (Phase 0 기존)
├── settings / logout / ... (Phase 0 기존)
├── passed / failed / blocked / retest / untested (Phase 0 기존 — Phase 3 전 파일 재사용)
├── cancel / save / close / create / ... (Phase 0 기존)
├── time.* (Phase 1 기존 — DetailPanel getTimeAgo 삭제 후 재사용)
├── weekday.* (Phase 1 기존 — 본 스펙 미사용)
├── toast.* (Phase 0 기존 + Phase 2a 확장)
├── errorBoundary.* (f024 기존)
├── issues.* (Phase 1 기존 — FocusMode FILTER_CHIPS 의 `All` 만 재사용)
│
├── nav                                     ← [NEW Phase 3 서브트리 A]
│   ├── dashboard                           (ProjectHeader navItems[0])
│   ├── stepsLibrary                        (navItems[2])
│   ├── requirements                        (navItems[4])
│   ├── traceability                        (navItems[5])
│   ├── documents                           (navItems[8])
│   ├── switchProject                       (프로젝트 드롭다운 헤더)
│   ├── keyboardShortcutsTooltip            (키보드 아이콘 title)
│   └── userFallback                        (profile 이름 fallback)
│   (재사용): testCases / runsAndResults / milestones / sessions / settings / logout — flat 키 그대로
│
├── avatar                                  ← [NEW Phase 3 서브트리 B]
│   └── altFallback                         (Avatar img alt fallback 1 건)
│
├── detailPanel                             ← [NEW Phase 3 서브트리 C]
│   ├── quickActions                        (Run 모드 2번째 바)
│   │   ├── statusOption                    (select `<option>` 5종)
│   │   │   ├── untested                    ('— Untested')
│   │   │   ├── passed                      ('✓ Passed')
│   │   │   ├── failed                      ('✕ Failed')
│   │   │   ├── blocked                     ('⊘ Blocked')
│   │   │   └── retest                      ('↻ Retest')
│   │   ├── addResult                       ('Add Result')
│   │   ├── passAndNext                     ('Pass & Next')
│   │   ├── previousTooltip                 (title="Previous")
│   │   └── nextTooltip                     (title="Next")
│   │
│   ├── meta                                (Meta grid 6 라벨)
│   │   ├── priority                        (헤더, `common.priority` 재사용 가능 — PR 리뷰 시 판단)
│   │   ├── folder                          (신규, 'Folder' / '폴더')
│   │   ├── tags                            (신규, 'Tags' / '태그')
│   │   ├── assignee                        (헤더, `common.assignee` 재사용)
│   │   ├── created                         (신규 — `common.createdAt` 과 어휘 다름)
│   │   ├── lastRun                         (신규, 'Last Run' / '마지막 실행')
│   │   └── unassignedOption                ('— Unassigned —' / '— 미지정 —', select option 전용)
│   │
│   ├── steps                               (Steps 영역)
│   │   ├── stepsCount_one                  (`{{count}} step`)
│   │   ├── stepsCount_other                (`{{count}} steps`)
│   │   ├── attachmentsCount_one            (`· {{count}} attachment`)
│   │   ├── attachmentsCount_other          (`· {{count}} attachments`)
│   │   ├── stepsPassed                     (`{{passed}}/{{total}} steps passed`)
│   │   ├── precondition                    ('⚠ Precondition' / '⚠ 사전 조건')
│   │   ├── expectedResult                  ('Expected Result' / '예상 결과')
│   │   ├── noStepsDefined                  ('No steps defined' / '정의된 스텝 없음')
│   │   └── attachmentsHeader               ('Attachments ({{count}})' / '첨부 ({{count}})')
│   │
│   ├── tabs                                (Tab 4 헤더)
│   │   ├── comments                        ('Comments' / '댓글')
│   │   ├── results                         ('Results' / '결과')
│   │   ├── issues                          ('Issues' / '이슈')
│   │   └── history                         ('History' / '이력')
│   │
│   ├── comments                            (Comments 탭)
│   │   ├── empty                           ('No comments yet' / '아직 댓글이 없습니다')
│   │   ├── placeholder                     ('Add a comment...' / '댓글 추가…')
│   │   └── post                            ('Post' / '게시')
│   │
│   ├── results                             (Results 탭)
│   │   ├── empty                           ('No test results yet' / '아직 테스트 결과가 없습니다')
│   │   ├── unknownRun                      ('Unknown Run' / '알 수 없는 실행')
│   │   └── byAuthor                        ('by {{author}}' / '{{author}}님이 기록')
│   │
│   ├── issues                              (Issues 탭)
│   │   ├── empty                           ('No linked issues' / '연결된 이슈 없음')
│   │   ├── linkExisting                    ('Link Existing Issue' / '기존 이슈 연결')
│   │   ├── linkInputLabel                  ('Link Existing Issue' / '기존 이슈 연결' — input 바로 위 p 태그)
│   │   ├── linkInputPlaceholder            ('Enter issue key, e.g. PROJ-123' / '이슈 키 입력 (예: PROJ-123)')
│   │   ├── linkButton                      ('Link' / '연결')
│   │   ├── upsellTitle                     ('{{brand}} integration requires {{plan}}+' / '{{brand}} 연동은 {{plan}} 플랜부터 가능합니다', interp)
│   │   └── upsellBody                      ('Upgrade to create and manage Jira issues from test results.' / '업그레이드하여 테스트 결과에서 Jira 이슈를 생성·관리하세요.')
│   │
│   └── history                             (History 탭)
│       ├── empty                           ('No history yet' / '아직 이력이 없습니다')
│       ├── markedAs                        ('{{author}} marked as' / '{{author}}님이', interp — §12 Trans 컴포넌트 사용)
│       ├── inRun                           ('in {{runName}}' / '{{runName}}에서', interp)
│       └── unknownAuthor                   ('Unknown' / '알 수 없음', `common.unknownError` 와 별개)
│
└── exportModal                             ← [NEW Phase 3 서브트리 D]
    ├── title                               ('Export' / '내보내기')
    ├── format                              ('Format' / '포맷')
    ├── statusFilter                        ('Status Filter' / '상태 필터')
    ├── tagFilter                           ('Tag Filter' / '태그 필터')
    ├── tagFilterHint                       ('(empty = all tags)' / '(비우면 전체 태그)')
    ├── includeAiSummary                    ('Include AI Summary' / 'AI 요약 포함')
    ├── includeAiSummaryDesc                ('Prepends risk level, metrics, failure patterns & recommendations' / '리스크 수준, 지표, 실패 패턴, 권장 조치를 문서 앞쪽에 추가합니다')
    ├── countPreview                        ('{{current}} of {{total}} test cases will be exported' / '테스트 케이스 {{total}}건 중 {{current}}건이 내보내집니다', interp)
    └── exportButton                        ('Export {{format}}' / '{{format}} 내보내기', interp — `{{format}}` = 'PDF'|'CSV'|'EXCEL' 영문 고정)
```

### 5-2. `en/runs.ts` (ko 미러)

```
runs (existing root)
├── title / createRun / ... (Phase 0 기존)
├── aiSummary.* (Phase 1)
├── detail (Phase 2b)
│   ├── page / runStatus / headerActions / kpi / progress / folderSidebar / tcList / ssBanner / deprecatedBanner
│   ├── addResult / jiraIssue / githubIssue / tcDiff / upgradeModal / upgradeNudge / jiraSetup / resultDetail / imagePreview / fatalError
│   │
│   └── focusMode                           ← [NEW Phase 3 서브트리]
│       ├── header                          (상단 run name·counter·exit)
│       │   ├── counter                     ('{{index}} / {{total}}' — 숫자 포맷이라 언어 무관 **사실상 0 번역** 키, 하지만 i18next 표준 유지)
│       │   └── exit                        ('Exit' / '나가기')
│       │
│       ├── kbdHint                         (키보드 힌트 3 그룹 8 라벨)
│       │   ├── comments                    ('Comments' / '댓글')
│       │   ├── history                     ('History' / '이력')
│       │   ├── note                        ('Note' / '메모')
│       │   ├── sidebar                     ('Sidebar' / '사이드바')
│       │   └── search                      ('Search' / '검색', `common.search` 재사용 가능 — PR 리뷰)
│       │   (STATUS_BUTTONS 의 label 5 개는 `common.passed|failed|blocked|retest` + focusMode.skip)
│       │
│       ├── sidebar                         (280px 사이드바)
│       │   ├── progress                    ('Progress' / '진행률')
│       │   ├── completed                   ('{{count}} / {{total}} completed' / '{{total}}개 중 {{count}}개 완료', interp)
│       │   ├── searchPlaceholder           ('Search TC...' / 'TC 검색…')
│       │   ├── empty                       ('No test cases match' / '일치하는 테스트 케이스 없음')
│       │   └── openTooltip                 ('Open sidebar ({{shortcut}})' / '사이드바 열기 ({{shortcut}})', interp — §12-3)
│       │
│       ├── filterChip                      (FILTER_CHIPS 의 `All` 외 5 개는 common 재사용)
│       │   └── all                         ('All' / '전체', `common.issues.all` 재사용 가능 — Designer 결정: 재사용. 이 서브트리는 0 신규 키)
│       │
│       ├── body                            (메인 body 섹션 헤더)
│       │   ├── previously                  ('Previously {{status}}' / '이전 결과: {{status}}', interp — `{{status}}` = 이미 번역된 common.passed 등)
│       │   ├── precondition                ('Precondition' / '사전 조건', tier2 헤더)
│       │   ├── attachmentsHeader           ('Attachments ({{count}})' / '첨부 ({{count}})', interp)
│       │   ├── testStepsHeader             ('Test Steps' / '테스트 스텝')
│       │   ├── passedSuffix                ('{{count}}/{{total}} passed' / '{{count}}/{{total}} 통과', interp)
│       │   ├── stepPassTitle               ('Pass this step' / '이 스텝 통과')
│       │   ├── stepFailTitle               ('Fail this step' / '이 스텝 실패')
│       │   ├── downloadLabel               ('Download' / '다운로드', `common.download` 재사용 가능 — PR 리뷰)
│       │   └── sharedBadge                 ('Shared' / '공유', Phase 2b `runs.detail.addResult.steps.sharedBadge` 재사용 — 본 서브트리 0 키로 축소)
│       │
│       ├── ssBanner                        (SS Version Banner, FocusMode body 내부)
│       │   ├── newVersionPrefix            ('🔄 New version available for {{customId}} ''{{name}}'' (v{{version}})' / '🔄 {{customId}} ''{{name}}''의 새 버전 사용 가능 (v{{version}})', interp — 이모지 포함)
│       │   ├── lockedHint                  ('Locked to preserve test results' / '테스트 결과 보존을 위해 잠김' — Phase 2b `runs.detail.addResult.steps.lockedBanner` 재사용 가능. Designer 결정: 재사용, 본 키 미신설)
│       │   ├── viewChanges                 ('View changes' / '변경 보기')
│       │   ├── hideChanges                 ('Hide changes' / '변경 숨기기')
│       │   ├── update                      ('Update' / '업데이트' — Phase 2b `runs.detail.addResult.steps.updateButton` 재사용)
│       │   ├── dismiss                     ('Dismiss' / '닫기')
│       │   ├── currentPrefix               ('Current (v{{version}})' / '현재 (v{{version}})' — Phase 2b `runs.detail.addResult.steps.diffCurrent` 재사용)
│       │   ├── latestPrefix                ('Latest (v{{version}})' / '최신 (v{{version}})' — Phase 2b `runs.detail.addResult.steps.diffLatest` 재사용)
│       │   └── noHistory                   ('No history' / '이력 없음')
│       │
│       ├── comments                        (Tier 3 collapsible panel, C 키)
│       │   ├── header                      ('Comments' / '댓글')
│       │   ├── loading                     (`common.loading` 재사용)
│       │   └── empty                       ('No comments yet' / '아직 댓글이 없습니다' — `common.detailPanel.comments.empty` 와 100% 동일 → Designer 결정: **별도 키 유지** (ns 분리 원칙, DetailPanel은 common, FocusMode는 runs). 단 Dev PR 리뷰에서 재사용 판단 가능)
│       │
│       ├── history                         (Tier 3 collapsible panel, H 키)
│       │   ├── header                      ('Execution History' / '실행 이력')
│       │   ├── loading                     (`common.loading` 재사용)
│       │   └── empty                       ('No execution history' / '실행 이력 없음')
│       │
│       ├── relTime                         (comments/history 내부 인라인 relTime 3종 — AC-14 연장 적용)
│       │   ├── today                       ('today' / '오늘' — `common.today` 재사용 가능)
│       │   ├── daysAgo_one                 ('1d ago' / '1일 전' — `common.time.daysAgo` 재사용 권장)
│       │   └── daysAgo_other               (`common.time.daysAgo_other` 재사용)
│       │   (본 relTime 서브트리는 0 키 — 전부 common 재사용 권장)
│       │
│       ├── note                            (Note textarea)
│       │   ├── label                       ('Note' / '메모' — Phase 2b `runs.detail.addResult.note.label` 재사용)
│       │   ├── optionalSuffix              ('(optional)' / '(선택 사항)')
│       │   ├── placeholder                 ('Describe what you observed...' / '관찰한 내용을 기록하세요…')
│       │   └── saveHint                    ('⌘ + Enter to save with status' / '⌘ + Enter 로 상태와 함께 저장' — `⌘ + Enter` 는 단축키 기호, 영문 고정 AC-15)
│       │
│       ├── linkedIssues                    (failed TC 일 때 Linked Issues 섹션)
│       │   ├── label                       ('Linked Issues' / '연결된 이슈' — Phase 2b `runs.detail.addResult.issues.label` 재사용)
│       │   ├── createGithub                ('Create GitHub Issue' / 'GitHub 이슈 생성' — Phase 2b `runs.detail.addResult.issues.createGithub` 재사용)
│       │   └── creating                    ('Creating...' / '생성 중…' — Phase 2b `runs.detail.githubIssue.footer.creating` 재사용)
│       │
│       ├── githubIssueModal                (GitHub Issue Quick-Create modal)
│       │   └── (전부 Phase 2b `runs.detail.githubIssue.*` 재사용 — 본 서브트리 신규 키 **0건**)
│       │   ├── title → `runs.detail.githubIssue.title`
│       │   ├── titleField.label → `runs.detail.githubIssue.titleField.label`
│       │   ├── willBeCreatedIn → `runs.detail.githubIssue.willBeCreatedInPrefix`
│       │   ├── footer.cancel → `common.cancel`
│       │   └── footer.submit → `runs.detail.githubIssue.footer.submit`
│       │
│       ├── statusButton                    (footer 5 버튼 — STATUS_BUTTONS)
│       │   ├── passed → `common.passed` 재사용
│       │   ├── failed → `common.failed` 재사용
│       │   ├── blocked → `common.blocked` 재사용
│       │   ├── retest → `common.retest` 재사용
│       │   └── skip                        ('Skip' / '건너뛰기' — 신규 1 키. status=untested 인데 카피가 'Skip')
│       │
│       ├── footer                          (Previous / Next / Last test hint)
│       │   ├── previous                    ('Previous' / '이전', `common.*` 부재 — 신규)
│       │   ├── next                        ('Next' / '다음', `common.*` 부재 — 신규)
│       │   └── lastTestHint                ('Last test — press any status key to complete the run' / '마지막 테스트 — 상태 키를 눌러 실행을 완료하세요')
│       │
│       ├── lightbox                        (Lightbox modal)
│       │   └── alt                         ('Preview' / '미리보기', img alt)
│       │
│       └── toast                           (showFocusToast / setFocusToast 3 호출처)
│           ├── githubIssueCreated          ('GitHub issue #{{number}} created' / 'GitHub 이슈 #{{number}} 생성됨', interp — line 232. Phase 2b `runs.toast.githubCreated` 와 카피 동일 → 재사용 권장. 본 서브트리 0 키)
│           ├── githubIssueFailed           ('GitHub issue creation failed: {{reason}}' / 'GitHub 이슈 생성 실패: {{reason}}', interp — line 237. Phase 2b `runs.toast.githubCreateFailed` 재사용 가능)
│           └── saveFailed                  ('Failed to save result. Please try again.' / '결과 저장에 실패했습니다. 다시 시도해 주세요.' — line 387. Phase 2b `runs.toast.resultSaveFailed = 'Failed to save result.'` 와 카피 유사하나 ` Please try again.` 추가 — Designer 결정: 본 키 신규 유지 `runs.detail.focusMode.toast.saveFailed`, Phase 2b 키 값 변경 금지 AC-5 준수)
│           (요약: 3 호출 중 2건 재사용, 1건 신규)
```

### 5-3. `en/projects.ts` (ko 미러)

```
projects (existing root)
└── noProjects (Phase 0 기존 — ProjectHeader 재사용, 신규 키 0)
```

> **원칙:** 본 스펙은 기존 `common.*` / `runs.detail.*` / `projects.*` 트리에 **편입만** 하고, 신규 네임스페이스 파일은 생성하지 않는다. Phase 1 §3-2 "신규 네임스페이스 지양" 원칙 승계.

---

## 6. 파일별 번역 매핑 — `StatusBadge.tsx` (AC-8)

Dev Spec §4-1 파일 #4. **신규 키 0. 전량 재사용.**

| 라인 | EN (기존 상수값) | 재사용 키 | KO |
|------|-----------------|---------|----|
| 12 | `Passed` | `common.passed` | `통과` |
| 13 | `Failed` | `common.failed` | `실패` |
| 14 | `Blocked` | `common.blocked` | `차단됨` |
| 15 | `Retest` | `common.retest` | `재테스트` |
| 16 | `Untested` | `common.untested` | `미테스트` |

**리팩토링 패턴 (AC-8):**

```ts
// Before (line 11~17):
const STATUS_CONFIG: Record<TestStatus, StatusConfig> = {
  passed:   { dot: '...', ..., label: 'Passed'   },
  ...
};

// After (컴포넌트 내부 useMemo):
export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const { t } = useTranslation('common');
  const STATUS_CONFIG = useMemo<Record<TestStatus, StatusConfig>>(() => ({
    passed:   { dot: 'bg-emerald-500', ..., label: t('passed') },
    failed:   { dot: 'bg-red-500',     ..., label: t('failed') },
    blocked:  { dot: 'bg-amber-500',   ..., label: t('blocked') },
    retest:   { dot: 'bg-violet-500',  ..., label: t('retest') },
    untested: { dot: 'bg-slate-400',   ..., label: t('untested') },
  }), [t]);
  ...
}
```

> **범위 요약:** 5 label 모두 기존 키. **신규 키 0**. 호출처 (10+ 페이지) 코드 변경 없음.

---

## 7. 파일별 번역 매핑 — `Avatar.tsx` (AC-9)

Dev Spec §4-1 파일 #5. **신규 키 1.**

| 라인 | EN 하드코딩 | 키 | KO | 비고 |
|------|------------|----|----|-----|
| 99 | `'Avatar'` (fallback) | `common.avatar.altFallback` | `프로필 이미지` | 신규. img alt fallback 용. `alt={name \|\| email \|\| t('common:avatar.altFallback')}` |

**비번역 대상 (호출처 책임):**
- `photoUrl` — URL 값
- `name` / `email` / `userId` — 사용자 데이터
- `PALETTE` / `SIZE` / `getAvatarColor` / `simpleHash` / `getInitials` — 값·함수
- `AvatarStack.title={m.name || m.email}` — 사용자 데이터 (AC-9)
- `+{overflow}` (line 182) — 숫자 기호

> **범위 요약:** 1 건만 변경. 호출처 prop (특히 Avatar `title` prop) 은 Dev Spec §8 에 따라 호출처 책임으로 남김 — 본 스펙 범위 외.

---

## 8. 파일별 번역 매핑 — `ProjectHeader.tsx` (AC-12, AC-13)

Dev Spec §4-1 파일 #6. 신규 8 + 재사용 6 = 14 라벨.

### 8-1. navItems (9 라벨)

| 라인 | EN | 키 | KO | 재사용/신규 |
|------|----|----|----|------------|
| 159 | `Dashboard` | `common.nav.dashboard` | `대시보드` | 신규 |
| 164 | `Test Cases` | `common.testCases` | `테스트 케이스` | **재사용** (기존 flat) |
| 169 | `Steps Library` | `common.nav.stepsLibrary` | `스텝 라이브러리` | 신규 |
| 174 | `Runs` | `common.runsAndResults` | `실행 및 결과` | **재사용** (기존 flat) |
| 179 | `Requirements` | `common.nav.requirements` | `요구사항` | 신규 |
| 184 | `Traceability` | `common.nav.traceability` | `추적성` | 신규 |
| 189 | `Milestones` | `common.milestones` | `마일스톤` | **재사용** (기존 flat) |
| 194 | `Exploratory` | `common.sessions` | `디스커버리 로그` | **재사용** (기존 flat). 단 KO 값이 nav 맥락에 길다는 감 — Phase 5 에서 `탐색`으로 단축 권고, 본 스펙 유지 (AC-5 파괴 금지) |
| 199 | `Documents` | `common.nav.documents` | `문서` | 신규. 기존 `common.documentation = '문서'` 와 동일 값이지만 nav 전용 맥락 분리 |

> **구현 주의:** `navItems` 배열이 컴포넌트 함수 함수 본문 안에 있어 (현재 155~203 라인) `useMemo(() => [...], [t, projectId, path])` 로 감싼다. `label: t('common:nav.dashboard')` 식으로 ns 접두사 명시 (다중 ns 사용).

### 8-2. 프로젝트 드롭다운 (2 라벨)

| 라인 | EN | 키 | KO | 재사용/신규 |
|------|----|----|----|------------|
| 271 | `Switch project` | `common.nav.switchProject` | `프로젝트 전환` | 신규 |
| 274 | `No projects found` | `projects.noProjects` | `프로젝트가 없습니다` | **재사용** (Phase 0) |

### 8-3. 프로필 드롭다운 + 우측 툴바 (4 라벨)

| 라인 | EN | 키 | KO | 재사용/신규 |
|------|----|----|----|------------|
| 343 | `Keyboard Shortcuts (?)` | `common.nav.keyboardShortcutsTooltip` | `단축키 (?)` | 신규. `(?)` 는 단축키 힌트 고정 문자 — 문자열 안에 포함 (interpolation 불필요, AC-15 예외 케이스) |
| 377 | `'User'` (fallback) | `common.nav.userFallback` | `사용자` | 신규. `{full_name \|\| email \|\| t('common:nav.userFallback')}` |
| 384 | `{tierInfo.name}` = `Free` / `Hobby` / ... | — | (영문 고정) | **번역 대상 아님** (AC-13). TIER_INFO 7 값 그대로 렌더 |
| 403 | `Settings` | `common.settings` | `설정` | **재사용** (기존 flat) |
| 424 | `Log out` | `common.logout` | `로그아웃` | **재사용** (기존 flat) |

> **범위 요약:** 15 라벨 중 신규 8 / 재사용 6 / 번역 대상 외 1 (TIER_INFO.name).

---

## 9. 파일별 번역 매핑 — `ExportModal.tsx` (AC-11)

Dev Spec §4-1 파일 #2. 신규 9 + 재사용 7 (5 status + close + cancel) = 16 라벨.

### 9-1. UI 래퍼 문자열

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 75 | `Export` (헤더 h3) | `common.exportModal.title` | `내보내기` | 신규. `common.export` 와 동일 값 — Designer 판단: **별도 키 유지** (헤더 전용 맥락. 향후 긴 카피로 확장 가능성). PR 리뷰 시 Developer 재사용 주장 가능 |
| 81 | `Close` (aria-label) | `common.close` | `닫기` | **재사용** |
| 92 | `Format` | `common.exportModal.format` | `포맷` | 신규 |
| 107 | `PDF` / `CSV` / `Excel` (formats[].label) | — | (영문 고정) | **번역 대상 아님** (AC-11). 포맷 약어. Dev Spec §7 설명대로 `formats` 배열 `label` 은 상수 유지 |
| 117 | `Status Filter` | `common.exportModal.statusFilter` | `상태 필터` | 신규 |
| 129 | `s.charAt(0).toUpperCase() + s.slice(1)` 5개 버튼 | `common.passed` / `common.failed` / `common.blocked` / `common.retest` / `common.untested` | 기존 값 | **재사용 (AC-14)**. 대문자화 로직 제거. `t('common:' + s)` 또는 맵 함수 |
| 140 | `Tag Filter` | `common.exportModal.tagFilter` | `태그 필터` | 신규 |
| 141 | `(empty = all tags)` | `common.exportModal.tagFilterHint` | `(비우면 전체 태그)` | 신규 |
| 186 | `Include AI Summary` | `common.exportModal.includeAiSummary` | `AI 요약 포함` | 신규 |
| 190 | `Prepends risk level, metrics, failure patterns &amp; recommendations` | `common.exportModal.includeAiSummaryDesc` | `리스크 수준, 지표, 실패 패턴, 권장 조치를 문서 앞쪽에 추가합니다` | 신규. `&amp;` → `&` |
| 198~200 | `{displayCount} of {totalCount} test cases will be exported` | `common.exportModal.countPreview` | `테스트 케이스 {{total}}건 중 {{current}}건이 내보내집니다` | 신규. interp `{{current}}`, `{{total}}`. JSX 내부의 `<span>{displayCount}</span> of {totalCount}` 조립 구조를 `<Trans>` 컴포넌트 또는 `countPreview` 단일 키 통합으로 처리. **Designer 권장: 통합 키** — Phase 1 §5-2 "조사 주입 i18next 불가" 원칙 감안 |
| 210 | `Cancel` | `common.cancel` | `취소` | **재사용** |
| 218 | `Export {format.toUpperCase()}` | `common.exportModal.exportButton` | `{{format}} 내보내기` | 신규. interp `{{format}}` = `'PDF'` / `'CSV'` / `'EXCEL'` 영문 고정 |

### 9-2. AC-9 / AC-11 외부 송출 재확인

- **PDF / CSV / Excel export 출력 콘텐츠 자체** (CSV 컬럼명, PDF HTML 템플릿, Excel 셀 라벨) → **번역 범위 외**. ExportModal 은 wrapping UI 만 번역. `onExport()` 콜백이 호출하는 실제 export 로직은 별도 페이지/모듈에서 처리 (Dev Spec §9 OOS).
- formats[].label 의 `'PDF' | 'CSV' | 'Excel'` 는 파일 포맷 약어 → 번역 금지.
- `.i18nignore` 규칙 추가 권고 (선택): `>PDF<` / `>CSV<` / `>Excel<` — Dev Spec §7 스캐너 확장 후 false-positive 방지. 본 스펙은 각 문자열이 JSX 내부의 버튼 라벨로만 쓰이고 span 태그 사이에 들어가므로 이미 regex 비매치 가능 — Developer 가 스캐너 결과 확인 후 결정.

> **범위 요약:** 9 신규 + 7 재사용 + 3 비번역 (PDF/CSV/Excel) = 19 슬롯.

---

## 10. 파일별 번역 매핑 — `DetailPanel.tsx` (AC-14)

Dev Spec §4-1 파일 #1. 신규 약 40 + 재사용 약 15 = 55 슬롯. 가장 큰 서브트리.

### 10-1. 헤더 + Quick Actions Bar (Run 모드)

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 519 | `— Untested` | `common.detailPanel.quickActions.statusOption.untested` | `— 미테스트` | 신규. `<option>` 값 (데이터) 은 `untested` 영문 유지, label 만 번역 |
| 520 | `✓ Passed` | `common.detailPanel.quickActions.statusOption.passed` | `✓ 통과` | 신규. 이모지 포함 |
| 521 | `✕ Failed` | `common.detailPanel.quickActions.statusOption.failed` | `✕ 실패` | 신규 |
| 522 | `⊘ Blocked` | `common.detailPanel.quickActions.statusOption.blocked` | `⊘ 차단됨` | 신규 |
| 523 | `↻ Retest` | `common.detailPanel.quickActions.statusOption.retest` | `↻ 재테스트` | 신규 |
| 532 | `Add Result` | `common.detailPanel.quickActions.addResult` | `결과 추가` | 신규. Phase 2b `runs.detail.addResult.title` 와 동일 값 — Designer 결정: ns 분리 원칙에 따라 별도 키 |
| 543 | `Pass & Next` (span 안, `&amp;` 포함) | `common.detailPanel.quickActions.passAndNext` | `통과 후 다음` | 신규. `&amp;` → `&` |
| 551 | `title="Previous"` | `common.detailPanel.quickActions.previousTooltip` | `이전` | 신규 |
| 559 | `title="Next"` | `common.detailPanel.quickActions.nextTooltip` | `다음` | 신규 |

### 10-2. Meta Grid (6 라벨)

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 571 | `Priority` | `common.priority` | `우선순위` | **재사용** |
| 583 | `Folder` | `common.detailPanel.meta.folder` | `폴더` | 신규 |
| 605 | `Tags` | `common.detailPanel.meta.tags` | `태그` | 신규 |
| 621 | `Assignee` | `common.assignee` | `담당자` | **재사용** |
| 661 | `— Unassigned —` (표시용) | `common.detailPanel.meta.unassignedOption` | `— 미지정 —` | 신규. em-dash 래핑 포함. Phase 2b `runs.detail.tcList.assigneeDropdown.unassigned = '— Unassigned —'` 와 카피 동일 — 두 곳에서 다른 ns 에서 쓰이므로 **공유 공간으로 승격 대신 복제** (Designer 결정: 중복 허용) |
| 669 | `— Unassigned —` (`<option value="">`) | `common.detailPanel.meta.unassignedOption` | (위와 동일) | **재사용** (같은 파일 내) |
| 687 | `Created` | `common.detailPanel.meta.created` | `생성` | 신규 — `common.createdAt = '생성일'` 과 카피 다름 (grid 라벨 간결화) |
| 693 | `Last Run` | `common.detailPanel.meta.lastRun` | `마지막 실행` | 신규 |
| 577 | `testCase.priority` (capitalize) | — | (데이터) | priority 는 데이터 값. `capitalize` CSS 클래스로 처리되므로 번역 불필요 |
| 688 | `formatDate(testCase.createdAt)` | (helper 교체) | — | AC-14 — `formatShortDate(iso, i18n.language)` 호출로 변경. 키 없음 |
| 700 | `lastResult.status.charAt(0).toUpperCase() + lastResult.status.slice(1)` | `common.passed|failed|blocked|retest|untested` | 기존 값 | **재사용 (AC-14)**. 대문자화 로직 제거 |
| 696 | `getTimeAgo(lastResult.timestamp)` | (helper 교체) | — | AC-14 — `formatRelativeTime(iso, t)` + `diffDays >= 7 ? formatShortDate(iso, i18n.language) : ...` 조합 (Dev Spec §4-5-2) |

### 10-3. Steps Toggle Bar + Steps Area

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 724 | `{steps.length} step{steps.length !== 1 ? 's' : ''}` | `common.detailPanel.steps.stepsCount_one` / `_other` | `스텝 {{count}}개` / `스텝 {{count}}개` | 신규. plural (한국어 동일) |
| 725 | `· {n} attachment{...}s` | `common.detailPanel.steps.attachmentsCount_one` / `_other` | `· 첨부 {{count}}개` / `· 첨부 {{count}}개` | 신규. plural (리드 `· ` 공백 포함) |
| 732 | `{steps.length} steps passed` | `common.detailPanel.steps.stepsPassed` | `{{passed}}/{{total}} 스텝 통과` | 신규. interp `{{passed}}`, `{{total}}`. 현 JSX 가 `<span>{passed}</span><span>/</span><span>{total} steps passed</span>` 로 3 조각 — **Designer 권장: 통합 키** 로 `<Trans>` 사용 또는 `t('...stepsPassed', { passed, total })` 단일 호출 |
| 736 | `· {n} attachment{...}s` (재발생) | `common.detailPanel.steps.attachmentsCount_*` | (위와 동일) | **재사용** |
| 759 | `⚠ Precondition` | `common.detailPanel.steps.precondition` | `⚠ 사전 조건` | 신규. 이모지 포함. 대문자 스타일은 CSS `uppercase` |
| 876 | `Expected Result` | `common.detailPanel.steps.expectedResult` | `예상 결과` | 신규. 대문자 스타일 CSS |
| 881 | `No steps defined` | `common.detailPanel.steps.noStepsDefined` | `정의된 스텝 없음` | 신규 |
| 890 | `Attachments ({n})` | `common.detailPanel.steps.attachmentsHeader` | `첨부 ({{count}})` | 신규. interp |
| 830 | `Update` (SS diff 버튼) | `runs.detail.addResult.steps.updateButton` | `업데이트` | **재사용** (Phase 2b) |
| 832 | `Locked to preserve test results` | `runs.detail.addResult.steps.lockedBanner` | `테스트 결과 보존을 위해 잠김` | **재사용** (Phase 2b) |
| 837 | `Current v{version}` | `runs.detail.addResult.steps.diffCurrent` | `현재 (v{{version}})` | **재사용** (Phase 2b, 카피 조정 위치 `<div>Current v{ref.shared_step_version}</div>` → `{t('runs:detail.addResult.steps.diffCurrent', { version })}`) |
| 841 | `Version history unavailable` | `runs.detail.addResult.steps.diffUnavailable` | `버전 이력 없음` | **재사용** (Phase 2b) |
| 842 | `Loading...` (SS diff loading) | `runs.detail.addResult.steps.diffLoading` | `불러오는 중…` | **재사용** (Phase 2b) |
| 846 | `Latest v{version}` | `runs.detail.addResult.steps.diffLatest` | `최신 (v{{version}})` | **재사용** (Phase 2b) |
| 818 | `New version: v{n}` (title tooltip) | `runs.detail.addResult.steps.sharedUpdateBadgeTitle` | `새 버전: v{{version}}` | **재사용** (Phase 2b) |

### 10-4. Tab Bar + Tab Body

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 956 | `Comments` / `Results` / `Issues` / `History` (labels map) | `common.detailPanel.tabs.comments` / `.results` / `.issues` / `.history` | `댓글` / `결과` / `이슈` / `이력` | 신규 4 — `labels: Record<string, string>` 객체를 `useMemo` 내부에서 `t()` 주입 |
| 1001 | `No comments yet` | `common.detailPanel.comments.empty` | `아직 댓글이 없습니다` | 신규 |
| 1042 | `Add a comment...` (placeholder) | `common.detailPanel.comments.placeholder` | `댓글 추가…` | 신규 |
| 1051 | `Post` | `common.detailPanel.comments.post` | `게시` | 신규 |
| 1015 | `c.timestamp.toLocaleString('en-US', ...)` | (helper 교체) | — | AC-14 — `formatShortDateTime(iso, i18n.language)` 재사용 (Phase 2b 헬퍼) |
| 1063 | `No test results yet` | `common.detailPanel.results.empty` | `아직 테스트 결과가 없습니다` | 신규 |
| 1091 | `Unknown Run` | `common.detailPanel.results.unknownRun` | `알 수 없는 실행` | 신규 |
| 1093 | `result.timestamp.toLocaleDateString('en-US', ...)` | (helper 교체) | — | AC-14 — `formatShortDate(iso, i18n.language)` |
| 1095 | `result.timestamp.toLocaleTimeString('en-US', ...)` | (helper 교체) | — | AC-14 — `formatShortTime(iso, i18n.language)` (Phase 2b 헬퍼) |
| 1111 | `result.status.charAt(0).toUpperCase() + result.status.slice(1)` | `common.passed|...` | 기존 값 | **재사용 (AC-14)**. 대문자화 제거 |
| 1118 | `by {author}` | `common.detailPanel.results.byAuthor` | `{{author}}님이 기록` | 신규. interp. JSX 의 ` · by {author}` 구조에서 `· ` 는 JSX 그대로, ` by {author}` 부분만 키로 |
| 1140 | `Jira integration requires Hobby+` | `common.detailPanel.issues.upsellTitle` | `{{brand}} 연동은 {{plan}} 플랜부터 가능합니다` | 신규. **interp (AC-16)** `{{brand}}=Jira`, `{{plan}}=Hobby` |
| 1141 | `Upgrade to create and manage Jira issues from test results.` | `common.detailPanel.issues.upsellBody` | `업그레이드하여 테스트 결과에서 Jira 이슈를 생성·관리하세요.` | 신규. `Jira` 는 문장 내 브랜드명 — interpolation 없이 문자열 내에 그대로 (AC-16 은 헤더 타이틀만 interp) |
| 1150 | `No linked issues` | `common.detailPanel.issues.empty` | `연결된 이슈 없음` | 신규 |
| 1157 | `Link Existing Issue` (empty state 버튼) | `common.detailPanel.issues.linkExisting` | `기존 이슈 연결` | 신규 |
| 1164 | `Create Jira Issue` (empty state 버튼) | `runs.detail.addResult.issues.createJira` | `Jira 이슈 생성` | **재사용** (Phase 2b) |
| 1173 | `issue.createdAt.toLocaleDateString('en-US', ...)` | (helper 교체) | — | AC-14 — `formatShortDate` |
| 1175~1176 | `issue.status.charAt(0).toUpperCase() + issue.status.slice(1)` | `common.issues.status.open` / `.inProgress` / `.resolved` / `.closed` | 기존 값 | **재사용 (AC-14)**. 단 Jira status 와 test status 는 값 집합이 다름 — 이 코드의 `issue.status` 는 Jira 기준. `common.issues.status.*` 재사용 가능 여부 PR 리뷰에서 확인. 불일치 시 신규 키 `common.detailPanel.issues.statusLabel` 추가 |
| 1210 | (동일, GitHub issue) | (위와 동일) | — | **재사용** |
| 1212~1213 | (GitHub issue.status capitalize) | (위와 동일) | — | **재사용** |
| 1244 | `Link Existing Issue` (Footer 재발생) | `common.detailPanel.issues.linkExisting` | (위와 동일) | **재사용** |
| 1251 | `Create Jira Issue` (Footer 재발생) | `runs.detail.addResult.issues.createJira` | (위와 동일) | **재사용** |
| 1260 | `Link Existing Issue` (inline input label p 태그) | `common.detailPanel.issues.linkInputLabel` | `기존 이슈 연결` | 신규 — empty state 버튼(`linkExisting`)과 분리. p 태그 헤더 맥락 |
| 1274 | `Enter issue key, e.g. PROJ-123` (placeholder) | `common.detailPanel.issues.linkInputPlaceholder` | `이슈 키 입력 (예: PROJ-123)` | 신규. `PROJ-123` 는 예시 고정 (브랜드-like) |
| 1285 | `Link` (inline button) | `common.detailPanel.issues.linkButton` | `연결` | 신규 |
| 1291 | `Cancel` | `common.cancel` | `취소` | **재사용** |
| 1305 | `No history yet` | `common.detailPanel.history.empty` | `아직 이력이 없습니다` | 신규 |
| 1316 | `result.timestamp.toLocaleDateString('en-US', ...)` | (helper 교체) | — | AC-14 |
| 1318 | `result.timestamp.toLocaleTimeString('en-US', ...)` | (helper 교체) | — | AC-14 |
| 1327 | `'Unknown'` (author fallback) | `common.detailPanel.history.unknownAuthor` | `알 수 없음` | 신규 |
| 1328 | ` marked as ` (Trans 중간 조각) | `common.detailPanel.history.markedAs` | `{{author}}님이 {{status}}로 기록` | 신규. **interp 2개**. 현 JSX 는 `<span>{author}</span>{' marked as '}<span>{status}</span>{run.name ? ` in ${run.name}`}` 3 조각 — Designer 권장: **단일 Trans 컴포넌트 또는 통합 키** (§12 참조). EN `{{author}} marked as {{status}}` / KO `{{author}}님이 {{status}}로 기록` — 조사 포함 |
| 1330 | ` in ${result.run.name}` | `common.detailPanel.history.inRun` | `({{runName}}에서)` | 신규. interp. Designer 판단: `in {{runName}}` 부분을 **괄호 감싸기 추가** (카피 자연스러움) |
| 1310 | `result.status.charAt(0).toUpperCase() + result.status.slice(1)` | `common.passed|...` | 기존 값 | **재사용 (AC-14)** |

### 10-5. Footer (TC 모드)

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 1357 | `Edit` | `common.edit` | `수정` | **재사용** |
| 1364 | `Delete` | `common.delete` | `삭제` | **재사용** |

> **범위 요약:** DetailPanel 약 40 신규 + 15 재사용 = 55 슬롯. `common.detailPanel.*` 서브트리 ~40 리프 (Dev Spec §10 상한 50 이내). 헬퍼 교체는 키가 아니므로 카운트 미포함.

---

## 11. 파일별 번역 매핑 — `FocusMode.tsx` (AC-10, AC-15)

Dev Spec §4-1 파일 #3. 신규 약 30 + 재사용 약 20 = 50 슬롯. Phase 3 에서 두 번째로 큰 서브트리.

### 11-1. 헤더 + 키보드 힌트 (AC-10)

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 612 | `{runName}` | — | (데이터) | 사용자 데이터. 번역 없음 |
| 614 | `{index + 1} / {tests.length}` | `runs.detail.focusMode.header.counter` | `{{index}} / {{total}}` | 신규 (포맷 기호). interp. **Designer 권장: 키 신설 없이 JSX 그대로 유지** (숫자 포맷 언어 무관). 본 스펙 **키 0** 으로 축소 |
| 620~625 | STATUS_BUTTONS `.label` 5 개 (`Passed` / `Failed` / `Blocked` / `Retest` / `Skip`) | `common.passed` / `common.failed` / `common.blocked` / `common.retest` / `runs.detail.focusMode.statusButton.skip` | 기존 + `건너뛰기` | **4 재사용 + 1 신규** (AC-10). `Skip` 은 status=untested 임에도 카피가 "Skip" — `common.untested='Untested'/'미테스트'` 와 다름 |
| 627 | `[{ key: 'C', label: 'Comments' }, { key: 'H', label: 'History' }, { key: 'N', label: 'Note' }]` | `runs.detail.focusMode.kbdHint.comments` / `.history` / `.note` | `댓글` / `이력` / `메모` | 신규 3. useMemo 이동 (AC-10). `key` (C/H/N) 는 영문 고정 AC-12 |
| 634 | `[{ key: '[', label: 'Sidebar' }, { key: '/', label: 'Search' }]` | `runs.detail.focusMode.kbdHint.sidebar` / `.search` | `사이드바` / `검색` | 신규 2 (search 는 `common.search` 재사용 가능 — PR 리뷰) |
| 648 | `Exit` | `runs.detail.focusMode.header.exit` | `나가기` | 신규. 우측 상단 버튼 라벨 |

### 11-2. TIER 2 Metadata Bar

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 676 | `priority.charAt(0).toUpperCase() + priority.slice(1)` | `common.issues.priority.critical` / `.high` / `.medium` / `.low` | 기존 값 | **재사용 (AC-14 연장)**. 대문자화 제거. 단 critical 은 값 `'Critical'/'심각'` 으로 기존 재사용. Phase 2b `common.critical` 부재 확인됨 — `common.issues.priority.critical` 재사용 |
| 697 | `test.assignee.substring(0, 2).toUpperCase()` | — | (데이터) | 번역 없음 (이니셜) |

### 11-3. Sidebar (280px)

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 728 | `Progress` | `runs.detail.focusMode.sidebar.progress` | `진행률` | 신규. CSS `uppercase` 는 언어 무관 |
| 731 | `/ {tests.length} completed` | `runs.detail.focusMode.sidebar.completed` | `{{total}}개 중 {{count}}개 완료` | 신규. interp. 현 JSX 는 `<span>{completedCount}</span><span> / {tests.length} completed</span>` 2 조각 — **Designer 권장: 통합 키** |
| 569~574 | FILTER_CHIPS `label` 6 개 (`All` / `Passed` / `Failed` / `Blocked` / `Retest` / `Untested`) | `common.issues.all` / `common.passed` / `common.failed` / `common.blocked` / `common.retest` / `common.untested` | 기존 값 | **전량 재사용 (AC-10)**. `common.issues.all = 'All' / '전체'` 재사용. 단 `common.issues.all` 맥락이 이슈 필터 전용 — 의미 유사하므로 재사용 허용. useMemo 이동 |
| 789 | `placeholder="Search TC..."` | `runs.detail.focusMode.sidebar.searchPlaceholder` | `TC 검색…` | 신규 |
| 840 | `No test cases match` | `runs.detail.focusMode.sidebar.empty` | `일치하는 테스트 케이스 없음` | 신규 |
| 881 | `title="Open sidebar ([)"` | `runs.detail.focusMode.sidebar.openTooltip` | `사이드바 열기 ({{shortcut}})` | 신규. **interp (AC-15)** `{{shortcut}} = '['`. 호출: `t('runs:detail.focusMode.sidebar.openTooltip', { shortcut: '[' })` |

### 11-4. Body 섹션

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 909 | `Previously {test.runStatus}` | `runs.detail.focusMode.body.previously` | `이전 결과: {{status}}` | 신규. interp. `{{status}}` 는 이미 번역된 `common.passed` 등 t() 결과 주입: `t('...previously', { status: t('common:' + test.runStatus) })` |
| 928 | `🔄 New version available for {custom_id} '{name}' (v{version})` | `runs.detail.focusMode.ssBanner.newVersionPrefix` | `🔄 {{customId}} ''{{name}}''의 새 버전 사용 가능 (v{{version}})` | 신규. interp 3. 이모지 포함 |
| 933 | `Locked to preserve test results` | `runs.detail.addResult.steps.lockedBanner` | `테스트 결과 보존을 위해 잠김` | **재사용** (Phase 2b) |
| 940 | `Current (v{ssDiffData.currentVersion})` | `runs.detail.addResult.steps.diffCurrent` | `현재 (v{{version}})` | **재사용** (Phase 2b) |
| 947 | `No history` | `runs.detail.focusMode.ssBanner.noHistory` | `이력 없음` | 신규. Phase 2b `runs.detail.addResult.steps.diffUnavailable = '버전 이력 없음'` 과 의미 유사 — Designer 판단: 카피 다름으로 별도 키 |
| 951 | `Latest (v{ssDiffData.latestVersion})` | `runs.detail.addResult.steps.diffLatest` | `최신 (v{{version}})` | **재사용** (Phase 2b) |
| 973 | `Hide changes` / `View changes` | `runs.detail.focusMode.ssBanner.hideChanges` / `.viewChanges` | `변경 숨기기` / `변경 보기` | 신규 2 |
| 986 | `Update` | `runs.detail.addResult.steps.updateButton` | `업데이트` | **재사용** (Phase 2b) |
| 993 | `Dismiss` | `runs.detail.focusMode.ssBanner.dismiss` | `닫기` | 신규. Phase 2b `runs.detail.ssBanner.dismiss` 와 동일 값 — Designer 판단: **재사용 가능** → 본 키 미신설, Phase 2b 재사용. 본 서브트리 키 1 감소 |
| 1016 | `Precondition` | `runs.detail.focusMode.body.precondition` | `사전 조건` | 신규. CSS `uppercase` |
| 1027 | `Attachments ({n})` | `runs.detail.focusMode.body.attachmentsHeader` | `첨부 ({{count}})` | 신규. interp |
| 1069 | `Download` | `common.download` | `다운로드` | **재사용** |
| 1083 | `Test Steps` | `runs.detail.focusMode.body.testStepsHeader` | `테스트 스텝` | 신규. CSS `uppercase` |
| 1087 | `{passedStepCount}</span>/{steps.length} passed` | `runs.detail.focusMode.body.passedSuffix` | `{{count}}/{{total}} 통과` | 신규. interp |
| 1146 | `title="Pass this step"` | `runs.detail.focusMode.body.stepPassTitle` | `이 스텝 통과` | 신규 |
| 1159 | `title="Fail this step"` | `runs.detail.focusMode.body.stepFailTitle` | `이 스텝 실패` | 신규 |
| 1189 | `Shared` (Tier 3 뱃지) | `runs.detail.addResult.steps.sharedBadge` | `공유` | **재사용** (Phase 2b) |

### 11-5. Comments / History Collapsible Panels

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 1218 | `Comments` | `runs.detail.focusMode.comments.header` | `댓글` | 신규. Phase 3 `common.detailPanel.tabs.comments = 'Comments' / '댓글'` 와 카피 동일 — Designer 판단: ns 분리 원칙에 따라 별도 키 |
| 1230 | `Loading...` | `common.loading` | `Loading...` | **재사용**. 단 KO 값 `Loading...` (Phase 0 미번역) — Phase 2b QA W-2 이슈 승계, 본 스펙 범위 외 |
| 1233 | `No comments yet` | `runs.detail.focusMode.comments.empty` | `아직 댓글이 없습니다` | 신규. `common.detailPanel.comments.empty` 와 카피 동일 — ns 분리 유지 (Designer) |
| 1239 | `today` / `1d ago` / `{d}d ago` (inline 계산) | `common.today` / `common.time.daysAgo_one` / `common.time.daysAgo_other` | 기존 | **재사용**. AC-14 연장 — inline `Math.floor(diff/86400000)` 조건 제거 후 `formatRelativeTime(h.timestamp.toISOString(), t)` 호출 (Phase 1 헬퍼) |
| 1282 | `Execution History` | `runs.detail.focusMode.history.header` | `실행 이력` | 신규 |
| 1294 | `Loading...` | `common.loading` | (위와 동일) | **재사용** |
| 1297 | `No execution history` | `runs.detail.focusMode.history.empty` | `실행 이력 없음` | 신규 |
| 1302 | `today` / `1d ago` / `{d}d ago` (history inline 계산) | `common.today` / `common.time.daysAgo_*` | 기존 | **재사용** (AC-14 연장) |
| 1307 | `h.status.charAt(0).toUpperCase() + h.status.slice(1)` | `common.passed|failed|blocked|retest|untested` | 기존 | **재사용 (AC-14)** |
| 1311 | ` · by ${h.author}` | — | — | 사용자 데이터 + 포맷 기호. JSX 구조 유지 (` · by ` 접두는 별도 키로 분리 시 과함, Designer 판단: 그대로) |

### 11-6. Note Textarea

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 1327 | `Note` | `runs.detail.addResult.note.label` | `메모` | **재사용** (Phase 2b) |
| 1327 | `(optional)` | `runs.detail.focusMode.note.optionalSuffix` | `(선택 사항)` | 신규 |
| 1335 | `placeholder="Describe what you observed..."` | `runs.detail.focusMode.note.placeholder` | `관찰한 내용을 기록하세요…` | 신규 |
| 1353 | `⌘ + Enter to save with status` | `runs.detail.focusMode.note.saveHint` | `⌘ + Enter 로 상태와 함께 저장` | 신규. `⌘ + Enter` 는 **단축키 기호 영문 고정** (AC-15 AC-12 승계) |

### 11-7. Linked Issues (failed TC) + GitHub Issue Quick-Create Modal

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 1361 | `Linked Issues` | `runs.detail.addResult.issues.label` | `연결된 이슈` | **재사용** (Phase 2b) |
| 1402 | `Creating...` | `runs.detail.githubIssue.footer.creating` | `생성 중…` | **재사용** (Phase 2b) |
| 1403 | `Create GitHub Issue` | `runs.detail.addResult.issues.createGithub` | `GitHub 이슈 생성` | **재사용** (Phase 2b) |
| 1427 | `Create GitHub Issue` (modal title) | `runs.detail.githubIssue.title` | `GitHub 이슈 생성` | **재사용** (Phase 2b) |
| 1434 | `Title` (label) | `runs.detail.githubIssue.titleField.label` | `제목` | **재사용** (Phase 2b) |
| 1446 | `Will be created in` | `runs.detail.githubIssue.willBeCreatedInPrefix` | `생성 위치: ` | **재사용** (Phase 2b, trailing space) |
| 1454 | `Cancel` | `common.cancel` | `취소` | **재사용** |
| 1469 | `Create Issue` | `runs.detail.githubIssue.footer.submit` | `이슈 생성` | **재사용** (Phase 2b) |

> **GitHub modal 전량 재사용** — 본 서브트리 신규 키 **0**. Dev Spec §4-2 의 "중복 80% 이상 공통 승격" 분기 발동.

### 11-8. Footer (Status Buttons + Nav)

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 1487 | `Previous` | `runs.detail.focusMode.footer.previous` | `이전` | 신규 |
| 1514 | STATUS_BUTTONS `.label` (footer 재발생) | (위 §11-1 와 동일) | 기존 값 | **재사용** (AC-10) |
| 1526 | `Next` | `runs.detail.focusMode.footer.next` | `다음` | 신규 |
| 1532 | `Last test — press any status key to complete the run` | `runs.detail.focusMode.footer.lastTestHint` | `마지막 테스트 — 상태 키를 눌러 실행을 완료하세요` | 신규 |

### 11-9. Lightbox

| 라인 | EN | 키 | KO | 비고 |
|------|----|----|----|-----|
| 1575 | `alt="Preview"` | `runs.detail.focusMode.lightbox.alt` | `미리보기` | 신규 |

### 11-10. Toast (showFocusToast 3 호출)

| 라인 | 현재 코드 | 신규/재사용 키 | KO | 비고 |
|------|----------|--------------|----|-----|
| 232 | `showFocusToast('success', \`GitHub issue #${data.issue.number} created\`)` | `runs.toast.githubCreated` | `GitHub 이슈 #{{number}} 생성됨` | **재사용** (Phase 2b). 호출: `showFocusToast('success', t('runs:toast.githubCreated', { number: data.issue.number }))` |
| 237 | `showFocusToast('error', \`GitHub issue creation failed: ${err.message}\`)` | `runs.toast.githubCreateFailed` | `GitHub 이슈 생성 실패: {{reason}}` | **재사용** (Phase 2b). interp `{{reason}}` = `err.message` |
| 387 | `showFocusToast('error', err instanceof Error ? err.message : 'Failed to save result. Please try again.')` | `runs.detail.focusMode.toast.saveFailed` | `결과 저장에 실패했습니다. 다시 시도해 주세요.` | 신규. Phase 2b `runs.toast.resultSaveFailed = 'Failed to save result.'` 와 카피 유사하나 `Please try again.` 추가 — Designer 판단: **신규 키 유지** (AC-5 Phase 2b 키 값 변경 금지). err.message 는 그대로 pass-through |

> **범위 요약:** FocusMode 약 30 신규 + 20 재사용 = 50 슬롯. `runs.detail.focusMode.*` 서브트리 ~28 리프 (Dev Spec §10 상한 60 내 충분). GitHub modal 및 일부 SS banner 전량 재사용으로 신규 키 축소.

---

## 12. Plural / Interpolation 규칙 재명시 (Phase 1 §5 승계)

### 12-1. 본 스펙 plural 적용 키 전수

| 키 | EN _one | EN _other | KO _one | KO _other |
|----|---------|-----------|---------|-----------|
| `common.detailPanel.steps.stepsCount` | `{{count}} step` | `{{count}} steps` | `스텝 {{count}}개` | `스텝 {{count}}개` |
| `common.detailPanel.steps.attachmentsCount` | `· {{count}} attachment` | `· {{count}} attachments` | `· 첨부 {{count}}개` | `· 첨부 {{count}}개` |
| (재사용) `common.time.*` | Phase 1 | Phase 1 | Phase 1 | Phase 1 |

> 한국어는 단복수 동일하나 i18next 표준 준수 위해 두 키 모두 정의 (Phase 1 §4-1 원칙).

### 12-2. 본 스펙 interpolation 변수 전수 (camelCase)

| 키 | 변수 | 의미 |
|----|------|------|
| `common.detailPanel.steps.stepsPassed` | `{{passed}}`, `{{total}}` | 통과 스텝 수 |
| `common.detailPanel.results.byAuthor` | `{{author}}` | 작성자 이름 |
| `common.detailPanel.history.markedAs` | `{{author}}`, `{{status}}` | 작성자 + 상태 |
| `common.detailPanel.history.inRun` | `{{runName}}` | 실행 이름 |
| `common.detailPanel.issues.upsellTitle` | `{{brand}}`, `{{plan}}` | 브랜드 + 플랜명 (AC-16) |
| `common.detailPanel.steps.attachmentsHeader` | `{{count}}` | 첨부 수 |
| `common.exportModal.countPreview` | `{{current}}`, `{{total}}` | 필터링 후 / 전체 TC 수 |
| `common.exportModal.exportButton` | `{{format}}` | 파일 포맷 약어 (영문 고정 'PDF' 등) |
| `runs.detail.focusMode.sidebar.completed` | `{{count}}`, `{{total}}` | 완료 수 / 전체 |
| `runs.detail.focusMode.sidebar.openTooltip` | `{{shortcut}}` | 단축키 문자 (영문 고정 '[') |
| `runs.detail.focusMode.body.previously` | `{{status}}` | 이미 번역된 상태 라벨 주입 |
| `runs.detail.focusMode.body.attachmentsHeader` | `{{count}}` | 첨부 수 |
| `runs.detail.focusMode.body.passedSuffix` | `{{count}}`, `{{total}}` | 통과 스텝 수 |
| `runs.detail.focusMode.ssBanner.newVersionPrefix` | `{{customId}}`, `{{name}}`, `{{version}}` | SS 메타 3개 |
| `runs.detail.focusMode.toast.saveFailed` | — (err.message pass-through) | — |

### 12-3. 단축키 interpolation 규칙 (AC-15)

FocusMode 의 `title="Open sidebar ([)"` 같은 힌트는 `{{shortcut}}` interpolation 처리.

```ts
// 호출
<button title={t('runs:detail.focusMode.sidebar.openTooltip', { shortcut: '[' })}>

// 번들
// en
'runs.detail.focusMode.sidebar.openTooltip': 'Open sidebar ({{shortcut}})',
// ko
'runs.detail.focusMode.sidebar.openTooltip': '사이드바 열기 ({{shortcut}})',
```

**AC-15 interp 대상 (본 스펙 유일 1건):**
- `runs.detail.focusMode.sidebar.openTooltip`

**AC-15 interp 비대상 (단축키가 **문장 안 단일 문자** 가 아닌 경우 — 전체 문자열에 섞어 두기):**
- `runs.detail.focusMode.note.saveHint = '⌘ + Enter 로 상태와 함께 저장'` — `⌘ + Enter` 복합 기호, Phase 2b AC-12 선례대로 문자열 내 고정
- `common.nav.keyboardShortcutsTooltip = '단축키 (?)'` — `?` 단일 힌트 기호, 단문 맥락상 고정
- `runs.detail.focusMode.header.exit = '나가기'` — 단축키 문자 (`Esc`) 는 `<kbd>` 태그로 JSX 에서 분리 렌더, 번들 키에 포함 안됨

### 12-4. 조합 렌더링 (Trans / 단일 키 권장)

다음 3 곳은 현 JSX 가 여러 span 조각으로 분리되어 있음. **Designer 권장: 단일 키 + 통합 번역** (조사·관사 주입 리스크 해결):

1. **DetailPanel `stepsPassed`** (line 729~733) — 현 `<span>{passedCount}</span><span>/</span><span>{steps.length} steps passed</span>` → `t('...stepsPassed', { passed, total })` 한 번 호출
2. **DetailPanel `history.markedAs` + `inRun`** (line 1326~1332) — 현 3 조각 → `<Trans i18nKey="common:detailPanel.history.entry" values={{author, status, runName}}>{/* ... */}</Trans>` + inline 상태 색상만 children 으로 주입. 또는 2 키 분리 유지 (기존 JSX 구조 보존). **Designer 판단: 2 키 분리 유지** (상태 색상 주입 JSX 보존). 조사는 KO 값 내에서 해결 (`{{author}}님이`, `{{runName}}에서`)
3. **FocusMode `sidebar.completed`** (line 729~732) — 현 `<span>{completedCount}</span><span> / {tests.length} completed</span>` → 단일 키 `'{{total}}개 중 {{count}}개 완료'`. 단 JSX 의 `<span className="text-indigo-500">` 색상 스타일 보존 필요 — **Designer 판단: `<Trans>` 컴포넌트 사용** 권장. 예:

```tsx
<Trans
  i18nKey="runs:detail.focusMode.sidebar.completed"
  values={{ count: completedCount, total: tests.length }}
  components={{ hl: <span className="text-indigo-500" /> }}
/>
// en: '<hl>{{count}}</hl> / {{total}} completed'
// ko: '{{total}}개 중 <hl>{{count}}</hl>개 완료'
```

---

## 13. AC-9 — AI 비번역 원칙 재확인 (본 스펙 해당 없음)

Phase 1 §6, Phase 2b §15 승계. **본 Phase 3 의 6 개 공유 컴포넌트는 Claude AI 응답 본문을 직접 렌더하지 않는다.** 확인:

| 컴포넌트 | AI 응답 렌더 여부 | 비고 |
|---------|-----------------|-----|
| DetailPanel | ❌ | testResults 데이터는 DB 에서 (author 이름, 상태, note) — 사용자 입력 / 시스템 값. AI 호출 없음 |
| ExportModal | ❌ | "Include AI Summary" 옵션은 PDF export 시 **별도 페이지** 가 AI 본문을 렌더. ExportModal 은 체크박스 라벨만 |
| FocusMode | ❌ | 테스트 실행 UI. AI 호출 없음 |
| StatusBadge | ❌ | 상태 라벨만 |
| Avatar | ❌ | 이미지 alt 만 |
| ProjectHeader | ❌ | 네비·프로필 |

**결론:** Phase 1 §6-3 에 요구되는 AI 비번역 주석(`i18n policy AC-9`) 은 **본 스펙 6 개 파일 중 어디에도 추가하지 않는다**. AI 응답 렌더 영역은 Phase 1 의 `AIRunSummaryPanel.tsx` / `AiRiskAnalysisCard.tsx` 에 이미 존재 — 그대로 유지.

**AC-9 확장 재확인:**
- ExportModal 이 호출하는 `onExport()` 콜백 → 실제 PDF / CSV / Excel 본문 생성은 **별도 모듈**. 본 스펙 범위 외 (Dev Spec §9 OOS).
- FocusMode 의 `createGithubIssue()` 함수 → GitHub REST API payload body (라인 224 `body: '**Auto-created by Testably ...**'`) 는 **번역 범위 외** (Phase 2b §15 승계).

---

## 14. 최종 키 집계 (AC-6 검증)

### 14-1. 네임스페이스별 신규 leaf 키 수 (재사용 제외)

| 서브트리 | 신규 leaf | 재사용 키 (not new) |
|---------|---------|-------------------|
| `common.nav.*` | 8 (dashboard / stepsLibrary / requirements / traceability / documents / switchProject / keyboardShortcutsTooltip / userFallback) | 6 재사용 (testCases / runsAndResults / milestones / sessions / settings / logout) + `projects.noProjects` |
| `common.avatar.*` | 1 (altFallback) | — |
| `common.detailPanel.quickActions.*` | 9 (statusOption 5 + addResult + passAndNext + previousTooltip + nextTooltip) | — |
| `common.detailPanel.meta.*` | 5 (folder / tags / created / lastRun / unassignedOption) | 2 재사용 (priority → `common.priority`, assignee → `common.assignee`) |
| `common.detailPanel.steps.*` | 8 (stepsCount plural 2 + attachmentsCount plural 2 + stepsPassed + precondition + expectedResult + noStepsDefined + attachmentsHeader) | 5 재사용 (SS Diff 전부 Phase 2b: updateButton / lockedBanner / diffCurrent / diffLatest / diffUnavailable / diffLoading / sharedUpdateBadgeTitle — 실제 6건) |
| `common.detailPanel.tabs.*` | 4 (comments / results / issues / history) | — |
| `common.detailPanel.comments.*` | 3 (empty / placeholder / post) | — |
| `common.detailPanel.results.*` | 3 (empty / unknownRun / byAuthor) | 5 status → `common.*` 재사용 |
| `common.detailPanel.issues.*` | 7 (empty / linkExisting / linkInputLabel / linkInputPlaceholder / linkButton / upsellTitle / upsellBody) | 2 재사용 (`runs.detail.addResult.issues.createJira`, `common.cancel`) + status capitalize → `common.issues.status.*` 재사용 |
| `common.detailPanel.history.*` | 3 (empty / markedAs / inRun / unknownAuthor) — 실제 4 | 1 재사용 (status capitalize → `common.*`) |
| `common.detailPanel.footer` | 0 | `common.edit` / `common.delete` 재사용 |
| `common.exportModal.*` | 9 (title / format / statusFilter / tagFilter / tagFilterHint / includeAiSummary / includeAiSummaryDesc / countPreview / exportButton) | 2 재사용 (close / cancel) + 5 status 재사용 |
| `runs.detail.focusMode.header.*` | 1 (exit) — counter 는 키 미신설 | — |
| `runs.detail.focusMode.kbdHint.*` | 4 (comments / history / note / sidebar) | 1 재사용 (search → `common.search`) + STATUS_BUTTONS 5 label → `common.*` 재사용 (AC-10) |
| `runs.detail.focusMode.sidebar.*` | 5 (progress / completed / searchPlaceholder / empty / openTooltip) | FILTER_CHIPS 6 label 전량 재사용 (`common.issues.all` + `common.passed|...|untested`) |
| `runs.detail.focusMode.body.*` | 7 (previously / precondition / attachmentsHeader / testStepsHeader / passedSuffix / stepPassTitle / stepFailTitle) | 2 재사용 (download → `common.download`, sharedBadge → `runs.detail.addResult.steps.sharedBadge`) |
| `runs.detail.focusMode.ssBanner.*` | 4 (newVersionPrefix / viewChanges / hideChanges / noHistory) | 5 재사용 (lockedHint→`.lockedBanner`, update→`.updateButton`, dismiss→`runs.detail.ssBanner.dismiss`, currentPrefix→`.diffCurrent`, latestPrefix→`.diffLatest`) |
| `runs.detail.focusMode.comments.*` | 2 (header / empty) | `common.loading` 재사용 |
| `runs.detail.focusMode.history.*` | 2 (header / empty) | `common.loading` 재사용 |
| `runs.detail.focusMode.note.*` | 3 (optionalSuffix / placeholder / saveHint) | 1 재사용 (label → `runs.detail.addResult.note.label`) |
| `runs.detail.focusMode.linkedIssues.*` | 0 | 3 재사용 (label / createGithub / creating 전량 Phase 2b) |
| `runs.detail.focusMode.githubIssueModal.*` | 0 | 6 재사용 (title / titleField.label / willBeCreatedIn / cancel / submit 전량 Phase 2b + `common.cancel`) |
| `runs.detail.focusMode.statusButton.*` | 1 (skip) | 4 재사용 (passed / failed / blocked / retest → `common.*`) |
| `runs.detail.focusMode.footer.*` | 3 (previous / next / lastTestHint) | — |
| `runs.detail.focusMode.lightbox.*` | 1 (alt) | — |
| `runs.detail.focusMode.toast.*` | 1 (saveFailed) | 2 재사용 (githubIssueCreated → `runs.toast.githubCreated`, githubIssueFailed → `runs.toast.githubCreateFailed`) |
| **StatusBadge 전체** | 0 | 5 재사용 (AC-8) |
| **Avatar 전체** | 1 (altFallback) | — |
| **합계** | **~95 신규 leaf** | 약 45 재사용 leaf |

### 14-2. AC-6 범위 검증

- **하한 80:** 합계 95 > 80 ✅
- **상한 160:** 합계 95 < 160 ✅
- **Phase 2b QA W-3 교훈:** 좁혀진 범위 (80~160) 내 **중간값 부근 (95)** — Designer + Developer 모두 합리적 추정 일치.

### 14-3. en/ko 파일 추가 라인 수 예측

- **en/common.ts 신규 라인:** ~75 leaf (common 서브트리 55 + detailPanel + exportModal + nav + avatar) + 계층 중괄호 / 콤마 오버헤드 ~35 라인 = **약 110 라인 추가**
- **ko/common.ts 신규 라인:** 동일 = **약 110 라인 추가**
- **en/runs.ts 신규 라인:** ~30 leaf (focusMode 서브트리) + 계층 오버헤드 ~20 라인 = **약 50 라인 추가**
- **ko/runs.ts 신규 라인:** 동일 = **약 50 라인 추가**
- **projects.ts:** 변경 없음 (재사용만)

**총 추가 라인 (en+ko): ~320 라인.** Dev Spec §10 추정(200~400) 범위 내.

### 14-4. AC-5 / AC-7 / AC-8 / AC-10 / AC-12 / AC-13 / AC-14 준수 검증

- **AC-5 (Phase 1/2 키 보존):** 본 스펙이 건드린 기존 키 — 0건. Phase 1 / 2a / 2b 의 `common.*` / `milestones.*` / `runs.aiSummary.*` / `runs.detail.*` / `runs.toast.*` 모두 **읽기 전용 재사용**. 신규는 전부 `common.nav.*` / `common.avatar.*` / `common.detailPanel.*` / `common.exportModal.*` / `runs.detail.focusMode.*` ✅
- **AC-7 (스캐너 확장):** Designer 는 네임스페이스만 확정 — SCOPE_DIRS 확장은 Developer 책임. 스펙 §9-2 에 원칙 명시 ✅
- **AC-8 (StatusBadge 재사용):** §6 표 — 5 label 모두 기존 `common.passed|failed|blocked|retest|untested` 재사용, 신규 0. useMemo 리팩토링 ✅
- **AC-10 (FocusMode 상수 리팩토링):** §11-1 표 — STATUS_BUTTONS 4+1 / FILTER_CHIPS 6 / 키보드 힌트 3 배열 useMemo 이동. Skip 1 신규 ✅
- **AC-12 (ProjectHeader 재사용):** §8-1 표 — navItems 9 개 중 4 개 기존 flat 재사용 (testCases / runsAndResults / milestones / sessions). 신규 5 (nav.*) + projects.noProjects 재사용 + settings / logout 재사용 ✅
- **AC-13 (TIER_INFO 영문 고정):** §3-2 확정. 본 스펙 키 미신설, JSX 에서 `{tierInfo.name}` 그대로 렌더 ✅
- **AC-14 (DetailPanel 상수 + date 헬퍼):** §10 표 — 상태 라벨 5 곳 대문자화 로직 제거 후 `common.passed|...` 룩업, `getTimeAgo` / `formatDate` / `toLocaleDateString|String|Time` 5 곳 → Phase 1/2b 공용 헬퍼 재사용, 신규 헬퍼 도입 0 ✅
- **AC-15 (단축키 interpolation):** §12-3 표 — `{{shortcut}}` 1건 (`runs.detail.focusMode.sidebar.openTooltip`). 나머지 단축키 기호는 문자열 내 고정 ✅
- **AC-16 (브랜드 + 플랜 interpolation):** §10-4 `common.detailPanel.issues.upsellTitle` — `{{brand}}`, `{{plan}}` 2 변수 ✅

### 14-5. 재사용 비율 검증

**신규 95 / 재사용 45 = 재사용률 32%.** Phase 2b (재사용률 ~20%) 대비 높음. Phase 3 가 공유 컴포넌트 + Phase 1/2 기 누적으로 재사용 풀이 커졌기 때문 (예상대로).

**Dev Spec §4-3 "중복 생성 금지 목록" 완전 준수.** 신규 키 중 영문 값이 기존 키와 100% 일치하는 케이스 — 일부 있음 (`common.detailPanel.comments.empty` vs `runs.detail.focusMode.comments.empty` — 카피 "No comments yet" 동일). Designer 판단: **ns 분리 원칙에 따라 복제 허용**. PR 리뷰 시 Developer 가 공통 승격 제안 가능.

---

## 15. Developer 인수 체크리스트

작업 착수 전 본 스펙 기준으로 다음을 사전 확인 (Phase 2b §18 패턴 승계):

- [ ] §5 번들 트리 도식 열어 두고, 신규 키를 `en/common.ts` / `en/runs.ts` 의 정확한 계층에 넣기
- [ ] §4 재사용 매트릭스 상단에 두고, 코드 변경 시 먼저 `common.*` / `runs.detail.*` / `runs.toast.*` / `projects.*` 에서 grep 으로 동일 값 존재 여부 확인
- [ ] §6 StatusBadge — `useMemo` 패턴 + 신규 키 0 확인
- [ ] §7 Avatar — `common.avatar.altFallback` 1 건만 변경
- [ ] §8 ProjectHeader — navItems 9 개 중 **4 개는 기존 flat 키 재사용** (중복 키 생성 금지)
- [ ] §9 ExportModal — formats[].label (PDF/CSV/Excel) 는 번역 금지
- [ ] §10 DetailPanel — SS Diff 6 건 Phase 2b 재사용, 상태 라벨 5 곳 Phase 0 재사용
- [ ] §11 FocusMode — GitHub Issue Quick-Create modal 전량 Phase 2b 재사용 (신규 0), FILTER_CHIPS 6 라벨 전량 재사용
- [ ] §12-3 AC-15 단축키 interpolation — `{{shortcut}}` 1건만 (`openTooltip`)
- [ ] §13 AC-9 — 6 파일 어디에도 AI 비번역 주석 추가 안함 (해당 없음)
- [ ] 헬퍼 교체: DetailPanel `formatDate` / `getTimeAgo` / `toLocaleDateString|String|Time` 5 곳 → Phase 1/2b 공용 헬퍼 (`formatShortDate` / `formatRelativeTime` / `formatShortTime` / `formatShortDateTime` / `formatLongDateTime`). **신규 헬퍼 도입 금지** (AC-14)
- [ ] FocusMode comments/history 의 inline `d === 0 ? 'today' : ...` 2 곳도 `formatRelativeTime` 으로 치환 (AC-14 연장)
- [ ] 상태 라벨 대문자화 로직 제거: DetailPanel 5 곳 / ExportModal 1 곳 / FocusMode history 1 곳 (AC-14)
- [ ] `.i18nignore` 확장 (선택): `>PDF<`, `>CSV<`, `>Excel<` — 스캐너 확장 후 false-positive 발생 시 추가
- [ ] `scripts/scan-i18n.mjs` SCOPE_DIRS 에 6 파일 whitelist (AC-7 A 안)
- [ ] `useTranslation(['common'])` → `useTranslation(['common', 'runs'])` 으로 확장 (DetailPanel + FocusMode), `useTranslation('common')` 단일 ns (StatusBadge / Avatar / ExportModal / ProjectHeader — ProjectHeader 는 `['common', 'projects']`)
- [ ] `npm run scan:i18n:check` 6 파일 매치 0 확인
- [ ] `npm run scan:i18n:parity` en↔ko diff 0 확인
- [ ] 수동 스모크 테스트 (AC 리스크 §11): 로그인 → 프로젝트 이동 → 9 탭 전수 이동 → 프로젝트 전환 드롭다운 → 프로필 드롭다운 → Run 실행 → DetailPanel 4 탭 순회 → Focus Mode 진입 → 사이드바 필터 6 칩 / 검색 / 단축키 [ + / → Escape 로 종료. EN / KO 양쪽.

---

## 16. Out of Scope (Designer 관점 재확인)

Dev Spec §9 동일. 본 스펙 카피로 처리하지 않는 영역:

- Phase 1~2b 에서 완료된 파일들 (milestone-detail / issues / AIRunSummaryPanel / plan-detail / run-detail) — AC-5 파괴 금지
- `src/components/` 의 나머지 미번역 파일 (CommandPalette, InlineEdit, KeyboardShortcutsHelp, LanguageSwitcher, EmptyState, ModalShell, StepEditor, SavedViewsDropdown, UpgradeBanner, TagChip, EnvironmentAIInsights, EnvironmentDropdown, EnvironmentFormModal, ProgressBar, SegmentedBar, StatusPill, LifecycleBadge, BulkActionBar, AITriggerButton, NotificationBell, SaveIndicator, PageLoader, Skeleton, CookieBanner, SEOHead, VirtualList) — Phase 4 후속 티켓
- `src/pages/` 중 미번역 페이지 — Phase 5 후속 티켓
- TIER_INFO Plan 이름 번역 (AC-13)
- 키보드 단축키 문자 (`P / F / B / R / S / C / H / N / [ / ] / / / Esc / Cmd+Shift+F / ⌘ + Enter`) 번역 (AC-15, AC-12 승계)
- ExportModal formats[].label (PDF / CSV / Excel) 포맷 약어 번역 (AC-11)
- Avatar `title` prop 외부 전달 값 번역 (호출처 책임, AC-9)
- AvatarStack `title={m.name || m.email}` 사용자 데이터 번역
- ExportModal 이 생성하는 PDF / CSV / Excel 본문 번역 (Phase 2b §15 외부 송출 OOS)
- FocusMode `createGithubIssue` 의 REST API payload body 번역 (AC-9)
- Claude 프롬프트 locale 힌트 주입 (f013)
- 통화 / 숫자 천단위 구분자 (f014)
- 사용자 입력 데이터 (실명 / 이메일 / 프로젝트명 / TC 제목 / 폴더 이름 / 태그 / 코멘트 본문 / precondition / 파일명)
- 외부 라이브러리 아이콘 alt/aria (lucide-react / remixicon)

---

## 17. 변경 이력

| 일자 | 작성자 | 내용 |
|------|-------|------|
| 2026-04-21 | @designer | 최초 작성 (Phase 3 shared components). Dev Spec §10 키 구조에 1:1 매핑, Phase 1 §2~§6 / Phase 2a+2b 톤·용어 상속, AC-1~AC-16 준수 검증 완료 |
