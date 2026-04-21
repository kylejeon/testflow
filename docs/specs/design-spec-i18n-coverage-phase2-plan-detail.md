# Design Spec: i18n 커버리지 Phase 2a — plan-detail/page.tsx 카피 치팅시트

> **작성일:** 2026-04-21
> **작성자:** @designer
> **상태:** Draft → Review → Approved
> **관련 Dev Spec:** `docs/specs/dev-spec-i18n-coverage-phase2-plan-detail.md` (Phase 2a — 키 구조 확정)
> **상속 원칙:** `docs/specs/design-spec-i18n-coverage.md` (Phase 1 — §2 톤앤매너 / §3 용어 컨벤션 / §4 단위·시간 / §5 plural / §6 AI 비번역 원칙)
> **대상 파일:** `src/pages/plan-detail/page.tsx` (3,415줄, 단일 파일, 자식 컴포넌트 없음)
> **Figma:** N/A — 레이아웃 무변경. 카피 교체만 수행.

---

## 0. 이 문서의 목적과 읽는 법

Phase 2a 는 plan-detail/page.tsx 내부의 하드코딩 영문 **75 JSX 텍스트 + 37 토스트 + 16 attribute + 6 날짜 포맷 + 4 상수 블록**을 i18next 번들로 이관한다. 이 Design Spec 은 Developer 가 Dev Spec §10-1 네임스페이스 구조에 **그대로 복사해서 붙여넣을 수 있는** EN/KO 문자열 매핑 치팅시트다.

**Developer 워크플로우:**
1. §2 용어·톤 상속 확인 (Phase 1 §3 의 확장이다)
2. §3 Plan 도메인 신규 용어 외우기 — Snapshot/Drift/Rebase/Danger Zone 등
3. §4 ~ §24 섹션별 매핑 표를 펼쳐 EN/KO 값을 번들 파일에 복사
4. §25 상수 블록 리팩토링 패턴 (STATUS_CONFIG / PRIORITY_CONFIG / TABS / TC_PRI) 적용
5. §26 날짜 헬퍼 교체
6. §27 토스트 37건 일괄 매핑
7. §28 확인 모달 5종 interpolation 검증
8. §29 최종 키 배치 트리 확인 후 `milestones.ts` 에 병합

> 섹션 번호는 Dev Spec §4-2 의 22 섹션에 1:1 매핑된다. 추가 3 섹션 (Constants / 날짜 헬퍼 / 최종 배치) 포함 총 30 섹션.

---

## 1. 레이아웃

**레이아웃 변경 없음.** 모든 DOM 구조·Tailwind 클래스·CSS 변수·Grid·Flex·여백·breakpoint 는 현재 v3 Plan Detail 레이아웃과 완전 동일하게 유지한다.

### 1-1. 텍스트 길이 리스크 체크포인트 (Phase 2a 특화)

| 위치 | EN 기준 | KO 예상 | 변동 | 완화 |
|------|--------|---------|-----|-----|
| Tab 라벨 `Test Cases` (detail-tabs) | 10 char | `테스트 케이스` 6 char | 단축 | OK |
| Tab 라벨 `Environments` | 12 char | `환경` 2 char | 단축 | OK |
| Strip KPI `Best Pass Rate` | 14 char | `최고 통과율` 6 char | 단축 | OK |
| Strip KPI `Envs Covered` | 12 char | `적용 환경` 5 char | 단축 | OK |
| AI Risk `Forecast Completion` | 19 char | `완료 예상일` 6 char | 단축 | OK |
| Snapshot `Drift from live` | 15 char | `라이브 대비 드리프트` 11 char | 비슷 | OK |
| Snapshot `TC revision` | 11 char | `TC 리비전` 6 char | 단축 | OK |
| DangerZone `Delete permanently` | 18 char | `영구 삭제` 5 char | 단축 | OK |
| DangerZone 설명 `Cannot be undone. All runs and issues will be orphaned.` | 54 char | `되돌릴 수 없습니다. 연결된 모든 실행과 이슈가 고아 상태가 됩니다.` 32 char | 단축 | OK |
| Modal `Duplicate Plan` body (long) | 130 char | `동일한 TC 스냅샷(테스트 케이스 {{count}}건)으로 "{{planName}}"의 복사본을 만드시겠습니까? 새 플랜 이름은 "{{planName}} (Copy)"가 되며, 생성 후 해당 플랜으로 이동합니다.` 95 char | 단축 | OK. 모달 `max-w-3xl` 이 아닌 `max-w-28rem` = 448px. 한국어 5줄 wrap 허용. |
| Unlock modal body 2 | 84 char | `기존 실행은 영향받지 않지만 플랜 범위가 달라질 수 있습니다. 계속 진행하시겠습니까?` 45 char | 단축 | OK |
| Execution Pace `Avg TC/day` | 10 char | `일 평균 TC` 8 char | 동급 | OK |
| Activity Export CSV 헤더 `Date,Event,Actor,Details` | 외부 포워드 | (영문 유지) | — | 번역 대상 아님 (Dev §8) |

> **결론:** Plan Detail 한국어 번역은 평균 **35~45% 단축**. 오버플로 리스크 없음. 유일한 주의: Danger Zone의 `"Cannot be undone."` 계열 경고 톤이 한국어에서 약해지지 않도록 §2-3 **강조(`<strong>`) 마크업 유지** 원칙 적용 (§22 모달 참조).

---

## 2. 톤앤매너 상속 (Phase 1 §2 full inheritance)

Phase 1 Design Spec §2 의 모든 원칙이 그대로 적용된다. 재정의 금지. 아래는 Phase 2a 에서 특히 자주 발동될 규칙만 요약.

### 2-1. 기본 원칙 (Phase 1 §2-1 재명시)

| 축 | EN | KO |
|----|----|----|
| 문체 | Imperative mood ("Archive", "Duplicate", "Rebase") | 존댓말 ("아카이브", "복제하기", "리베이스") |
| 간결성 | 2~4 단어 버튼 선호 | 조사 필수, 음역 허용 |
| 전문용어 | 원어 그대로 (Snapshot, Drift, Rebase) | 음역 + 보조 의미 — `스냅샷`, `드리프트`, `리베이스` |
| 이모지 | 현재 코드 박힌 `↻` `＋` `×` `→` 유지 | 동일 |

### 2-2. 문장 종결 — Phase 2a 자주 쓰는 패턴

| 컨텍스트 | KO 종결 | 예시 (Phase 2a 실 키) |
|---------|--------|---------|
| 섹션 헤더 | 명사 | `테스트 케이스`, `기본 정보`, `데인저 존` |
| 상태 뱃지 | 명사 / `~됨` | `잠김` (LOCKED), `잠금 해제됨` (Unlocked), `최신 상태` (Up to date) |
| 버튼 / CTA | `~하기` / 명사 | `아카이브`, `복제하기`, `영구 삭제`, `잠금 해제`, `리베이스`, `다시 스캔` |
| Empty state | `~합니다` / `~없음` | `저장된 프리셋이 없습니다.`, `아직 연결된 실행이 없습니다.`, `아직 기록된 활동이 없습니다.` |
| 토스트 success | `~되었습니다` | `스냅샷이 잠겼습니다`, `플랜이 삭제되었습니다`, `테스트 케이스가 추가되었습니다` |
| 토스트 error | `~에 실패했습니다` | `스냅샷 잠금에 실패했습니다`, `플랜 삭제에 실패했습니다` |
| 확인 모달 질문 | `~하시겠습니까?` | `"{{planName}}"을(를) 삭제하시겠습니까?`, `"{{planName}}"을(를) 아카이브하시겠습니까?` |
| 경고문 (Danger) | `~됩니다 / ~할 수 없습니다` | `되돌릴 수 없습니다.`, `플랜이 읽기 전용이 됩니다.`, `실행 데이터는 유지됩니다.` |

### 2-3. Danger Zone 강조 톤 (중요)

Phase 1 §2-4 "피해야 할 표현" 원칙과 별개로, **Danger Zone/파괴 액션은 강조 마크업(`<strong>`)을 한국어에도 유지**해야 한다. 실제 소스에서 `<strong>"{plan.name}"</strong>` 으로 감싸진 interpolation 은 번역에서도 동일 위치에 `<strong>` 이 들어간다.

**예시:**
- EN `Are you sure you want to delete <strong>"{{planName}}"</strong>? This action cannot be undone.`
- KO `<strong>"{{planName}}"</strong>을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`

i18next + React `Trans` 컴포넌트 사용 또는 `dangerouslySetInnerHTML` 유지(현 소스 방식). Developer 는 §22 모달 섹션의 마크업 지침을 따른다.

---

## 3. 용어 사전 — Phase 1 §3 상속 + Plan 도메인 확장

### 3-1. Phase 1 §3-1 브랜드명 (번역 금지, 동일 적용)

| 용어 | 근거 |
|------|-----|
| `Testably`, `Jira`, `GitHub`, `Claude`, `Slack`, `Supabase`, `Paddle`, `LemonSqueezy`, `Stripe` | Phase 1 §3-1 |

### 3-2. Phase 1 §3-2 고정 번역 재명시 (Plan Detail 에서 재등장)

| EN | KO 확정 | Plan Detail 등장 위치 |
|----|--------|---------------------|
| **Milestone** | `마일스톤` | breadcrumb, Settings Linked Milestone |
| **Sub Milestone** | `하위 마일스톤` | Settings milestone select (`↳ {{name}} (sub-milestone)`) |
| **Test Plan / Plan** | `테스트 플랜` / `플랜` | 전역 (Delete/Archive/Duplicate 모달 타이틀 등) |
| **Test Case / TC** | `테스트 케이스` / `TC` | 전역 |
| **Run** | `실행` / `런` (기존 섹션 헤더만 `런` 레거시) | Runs 탭 strip, run-card, Activity 탭 |
| **Pass Rate** | `통과율` | Runs Strip `Best Pass Rate`, detail-head stats |
| **Retest** | `재테스트` | Activity 이벤트 desc |
| **Issue** | `이슈` | Issues 탭 (Phase 1 재사용) |
| **Contributor** | `기여자` | — (Phase 2a 직접 등장 없음) |
| **On track / At Risk / Critical** | `정상 진행` / `주의` / `심각` | AI Risk Predictor pill (재사용) |
| **Summary / Observations / Recommendations** | `요약` / `관찰` / `권장 조치` | AI Risk Predictor (신규 `Recommendation` 은 단수) |
| **Refresh** | `새로고침` | — (Phase 2a 는 `Re-scan` 별도) |
| **Credit / Credits** | `크레딧` | AI Risk Predictor `Costs 1 AI credit` |

### 3-3. Plan 도메인 신규 용어 (Phase 2a 확정)

Dev Spec §13-리스크 에서 "리베이스 / 다시 스캔" 결정 지시. 본 Design Spec 이 **최종 확정**한다.

| EN | KO 확정 | 대체 후보(NG) | 근거 |
|----|--------|--------------|-----|
| **Snapshot** | `스냅샷` (음역) | ~~찰칵~~, ~~스냅~~ | Git/Docker 문화 — 개발자 도메인 표준 |
| **Lock Snapshot** | `스냅샷 잠그기` | ~~스냅샷 락~~ | Testably 기존 `locked` = `잠김` 정렬 |
| **Unlock** | `잠금 해제` | ~~언락~~ | UX 표준 (iOS/macOS) |
| **LOCKED** (badge) | `잠김` | ~~락됨~~ | 대문자 badge는 KO도 짧게 |
| **Unlocked** (badge) | `잠금 해제됨` | ~~언락됨~~ | 문장 종결 `~됨` 규칙 |
| **Drift** | `드리프트` (음역) | ~~편차~~, ~~이탈~~ | Infra-as-Code 표준 음역 |
| **Drift from live** | `라이브 대비 드리프트` | ~~현행 대비 편차~~ | 위 음역 + 방향성 |
| **Up to date** | `최신 상태` | ~~최신~~ | 완결형 |
| **Rebase** | `리베이스` (음역) | ~~기준 재설정~~, ~~재정렬~~ | Git 문화 (개발자 target) |
| **TC revision** | `TC 리비전` | ~~TC 개정~~ | 음역 (git rev 와 정렬) |
| **TC edited** (drift count) | `TC {{count}}건 수정됨` | ~~편집된 TC {{count}}건~~ | 수동태 유지 |
| **Scanned {{date}}** | `{{date}} 스캔함` | ~~{{date}}에 스캔됨~~ | Past action — 간결 |
| **Forecast Completion** | `완료 예상일` | ~~예측 완료~~ | 명사화 |
| **Failure risk diagnostic** | `실패 리스크 진단` | ~~실패 위험 진단~~ | 서비스 전역 `Risk` = `리스크` (AI Risk 명칭 일관성) |
| **Top Risk Signals** | `주요 리스크 신호` | ~~상위 위험 신호~~ | 위와 동일 |
| **Recommendation** | `권장 조치` | ~~추천~~ | Phase 1 `Recommendations` 와 동형 (단수/복수 동일 번역) |
| **Re-scan** | `다시 스캔` | ~~재스캔~~, ~~리스캔~~ | 서비스 전역 `Refresh = 새로고침` 과 동형 동사 패턴 |
| **Run Risk Scan** | `리스크 스캔 실행` | ~~위험 스캔 시작하기~~ | Imperative 유지, "실행" 은 동사 |
| **Scanning…** | `스캔 중…` | ~~스캐닝 중~~ | `~ing` → `~중` 표준 |
| **Execution Pace** | `실행 페이스` | ~~실행 속도~~, ~~수행 속도~~ | "Velocity" = 속도 이미 점유. 구분 |
| **Avg TC/day** | `일 평균 TC` | ~~TC/일~~ | 한국어 어순 자연스럽게 |
| **Remaining** | `남음` | ~~잔여~~ | 기존 `common.*` 정렬 |
| **{{n}} TC ~{{d}}d** | `TC {{n}}건 ~{{d}}일` | — | 단위 한국어 후치 |
| **Entry Criteria** | `진입 기준` | ~~엔트리 기준~~ | 테스트 계획 도메인 표준 (ISTQB) |
| **Exit Criteria** | `종료 기준` | ~~엑시트 기준~~, ~~이탈 기준~~ | ISTQB 한국어 표준 |
| **Auto** (badge) | `자동` | ~~오토~~ | 기존 badge 톤 |
| **Auto-evaluated** | `자동 평가됨` | ~~자동평가~~ | 동사 수동형 |
| **Auto-evaluated based on test results** | `테스트 결과 기반 자동 평가` | — | title tooltip |
| **Click to toggle** | `클릭하여 전환` | ~~토글하려면 클릭~~ | 간결 |
| **Add criterion** | `기준 추가` | ~~항목 추가~~ | 도메인 용어 유지 |
| **Presets** | `프리셋` (음역) | ~~미리 설정~~ | 개발자 UI 관용 |
| **Save as preset** | `프리셋으로 저장` | — | — |
| **No presets saved yet** | `저장된 프리셋이 없습니다` | — | — |
| **All presets already added** | `모든 프리셋이 추가되었습니다` | — | — |
| **Include Draft TCs** | `초안 TC 포함` | ~~드래프트 TC 포함~~ | 기존 번들 `draft = 초안` 재사용 |
| **Draft** (badge) | `초안` | — | 재사용 |
| **Active** (badge TC Picker) | `활성` | — | — |
| **No Folder** | `폴더 없음` | — | — |
| **All Folders** | `모든 폴더` | — | — |
| **All Priority** | `모든 우선순위` | — | — |
| **Add TCs** | `TC 추가` | ~~TCs 추가~~ | 한국어 단복수 없음 |
| **Danger Zone** | `데인저 존` (음역) | ~~위험 구역~~, ~~삭제 영역~~ | GitHub/Vercel 관용 음역 — 엔지니어 인지 |
| **Archive plan** | `플랜 아카이브` | ~~플랜 보관~~ | 기존 번들 혼재 — Phase 1 `common.archived` 있으므로 "아카이브" 통일 |
| **Unarchive plan** | `플랜 아카이브 해제` | ~~언아카이브~~ | — |
| **Archive** (CTA 짧게) | `아카이브` | — | — |
| **Unarchive** (CTA 짧게) | `해제` | ~~언아카이브~~ | 공간 절약 |
| **Duplicate plan** | `플랜 복제` | ~~플랜 복사~~, ~~플랜 중복~~ | `Duplicate` = `복제` 서비스 전역 정렬 |
| **Duplicate** (CTA) | `복제하기` | — | — |
| **Delete plan** / **Delete permanently** | `플랜 삭제` / `영구 삭제` | — | — |
| **Delete Test Plan** (modal title) | `테스트 플랜 삭제` | — | `Test Plan` 풀 네임 |
| **Archive Plan** (modal title) | `플랜 아카이브` | — | — |
| **Unarchive Plan** (modal title) | `플랜 아카이브 해제` | — | — |
| **Duplicate Plan** (modal title) | `플랜 복제` | — | — |
| **Environments Heatmap** | `환경 히트맵` | — | 재사용 `environments.*` 번들 (이미 번역됨) |
| **AI Risk Predictor** | `AI 리스크 예측기` | ~~AI 위험 예측기~~ | `milestones.aiRisk.title = 'AI 리스크 분석'` 과 정렬 |
| **Status** dropdown 값 | `계획` / `진행 중` / `완료` / `취소됨` / `아카이브됨` | — | `Planning` → `계획` (Dev §8 에지 `archived` 추가 포함) |
| **Unsaved changes** | `저장되지 않은 변경사항` | ~~미저장 변경~~ | 형식적 |
| **Save Changes** | `변경사항 저장` | — | — |
| **Discard** | `변경 취소` | ~~버리기~~ | 실사용자 친숙 |
| **Saving…** | `저장 중…` | — | — |
| **Showing N of M** | `{{m}}개 중 {{n}}개 표시` | — | — |
| **Previous / Next** (pagination) | `이전` / `다음` | — | 재사용 `common.*` (검증 필요) |
| **Continue: {{runName}}** | `이어하기: {{runName}}` | ~~계속: ...~~ | 실행 재개 명확화 |
| **{{n}} Runs In Progress** | `진행 중 실행 {{n}}건` | — | — |
| **＋ Start New Run** | `＋ 새 실행 시작` | — | `＋` 기호 유지 |
| **Start Run** | `실행 시작` | — | — |
| **Continue Run** | `실행 이어하기` | — | — |
| **New Run** (버튼) | `새 실행` | — | — |
| **Start a new Run with these {{n}} TCs** | `이 {{n}}건의 TC로 새 실행 시작` | — | — |
| **View** (버튼) | `보기` | — | — |
| **Unassigned** | `미지정` | ~~지정 안됨~~ | 기존 번들 정렬 |
| **+{{n}} more** | `+{{n}}명` | ~~+{{n}}개 더~~ | 사람 세는 조사 |
| **System** (actor fallback) | `시스템` | — | — |
| **Today / Yesterday** | `오늘` / `어제` | — | 재사용 `common.today` / `common.yesterday` |
| **All time** | `전체 기간` | — | — |
| **Last 7d/14d/30d** | `최근 7일/14일/30일` | — | — |
| **Export** | `내보내기` | — | 재사용 `common.export` |
| **{{n}} events** | `이벤트 {{n}}건` | — | — |
| **Run Activity** 이벤트 desc (18종) | §14 표 참조 | — | — |

### 3-4. 혼용 주의 — "Status"

- `plan.status` 의 값 `planning | active | completed | cancelled | archived` 는 **데이터 값**이므로 번역 금지.
- 화면에 표시될 때는 STATUS_CONFIG 를 통해 `label` 로 치환된다 — 이때 `{ planning: '계획', active: '진행 중', ... }` 매핑 적용.
- **주의:** Phase 1 기존 키 `common.started = 'In Progress' / '진행 중'` 이 존재. Plan Detail 에서는 **재사용하지 말고 별도 `planDetail.statusConfig.active` 키 신설** (Dev Spec §4-4 주의 사항).

### 3-5. 혼용 주의 — "Archive / Archived"

- `common.archived` 가 이미 존재한다면 재사용. 없다면 신규. Dev Spec 에서는 `milestones.planDetail.statusConfig.archived` 추가 지시.
- `STATUS_CONFIG` 내 `archived` 값은 **badge 뱃지용** (`badge badge-neutral`) + **Settings dropdown option 값 아님** (dropdown 은 4개만: planning/active/completed/cancelled). archived 는 Archive 버튼 클릭 → `status = 'archived'` 업데이트로만 진입.

---

## 4. 상태별 화면

Plan Detail 은 단일 페이지 + 6 탭이다. 각 상태가 발동되는 지점을 명시한다. (별도 신규 스크린 없음 — 기존 화면 상태 매핑만.)

| 상태 | 발동 조건 | 표시 키 | 참고 섹션 |
|------|---------|--------|---------|
| **정상** | `plan` 로드 성공 + 탭 활성 | 섹션별 정상 레이아웃 (§5 ~ §24) | — |
| **로딩** | `loading === true` | `<PageLoader />` 렌더 (기존 컴포넌트, 번역 불필요) | 페이지 shell |
| **에러** | `loadError === true` 또는 `!plan` | §24 에러 상태 ("Plan not found" / "Failed to load plan") | §24 |
| **빈 상태 TC** | `planTcs.length === 0` | `No test cases added yet. Click "Add TCs" to start.` | §5 |
| **빈 상태 Run** | `runs.length === 0` | `No runs linked to this plan yet.` | §7 |
| **빈 상태 Activity** | `filtered.length === 0` | `No activity recorded yet.` | §8 |
| **빈 상태 Snapshot** | `!plan.is_locked && planTcs.length === 0` | `Add TCs to enable locking.` | §11 |
| **빈 상태 Snapshot (TC 있음)** | `!plan.is_locked && planTcs.length > 0` | `Lock the TC scope to prevent drift. Required before starting a tracked run.` | §11 |
| **빈 상태 AI Risk Predictor** | `!riskData` | `Run an AI-powered risk analysis to get failure predictions, risk signals, and actionable recommendations.` + `Costs 1 AI credit · Requires Starter plan` | §10 |
| **빈 상태 Presets** | `entryPresets.length === 0` | `No presets saved yet` | §16 |
| **빈 상태 Presets all added** | `entryPresets.filter(p => !entryCriteria.includes(p)).length === 0` | `All presets already added` | §16 |
| **빈 상태 TC Picker 검색** | `!pickerSearch ? 'All test cases already added.' : 'No test cases match your search.'` | 조건부 2개 | §6 |
| **제한 도달 AI** | `res.status === 429` | toast `Monthly AI credit limit reached` → `매월 AI 크레딧 한도에 도달했습니다` | §27 |
| **제한 도달 Tier** | `res.status === 403` | toast `Starter plan required for AI Risk Predictor` → `AI 리스크 예측기는 Starter 플랜이 필요합니다` | §27 |
| **제한 TC 0 → Run 시작** | `planTcs.length === 0 && onStartNewRun` | toast warning `Add at least one test case before starting a run.` | §27 |
| **Unsaved state (Settings)** | `dirty === true` | Save bar 표시 (`Unsaved changes` / `Discard` / `Save Changes` / `Saving…`) | §18 |

> **원칙:** 모든 상태는 텍스트만 바뀌지 색상·아이콘·border 는 현행 유지. §27 토스트 전표가 "제한 도달" 상태의 토스트 메시지를 모두 커버한다.

---

## 5. 섹션 1 — Page Shell / Breadcrumb / Detail Head / Stats / Tabs

> **키 위치:** `milestones.planDetail.shell.*` + 일부 `common.*` 재사용. Dev Spec §10-1 `shell` 및 `tab` 서브트리 참조.

### 5-1. Breadcrumb / Detail Head

| Key | EN | KO | 비고 (재사용 / interpolation / plural) |
|-----|----|----|-------------------------------------|
| `milestones.planDetail.shell.breadcrumb.milestones` | Milestones | 마일스톤 | **기존 재사용 가능**: `common.milestones` 있으면 그걸. Dev §4-4 재사용 맵 참조 |
| `milestones.planDetail.shell.breadcrumb.plans` | Plans | 플랜 | 신규. breadcrumb 중간 segment |
| `milestones.planDetail.shell.detailHead.inheritedFrom` | Inherited from **{{name}}** | **{{name}}**에서 상속 | 신규. `<b>` 마크업 유지 (Trans 컴포넌트 사용) |
| `milestones.planDetail.shell.detailHead.due` | Due {{date}} | 마감일 {{date}} | 신규. `{{date}}` = `formatShortDate(plan.target_date, lang)` |
| `milestones.planDetail.shell.detailHead.dateRange` | {{start}} – {{end}} | {{start}} – {{end}} | interpolation 2개. 하이픈 엔대시 `–` 유지 |
| `milestones.planDetail.shell.detailHead.dateRangeFallback` | ? | ? | literal `?` (미정 값), en/ko 동일 |
| `milestones.planDetail.shell.aiOptimize` | AI Optimize | AI 최적화 | 신규. detail-head-right 버튼 |
| `common.edit` | Edit | 수정 | **재사용**. Phase 1 완료 |

### 5-2. Stats Row (progress bar + 통계)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `common.passed` | Passed | 통과 | **재사용** Phase 1 |
| `common.failed` | Failed | 실패 | **재사용** |
| `common.blocked` | Blocked | 차단 | **재사용** |
| `common.untested` | Untested | 미실행 | **재사용** |
| `milestones.planDetail.shell.stats.executedOfTotal` | {{executed}}/{{total}} executed · **{{pct}}%** | {{executed}}/{{total}} 실행 · **{{pct}}%** | interpolation 3. `<b>` 마크업 |
| `milestones.planDetail.shell.stats.passRate` | Pass Rate **{{pct}}%** | 통과율 **{{pct}}%** | — |

### 5-3. Tab Navigation (TABS 상수 라벨)

Dev §4-5 상수 리팩토링 대상. `useMemo(() => [...], [t])`.

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.tab.testCases` | Test Cases | 테스트 케이스 | **재사용 가능**: `common.testCases` 존재 시 (Phase 1 §10-2). 중복 추가 금지 |
| `milestones.planDetail.tab.runs` | Runs | 런 | **재사용**: `milestones.detail.overview.sections.runs` = `'런'` (Phase 1 레거시). **주의:** Phase 1 §3-3 결정 — 섹션 헤더는 "런", 신규 키는 "실행". Tab 라벨은 섹션 헤더에 준해 `'런'` 유지 (기존 값과 정합) |
| `milestones.planDetail.tab.activity` | Activity | 활동 | 신규 |
| `milestones.planDetail.tab.issues` | Issues | 이슈 | **재사용**: Phase 1 `common.issues.*` 서브트리 존재. label 만 신규 또는 재사용 |
| `milestones.planDetail.tab.environments` | Environments | 환경 | **재사용**: `environments.*` 네임스페이스 (Phase 2a 범위 밖) |
| `milestones.planDetail.tab.settings` | Settings | 설정 | **재사용**: `common.settings` Phase 1 완료 |

> **주의 (Dev §4-4 재사용 원칙):** `common.testCases`, `common.settings` 는 이미 `useTranslation('common')` 으로 가져올 수 있으면 중복 생성 금지. 다중 네임스페이스 `useTranslation(['milestones','common','runs'])` 로 호출하여 `t('common:testCases')` 로 참조.

### 5-4. Tab Count badge

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.tab.count` | {{count}} | {{count}} | 숫자만. 별도 키 불필요, 직접 `{totalTCs}` 렌더 |

---

## 6. 섹션 2 — (TABS 상수는 §5-3 에 이동, 본 섹션은 STATUS_CONFIG 라벨)

> **키 위치:** `milestones.planDetail.statusConfig.*`. Dev §4-5 상수 리팩토링.

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.statusConfig.planning` | Planning | 계획 | 신규. badgeCls = `badge badge-neutral` 유지 |
| `milestones.planDetail.statusConfig.active` | In Progress | 진행 중 | 신규. `badge badge-warning`. **주의:** Phase 1 `common.started = 'In Progress' / '진행 중'` 과 값은 동일하나 **별도 키 유지** (Dev §4-4 주의) |
| `milestones.planDetail.statusConfig.completed` | Completed | 완료 | 신규. `badge badge-success` |
| `milestones.planDetail.statusConfig.cancelled` | Cancelled | 취소됨 | 신규. `badge badge-danger` |
| `milestones.planDetail.statusConfig.archived` | Archived | 아카이브됨 | **Dev §8 에지 케이스 해결**: 기존 코드에 누락된 archived 라벨 추가. `badge badge-neutral` 적용 |

---

## 7. 섹션 3 — PRIORITY_CONFIG 라벨

> **키 위치:** `milestones.planDetail.priorityLabel.*`. Dev §4-5 상수 리팩토링.

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.priorityLabel.critical` | P1 Critical | P1 심각 | 신규. `priCls = 'pri-badge pri-p1'` 유지 |
| `milestones.planDetail.priorityLabel.high` | P2 High | P2 높음 | 신규. `pri-p2` |
| `milestones.planDetail.priorityLabel.medium` | P3 Medium | P3 보통 | 신규. `pri-p3` |
| `milestones.planDetail.priorityLabel.low` | P3 Low | P3 낮음 | 신규. `pri-p3` |
| `milestones.planDetail.priorityLabel.p1Short` | P1 | P1 | SettingsTab 3-button group |
| `milestones.planDetail.priorityLabel.p2Short` | P2 | P2 | 동일 |
| `milestones.planDetail.priorityLabel.p3Short` | P3 | P3 | 동일 |

> **원칙:** `P1`, `P2`, `P3` 은 언어 무관 기호이므로 번역 불필요하지만, 매핑 consistency 를 위해 키 자체는 정의해둔다. (선택 사항 — 하드코딩 `<span>P1</span>` 허용.)

---

## 8. 섹션 4 — Test Cases Tab (§4-2 `testCasesTab`)

> **키 위치:** `milestones.planDetail.testCasesTab.*`

### 8-1. Lock strip (plan.is_locked === true 일 때)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.testCasesTab.lockStrip.titleB` | Snapshot locked | 스냅샷 잠김 | `<b>` 마크업 |
| `milestones.planDetail.testCasesTab.lockStrip.body` | — TC scope is fixed. New TC changes in the library won't affect this plan. | — TC 범위가 고정되었습니다. TC 라이브러리의 변경사항은 이 플랜에 반영되지 않습니다. | `<b>` 뒤 본문 |
| `milestones.planDetail.testCasesTab.lockStrip.rebase` | ↻ Rebase | ↻ 리베이스 | `↻` 기호 유지 |
| `milestones.planDetail.testCasesTab.lockStrip.unlock` | Unlock | 잠금 해제 | — |

### 8-2. Entry / Exit Criteria blocks (Test Cases Tab 내부)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.testCasesTab.criteria.entryTitle` | Entry Criteria | 진입 기준 | — |
| `milestones.planDetail.testCasesTab.criteria.exitTitle` | Exit Criteria | 종료 기준 | — |
| `milestones.planDetail.testCasesTab.criteria.metSuffix` | {{met}} / {{total}} met | {{met}} / {{total}} 충족 | interpolation 2 |
| `milestones.planDetail.testCasesTab.criteria.emptyEntry` | No entry criteria defined. | 정의된 진입 기준이 없습니다. | — |
| `milestones.planDetail.testCasesTab.criteria.emptyExit` | No exit criteria defined. | 정의된 종료 기준이 없습니다. | — |
| `milestones.planDetail.testCasesTab.criteria.autoBadge` | Auto | 자동 | badge 텍스트 |
| `milestones.planDetail.testCasesTab.criteria.autoTooltip` | Auto-evaluated | 자동 평가됨 | `title` attribute |
| `milestones.planDetail.testCasesTab.criteria.autoEvalTooltip` | Auto-evaluated based on test results | 테스트 결과 기반 자동 평가 | `title` attribute (3곳) |
| `milestones.planDetail.testCasesTab.criteria.clickToggleTooltip` | Click to toggle | 클릭하여 전환 | `title` attribute |

### 8-3. Filter bar

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.testCasesTab.filter.searchPlaceholder` | Search in plan… | 플랜 내 검색… | `placeholder` attribute |
| `milestones.planDetail.testCasesTab.filter.allPriority` | All Priority | 모든 우선순위 | select option |
| `milestones.planDetail.testCasesTab.filter.lockSnapshot` | Lock Snapshot | 스냅샷 잠그기 | 버튼 |
| `milestones.planDetail.testCasesTab.filter.addTcs` | Add TCs | TC 추가 | 버튼 |

### 8-4. TC Table headers + row

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.testCasesTab.table.id` | ID | ID | 재사용 가능 (`common.id` 존재 시) |
| `milestones.planDetail.testCasesTab.table.title` | Title | 제목 | 재사용 `common.title` 검토 |
| `milestones.planDetail.testCasesTab.table.folder` | Folder | 폴더 | — |
| `milestones.planDetail.testCasesTab.table.priority` | Priority | 우선순위 | 재사용 `common.priority` |
| `milestones.planDetail.testCasesTab.table.status` | Status | 상태 | 재사용 `common.status` |
| `milestones.planDetail.testCasesTab.table.assignee` | Assignee | 담당자 | 재사용 `common.assignee` |
| `milestones.planDetail.testCasesTab.table.dashPlaceholder` | — | — | en/ko 동일, 신규 불필요 (리터럴) |
| `milestones.planDetail.testCasesTab.table.emptySearch` | No test cases match your search. | 검색 결과가 없습니다. | — |
| `milestones.planDetail.testCasesTab.table.emptyInitial` | No test cases added yet. Click "Add TCs" to start. | 아직 추가된 테스트 케이스가 없습니다. "TC 추가"를 클릭해 시작하세요. | `<Trans>` 로 `"Add TCs"` 부분 재사용 가능 |

### 8-5. Pagination

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.testCasesTab.pagination.showing` | Showing {{shown}} of {{total}} | {{total}}개 중 {{shown}}개 표시 | interpolation 2 |
| `milestones.planDetail.testCasesTab.pagination.previous` | Previous | 이전 | 재사용 검토 |
| `milestones.planDetail.testCasesTab.pagination.next` | Next | 다음 | 재사용 검토 |

### 8-6. Result label (RESULT_CLS 매핑)

현 코드 `result.charAt(0).toUpperCase() + result.slice(1)` → 삭제, `t('common:' + result)` 로 교체 (Dev §4-5).

| EN (result value) | EN 라벨 | KO 라벨 | 재사용 키 |
|------------------|--------|--------|---------|
| `passed` | Passed | 통과 | `common.passed` |
| `failed` | Failed | 실패 | `common.failed` |
| `blocked` | Blocked | 차단 | `common.blocked` |
| `retest` | Retest | 재테스트 | `common.retest` |
| `untested` | Untested | 미실행 | `common.untested` |

---

## 9. 섹션 5 — TC Picker Modal (§4-2 `tcPicker`)

> **키 위치:** `milestones.planDetail.tcPicker.*`

### 9-1. Header

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.tcPicker.title` | Add Test Cases | 테스트 케이스 추가 | — |

### 9-2. Filter bar

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.tcPicker.filter.searchPlaceholder` | Search test cases... | 테스트 케이스 검색... | `placeholder`. `...` 3-dot 유지 (ellipsis 문자 아님) |
| `milestones.planDetail.tcPicker.filter.allFolders` | All Folders | 모든 폴더 | — |
| `milestones.planDetail.tcPicker.filter.noFolder` | No Folder | 폴더 없음 | — |
| `milestones.planDetail.tcPicker.filter.includeDraft` | Include Draft TCs | 초안 TC 포함 | toggle 라벨 |
| `milestones.planDetail.tcPicker.filter.draftHidden` | {{count}} hidden | {{count}}건 숨김 | interpolation |

### 9-3. Summary row + Table + Footer

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.tcPicker.summary_one` | {{count}} test case available | 테스트 케이스 {{count}}건 사용 가능 | **plural _one** |
| `milestones.planDetail.tcPicker.summary_other` | {{count}} test cases available | 테스트 케이스 {{count}}건 사용 가능 | **plural _other** (ko 동일) |
| `milestones.planDetail.tcPicker.table.id` | ID | ID | 재사용 검토 |
| `milestones.planDetail.tcPicker.table.title` | Title | 제목 | — |
| `milestones.planDetail.tcPicker.table.status` | Status | 상태 | — |
| `milestones.planDetail.tcPicker.table.priority` | Priority | 우선순위 | — |
| `milestones.planDetail.tcPicker.table.statusDraft` | Draft | 초안 | — |
| `milestones.planDetail.tcPicker.table.statusActive` | Active | 활성 | — |
| `milestones.planDetail.tcPicker.table.dashPlaceholder` | - | - | 리터럴, 키 생성 불요 |
| `milestones.planDetail.tcPicker.table.emptySearch` | No test cases match your search. | 검색 결과가 없습니다. | — |
| `milestones.planDetail.tcPicker.table.emptyAll` | All test cases already added. | 모든 테스트 케이스가 이미 추가되었습니다. | — |
| `milestones.planDetail.tcPicker.footer.selected` | **{{count}}** selected | **{{count}}**개 선택됨 | `<strong>` 마크업 |
| `milestones.planDetail.tcPicker.footer.cancel` | Cancel | 취소 | **재사용** `common.cancel` |
| `milestones.planDetail.tcPicker.footer.addTcs_one` | Add {{count}} TC | TC {{count}}개 추가 | **plural _one**. CTA, 조건부 (selectedIds.size > 0) |
| `milestones.planDetail.tcPicker.footer.addTcs_other` | Add {{count}} TCs | TC {{count}}개 추가 | **plural _other** (ko 동일) |
| `milestones.planDetail.tcPicker.footer.addTcsZero` | Add TCs | TC 추가 | selectedIds.size === 0 일 때 fallback |

> **주의 (Dev §11 리스크):** 현 코드 `Add ${pickerSelectedIds.size > 0 ? \`${n} TC${n > 1 ? 's' : ''}\` : 'TCs'}` 라는 영어 특화 복수형 — i18next plural 전환 시 `addTcsZero` 별도 키 필요.

---

## 10. 섹션 6 — AI Risk Predictor Card (§4-2 `aiRiskPredictor`)

> **키 위치:** `milestones.planDetail.aiRiskPredictor.*`

### 10-1. Header

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.aiRiskPredictor.title` | AI Risk Predictor | AI 리스크 예측기 | — |
| `milestones.planDetail.aiRiskPredictor.subtitle` | Failure risk diagnostic | 실패 리스크 진단 | `riskData?._scanned_at` 없을 때 |
| `milestones.planDetail.aiRiskPredictor.scannedAt` | Scanned {{date}} · {{time}} | {{date}} · {{time}} 스캔함 | interpolation 2. `{{date}} = formatShortDate`, `{{time}} = formatShortTime` |

### 10-2. Data display

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.aiRiskPredictor.forecastCompletion` | Forecast Completion | 완료 예상일 | uppercase CSS 적용 — 한국어는 CSS 무시되므로 그대로 |
| `milestones.planDetail.aiRiskPredictor.confidence` | Confidence | 신뢰도 | 재사용 검토 (`milestones.aiRisk.confidence` 존재 시) |
| `milestones.planDetail.aiRiskPredictor.topRiskSignals` | Top Risk Signals | 주요 리스크 신호 | — |
| `milestones.planDetail.aiRiskPredictor.recommendation` | Recommendation | 권장 조치 | 단수. Phase 1 `Recommendations` 복수와 동일 번역 (한국어 단복수 없음) |
| `milestones.planDetail.aiRiskPredictor.rescan` | Re-scan | 다시 스캔 | 버튼 |
| `milestones.planDetail.aiRiskPredictor.scanning` | Scanning... | 스캔 중... | 버튼 로딩 상태 |
| `milestones.planDetail.aiRiskPredictor.runScan` | Run Risk Scan | 리스크 스캔 실행 | 버튼 |

### 10-3. Empty state

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.aiRiskPredictor.empty.description` | Run an AI-powered risk analysis to get failure predictions, risk signals, and actionable recommendations. | AI 기반 리스크 분석을 실행하면 실패 예측, 리스크 신호, 실행 가능한 권장 조치를 확인할 수 있습니다. | — |
| `milestones.planDetail.aiRiskPredictor.empty.cost` | Costs 1 AI credit · Requires Starter plan | AI 크레딧 1개 소모 · Starter 플랜 필요 | — |

### 10-4. Error messages (AC-15 서버 fallback 패턴)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.aiRiskPredictor.error.tierTooLow` | Starter plan required for AI Risk Predictor | AI 리스크 예측기는 Starter 플랜이 필요합니다 | 서버 `data.error` fallback |
| `milestones.planDetail.aiRiskPredictor.error.monthlyLimit` | Monthly AI credit limit reached | 매월 AI 크레딧 한도에 도달했습니다 | 429 |
| `milestones.planDetail.aiRiskPredictor.error.default` | Risk scan failed | 리스크 스캔에 실패했습니다 | 기타 |

### 10-5. AI 응답 본문 (AC-9 비번역 재확인)

Phase 1 Design Spec §6 원칙 상속. AI Risk Predictor 가 `data.forecast_date`, `data.forecast_note`, `data.risk_signals[].signal`, `data.risk_signals[].badge`, `data.recommendation`, `data.summary`, `data.confidence_label` 을 반환할 때 — **본문은 번역 대상 아님**. 래핑 라벨(`Forecast Completion`, `Top Risk Signals`, `Recommendation`, `Confidence`)만 번역.

**코드 주석 요구:** 해당 `PlanSidebar` 의 AI Risk 블록 상단에 아래 주석 추가 (§10-1 헤더 근처).

```ts
/**
 * i18n policy (dev-spec-i18n-coverage-phase2-plan-detail AC-9 / Phase 1 §6):
 * Wrapping labels are translated. Claude response body fields
 * (forecast_date, forecast_note, risk_signals[].signal, risk_signals[].badge,
 * recommendation, summary, confidence_label) are rendered as-is.
 * Multi-locale prompts tracked in separate spec.
 */
```

---

## 11. 섹션 7 — Snapshot Card (§4-2 `snapshot`)

> **키 위치:** `milestones.planDetail.snapshot.*`

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.snapshot.title` | Snapshot | 스냅샷 | 카드 타이틀 |
| `milestones.planDetail.snapshot.badge.locked` | LOCKED | 잠김 | 대문자 badge — KO 는 일반형 |
| `milestones.planDetail.snapshot.badge.unlocked` | Unlocked | 잠금 해제됨 | — |
| `milestones.planDetail.snapshot.lockedAt` | Locked at | 잠긴 시각 | row label |
| `milestones.planDetail.snapshot.lockedBy` | Locked by | 잠근 사람 | row label |
| `milestones.planDetail.snapshot.tcRevision` | TC revision | TC 리비전 | row label |
| `milestones.planDetail.snapshot.driftFromLive` | Drift from live | 라이브 대비 드리프트 | row label |
| `milestones.planDetail.snapshot.tcEdited_one` | {{count}} TC edited | TC {{count}}건 수정됨 | **plural _one** |
| `milestones.planDetail.snapshot.tcEdited_other` | {{count}} TC edited | TC {{count}}건 수정됨 | **plural _other** (ko 동일). EN도 `TCs` 아닌 `TC` 유지 (원본 코드 준수) |
| `milestones.planDetail.snapshot.upToDate` | Up to date | 최신 상태 | — |
| `milestones.planDetail.snapshot.driftTooltip` | TCs modified after snapshot was locked | 스냅샷 잠금 이후 수정된 TC | `title` attribute (ⓘ 호버) |
| `milestones.planDetail.snapshot.rebaseTooltip.noDrift` | No drift detected | 드리프트 없음 | `title`, 버튼 disabled 상태 |
| `milestones.planDetail.snapshot.rebaseTooltip.updateBaseline` | Update baseline to latest TC revisions | 기준선을 최신 TC 리비전으로 업데이트 | `title`, 버튼 활성 상태 |
| `milestones.planDetail.snapshot.rebase` | ↻ Rebase | ↻ 리베이스 | 버튼 |
| `milestones.planDetail.snapshot.unlock` | Unlock | 잠금 해제 | 버튼 |
| `milestones.planDetail.snapshot.emptyDescription` | Lock the TC scope to prevent drift. Required before starting a tracked run. | 드리프트 방지를 위해 TC 범위를 잠그세요. 추적 가능한 실행을 시작하려면 필요합니다. | 빈 상태 |
| `milestones.planDetail.snapshot.lockCta` | Lock Snapshot | 스냅샷 잠그기 | 버튼 |
| `milestones.planDetail.snapshot.emptyAddTcs` | Add TCs to enable locking. | 잠금을 사용하려면 TC를 추가하세요. | TC 0 일 때 |
| `milestones.planDetail.snapshot.lockedByFallback` | — | — | 리터럴 (dash) |

> **Locked by interpolation 노트:** `{lockedByUser.full_name || lockedByUser.email}` — 사용자 데이터, 번역 아님. i18n 키에 `{{name}}` 주입하지 말고 JSX 내 그대로 렌더.

---

## 12. 섹션 8 — Execution Pace Card (§4-2 `executionPace`)

> **키 위치:** `milestones.planDetail.executionPace.*`

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.executionPace.title` | Execution Pace | 실행 페이스 | 카드 타이틀 |
| `milestones.planDetail.executionPace.avgTcPerDay` | Avg TC/day | 일 평균 TC | uppercase + 단위. KO 어순 반전 |
| `milestones.planDetail.executionPace.remaining` | Remaining | 남음 | — |
| `milestones.planDetail.executionPace.tcWithDaysEst` | {{untested}} TC **~{{days}}d** | TC {{untested}}건 **~{{days}}일** | interpolation 2. small font suffix 로 `~{{days}}d` 따로 렌더 중 — §25 참고 (키를 나눠도 됨) |
| `milestones.planDetail.executionPace.tcZero` | 0 | 0 | 리터럴 |

> **분할 옵션:** `tcWithDaysEst` 를 **두 키로 분리**하여 CSS small font 를 rendering 단에서 제어:
> - `executionPace.tcCount` = `{{untested}} TC` / `TC {{untested}}건`
> - `executionPace.daysEstSuffix` = `~{{days}}d` / `~{{days}}일`
>
> Developer 판단. 본 Spec 은 **분할 옵션 권장**.

---

## 13. 섹션 9 — Runs Tab (§4-2 `runsTab`)

> **키 위치:** `milestones.planDetail.runsTab.*`

### 13-1. Strip 4 stats + New Run 버튼

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.runsTab.strip.totalRuns` | Total Runs | 전체 실행 | — |
| `milestones.planDetail.runsTab.strip.bestPassRate` | Best Pass Rate | 최고 통과율 | — |
| `milestones.planDetail.runsTab.strip.latest` | Latest | 최근 | — |
| `milestones.planDetail.runsTab.strip.envsCovered` | Envs Covered | 적용 환경 | — |
| `milestones.planDetail.runsTab.strip.newRun` | New Run | 새 실행 | 버튼 |
| `milestones.planDetail.runsTab.strip.sub.planLinked` | plan-linked | 플랜 연결됨 | sub text |
| `milestones.planDetail.runsTab.strip.sub.noRuns` | no runs yet | 아직 실행 없음 | sub text |
| `milestones.planDetail.runsTab.strip.sub.noData` | — | — | 리터럴 (dash) |
| `milestones.planDetail.runsTab.strip.sub.noEnvData` | no env data | 환경 데이터 없음 | sub text |
| `milestones.planDetail.runsTab.strip.bestRunLabel` | {{name}} ({{date}}) | {{name}} ({{date}}) | interpolation 2. `{{date}}` = `formatShortDate` |

### 13-2. Run card

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.runsTab.runCard.runNumber` | Run #{{n}} | 실행 #{{n}} | `#` 기호 유지 |
| `milestones.planDetail.runsTab.runCard.dateTime` | {{date}}, {{time}} | {{date}}, {{time}} | interpolation 2 |
| `milestones.planDetail.runsTab.runCard.ago` | · {{ago}} | · {{ago}} | interpolation. `{{ago}}` = `formatRelativeTime(iso, t)` 결과 |
| `milestones.planDetail.runsTab.runCard.executedOfTotal` | {{executed}} of {{total}} executed | {{total}}개 중 {{executed}}개 실행 | interpolation 2 |
| `milestones.planDetail.runsTab.runCard.untestedSuffix` | · {{count}} untested | · {{count}}개 미실행 | interpolation |
| `milestones.planDetail.runsTab.runCard.passSuffix` | {{count}} pass | 통과 {{count}} | — |
| `milestones.planDetail.runsTab.runCard.failSuffix` | · {{count}} fail | · 실패 {{count}} | — |
| `milestones.planDetail.runsTab.runCard.blockSuffix` | · {{count}} block | · 차단 {{count}} | — |
| `milestones.planDetail.runsTab.runCard.view` | View | 보기 | 버튼 |
| `milestones.planDetail.runsTab.runCard.unassigned` | Unassigned | 미지정 | — |
| `milestones.planDetail.runsTab.runCard.moreSuffix` | +{{count}} more | +{{count}}명 | interpolation |

### 13-3. New Run CTA card + empty

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.runsTab.newRunCta` | Start a new Run with these {{count}} TCs | 이 {{count}}건의 TC로 새 실행 시작 | interpolation |
| `milestones.planDetail.runsTab.newRunCtaHint` | · opens New Run modal with Plan pre-selected | · 플랜이 미리 선택된 새 실행 모달이 열립니다 | suffix |
| `milestones.planDetail.runsTab.empty` | No runs linked to this plan yet. | 아직 이 플랜에 연결된 실행이 없습니다. | — |
| `milestones.planDetail.runsTab.dashPlaceholder` | — | — | 리터럴 |

---

## 14. 섹션 10 — Activity Tab (§4-2 `activityTab`)

> **키 위치:** `milestones.planDetail.activityTab.*`

### 14-1. Filter pills

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.activityTab.filter.all` | All | 전체 | — |
| `milestones.planDetail.activityTab.filter.results` | Results | 결과 | — |
| `milestones.planDetail.activityTab.filter.runs` | Runs | 런 | 재사용 또는 신규. `런` 유지 (Phase 1 레거시 정합) |
| `milestones.planDetail.activityTab.filter.tc` | TC Edits | TC 수정 | — |
| `milestones.planDetail.activityTab.filter.ai` | AI | AI | 고유명사 |
| `milestones.planDetail.activityTab.filter.status` | Status | 상태 | 재사용 `common.status` 검토 |

### 14-2. Date range dropdown

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.activityTab.dateRange.last7d` | Last 7d | 최근 7일 | dropdown option |
| `milestones.planDetail.activityTab.dateRange.last14d` | Last 14d | 최근 14일 | — |
| `milestones.planDetail.activityTab.dateRange.last30d` | Last 30d | 최근 30일 | — |
| `milestones.planDetail.activityTab.dateRange.allTime` | All time | 전체 기간 | — |
| `milestones.planDetail.activityTab.dateRange.button.last7d` | Last 7d | 최근 7일 | trigger 버튼 (선택 상태 표시 — dropdown option 과 동일 값 재사용) |
| `milestones.planDetail.activityTab.dateRange.button.last14d` | Last 14d | 최근 14일 | 동일 |
| `milestones.planDetail.activityTab.dateRange.button.last30d` | Last 30d | 최근 30일 | 동일 |
| `milestones.planDetail.activityTab.dateRange.button.allTime` | All time | 전체 기간 | 동일 |

> **최적화:** `dateRange.*` 키 하나만 유지하고 버튼/dropdown 동일 키 참조. 위 표는 명시적 설명.

### 14-3. Export + empty + day header

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.activityTab.export` | Export | 내보내기 | 재사용 `common.export` 검토 |
| `milestones.planDetail.activityTab.empty` | No activity recorded yet. | 아직 기록된 활동이 없습니다. | — |
| `milestones.planDetail.activityTab.dayHeader.today` | Today · {{date}} | 오늘 · {{date}} | interpolation. `{{date}} = formatShortDate` |
| `milestones.planDetail.activityTab.dayHeader.yesterday` | Yesterday · {{date}} | 어제 · {{date}} | interpolation |
| `milestones.planDetail.activityTab.dayHeader.events` | {{count}} events | 이벤트 {{count}}건 | interpolation. 플러럴 불필요 (영문 복수 고정) |
| `milestones.planDetail.activityTab.systemActor` | System | 시스템 | actor fallback |

### 14-4. Event descriptions (18종)

소스 코드 1420-1436줄의 18 desc. i18next 키로 매핑 후 `if/else` 체인 내부에서 `desc = t('...')` 호출.

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.activityTab.desc.recorded` | recorded | 기록함 | test_result_{passed,failed,blocked,retest} 공용 |
| `milestones.planDetail.activityTab.desc.runStatusChanged` | changed run status | 실행 상태 변경함 | run_status |
| `milestones.planDetail.activityTab.desc.tcAdded` | added test cases to the plan | 플랜에 테스트 케이스 추가함 | tc_added |
| `milestones.planDetail.activityTab.desc.tcRemoved` | removed a test case from the plan | 플랜에서 테스트 케이스 제거함 | tc_removed |
| `milestones.planDetail.activityTab.desc.snapshotLocked` | locked the snapshot | 스냅샷을 잠금 | snapshot_locked |
| `milestones.planDetail.activityTab.desc.snapshotUnlocked` | unlocked the snapshot | 스냅샷 잠금 해제함 | snapshot_unlocked |
| `milestones.planDetail.activityTab.desc.snapshotRebased` | rebased snapshot to latest | 스냅샷을 최신으로 리베이스함 | snapshot_rebased |
| `milestones.planDetail.activityTab.desc.statusChanged` | changed plan status | 플랜 상태 변경함 | status_changed |
| `milestones.planDetail.activityTab.desc.criteriaUpdated` | updated entry/exit criteria | 진입/종료 기준 업데이트함 | criteria_updated |
| `milestones.planDetail.activityTab.desc.planUpdated` | updated plan settings | 플랜 설정 업데이트함 | plan_updated |
| `milestones.planDetail.activityTab.desc.planDeleted` | deleted the plan | 플랜 삭제함 | plan_deleted |
| `milestones.planDetail.activityTab.desc.planCreated` | created the plan | 플랜 생성함 | plan_created / test_plan_created |
| `milestones.planDetail.activityTab.desc.planArchived` | archived the plan | 플랜 아카이브함 | plan_archived (metadata details 용, 본 문서 Activity desc fallback) |
| `milestones.planDetail.activityTab.desc.planUnarchived` | unarchived the plan | 플랜 아카이브 해제함 | plan_unarchived |
| `milestones.planDetail.activityTab.desc.planDuplicated` | duplicated the plan | 플랜 복제함 | plan_duplicated |
| `milestones.planDetail.activityTab.desc.milestoneLinked` | linked milestone | 마일스톤 연결함 | evtType.includes('milestone') |
| `milestones.planDetail.activityTab.desc.defaultFallback` | {{type}} | {{type}} | `evtType.replace(/_/g, ' ')` 결과 주입 (원문 그대로 노출) |

> **렌더 패턴:** `<b>{actorName}</b> {desc}` — 한국어에서도 `<b>{{actorName}}</b> {desc}` 구조 유지. 조사 `이/가`, `은/는` 은 **번역 키에 포함하지 않고 생략** (Phase 1 §5-2 원칙: "조사는 명사 뒤로 뺀다"). 즉 `<b>Kyle</b> 스냅샷을 잠금` 으로 렌더.

### 14-5. Status pill (metadata.status)

소스 코드 1447줄 `displayStatus.replace(/_/g,' ')` — 데이터 value 노출. 번역 원칙상 **status value 를 별도 키로 매핑**.

| status value | EN pill 텍스트 | KO pill 텍스트 | 재사용 키 |
|-------------|---------------|---------------|---------|
| `passed` | passed | 통과 | `common.passed` (소문자 필요 시 별도 키) |
| `completed` | completed | 완료 | `common.completed` |
| `failed` | failed | 실패 | `common.failed` |
| `blocked` | blocked | 차단 | `common.blocked` |
| `active` | active | 활성 | 신규 or `common.active` |
| `in_progress` | in progress | 진행 중 | `common.started` 재사용 |
| `retest` | retest | 재테스트 | `common.retest` |

Developer 는 `t(\`milestones:planDetail.activityTab.statusPill.\${displayStatus}\`)` 형식 또는 `common.*` 직접 참조 중 선택. **권장: 공통 키 직접 참조** (`t('common:' + displayStatus)`).

---

## 15. 섹션 11 — Issues Tab (§4-2)

Phase 1 커버리지 활용. `IssuesList` 내부는 이미 완전 번역됨. Plan Detail 의 `IssuesTab` 함수는 사이드바 렌더만 하므로 **추가 키 불필요**.

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| (없음) | — | — | Phase 1 `common.issues.*` 재사용 |

---

## 16. 섹션 12 — Environments Tab (§4-2)

이미 `useTranslation('environments')` 적용 완료 (plan-detail/page.tsx line 1511). **추가 키 불필요.** Phase 1 `environments.heatmap.*` 서브트리 재사용.

**검증 대상 키 (Dev §8 재사용 확인):**
- `environments.heatmap.title` — "Environment Heatmap" / "환경 히트맵"
- `environments.heatmap.tcsByEnvs` — `{{tcs}} TCs × {{envs}} envs`
- `environments.heatmap.loadFailed` — 로딩 실패
- `environments.heatmap.empty` / `emptyLegacyOnly` / `emptyNoTcs`
- `environments.heatmap.envSummary` — "Env Summary" 요약 행
- `environments.heatmap.legacyWarning` — `{{count}}` interpolation
- `environments.heatmap.scaleLabelV2` — 범례 라벨
- `environments.heatmap.scale.untested` — untested 범례
- `environments.heatmap.drillHint` — drill 힌트

### 16-1. Cell Drill 모달 (line 1917+)

`EnvironmentCellDrillModal` 내부에 한 건 하드코딩 존재 — "TC × Environment", "No runs found for this combination.", "Run {status}", "{passed}/{executed} passed".

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `environments.drillModal.header` | TC × Environment | TC × 환경 | 신규, `environments.*` 배치 |
| `environments.drillModal.noRuns` | No runs found for this combination. | 이 조합에서 찾은 실행이 없습니다. | 신규 |
| `environments.drillModal.runStatusSuffix` | Run {{status}} | 실행 {{status}} | interpolation |
| `environments.drillModal.passedOfExecuted` | {{passed}}/{{executed}} passed | {{executed}}개 중 {{passed}}개 통과 | interpolation 2 |
| `environments.drillModal.dateFallback` | — | — | 리터럴 |

> **배치 규칙:** 이 키들은 `milestones.planDetail.*` 가 아닌 **`environments.*` 네임스페이스에 배치** (Dev §8 에지 케이스 "Environments 탭 i18n 이 Phase 2a 범위 내 추가 필요 항목 발견 시" 원칙).

---

## 17. 섹션 13 — Settings Tab / Basic Information (§4-2 `settings.basicInfo`)

> **키 위치:** `milestones.planDetail.settings.basicInfo.*`

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.settings.basicInfo.sectionTitle` | Basic Information | 기본 정보 | 섹션 헤더 |
| `milestones.planDetail.settings.basicInfo.label.planName` | Plan Name * | 플랜 이름 * | `*` 기호 유지 (필수 표기) |
| `milestones.planDetail.settings.basicInfo.label.description` | Description | 설명 | 재사용 `common.description` |
| `milestones.planDetail.settings.basicInfo.label.owner` | Owner | 담당자 | 재사용 `common.owner` (검토) |
| `milestones.planDetail.settings.basicInfo.label.priority` | Priority | 우선순위 | 재사용 `common.priority` |
| `milestones.planDetail.settings.basicInfo.label.dates` | Dates | 기간 | — |
| `milestones.planDetail.settings.basicInfo.label.linkedMilestone` | Linked Milestone | 연결된 마일스톤 | — |
| `milestones.planDetail.settings.basicInfo.label.status` | Status | 상태 | 재사용 `common.status` |
| `milestones.planDetail.settings.basicInfo.ownerUnassigned` | — Unassigned — | — 미지정 — | `—` dash 유지 |
| `milestones.planDetail.settings.basicInfo.milestoneAdhoc` | — Ad-hoc (no milestone) — | — 비공식 (마일스톤 없음) — | — |
| `milestones.planDetail.settings.basicInfo.subMilestoneSuffix` | ↳ {{name}} (sub-milestone) | ↳ {{name}} (하위 마일스톤) | interpolation. `↳` 기호 유지 |
| `milestones.planDetail.settings.basicInfo.startPlaceholder` | Start date | 시작일 | 재사용 `common.startDate` (검토) |
| `milestones.planDetail.settings.basicInfo.endPlaceholder` | End date | 종료일 | 재사용 `common.endDate` |
| `milestones.planDetail.settings.basicInfo.statusOption.planning` | Planning | 계획 | `<option value="planning">`. statusConfig 재사용 |
| `milestones.planDetail.settings.basicInfo.statusOption.active` | In Progress | 진행 중 | statusConfig.active 재사용 |
| `milestones.planDetail.settings.basicInfo.statusOption.completed` | Completed | 완료 | statusConfig.completed 재사용 |
| `milestones.planDetail.settings.basicInfo.statusOption.cancelled` | Cancelled | 취소됨 | statusConfig.cancelled 재사용 |

> **최적화 노트:** `statusOption.*` 4개는 `milestones.planDetail.statusConfig.*` 4개와 동일 값이므로 **키 재사용** 가능. Developer 판단.

---

## 18. 섹션 14 — Settings Tab / Criteria editor (§4-2 `settings.criteria`)

> **키 위치:** `milestones.planDetail.settings.criteria.*`

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.settings.criteria.entryTitle` | Entry Criteria | 진입 기준 | 섹션 헤더 (Test Cases tab 과 값은 동일, 네임스페이스만 다름). 키 재사용 권장 (`testCasesTab.criteria.entryTitle`) |
| `milestones.planDetail.settings.criteria.exitTitle` | Exit Criteria | 종료 기준 | 동일 |
| `milestones.planDetail.settings.criteria.itemsBadge` | {{count}} items | {{count}}개 항목 | interpolation |
| `milestones.planDetail.settings.criteria.entryPlaceholder` | e.g. All critical TCs passed | 예: 모든 Critical TC 통과 | `placeholder` |
| `milestones.planDetail.settings.criteria.exitPlaceholder` | e.g. Pass rate ≥ 95% | 예: 통과율 ≥ 95% | `placeholder`. `≥` 기호 유지 |
| `milestones.planDetail.settings.criteria.addCriterion` | Add criterion | 기준 추가 | — |
| `milestones.planDetail.settings.criteria.savePresetTooltip` | Save as preset | 프리셋으로 저장 | `title` attribute |
| `milestones.planDetail.settings.criteria.presetsButton` | Presets | 프리셋 | — |
| `milestones.planDetail.settings.criteria.emptyPresets` | No presets saved yet | 저장된 프리셋이 없습니다 | — |
| `milestones.planDetail.settings.criteria.allPresetsAdded` | All presets already added | 모든 프리셋이 추가되었습니다 | — |

---

## 19. 섹션 15 — Settings Tab / Save bar (§4-2 `settings.saveBar`)

> **키 위치:** `milestones.planDetail.settings.saveBar.*`

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.settings.saveBar.unsaved` | Unsaved changes | 저장되지 않은 변경사항 | — |
| `milestones.planDetail.settings.saveBar.discard` | Discard | 변경 취소 | 버튼 |
| `milestones.planDetail.settings.saveBar.save` | Save Changes | 변경사항 저장 | 버튼. **재사용 검토:** `common.save = '저장'` 은 짧아서 부적합. 신규 권장 |
| `milestones.planDetail.settings.saveBar.saving` | Saving… | 저장 중… | 로딩 상태 |

---

## 20. 섹션 16 — Settings Tab / Danger Zone (§4-2 `settings.dangerZone`) — **파괴 액션, 강조 톤 필수**

> **키 위치:** `milestones.planDetail.settings.dangerZone.*`

### 20-1. 섹션 헤더

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.settings.dangerZone.sectionTitle` | Danger Zone | 데인저 존 | `color: var(--danger-600)` 유지. 음역 결정 §3-3 |

### 20-2. Archive / Unarchive block (2-state)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.settings.dangerZone.archive.titleArchived` | Unarchive plan | 플랜 아카이브 해제 | `plan.status === 'archived'` 일 때 |
| `milestones.planDetail.settings.dangerZone.archive.titleActive` | Archive plan | 플랜 아카이브 | 기본 상태 |
| `milestones.planDetail.settings.dangerZone.archive.descArchived` | Restore the plan to Planning status so it can be edited again. | 플랜을 계획 상태로 복원하여 다시 편집할 수 있게 합니다. | — |
| `milestones.planDetail.settings.dangerZone.archive.descActive` | Plan becomes read-only. Existing run data is preserved. | 플랜이 읽기 전용이 됩니다. 기존 실행 데이터는 유지됩니다. | — |
| `milestones.planDetail.settings.dangerZone.archive.ctaUnarchive` | Unarchive | 해제 | 버튼 (짧은형) |
| `milestones.planDetail.settings.dangerZone.archive.ctaArchive` | Archive | 아카이브 | 버튼 |

### 20-3. Duplicate block

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.settings.dangerZone.duplicate.title` | Duplicate plan | 플랜 복제 | — |
| `milestones.planDetail.settings.dangerZone.duplicate.description` | Create a new plan with the same TC snapshot. | 동일한 TC 스냅샷으로 새 플랜을 생성합니다. | — |
| `milestones.planDetail.settings.dangerZone.duplicate.cta` | Duplicate | 복제하기 | 버튼 |

### 20-4. Delete block — **강조 톤 필수**

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.settings.dangerZone.delete.title` | Delete plan | 플랜 삭제 | `color: var(--danger-600)` |
| `milestones.planDetail.settings.dangerZone.delete.description` | Cannot be undone. All runs and issues will be orphaned. | 되돌릴 수 없습니다. 연결된 모든 실행과 이슈가 고아 상태가 됩니다. | 경고 톤 유지 |
| `milestones.planDetail.settings.dangerZone.delete.cta` | Delete permanently | 영구 삭제 | 버튼. `var(--danger)` 배경 |

---

## 21. 섹션 17 — SplitButton / Run 버튼 (§4-2 `runButton`)

> **키 위치:** `milestones.planDetail.runButton.*`

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.runButton.startRun` | Start Run | 실행 시작 | mode === 'start' |
| `milestones.planDetail.runButton.continueRun` | Continue Run | 실행 이어하기 | mode === 'continue', 1 in-progress |
| `milestones.planDetail.runButton.multipleInProgress` | {{count}} Runs In Progress | 진행 중 실행 {{count}}건 | interpolation. mode === 'multiple' |
| `milestones.planDetail.runButton.continueSuffix` | Continue: {{name}} | 이어하기: {{name}} | interpolation. dropdown 항목 |
| `milestones.planDetail.runButton.executedOfTotal` | {{executed}}/{{total}} executed | {{total}}개 중 {{executed}}개 실행 | interpolation 2. dropdown 항목 sub |
| `milestones.planDetail.runButton.startNewRun` | ＋ Start New Run | ＋ 새 실행 시작 | dropdown divider 아래 |

---

## 22. 섹션 18~22 — Confirm Modals (Unlock / Delete / Archive / Unarchive / Duplicate)

> **키 위치:** `milestones.planDetail.modal.*`. Dev §10-1 구조 준수.
> **강조 톤:** 모든 모달의 plan name 은 `<strong>"{{planName}}"</strong>` 마크업 유지. Developer 는 React `<Trans>` 컴포넌트 또는 `dangerouslySetInnerHTML` 중 하나 선택. **권장: `<Trans>`**.

### 22-1. §18 Unlock Snapshot Modal

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.modal.unlock.title` | Unlock Snapshot | 스냅샷 잠금 해제 | h3 |
| `milestones.planDetail.modal.unlock.body1` | Unlocking the snapshot will allow TC additions and removals. | 스냅샷 잠금을 해제하면 TC 추가 및 제거가 가능해집니다. | p 1 |
| `milestones.planDetail.modal.unlock.body2` | Existing runs will not be affected, but plan scope may shift. Are you sure you want to proceed? | 기존 실행은 영향받지 않지만 플랜 범위가 달라질 수 있습니다. 계속 진행하시겠습니까? | p 2 |
| `milestones.planDetail.modal.unlock.cancel` | Cancel | 취소 | 재사용 `common.cancel` |
| `milestones.planDetail.modal.unlock.cta` | Unlock | 잠금 해제 | `background: var(--warning)` 버튼 |

### 22-2. §19 Delete Test Plan Modal

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.modal.delete.title` | Delete Test Plan | 테스트 플랜 삭제 | h3 |
| `milestones.planDetail.modal.delete.body` | Are you sure you want to delete **"{{planName}}"**? This action cannot be undone. | **"{{planName}}"**을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다. | `<strong>` 마크업. interpolation `{{planName}}`. `을(를)` 조사 병기는 한국어 문법 관용 (planName 에 받침 유무 예측 불가) |
| `milestones.planDetail.modal.delete.cancel` | Cancel | 취소 | `common.cancel` 재사용 |
| `milestones.planDetail.modal.delete.cta` | Delete Plan | 플랜 삭제 | `background: var(--danger)` 버튼 |

### 22-3. §20 Archive Plan Modal

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.modal.archive.title` | Archive Plan | 플랜 아카이브 | h3 |
| `milestones.planDetail.modal.archive.body` | Archive **"{{planName}}"**? The plan will become read-only. Existing run data is preserved and the plan can be unarchived from the status dropdown. | **"{{planName}}"**을(를) 아카이브하시겠습니까? 플랜이 읽기 전용이 됩니다. 기존 실행 데이터는 유지되며, 상태 드롭다운에서 아카이브 해제할 수 있습니다. | `<strong>` 마크업 |
| `milestones.planDetail.modal.archive.cancel` | Cancel | 취소 | — |
| `milestones.planDetail.modal.archive.cta` | Archive | 아카이브 | `var(--warning)` 버튼 |

### 22-4. §21 Unarchive Plan Modal

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.modal.unarchive.title` | Unarchive Plan | 플랜 아카이브 해제 | h3 |
| `milestones.planDetail.modal.unarchive.body` | Restore **"{{planName}}"** to **Planning** status? The plan will become editable again. | **"{{planName}}"**을(를) **계획** 상태로 복원하시겠습니까? 플랜이 다시 편집 가능해집니다. | `<strong>` 마크업 2곳 |
| `milestones.planDetail.modal.unarchive.cancel` | Cancel | 취소 | — |
| `milestones.planDetail.modal.unarchive.cta` | Unarchive | 해제 | `var(--success-600)` 버튼 |

### 22-5. §22 Duplicate Plan Modal — plural 주의

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.modal.duplicate.title` | Duplicate Plan | 플랜 복제 | h3 |
| `milestones.planDetail.modal.duplicate.body_one` | Create a copy of **"{{planName}}"** with the same TC snapshot ({{count}} test case)? The new plan will be named **"{{planName}} (Copy)"** and you'll be redirected to it. | 동일한 TC 스냅샷(테스트 케이스 {{count}}건)으로 **"{{planName}}"**의 복사본을 만드시겠습니까? 새 플랜 이름은 **"{{planName}} (Copy)"**가 되며, 생성 후 해당 플랜으로 이동합니다. | **plural _one** |
| `milestones.planDetail.modal.duplicate.body_other` | Create a copy of **"{{planName}}"** with the same TC snapshot ({{count}} test cases)? The new plan will be named **"{{planName}} (Copy)"** and you'll be redirected to it. | 동일한 TC 스냅샷(테스트 케이스 {{count}}건)으로 **"{{planName}}"**의 복사본을 만드시겠습니까? 새 플랜 이름은 **"{{planName}} (Copy)"**가 되며, 생성 후 해당 플랜으로 이동합니다. | **plural _other**. KO 동일 |
| `milestones.planDetail.modal.duplicate.copySuffix` | (Copy) | (Copy) | **번역 금지** — DB insert 시 실제 `plan.name` 에 영문 `"(Copy)"` 가 저장되므로 본문 interpolation 과 정합성 유지. Developer 는 `handleDuplicate` 의 `copyName = \`${plan.name} (Copy)\`` 도 그대로 유지 |
| `milestones.planDetail.modal.duplicate.cancel` | Cancel | 취소 | — |
| `milestones.planDetail.modal.duplicate.cta` | Duplicate | 복제하기 | `var(--primary)` 버튼 |

> **주의 (Dev §11 리스크):** `plan.name` 에 한국어가 들어갈 수 있다 — 런타임에 `"{{planName}}"을(를)` 렌더. `을(를)` 표기는 한국어 사용자에게도 자연스럽게 수용되는 관용 표기. 이를 피하려면 i18next 조사 처리 플러그인 (후순위) 검토 — **이번 스코프는 `을(를)` 병기로 확정**.

---

## 23. 섹션 23 — Toasts (37건 전량, §4-2 `toast`) — **AC-2 핵심**

> **키 위치:** `milestones.planDetail.toast.*`. 일부는 `common.toast.*` 재사용.
> Developer 는 이 한 표를 보면서 37건 치환을 완료할 수 있도록 정리.

| # | 소스 위치 (approx) | 현재 EN | Key | EN (번역) | KO | 비고 |
|---|-------------------|---------|-----|-----------|-----|-----|
| 1 | PlanSidebar:227 | `Add test cases to this plan first` | `milestones.planDetail.toast.aiRisk.needTcs` | Add test cases to this plan first | 먼저 이 플랜에 테스트 케이스를 추가하세요 | warning |
| 2 | PlanSidebar:249 | `Starter plan required for AI Risk Predictor` | `milestones.planDetail.aiRiskPredictor.error.tierTooLow` (§10-4 재사용) | Starter plan required for AI Risk Predictor | AI 리스크 예측기는 Starter 플랜이 필요합니다 | 서버 `data.error` fallback 패턴 |
| 3 | PlanSidebar:251 | `Monthly AI credit limit reached` | `milestones.planDetail.aiRiskPredictor.error.monthlyLimit` (재사용) | Monthly AI credit limit reached | 매월 AI 크레딧 한도에 도달했습니다 | 동일 |
| 4 | PlanSidebar:253 | `Risk scan failed` (throw) | `milestones.planDetail.aiRiskPredictor.error.default` (재사용) | Risk scan failed | 리스크 스캔에 실패했습니다 | — |
| 5 | PlanSidebar:261 | `Risk scan complete (${n} credit used)` | `milestones.planDetail.toast.aiRisk.scanComplete` | Risk scan complete ({{credits}} credit used) | 리스크 스캔 완료 (크레딧 {{credits}}개 사용) | success, interpolation. `credit used` 단수 고정 (실제 소모값은 1이 일반적, 다수형 필요 시 plural 확장) |
| 6 | PlanSidebar:266 | `Risk scan failed: ${msg}` | `milestones.planDetail.toast.aiRisk.scanFailed` | Risk scan failed: {{message}} | 리스크 스캔 실패: {{message}} | error. err.message pass-through |
| 7 | Main:2842 | `Failed to save criteria state` | `milestones.planDetail.toast.criteria.saveFailed` | Failed to save criteria state | 기준 상태 저장에 실패했습니다 | error |
| 8 | Main:2849 | `Preset already exists` | `milestones.planDetail.toast.preset.exists` | Preset already exists | 프리셋이 이미 존재합니다 | info |
| 9 | Main:2850 | `Failed to save preset` | `milestones.planDetail.toast.preset.saveFailed` | Failed to save preset | 프리셋 저장에 실패했습니다 | error |
| 10 | Main:2854 | `Saved as preset` | `milestones.planDetail.toast.preset.saved` | Saved as preset | 프리셋으로 저장되었습니다 | success |
| 11 | Main:2859 | `Failed to add test case` | `milestones.planDetail.toast.tc.addFailed` | Failed to add test case | 테스트 케이스 추가에 실패했습니다 | error |
| 12 | Main:2862 | `Test case added` | `milestones.planDetail.toast.tc.added` | Test case added | 테스트 케이스가 추가되었습니다 | success |
| 13 | Main:2871 | `Failed to add test cases: ${msg}` | `milestones.planDetail.toast.tc.addMultipleFailed` | Failed to add test cases: {{message}} | 테스트 케이스 추가 실패: {{message}} | error |
| 14 | Main:2877 | `Added ${n} test case${s}` | `milestones.planDetail.toast.tc.addedMultiple_one` / `_other` | Added {{count}} test case / Added {{count}} test cases | 테스트 케이스 {{count}}건이 추가되었습니다 | success, **plural**. KO 동일 |
| 15 | Main:2881 | `Failed to add test cases` | `milestones.planDetail.toast.tc.addMultipleGeneric` | Failed to add test cases | 테스트 케이스 추가에 실패했습니다 | error catch-all |
| 16 | Main:2887 | `Failed to remove test case` | `milestones.planDetail.toast.tc.removeFailed` | Failed to remove test case | 테스트 케이스 제거에 실패했습니다 | error |
| 17 | Main:2890 | `Test case removed` | `milestones.planDetail.toast.tc.removed` | Test case removed | 테스트 케이스가 제거되었습니다 | success |
| 18 | Main:2900 | `Failed to lock snapshot` | `milestones.planDetail.toast.snapshot.lockFailed` | Failed to lock snapshot | 스냅샷 잠금에 실패했습니다 | error |
| 19 | Main:2902 | `Snapshot locked` | `milestones.planDetail.toast.snapshot.locked` | Snapshot locked | 스냅샷이 잠겼습니다 | success |
| 20 | Main:2913 | `Failed to unlock snapshot` | `milestones.planDetail.toast.snapshot.unlockFailed` | Failed to unlock snapshot | 스냅샷 잠금 해제에 실패했습니다 | error |
| 21 | Main:2915 | `Snapshot unlocked` | `milestones.planDetail.toast.snapshot.unlocked` | Snapshot unlocked | 스냅샷 잠금이 해제되었습니다 | success |
| 22 | Main:2924 | `Failed to rebase snapshot` | `milestones.planDetail.toast.snapshot.rebaseFailed` | Failed to rebase snapshot | 스냅샷 리베이스에 실패했습니다 | error |
| 23 | Main:2926 | `Snapshot rebased to latest` | `milestones.planDetail.toast.snapshot.rebased` | Snapshot rebased to latest | 스냅샷이 최신으로 리베이스되었습니다 | success |
| 24 | Main:2932 | `Failed to update plan` | `milestones.planDetail.toast.plan.updateFailed` | Failed to update plan | 플랜 업데이트에 실패했습니다 | error |
| 25 | Main:2947 | `Failed to delete plan` | `milestones.planDetail.toast.plan.deleteFailed` | Failed to delete plan | 플랜 삭제에 실패했습니다 | error |
| 26 | Main:2950 | `Plan deleted` | `milestones.planDetail.toast.plan.deleted` | Plan deleted | 플랜이 삭제되었습니다 | success |
| 27 | Main:2965 | `Failed to archive plan: ${msg}` | `milestones.planDetail.toast.plan.archiveFailed` | Failed to archive plan: {{message}} | 플랜 아카이브 실패: {{message}} | error, interpolation |
| 28 | Main:2969 | `Plan archived` | `milestones.planDetail.toast.plan.archived` | Plan archived | 플랜이 아카이브되었습니다 | success |
| 29 | Main:2979 | `Failed to unarchive plan: ${msg}` | `milestones.planDetail.toast.plan.unarchiveFailed` | Failed to unarchive plan: {{message}} | 플랜 아카이브 해제 실패: {{message}} | error |
| 30 | Main:2983 | `Plan restored to Planning` | `milestones.planDetail.toast.plan.unarchived` | Plan restored to Planning | 플랜이 계획 상태로 복원되었습니다 | success |
| 31 | Main:3009 | `Failed to duplicate plan: ${msg}` | `milestones.planDetail.toast.plan.duplicateFailed` | Failed to duplicate plan: {{message}} | 플랜 복제 실패: {{message}} | error |
| 32 | Main:3019 | `Plan created but TCs not copied: ${msg}` | `milestones.planDetail.toast.plan.tcsNotCopied` | Plan created but TCs not copied: {{message}} | 플랜은 생성되었으나 TC가 복사되지 않았습니다: {{message}} | warning |
| 33 | Main:3026 | `Plan duplicated` | `milestones.planDetail.toast.plan.duplicated` | Plan duplicated | 플랜이 복제되었습니다 | success |
| 34 | Main:3081 | `Add at least one test case before starting a run.` | `milestones.planDetail.toast.run.needTcs` | Add at least one test case before starting a run. | 실행을 시작하려면 최소 1개의 테스트 케이스를 추가하세요. | warning |
| 35 | Main:3272 | `All recommended TCs are already in this plan` | `milestones.planDetail.toast.aiOptimize.allAlreadyIn` | All recommended TCs are already in this plan | 추천된 모든 TC가 이미 이 플랜에 있습니다 | info |
| 36 | Main:3278 | `Failed to add TCs: ${msg}` | `milestones.planDetail.toast.aiOptimize.addFailed` | Failed to add TCs: {{message}} | TC 추가 실패: {{message}} | error |
| 37 | Main:3285 | `Added ${n} AI-recommended TCs to plan` | `milestones.planDetail.toast.aiOptimize.added_one` / `_other` | Added {{count}} AI-recommended TC to plan / Added {{count}} AI-recommended TCs to plan | AI 추천 TC {{count}}건이 플랜에 추가되었습니다 | success, **plural** |
| Settings:2090 (보너스) | SettingsTab | `Settings saved` | `milestones.planDetail.toast.settings.saved` | Settings saved | 설정이 저장되었습니다 | success. **재사용 검토:** Phase 1 `common.toast.saved` 존재 시 |

> **소계:** 37 + 1 보너스 = 38. 하지만 Dev Spec AC-2 에는 37건으로 명시되어 있으므로 `Settings saved` 는 **재사용** 우선. 신규 키는 36~37건 예상.

---

## 24. 섹션 24 — 에러 상태 (§4-2 `errorState`)

> **키 위치:** `milestones.planDetail.errorState.*`

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `milestones.planDetail.errorState.notFoundTitle` | Plan not found | 플랜을 찾을 수 없습니다 | `loadError === false && !plan` |
| `milestones.planDetail.errorState.loadFailedTitle` | Failed to load plan | 플랜 불러오기에 실패했습니다 | `loadError === true` |
| `milestones.planDetail.errorState.notFoundBody` | This plan does not exist or has been deleted. | 이 플랜은 존재하지 않거나 삭제되었습니다. | — |
| `milestones.planDetail.errorState.loadFailedBody` | The plan may have been deleted or you may not have access. | 플랜이 삭제되었거나 접근 권한이 없을 수 있습니다. | — |
| `milestones.planDetail.errorState.backToMilestones` | ← Back to Milestones | ← 마일스톤으로 돌아가기 | `←` 기호 유지 |
| `milestones.planDetail.errorState.retry` | Retry | 재시도 | 재사용 검토 `common.retry` |

---

## 25. 섹션 25 — 상수 리팩토링 패턴 (AC-9, AC-10)

> **Dev Spec §4-5 그대로 상속.** 본 Design Spec 은 **각 상수 라벨 값**만 확정.

### 25-1. STATUS_CONFIG (컴포넌트 내부 `useMemo`)

```tsx
const { t } = useTranslation('milestones');
const STATUS_CONFIG = useMemo(() => ({
  planning:  { label: t('planDetail.statusConfig.planning'),  badgeCls: 'badge badge-neutral' },
  active:    { label: t('planDetail.statusConfig.active'),    badgeCls: 'badge badge-warning' },
  completed: { label: t('planDetail.statusConfig.completed'), badgeCls: 'badge badge-success' },
  cancelled: { label: t('planDetail.statusConfig.cancelled'), badgeCls: 'badge badge-danger'  },
  archived:  { label: t('planDetail.statusConfig.archived'),  badgeCls: 'badge badge-neutral' }, // NEW — Dev §8 fix
}), [t]);
```

| Key | EN | KO |
|-----|----|-----|
| `planDetail.statusConfig.planning` | Planning | 계획 |
| `planDetail.statusConfig.active` | In Progress | 진행 중 |
| `planDetail.statusConfig.completed` | Completed | 완료 |
| `planDetail.statusConfig.cancelled` | Cancelled | 취소됨 |
| `planDetail.statusConfig.archived` | Archived | 아카이브됨 |

**색상 토큰 (건드리지 않음):** `badge-neutral`, `badge-warning`, `badge-success`, `badge-danger`. CSS 변수 그대로.

### 25-2. PRIORITY_CONFIG

```tsx
const PRIORITY_CONFIG = useMemo(() => ({
  critical: { label: t('planDetail.priorityLabel.critical'), priCls: 'pri-badge pri-p1' },
  high:     { label: t('planDetail.priorityLabel.high'),     priCls: 'pri-badge pri-p2' },
  medium:   { label: t('planDetail.priorityLabel.medium'),   priCls: 'pri-badge pri-p3' },
  low:      { label: t('planDetail.priorityLabel.low'),      priCls: 'pri-badge pri-p3' },
}), [t]);
```

(§7 에 값 명시)

### 25-3. TABS

```tsx
const TABS = useMemo(() => [
  { key: 'testcases',    label: t('common:testCases'),                     iconEl: <svg ... /> },
  { key: 'runs',         label: t('detail.overview.sections.runs'),        iconEl: <svg ... /> },
  { key: 'activity',     label: t('planDetail.tab.activity'),              iconEl: <svg ... /> },
  { key: 'issues',       label: t('planDetail.tab.issues'),                iconEl: <svg ... /> },
  { key: 'environments', label: t('planDetail.tab.environments'),          iconEl: <svg ... /> },
  { key: 'settings',     label: t('common:settings'),                      iconEl: <svg ... /> },
] as const, [t]);
```

`iconEl` JSX 은 변경 없이 상수로 유지. `useMemo` deps = `[t]` — 언어 변경 시만 재생성.

### 25-4. TC_PRI (TestCasesTab 내부)

컴포넌트 내부에 이미 있으므로 단순 변환:

```tsx
const TC_PRI: Record<string, { label: string; cls: string }> = {
  critical: { label: t('planDetail.priorityLabel.criticalShort'), cls: 'pri-badge pri-p1' },
  high:     { label: t('planDetail.priorityLabel.highShort'),     cls: 'pri-badge pri-p2' },
  medium:   { label: t('planDetail.priorityLabel.mediumShort'),   cls: 'pri-badge pri-p3' },
  low:      { label: t('planDetail.priorityLabel.lowShort'),      cls: 'pri-badge pri-p3' },
};
```

| Key | EN | KO |
|-----|----|-----|
| `planDetail.priorityLabel.criticalShort` | Critical | 심각 |
| `planDetail.priorityLabel.highShort` | High | 높음 |
| `planDetail.priorityLabel.mediumShort` | Medium | 보통 |
| `planDetail.priorityLabel.lowShort` | Low | 낮음 |

### 25-5. RESULT_CLS — 값은 className 만, 라벨 분리

현재 `result.charAt(0).toUpperCase() + result.slice(1)` 로 "Passed/Failed/..." 를 생성. i18n 전환 시:

```tsx
// Before
const resultLabel = result.charAt(0).toUpperCase() + result.slice(1);
// After
const resultLabel = t(`common:${result}`); // passed → "Passed" / "통과"
```

재사용 키: `common.passed / failed / blocked / retest / untested` (Phase 1 완료).

---

## 26. 섹션 26 — 날짜 포맷 헬퍼 교체 (AC-11)

> **Dev Spec §4-6 준수.** 호출 site 6곳 변경 예시.

### 26-1. 헬퍼 확장 (`src/lib/dateFormat.ts`)

```ts
export function formatShortDate(iso: string, lang?: string): string { /* 기존 */ }

export function formatShortDateTime(iso: string, lang?: string): string {
  const locale = (lang ?? i18n.language) === 'ko' ? 'ko-KR' : 'en-US';
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d);
  const timePart = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${datePart} · ${timePart}`;
}

export function formatShortTime(iso: string, lang?: string): string {
  const locale = (lang ?? i18n.language) === 'ko' ? 'ko-KR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}
```

### 26-2. 호출처 교체 표

| # | 소스 위치 | Before | After |
|---|----------|--------|-------|
| 1 | PlanSidebar:167-171 (sparkDays) | `d.toLocaleDateString('en-US', { month:'short', day:'numeric' })` | `formatShortDate(d.toISOString(), i18n.language)` |
| 2 | PlanSidebar:382 (Locked at) | `new Date(plan.snapshot_locked_at).toLocaleDateString('en-US', …) + ' · ' + new Date(...).toLocaleTimeString('en-US', …)` | `formatShortDateTime(plan.snapshot_locked_at, i18n.language)` |
| 3 | PlanSidebar:293 (AI Scanned) | inline concat | `formatShortDateTime(riskData._scanned_at, i18n.language)` (key `scannedAt` interpolation 에서 분리 주입) |
| 4 | RunsTab:1019 (bestRunLabel) | `new Date(r.created_at).toLocaleDateString('en-US', ...)` | `formatShortDate(r.created_at, i18n.language)` |
| 5 | RunsTab:1105-1106 (run card dateStr+timeStr) | inline dateStr + timeStr | `formatShortDateTime(r.created_at, i18n.language)` |
| 6 | ActivityTab:1337 (formatTime) | `new Date(ts).toLocaleTimeString('en-US', ...)` | `formatShortTime(ts, i18n.language)` |
| 7 | ActivityTab:1352-1353 (getDayLabel) | `new Date(firstLog.created_at).toLocaleDateString('en-US', ...)` | `formatShortDate(firstLog.created_at, i18n.language)` |
| 8 | Main:3134 (detail-head range start) | `new Date(plan.start_date).toLocaleDateString('en-US', ...)` | `formatShortDate(plan.start_date, i18n.language)` |
| 9 | Main:3136 (detail-head range end) | inline | `formatShortDate(plan.end_date, i18n.language)` — **주의:** 기존 코드에 end 에만 `year: 'numeric'` 포함. `formatShortDate` 시그니처 확장 또는 별도 헬퍼 `formatShortDateWithYear` 추가 필요 |
| 10 | Main:3142 (detail-head Due) | 동일 (year 포함) | 동일 |
| 11 | ActivityTab:1310 (groupByDay) | `d.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })` | **유지** (번역 대상 아님 — 내부 groupBy key 로만 사용). Day header 렌더는 §14-3 `dayHeader.today/yesterday` 로 별도 표시 |
| 12 | ActivityTab:handleExport:1290 (CSV) | `new Intl.DateTimeFormat('en-US', opts)` | **유지** — 외부 시스템 포워드. Dev §8 및 §9 Out of Scope |

> **권장:** `formatShortDate(iso, lang?, opts?: { withYear?: boolean })` 로 시그니처 확장. Dev 판단.

### 26-3. Relative time 헬퍼 교체 (AC-12)

Dev §4-6 에 따라 Phase 1 `src/lib/formatRelativeTime.ts` 의 `formatRelativeTime(iso, t)` 로 통합.

| # | 소스 위치 | Before | After |
|---|----------|--------|-------|
| 1 | RunsTab:1024-1032 (latestAgo) | inline `${mins}m ago` etc. | `formatRelativeTime(latest.created_at, t)` |
| 2 | RunsTab:1107-1114 (run-card ago) | inline | `formatRelativeTime(createdDate.toISOString(), t)` |

---

## 27. 섹션 27 — 토스트 재사용 vs 신규 분류표 (AC-2 중복 방지)

§23 의 37건을 네임스페이스별로 분류.

| 네임스페이스 | 건수 | 비고 |
|-------------|------|-----|
| `milestones.planDetail.toast.*` (신규) | ~34 | 대부분 plan-detail 특화 |
| `milestones.planDetail.aiRiskPredictor.error.*` (§10-4) | 3 | 재사용 (# 2, 3, 4) |
| `common.toast.saved` (Phase 1 재사용) | 1 | `Settings saved` — Phase 1 존재 시 |
| `common.toast.networkError` (Phase 1 재사용) | 0 | Plan Detail 에 직접 등장 없음 |

---

## 28. 섹션 28 — 인터랙션 & 반응형 & 다크모드 (상속 및 변경 없음)

### 28-1. 인터랙션

**키보드·클릭 동작 변경 없음.** Phase 2a 는 순수 텍스트 교체. 아래는 기존 동작을 **번역 후에도 유지**해야 함을 확인하는 체크.

| 인터랙션 | 변경 여부 |
|---------|---------|
| 탭 클릭 → `setActiveTab(tab.key)` | 유지. `tab.key` 는 데이터 키 (`testcases` 등), 번역 아님 |
| Danger Zone 버튼 클릭 → 모달 open | 유지 |
| 모달 배경 클릭 → 닫힘 (Archive/Unarchive/Duplicate) | 유지 |
| 모달 `ESC` 키 → 닫힘 | **현 코드 미구현** — Phase 2a 범위 밖 (§9 Out of Scope) |
| Snapshot lock strip `↻` 버튼 tooltip | 유지 (title 값만 번역) |
| TC Picker checkbox 다중 선택 | 유지 |
| Settings saveBar Discard → `setDirty(false)` | 유지. 확인 다이얼로그 없음 (변경 없음) |
| Sonner toast 4 types (success/error/warning/info) | 유지 |

### 28-2. 반응형 브레이크포인트

레이아웃 변경 없음. 참고용:

| Breakpoint | 동작 |
|-----------|-----|
| `< 768px` (mobile) | `EnvironmentsTab` 이 `gridTemplateColumns: '1fr'` — 사이드바 아래로. 다른 탭은 기존 `.plan-layout` / `.activity-layout` CSS 준수. 한국어 번역 후에도 overflow 없음 (§1-1 검증) |
| `768~1024px` (tablet) | 기존 유지. 3-col `.runs-strip` 정상. `.detail-tabs` 가로 스크롤 가능 |
| `> 1024px` (desktop) | 전체 레이아웃 활성 |

### 28-3. 다크모드 매핑

**변경 없음.** 현 소스는 CSS 변수 (`var(--text)`, `var(--bg-subtle)`, `var(--primary)`, `var(--danger)` 등) 를 사용하므로 다크모드 토큰이 이미 정의되어 있다. 번역은 텍스트만 바꾸며, 색상은 Light/Dark 모두 동일 토큰 적용.

| 요소 | Light | Dark |
|------|-------|------|
| Danger Zone 배경 | `#fef2f2` | `--danger-50-dark` (기존 토큰) |
| DELETE 버튼 | `var(--danger)` | 동일 변수 |
| LOCKED 뱃지 | `#ede9fe` / `var(--violet)` | `--violet-50-dark` / `--violet` |
| 모달 배경 | `rgba(15,23,42,0.5)` | 동일 |
| 기타 토큰 | 현 UI_GUIDE 정의 | 현 UI_GUIDE 정의 |

> Phase 2a 는 색상 토큰에 손대지 않는다.

### 28-4. 기존 컴포넌트 재사용 목록

Plan Detail 은 자식 컴포넌트가 없는 단일 파일이므로 "기존 컴포넌트 재사용" 은 **번역 키 재사용**으로 치환된다.

| 재사용 카테고리 | 대상 | 출처 |
|--------------|------|-----|
| 공통 action | `Cancel`, `Save`, `Delete`, `Edit`, `Close`, `Export`, `Retry` | `common.*` |
| Test status | `Passed`, `Failed`, `Blocked`, `Retest`, `Untested` | `common.*` |
| 공통 label | `Priority`, `Status`, `Owner`, `Name`, `Description`, `Assignee`, `Start date`, `End date` | `common.*` |
| Issues 탭 전체 | IssuesList 내부 | `common.issues.*` (Phase 1) |
| Environments 탭 전체 | EnvironmentsTab 내부 + drill 모달 (§16-1 일부 신규) | `environments.*` |
| AI Risk error fallback | `tierTooLow`, `monthlyLimit`, `default` | `milestones.planDetail.aiRiskPredictor.error.*` (본 Spec §10-4) |
| 상대 시간 | `{{n}}m ago` / `{{n}}h ago` / `{{n}}d ago` | `common.time.*` (Phase 1) via `formatRelativeTime(iso, t)` |
| 날짜 | `Apr 21` / `4월 21일` | `formatShortDate(iso, lang)` |
| 뱃지 색상 토큰 | `badge-neutral / badge-warning / badge-success / badge-danger / badge-violet` | 기존 CSS |
| Modal scaffold | fixed + `rgba(0,0,0,0.5)` + rounded 12px | 기존 (5개 모달 동일 scaffold) |

---

## 29. 섹션 29 — 최종 키 배치 & 번들 트리

> **원칙 (Dev Spec §7):** 기존 `src/i18n/local/en/milestones.ts` / `ko/milestones.ts` 파일에 `planDetail.*` 서브트리 신규 추가. 기존 `detail.*` 서브트리 훼손 금지.

### 29-1. milestones.ts 에 추가될 서브트리 (EN 기준)

```ts
// src/i18n/local/en/milestones.ts (기존 export default { ... } 안에 병합)
{
  // ... 기존 키 유지 (detail, aiRisk, riskSignal, rollupBadge, issues, ...)
  planDetail: {
    shell: {
      breadcrumb: { milestones: 'Milestones', plans: 'Plans' },
      detailHead: {
        inheritedFrom: 'Inherited from <1>{{name}}</1>',
        due: 'Due {{date}}',
        dateRange: '{{start}} – {{end}}',
        dateRangeFallback: '?',
        aiOptimize: 'AI Optimize',
      },
      stats: {
        executedOfTotal: '{{executed}}/{{total}} executed · <1>{{pct}}%</1>',
        passRate: 'Pass Rate <1>{{pct}}%</1>',
      },
    },
    statusConfig: {
      planning: 'Planning', active: 'In Progress', completed: 'Completed',
      cancelled: 'Cancelled', archived: 'Archived',
    },
    priorityLabel: {
      critical: 'P1 Critical', high: 'P2 High', medium: 'P3 Medium', low: 'P3 Low',
      criticalShort: 'Critical', highShort: 'High', mediumShort: 'Medium', lowShort: 'Low',
      p1Short: 'P1', p2Short: 'P2', p3Short: 'P3',
    },
    tab: {
      activity: 'Activity', issues: 'Issues', environments: 'Environments',
      // testCases, runs, settings → common / milestones.detail 재사용
    },
    testCasesTab: {
      lockStrip: {
        titleB: 'Snapshot locked',
        body: ' — TC scope is fixed. New TC changes in the library won\'t affect this plan.',
        rebase: '↻ Rebase',
        unlock: 'Unlock',
      },
      criteria: {
        entryTitle: 'Entry Criteria',
        exitTitle: 'Exit Criteria',
        metSuffix: '{{met}} / {{total}} met',
        emptyEntry: 'No entry criteria defined.',
        emptyExit: 'No exit criteria defined.',
        autoBadge: 'Auto',
        autoTooltip: 'Auto-evaluated',
        autoEvalTooltip: 'Auto-evaluated based on test results',
        clickToggleTooltip: 'Click to toggle',
      },
      filter: {
        searchPlaceholder: 'Search in plan…',
        allPriority: 'All Priority',
        lockSnapshot: 'Lock Snapshot',
        addTcs: 'Add TCs',
      },
      table: {
        folder: 'Folder',
        emptySearch: 'No test cases match your search.',
        emptyInitial: 'No test cases added yet. Click "Add TCs" to start.',
      },
      pagination: {
        showing: 'Showing {{shown}} of {{total}}',
        previous: 'Previous', next: 'Next',
      },
    },
    tcPicker: {
      title: 'Add Test Cases',
      filter: {
        searchPlaceholder: 'Search test cases...',
        allFolders: 'All Folders', noFolder: 'No Folder',
        includeDraft: 'Include Draft TCs',
        draftHidden: '{{count}} hidden',
      },
      summary_one: '{{count}} test case available',
      summary_other: '{{count}} test cases available',
      table: {
        statusDraft: 'Draft', statusActive: 'Active',
        emptySearch: 'No test cases match your search.',
        emptyAll: 'All test cases already added.',
      },
      footer: {
        selected: '<1>{{count}}</1> selected',
        addTcs_one: 'Add {{count}} TC',
        addTcs_other: 'Add {{count}} TCs',
        addTcsZero: 'Add TCs',
      },
    },
    runsTab: {
      strip: {
        totalRuns: 'Total Runs',
        bestPassRate: 'Best Pass Rate',
        latest: 'Latest',
        envsCovered: 'Envs Covered',
        newRun: 'New Run',
        sub: { planLinked: 'plan-linked', noRuns: 'no runs yet', noEnvData: 'no env data' },
        bestRunLabel: '{{name}} ({{date}})',
      },
      runCard: {
        runNumber: 'Run #{{n}}',
        dateTime: '{{date}}, {{time}}',
        ago: '· {{ago}}',
        executedOfTotal: '{{executed}} of {{total}} executed',
        untestedSuffix: ' · {{count}} untested',
        passSuffix: '{{count}} pass',
        failSuffix: ' · {{count}} fail',
        blockSuffix: ' · {{count}} block',
        view: 'View',
        unassigned: 'Unassigned',
        moreSuffix: '+{{count}} more',
      },
      newRunCta: 'Start a new Run with these {{count}} TCs',
      newRunCtaHint: '· opens New Run modal with Plan pre-selected',
      empty: 'No runs linked to this plan yet.',
    },
    activityTab: {
      filter: { all: 'All', results: 'Results', runs: 'Runs', tc: 'TC Edits', ai: 'AI', status: 'Status' },
      dateRange: { last7d: 'Last 7d', last14d: 'Last 14d', last30d: 'Last 30d', allTime: 'All time' },
      export: 'Export',
      empty: 'No activity recorded yet.',
      dayHeader: {
        today: 'Today · {{date}}',
        yesterday: 'Yesterday · {{date}}',
        events: '{{count}} events',
      },
      systemActor: 'System',
      desc: {
        recorded: 'recorded',
        runStatusChanged: 'changed run status',
        tcAdded: 'added test cases to the plan',
        tcRemoved: 'removed a test case from the plan',
        snapshotLocked: 'locked the snapshot',
        snapshotUnlocked: 'unlocked the snapshot',
        snapshotRebased: 'rebased snapshot to latest',
        statusChanged: 'changed plan status',
        criteriaUpdated: 'updated entry/exit criteria',
        planUpdated: 'updated plan settings',
        planDeleted: 'deleted the plan',
        planCreated: 'created the plan',
        planArchived: 'archived the plan',
        planUnarchived: 'unarchived the plan',
        planDuplicated: 'duplicated the plan',
        milestoneLinked: 'linked milestone',
        defaultFallback: '{{type}}',
      },
    },
    settings: {
      basicInfo: {
        sectionTitle: 'Basic Information',
        label: {
          planName: 'Plan Name *', dates: 'Dates', linkedMilestone: 'Linked Milestone',
        },
        ownerUnassigned: '— Unassigned —',
        milestoneAdhoc: '— Ad-hoc (no milestone) —',
        subMilestoneSuffix: '↳ {{name}} (sub-milestone)',
      },
      criteria: {
        itemsBadge: '{{count}} items',
        entryPlaceholder: 'e.g. All critical TCs passed',
        exitPlaceholder: 'e.g. Pass rate ≥ 95%',
        addCriterion: 'Add criterion',
        savePresetTooltip: 'Save as preset',
        presetsButton: 'Presets',
        emptyPresets: 'No presets saved yet',
        allPresetsAdded: 'All presets already added',
      },
      saveBar: {
        unsaved: 'Unsaved changes',
        discard: 'Discard',
        save: 'Save Changes',
        saving: 'Saving…',
      },
      dangerZone: {
        sectionTitle: 'Danger Zone',
        archive: {
          titleArchived: 'Unarchive plan',
          titleActive: 'Archive plan',
          descArchived: 'Restore the plan to Planning status so it can be edited again.',
          descActive: 'Plan becomes read-only. Existing run data is preserved.',
          ctaUnarchive: 'Unarchive',
          ctaArchive: 'Archive',
        },
        duplicate: {
          title: 'Duplicate plan',
          description: 'Create a new plan with the same TC snapshot.',
          cta: 'Duplicate',
        },
        delete: {
          title: 'Delete plan',
          description: 'Cannot be undone. All runs and issues will be orphaned.',
          cta: 'Delete permanently',
        },
      },
    },
    aiRiskPredictor: {
      title: 'AI Risk Predictor',
      subtitle: 'Failure risk diagnostic',
      scannedAt: 'Scanned {{date}} · {{time}}',
      forecastCompletion: 'Forecast Completion',
      confidence: 'Confidence',
      topRiskSignals: 'Top Risk Signals',
      recommendation: 'Recommendation',
      rescan: 'Re-scan',
      scanning: 'Scanning...',
      runScan: 'Run Risk Scan',
      empty: {
        description: 'Run an AI-powered risk analysis to get failure predictions, risk signals, and actionable recommendations.',
        cost: 'Costs 1 AI credit · Requires Starter plan',
      },
      error: {
        tierTooLow: 'Starter plan required for AI Risk Predictor',
        monthlyLimit: 'Monthly AI credit limit reached',
        default: 'Risk scan failed',
      },
    },
    snapshot: {
      title: 'Snapshot',
      badge: { locked: 'LOCKED', unlocked: 'Unlocked' },
      lockedAt: 'Locked at',
      lockedBy: 'Locked by',
      tcRevision: 'TC revision',
      driftFromLive: 'Drift from live',
      tcEdited_one: '{{count}} TC edited',
      tcEdited_other: '{{count}} TC edited',
      upToDate: 'Up to date',
      driftTooltip: 'TCs modified after snapshot was locked',
      rebaseTooltip: { noDrift: 'No drift detected', updateBaseline: 'Update baseline to latest TC revisions' },
      rebase: '↻ Rebase', unlock: 'Unlock',
      emptyDescription: 'Lock the TC scope to prevent drift. Required before starting a tracked run.',
      lockCta: 'Lock Snapshot',
      emptyAddTcs: 'Add TCs to enable locking.',
    },
    executionPace: {
      title: 'Execution Pace',
      avgTcPerDay: 'Avg TC/day',
      remaining: 'Remaining',
      tcCount: '{{count}} TC',
      daysEstSuffix: '~{{days}}d',
    },
    runButton: {
      startRun: 'Start Run',
      continueRun: 'Continue Run',
      multipleInProgress: '{{count}} Runs In Progress',
      continueSuffix: 'Continue: {{name}}',
      executedOfTotal: '{{executed}}/{{total}} executed',
      startNewRun: '＋ Start New Run',
    },
    modal: {
      unlock: {
        title: 'Unlock Snapshot',
        body1: 'Unlocking the snapshot will allow TC additions and removals.',
        body2: 'Existing runs will not be affected, but plan scope may shift. Are you sure you want to proceed?',
        cta: 'Unlock',
      },
      delete: {
        title: 'Delete Test Plan',
        body: 'Are you sure you want to delete <1>"{{planName}}"</1>? This action cannot be undone.',
        cta: 'Delete Plan',
      },
      archive: {
        title: 'Archive Plan',
        body: 'Archive <1>"{{planName}}"</1>? The plan will become read-only. Existing run data is preserved and the plan can be unarchived from the status dropdown.',
        cta: 'Archive',
      },
      unarchive: {
        title: 'Unarchive Plan',
        body: 'Restore <1>"{{planName}}"</1> to <3>Planning</3> status? The plan will become editable again.',
        cta: 'Unarchive',
      },
      duplicate: {
        title: 'Duplicate Plan',
        body_one: 'Create a copy of <1>"{{planName}}"</1> with the same TC snapshot ({{count}} test case)? The new plan will be named <3>"{{planName}} (Copy)"</3> and you\'ll be redirected to it.',
        body_other: 'Create a copy of <1>"{{planName}}"</1> with the same TC snapshot ({{count}} test cases)? The new plan will be named <3>"{{planName}} (Copy)"</3> and you\'ll be redirected to it.',
        cta: 'Duplicate',
      },
    },
    toast: {
      aiRisk: {
        needTcs: 'Add test cases to this plan first',
        scanComplete: 'Risk scan complete ({{credits}} credit used)',
        scanFailed: 'Risk scan failed: {{message}}',
      },
      criteria: { saveFailed: 'Failed to save criteria state' },
      preset: {
        exists: 'Preset already exists',
        saveFailed: 'Failed to save preset',
        saved: 'Saved as preset',
      },
      tc: {
        addFailed: 'Failed to add test case',
        added: 'Test case added',
        addMultipleFailed: 'Failed to add test cases: {{message}}',
        addMultipleGeneric: 'Failed to add test cases',
        addedMultiple_one: 'Added {{count}} test case',
        addedMultiple_other: 'Added {{count}} test cases',
        removeFailed: 'Failed to remove test case',
        removed: 'Test case removed',
      },
      snapshot: {
        lockFailed: 'Failed to lock snapshot',
        locked: 'Snapshot locked',
        unlockFailed: 'Failed to unlock snapshot',
        unlocked: 'Snapshot unlocked',
        rebaseFailed: 'Failed to rebase snapshot',
        rebased: 'Snapshot rebased to latest',
      },
      plan: {
        updateFailed: 'Failed to update plan',
        deleteFailed: 'Failed to delete plan',
        deleted: 'Plan deleted',
        archiveFailed: 'Failed to archive plan: {{message}}',
        archived: 'Plan archived',
        unarchiveFailed: 'Failed to unarchive plan: {{message}}',
        unarchived: 'Plan restored to Planning',
        duplicateFailed: 'Failed to duplicate plan: {{message}}',
        tcsNotCopied: 'Plan created but TCs not copied: {{message}}',
        duplicated: 'Plan duplicated',
      },
      run: { needTcs: 'Add at least one test case before starting a run.' },
      aiOptimize: {
        allAlreadyIn: 'All recommended TCs are already in this plan',
        addFailed: 'Failed to add TCs: {{message}}',
        added_one: 'Added {{count}} AI-recommended TC to plan',
        added_other: 'Added {{count}} AI-recommended TCs to plan',
      },
      settings: { saved: 'Settings saved' },
    },
    errorState: {
      notFoundTitle: 'Plan not found',
      loadFailedTitle: 'Failed to load plan',
      notFoundBody: 'This plan does not exist or has been deleted.',
      loadFailedBody: 'The plan may have been deleted or you may not have access.',
      backToMilestones: '← Back to Milestones',
      retry: 'Retry',
    },
  },
}
```

### 29-2. ko 대응 트리

위 구조 그대로 한국어 문자열 매핑. §5~§27 표의 KO 컬럼을 그대로 붙여넣으면 된다.

### 29-3. environments.ts 추가 분 (§16 drill 모달)

```ts
// src/i18n/local/en/environments.ts — 기존에 추가
{
  // ... 기존 heatmap 등 유지
  drillModal: {
    header: 'TC × Environment',
    noRuns: 'No runs found for this combination.',
    runStatusSuffix: 'Run {{status}}',
    passedOfExecuted: '{{passed}}/{{executed}} passed',
  },
}
```

### 29-4. .i18nignore 수정

Dev §7 준수:

```diff
- src/pages/plan-detail/page.tsx
```

---

## 30. 자체 Quality Gate 체크리스트

- [x] 모든 상태가 정의되었는가 (정상 / 빈 상태 / 로딩 / 에러 / 제한 도달) — §4 매핑 표
- [x] Tailwind / CSS 변수 / className 이 구체적으로 명시되었는가 — 레이아웃 무변경이므로 기존 클래스 유지, §28-3 에 토큰 재명시
- [x] 다크모드 색상 매핑이 있는가 — §28-3
- [x] 기존 컴포넌트 재사용 목록이 있는가 — §28-4
- [x] 인터랙션 (클릭, 호버, 키보드) 이 정의되었는가 — §28-1
- [x] 반응형 브레이크포인트별 변경점이 있는가 — §28-2
- [x] 토스트 메시지가 en/ko 모두 있는가 — §23 37건 표
- [x] Dev Spec 의 수용 기준과 일치하는가 — AC-1 ~ AC-15 모두 커버 (§25 상수, §26 날짜, §29 배치, §23 토스트)
- [x] Phase 1 용어·톤 상속 표기 — §2, §3-1, §3-2, §3-3 명시
- [x] Dev Spec 22 섹션과 1:1 매칭 — §5 ~ §24 매핑
- [x] STATUS_CONFIG.archived 누락 보강 — §6, §25-1
- [x] Interpolation 예시 (`{{planName}}`, `{{count}}`) — §22 모달 전체
- [x] AC-9 AI 비번역 원칙 재확인 — §10-5
- [x] 키 정렬 & 번들 배치 — §29-1 ~ §29-4

---

## 31. 후속 작업 (본 Design Spec 머지 후)

1. **@developer 착수** — Dev Spec §4-7 흐름대로 구현. 본 Design Spec 의 표를 **옆에 띄워놓고** 치환.
2. **`scan:i18n:parity` 통과 확인** → `.i18nignore` 에서 plan-detail 라인 제거.
3. **한국어 원어민 리뷰 (Danger Zone + 모달 문구)** — Dev §11 리스크 "한국어 번역 톤 약화" 대응. Designer + @marketer 또는 CEO 1회 패스.
4. **Playwright E2E (선택)** — `e2e/i18n-plan-detail.spec.ts` 신규. Dev §9 Out of Scope 로 지정되었으나 권장.
5. **Phase 2b 착수 준비** — run-detail/page.tsx (5,245줄). Phase 2a 머지 후 순차 진행.
