# Design Spec: i18n 커버리지 Phase 2b — run-detail/page.tsx 번역 카피

> **작성일:** 2026-04-21
> **작성자:** @designer
> **상태:** Draft → Review → Approved
> **관련 개발지시서:** `docs/specs/dev-spec-i18n-coverage-phase2-run-detail.md` (Phase 2b Dev Spec — 키 구조 확정)
> **상속:**
> - `docs/specs/design-spec-i18n-coverage.md` (Phase 1)
>   - §2 톤앤매너
>   - §3 고유명사 / 도메인 용어 고정 번역
>   - §4-1 상대시간 (`common.time.*` / `formatRelativeTime`)
>   - §4-2 절대날짜 (`formatShortDate`)
>   - §5 Plural / Interpolation 규칙
>   - §6 AC-9 AI 비번역 원칙
> **병행 스펙:** `design-spec-i18n-coverage-phase2-plan-detail.md` (Phase 2a) — 본 스펙과 파일/네임스페이스 중복 없음
> **Figma:** N/A — 레이아웃 무변경, 카피만 교체

---

## 0. 이 문서를 읽는 법

본 문서는 신규 디자인이 아닙니다. Dev Spec §10 에서 구조만 확정된 **20개 서브트리 × 약 292개 leaf 키**의 실제 EN/KO 카피를 Developer 가 **그대로 복사하여 `src/i18n/local/{en,ko}/runs.ts` · `common.ts` 에 붙여넣을 수 있는 치팅시트**입니다.

**Developer 워크플로우:**
1. §2 **상속 원칙** 을 훑어 Phase 1 규칙이 그대로 유효한지 확인
2. §3 **재사용 맵** 으로 신규 키를 만들기 전 반드시 `common.*` / `runs.aiSummary.*` 를 먼저 탐색
3. §5 **번들 트리 배치 도식** 을 열어 어느 키가 어느 파일의 어느 계층으로 들어가는지 확인
4. §6 ~ §11 **섹션별 매핑 표** — Dev Spec §4-2 의 30개 섹션과 1:1 매칭
5. §12 **showToast 29건** — `runs.toast.*` 전부
6. §13 **한국어 하드코딩 → EN 회귀** — AC-11 전용 표
7. §14 **단축키 / 영문 고정 문자열** (AC-12), §15 **PDF / Jira / GitHub payload 비번역** (AC-9), §16 **날짜·시간·숫자·타이머**
8. §17 **집계** — en/ko 각 카운트 검증

---

## 1. 레이아웃

**레이아웃 변경 없음.** 본 Phase 2b Dev Spec(§1)과 동일하게 **순수 텍스트 교체 리팩토링**이며, DOM 구조·여백·폰트·color token·반응형 중단점은 무변경. KO 텍스트가 5,245줄 중 가장 혼잡한 `Add Result Modal` 및 `Create Jira Issue Modal` 에서도 **EN 대비 평균 30~50% 단축**되므로 모달 폭(max-w-2xl / max-w-lg) 오버플로 리스크 없음.

### 1-1. 텍스트 길이 체크포인트 (Phase 2b 신규 문자열만)

| 위치 | EN 기준 | KO 예상 | 변동 | 완화 |
|------|--------|---------|-----|-----|
| Header pill `In Progress` | 11 char | `진행 중` 3 char | 단축 | OK |
| Header pill `Under Review` | 12 char | `검토 중` 3 char | 단축 | OK |
| KPI `Total Tests` | 11 char | `전체 테스트` 5 char | 단축 | OK |
| Progress legend `{n} Untested` | 11 char | `미수행 {n}` 6 char | 단축 | OK |
| Progress bar title `Passed: {n}` | 10 char | `통과: {n}` 6 char | 단축 | OK |
| Bulk toolbar `{count} items selected` | 18 char | `{count}개 선택됨` 7 char | 단축 | OK |
| SS banner `New version available for {n} Shared Steps` | 45 char | `공유 스텝 {n}개에 새 버전이 있습니다` 19 char | 단축 | OK |
| SS banner `({n} TC affected, {m} untested can be updated)` | 44 char | `(TC {n}건 영향, 미수행 {m}건 업데이트 가능)` 26 char | 단축 | OK |
| Deprecated banner 전체 문구 | 108 char | 40 char | 단축 | OK |
| Add Result 모달 `Add result` 버튼 | 10 char | `결과 추가` 5 char | 단축 | OK |
| Assignee hint `Leave empty to keep current assignment.` | 39 char | `비워두면 현재 담당자가 유지됩니다.` 17 char | 단축 | OK |
| Issue hint `Enter a Jira issue key and press Enter (e.g., PROJ-123)` | 52 char | `Jira 이슈 키를 입력하고 Enter 키를 누르세요 (예: PROJ-123)` 34 char | 비슷 | OK (기존 한국어보다 살짝 김, 2줄 wrap 허용) |
| Upgrade Modal title `Starter plan required` | 21 char | `Starter 플랜이 필요합니다` 15 char | 단축 | OK |
| Jira Setup title `Jira integration required` | 24 char | `Jira 연동이 필요합니다` 14 char | 단축 | OK |
| TC Diff header `Comparing v{a}.{b} → v{c}.{d}` | ~30 char | `버전 비교: v{a}.{b} → v{c}.{d}` ~28 char | 비슷 | OK |
| TC Diff update btn `Update to v{c}.{d}` | ~18 char | `v{c}.{d}로 업데이트` ~14 char | 단축 | OK |
| Attachments `drag/paste here` | 15 char | `드래그 또는 붙여넣기` 10 char | 단축 | OK |
| ResultDetailModal `Test Result Details` | 19 char | `테스트 결과 상세` 8 char | 단축 | OK |
| Toast `Shared Step '{name}' updated to v{v}` | ~35 char + name | `공유 스텝 '{name}' v{v}로 업데이트됨` ~30 char + name | 비슷 | OK (sonner 자동 wrap) |

> **결론:** Phase 1과 동일하게 한국어가 EN 대비 일관되게 짧음. 유일한 주의 포인트는 issue hint 한 줄 — `text-xs` 가 모달 폭(max-w-2xl ≈ 672px) 안에서 한 줄로 렌더되며 개행 필요 시 현재 CSS 가 자연 wrap 허용.

---

## 2. Phase 1 상속 원칙 (재선언)

본 스펙은 Phase 1 design-spec의 다음 항목을 **무수정 계승**합니다. Developer 는 `design-spec-i18n-coverage.md` 의 해당 섹션을 기준 문서로 참고하세요.

| Phase 1 섹션 | 제목 | 상속 여부 | 본 스펙 적용 포인트 |
|------|------|-----------|-------------------|
| §2-1 ~ §2-4 | KO/EN 톤앤매너 · 종결 컨벤션 · 지양/선호 표현 | **100% 상속** | Run-detail 모든 카피에 동일 적용 |
| §3-1 | 브랜드명 (Testably / Jira / GitHub / Claude / Supabase / Slack / Paddle 등) | **100% 상속** | `Jira Issue` / `GitHub Issue` / `Slack` / `Paddle` 은 그대로 노출 |
| §3-2 | 도메인 용어 고정 번역 표 | **100% 상속 + 확장** | 본 스펙 §3-1 에서 Run-detail 특화 용어(Shared Step / Result / Evidence / Annotation / Focus Mode / Jira Key) 추가 |
| §3-3 | "Run" 혼용 주의 (기존 `sections.runs='런'` 유지) | **100% 상속** | 본 스펙에서 "Run" 은 **`실행`** (run 도메인 네이티브), "Test Run" 은 기본 이름이라 `실행` 사용 |
| §4-1 | 상대시간 헬퍼 `formatRelativeTime(iso, t)` + `common.time.*` | **재사용만, 신규 키 없음** | run-detail 에 상대시간 호출 부재 (Dev Spec §4-4-2 확인) |
| §4-2 | 절대날짜 `formatShortDate(iso)` | **재사용 + 확장** | `formatLongDateTime(iso, language)` 신규 헬퍼 (Dev Spec §7) — ResultDetailModal 전용 |
| §4-3 | 퍼센트 / 숫자 / 소수점 | **100% 상속** | `{percent}%` / `{count}` 그대로 |
| §4-4 | 단위 (TCs / runs / days / sec) | **100% 상속** | 본 스펙 §8-2 에 run-detail 특화 단위 추가 |
| §5-1 | Plural `_one` / `_other` | **100% 상속** | 본 스펙 §8-1 plural 표 |
| §5-2 | Interpolation `{{name}}` camelCase | **100% 상속** | 본 스펙 내 모든 변수 camelCase |
| §6 | AI 비번역 원칙 (AC-9) | **100% 상속 (AC-9 재확인)** | 본 스펙 §15 에서 run-detail 특화 외부 송출(Jira payload / GitHub body / PDF HTML) 재확인 |

### 2-1. 이번 파일 범위에서 Phase 1 과 **다른 점**

| 항목 | Phase 1 | Phase 2b |
|------|---------|---------|
| 대상 파일 | 20개 컴포넌트 분산 | 1개 파일 내부 + 서브 컴포넌트 `ResultDetailModal` (동일 파일) |
| 네임스페이스 | `common.*` + `milestones.*` + `runs.aiSummary.*` (신규) | `runs.detail.*` (신규) + `runs.toast.*` (신규) + `common.*` 재사용 우선 |
| 한국어 하드코딩 | 거의 없음 | **~22건 존재** (AC-11 전수 회귀 대상) |
| 외부 송출 문자열 | AIRunSummaryPanel 내부 AI 본문만 | PDF export HTML 블록 + Jira/GitHub REST payload body 추가 포함 |
| 단축키 힌트 | X | `Cmd+Shift+F`, `Enter` 키 (AC-12 문구 분리) |

---

## 3. 고유명사 / 도메인 용어 (Phase 1 §3 연장)

### 3-1. Run-detail 특화 용어 — 고정 번역

Phase 1 §3-2 표를 그대로 유지하면서, 본 파일에서 처음 등장하는 용어를 추가합니다.

| EN | KO 확정 번역 | 대체 후보 (NG) | 사용 위치 (본 파일) |
|----|-------------|---------------|-------------------|
| **Run** (명사, page context) | `실행` | ~~런~~ (Phase 1 §3-3 에서 `sections.runs` 만 '런' 유지) | Header "Back to Runs", "Test Run" fallback, Focus Mode run 이름 |
| **Result** (test result) | `결과` 또는 `테스트 결과` | ~~리절트~~ | Add Result, Result Detail, "Add a test result first..." |
| **Shared Step / SS** | `공유 스텝` | ~~공유 단계~~, ~~공유 스텝스~~ | SS version banner, Add Result steps 헤더, TC Diff |
| **Step** (개별 실행 단계) | `스텝` | ~~단계~~ (기존 테스트케이스 번들과 일관성) | Add Result "Steps" 라벨, Step Results |
| **Step Results** | `스텝 결과` | ~~단계별 결과~~ | ResultDetailModal |
| **Focus Mode** | `Focus Mode` (고유명사 유지) | ~~집중 모드~~, ~~포커스 모드~~ | Header action button (AC-12 키 이름만 번역) |
| **Export** | `내보내기` | ~~익스포트~~ | Header action (Export PDF / CSV / Excel) |
| **Evidence / Attachment** | `첨부` / `첨부 파일` | ~~증거~~, ~~에비던스~~ | Add Result Attachments, Result Detail |
| **Annotation / Note** | `메모` | ~~주석~~, ~~어노테이션~~ | Add Result Note, Result Detail Note |
| **Bug report** | `버그 리포트` (음역) | ~~버그 보고서~~ | — (실제 UI 라벨은 `Create Jira Issue` / `Create GitHub Issue`) |
| **Issue** (Jira/GitHub) | `이슈` | `common.issues.*` 재사용 | Add Issue Modal, Linked Issues |
| **Issue key** (Jira) | `이슈 키` | ~~이슈 식별자~~ | Issue placeholder/hint |
| **Summary** (Jira 필드) | `요약` (기존 `aiSummary.*` 와 맥락 구분) | ~~서머리~~ | Add Jira Issue Modal |
| **Description** (Jira/GitHub) | `설명` | — | Add Jira/GitHub Issue Modal |
| **Issue Type** | `이슈 유형` | ~~이슈 타입~~ | Add Jira Issue Modal |
| **Components** (Jira) | `컴포넌트` (Jira 용어 그대로 음역, Atlassian 공식) | ~~구성요소~~ | Add Jira Issue Modal |
| **Priority** (Jira) — Highest/Lowest | `최고` / `최저` (기존 `common.issues.priority.*` 와 중복 주의) | ~~최상~~, ~~최하~~ | Add Jira Issue Modal (Jira 전용이므로 **`runs.detail.jiraIssue.priority.option.*` 별도 키** — `common.issues.priority.*` 에는 Highest/Lowest 가 없음) |
| **Assignee** (Jira/GitHub) | `담당자` | ~~어사이니~~ | 전역 (기존 `common.assignee` 재사용 — 라벨만) |
| **Unassigned** | `담당자 없음` | ~~미할당~~, ~~무할당~~ | Assignee dropdown, bulk toolbar (`common.issues.assignee.unassigned` 재사용 — 값이 이미 `'Unassigned'` / `'미할당'`. **Phase 2b 에서는 기존 값 재사용하되, Dropdown 맥락이므로 `— Unassigned —` 기호 래핑 전용 신규 키 `runs.detail.tcList.assigneeDropdown.unassigned` 유지**) |
| **Related Test Case** | `관련 테스트 케이스` | ~~연관 테스트~~ | Add Jira/GitHub Issue Modal |
| **Test Case / TC** | `테스트 케이스` / `TC` | (Phase 1 재사용) | 전역 |
| **Starter / Hobby / Professional** (플랜 이름) | 번역 금지 — 원어 유지 (Phase 1 §3-1 브랜드명에 준함) | ~~스타터~~ 등 | Upgrade Modal, Upgrade Nudge |
| **Automated** (Run badge) | `자동화` | ~~자동~~ | Header run pill |
| **Deprecated** (TC lifecycle) | `폐기됨` | ~~사용 중단~~ | Deprecated TC banner |
| **Locked** (version locked) | `잠김` | ~~락됨~~ | TC/SS version badge tooltip |
| **Drafts / Draft** (TC version) | `초안` | ~~드래프트~~ | TC version badge ⚠ 표시 (본 파일에선 아이콘만 노출 → 번역 불필요) |
| **Paused / In Progress / Under Review / Completed** (Run 상태 5종) | `일시중지` / `진행 중` / `검토 중` / `완료` | ~~Paused~~ 그대로 X | Header pill |
| **New** (Run 상태 "New" pill) | `신규` (Phase 1 `common.new` 존재 시 재사용) | ~~뉴~~ | Header pill fallback |
| **CI/CD** | `CI/CD` (약어 유지, 번역 금지) | — | ResultDetailModal 뱃지 |
| **Unknown** (작성자 fallback) | `알 수 없음` | ~~언노운~~ | ResultDetailModal 작성자명 |
| **Choose files** | `파일 선택` | ~~파일 고르기~~ | Attachments |
| **screenshot** (소문자, 버튼 라벨) | `스크린샷` | ~~화면 캡처~~ | Attachments |

### 3-2. 재사용 우선 — `common.*` 이미 존재 여부 매트릭스

Dev Spec §4-3 의 "재사용 우선 원칙" 을 만족시키기 위한 실측 표. 작업 전 Developer 는 이 표로 **신규 키 vs 재사용** 을 즉시 판별할 수 있어야 합니다.

| 용도 | 기존 키 존재? | 값 (en/ko) | 본 스펙 처리 |
|------|-------------|------------|-------------|
| Pass/Fail/Blocked/Retest/Untested | ✅ `common.passed` / `common.failed` / `common.blocked` / `common.retest` / `common.untested` | `Passed` / `통과`, `Failed` / `실패`, `Blocked` / `차단`, `Retest` / `재테스트`, `Untested` / `미수행` | **재사용 필수 (AC-7, AC-8)** — 신규 `common.status.*` 생성 금지 |
| Cancel | ✅ `common.cancel` | `Cancel` / `취소` | 재사용 |
| Close | ✅ `common.close` | `Close` / `닫기` | 재사용 |
| Save | ✅ `common.save` | `Save` / `저장` | 재사용 |
| Create | ✅ `common.create` | `Create` / `생성` | 재사용 |
| Edit | ✅ `common.edit` | `Edit` / `수정` | 재사용 |
| Delete | ✅ `common.delete` | `Delete` / `삭제` | 재사용 |
| Loading… | ✅ `common.loading` | `Loading...` / `로딩 중...` | 재사용 (단 Dev Spec §3-2 Phase 1 `common.loading='Loading...'` 값 그대로. KO 값이 현재 `로딩 중...` 인 점은 Phase 1 톤 가이드 §2-4 `로딩중...` 지양 원칙과 모순 — **본 스펙에서 건드리지 않음**, 별도 followup 티켓) |
| Confirm | ✅ `common.confirm` | `Confirm` / `확인` | 재사용 |
| All (필터) | ❌ `common.all` 부재 | — | **신규: `runs.detail.tcList.filter.allStatus`, `.allPriority` 분리 키로 처리** (맥락별 별도 카피 가능성) |
| Status | ✅ `common.status` | `Status` / `상태` | 재사용 |
| Priority | ✅ `common.priority` | `Priority` / `우선순위` | 재사용 |
| Assignee | ✅ `common.assignee` | `Assignee` / `담당자` | 재사용 |
| High/Medium/Low | ✅ `common.high|medium|low` | | Add Result priority, Add Jira Issue Modal priority 의 Medium/Low 부분만 재사용 가능. **Highest/Lowest 는 부재 → 신규** (`runs.detail.jiraIssue.priority.option.*`) |
| Critical | ❌ `common.critical` 부재, 대신 `common.issues.priority.critical` 존재 | `Critical` / `심각` | 필터 select 용도는 `common.issues.priority.critical` 재사용 (맥락 유사) |
| Back | ❌ `common.back` 부재 (단 `common.backToRuns` 용도로 전용 키 사용 권장) | — | 신규: `runs.detail.page.backToRuns` |
| Apply | ❌ `common.apply` 부재 | — | 신규: `runs.detail.tcList.bulk.apply` (bulk toolbar 전용, 다른 페이지 Apply 와 문맥 다를 수 있으므로 분리) |
| Update | ❌ `common.update` 부재 | — | 신규: `runs.detail.addResult.steps.updateButton` 및 `runs.detail.ssBanner.updateAll`, `runs.detail.tcDiff.footer.update` (각 맥락 카피 다름 → 분리) |
| Unknown | ❌ `common.unknown` 부재 | — | 신규: `runs.detail.resultDetail.unknownAuthor` |
| Time (relative) | ✅ `common.time.*` | Phase 1 | **본 파일에서는 호출처 없음** (Dev Spec §4-4-2) |
| Issues/Priority/Status | ✅ `common.issues.*` 전체 | Phase 1 | `common.issues.priority.critical|high|medium|low|none` 만 재사용 (TC list filter select 용) |

### 3-3. 신규 `common.*` 보강 요청

Dev Spec §10 마지막 블록의 "필요 시 보강" 항목 중, 실제 **본 파일에서 필요한 누락분** 만 추린 최소 세트:

| 신규 키 | EN | KO | 근거 |
|--------|----|----|-----|
| `common.unknownError` | `Unknown error` | `알 수 없는 오류` | showToast `error.message || 'Unknown error'` fallback 표준화. Dev Spec §4-4-5 참조 |

> **참고:** `common.status.passed|failed|blocked|retest|untested` **는 신규로 만들지 않습니다**. 기존 `common.passed|failed|blocked|retest|untested` 플랫 키 그대로 재사용 (AC-7). Dev Spec §10 마지막 블록의 `common.status.*` 는 "있으면 재사용, 없으면 보강" 표현이었으므로, **이미 플랫 키가 있는 현 상태에서는 보강 불필요**.

---

## 4. 상속 규칙 적용 포인트

### 4-1. 날짜·시간 (Phase 1 §4 상속)

Dev Spec §4-4-2 에 명시된 2개의 날짜 렌더 포인트:

| 위치 | 라인 | 기존 코드 | 교체 방식 |
|------|-----|----------|---------|
| Run header `Started ${...}` | 2954 | `new Date(run.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })` | `formatShortDate(iso)` 헬퍼 호출 + `t('runs:detail.page.startedPrefix', { date })` interpolation. EN `Started {{date}}` / KO `시작 {{date}}`. 렌더 예: EN `Started Apr 21`, KO `시작 4월 21일` |
| ResultDetailModal 작성자 timestamp | 4846~4852 | `result.timestamp.toLocaleString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })` | **신규 헬퍼 `formatLongDateTime(iso, language)`** (Dev Spec §7 에서 `src/lib/dateFormat.ts` 에 추가) 호출. `i18n.language === 'ko' ? 'ko-KR' : 'en-US'` 로 로케일 분기. 헬퍼 반환값을 **그대로** `<div>{formatLongDateTime(result.timestamp.toISOString(), i18n.language)}</div>` 로 노출 (번역 키 포장 없음 — 날짜 자체) |

렌더 예:
- `en`: `April 21, 2026, 02:15 PM`
- `ko`: `2026년 4월 21일, 오후 2:15`

### 4-2. 상대시간

Run-detail 본체에는 **상대시간 노출이 없음** (활동 피드·Last synced 는 `AIRunSummaryPanel` / `IssuesList` 로 이관됨). `common.time.*` 재사용·신규 추가 불필요. **Designer 원칙:** Developer 가 새로 `relativeTime(...)` 같은 인라인 헬퍼를 추가하는 것을 **금지**하고, 필요 시 Phase 1 `formatRelativeTime(iso, t)` 만 사용.

### 4-3. 숫자 / 퍼센트 / 타이머

- `{Math.round(...)}%` → 번역 불필요. 문자열 앞뒤 조립 시 `t()` 결과를 **interpolation** 로만 넣기 (§6 참조)
- 타이머 `00:00` → Dev Spec §4-5 `.i18nignore` 예외. **번역 키 생성 금지**
- Elapsed Time 숫자는 `resultFormData.elapsed` 값 그대로 표시 (서버 저장 값이 사용자 입력). 라벨만 번역

### 4-4. Plural (Phase 1 §5-1 연장)

본 파일에서 plural 적용 키 목록 (§8-1 상세표):

| 키 (base) | 근거 interpolation |
|----------|------------------|
| `runs.detail.page.testCasesCount` | `{{count}}` TC 개수 |
| `runs.detail.tcList.bulk.selected` | `{{count}}` selected item |
| `runs.detail.ssBanner.headline` | `{{count}}` Shared Steps |
| `runs.detail.ssBanner.tcAffected` | `{{count}}` TC |
| `runs.detail.ssBanner.untestedUpdatable` | `{{count}}` untested |
| `runs.detail.deprecatedBanner.countSentence` | `{{count}}` deprecated TCs |
| `runs.detail.resultDetail.attachmentsLabel` | `{{count}}` attachments |

한국어는 Phase 1과 동일하게 `_one` / `_other` 값을 동일하게 두되 **양쪽 모두 선언** (i18next parity 요구).

---

## 5. 번들 트리 배치 도식

Dev Spec §4-3 네임스페이스 배치와 동일. 실제 `src/i18n/local/en/runs.ts` 의 최종 트리는 아래 구조:

```
runs (existing root)
├── title / createRun / editRun / ... (Phase 0 기존, 건드리지 않음)
│
├── aiSummary.*  ← Phase 1에서 완료. 본 스펙에서 건드리지 않음 (AC-6)
│
├── detail                                     ← [NEW Phase 2b 서브트리 A]
│   ├── page                                   (§6 Page header)
│   ├── runStatus                              (§6 Run status pills)
│   ├── headerActions                          (§6 Export/AI/Focus 버튼)
│   ├── kpi                                    (§6 KPI card Total Tests only)
│   ├── progress                               (§6 Execution Progress card)
│   ├── folderSidebar                          (§7 Folder sidebar)
│   ├── tcList                                 (§7 TC list filter/header/row/empty/bulk)
│   │   ├── filter.*
│   │   ├── header.*
│   │   ├── empty.*
│   │   ├── assigneeDropdown.*
│   │   ├── bulk.*
│   │   └── versionBadge.*
│   ├── ssBanner                               (§7 Shared Step update banner)
│   ├── deprecatedBanner                       (§7 Deprecated TC info banner)
│   ├── addResult                              (§8 Add Result Modal — 가장 큰 서브트리)
│   │   ├── status.*
│   │   ├── note.*
│   │   ├── steps.*
│   │   ├── elapsed.*
│   │   ├── assignee.*
│   │   ├── issues.*
│   │   ├── attachments.*
│   │   └── footer.*
│   ├── jiraIssue                              (§9 Create Jira Issue Modal)
│   │   ├── summary.* / description.* / issueType.* / priority.* / labels.* / assignee.* / components.*
│   │   └── footer.*
│   ├── githubIssue                            (§9 Create GitHub Issue Modal)
│   ├── tcDiff                                 (§10 TC Version Diff Modal)
│   ├── upgradeModal                           (§10 Starter upgrade modal)
│   ├── upgradeNudge                           (§10 Free tier AI nudge)
│   ├── jiraSetup                              (§10 Jira setup required modal)
│   ├── resultDetail                           (§11 ResultDetailModal subcomponent)
│   ├── imagePreview                           (§11 Image preview modal)
│   └── fatalError                             (§11 throw new Error UI fallback)
│
└── toast                                      ← [NEW Phase 2b 서브트리 B — §12]
    └── (29건, flat 키)
```

KO 파일(`ko/runs.ts`)도 동일 구조로 미러링.

---

## 6. 섹션별 번역 매핑 — 상단 레이아웃 (§4-2 섹션 1~5)

> **표 포맷:** `Key (full path)` / `EN` / `KO` / `비고` (재사용=re-use, interp=interpolation, plural). **PR-A 범위 (섹션 1~15) 에 속함.**

### 6-1. `runs.detail.page.*` — Page header (Dev Spec §4-2 섹션 1)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.page.backToRuns` | `Back to Runs` | `실행 목록으로` | line 2926 |
| `runs.detail.page.startedPrefix` | `Started {{date}}` | `시작 {{date}}` | line 2954. `{{date}}` = `formatShortDate(iso)`. interp |
| `runs.detail.page.percentCompletedSuffix` | `{{percent}}% completed` | `{{percent}}% 완료` | line 2955. interp |
| `runs.detail.page.testCasesCount_one` | `{{count}} test case` | `테스트 케이스 {{count}}건` | line 2956. plural |
| `runs.detail.page.testCasesCount_other` | `{{count}} test cases` | `테스트 케이스 {{count}}건` | line 2956. plural |
| `runs.detail.page.automatedBadge` | `Automated` | `자동화` | line 2949 |
| `runs.detail.page.runNameFallback` | `Test Run` | `테스트 실행` | line 2800, 3601 Focus/Export prop fallback |

> **구현 주의:** `Started … · {n}% completed · {n} test cases` 는 3개 조각이 `&&` 로 조건부 렌더링됨. 각 조각을 **독립 번역 키** 로 유지하고, JSX 에서 `· ` 구분자는 **JSX 가 그대로 들고 있는다** (조사·관사 주입 없음, EN/KO 공통 중점 표기). Phase 1 design-spec §5-2 "관사/조사 주입은 i18next 가 처리 못 함" 원칙.

### 6-2. `runs.detail.runStatus.*` — Run 상태 5 pill (Dev Spec §4-2 섹션 30, 라인 2933~2945)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.runStatus.completed` | `Completed` | `완료` | 기존 `common.completed='Completed'/'완료'` 가 이미 존재 — **재사용 권장** (`t('common:completed')`) ✅ re-use |
| `runs.detail.runStatus.inProgress` | `In Progress` | `진행 중` | 기존 `common.started='In Progress'/'진행 중'` 존재. 다만 키 이름이 의미 불일치(`started`→`inProgress`) — **신규 `runs.detail.runStatus.inProgress` 권장** (또는 `common.inProgress='In progress'` 재사용. 하지만 소문자 p 로 다름 ⚠). 안전하게 **신규** |
| `runs.detail.runStatus.underReview` | `Under Review` | `검토 중` | 신규 |
| `runs.detail.runStatus.paused` | `Paused` | `일시중지` | 신규 |
| `runs.detail.runStatus.draft` | `New` | `신규` | 기존 `common.new='New'/'신규'` 재사용 가능 ✅ re-use. 혼동 주의: Run 의 "New" 상태는 서버 enum 상 실제로는 `'draft'` (DB). UI 라벨만 "New". 키 이름은 `draft` 유지 (서버 값 매칭)되 값은 `New/신규` |

> **Developer 판단:** 키 가독성과 AC-6(Phase 1 파괴 금지)을 모두 만족시키려면 **`runs.detail.runStatus.*` 5개를 모두 신규 키로 두고, `t()` 호출 전에 Phase 1 `common.*` 에 동일한 값이 있는지 eslint 검사** 로 중복 방지. 본 스펙은 **신규 5건 전부 선언** 을 권장.

### 6-3. `runs.detail.headerActions.*` — Export / AI Summary / Focus (Dev Spec §4-2 섹션 2)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.headerActions.export` | `Export` | `내보내기` | line 2969 |
| `runs.detail.headerActions.exportTooltip` | `Export PDF / CSV / Excel` | `PDF / CSV / Excel로 내보내기` | line 2966 `title=` |
| `runs.detail.headerActions.aiSummary` | `AI Summary` | `AI 요약` | line 2980, 3000. (`aiSummary.title='AI Run Summary'` 는 패널 내부 전용. 버튼 라벨은 축약형 — 별도 키) |
| `runs.detail.headerActions.aiSummaryFreshCheck` | `✓` | `✓` | line 2982 (문자 그대로, 번역 불필요 but 주석으로 의도 표기) |
| `runs.detail.headerActions.aiSummaryStaleWarn` | `⚠️` | `⚠️` | line 2985 (문자 그대로) |
| `runs.detail.headerActions.aiSummaryNewBadge` | `NEW` | `NEW` | line 2989 (브랜드·강조 톤 고정, **번역 금지**. `.i18nignore` 확장 없이 `t()` 호출 값으로 `'NEW'` 그대로) |
| `runs.detail.headerActions.aiSummaryLockedBadge` | `HOBBY` | `HOBBY` | line 3002 (플랜명, **번역 금지** — Phase 1 §3-1 브랜드·플랜명 규칙) |
| `runs.detail.headerActions.focusMode` | `Focus Mode` | `Focus Mode` | line 3013. Phase 2b §3-1 표 — **고유명사 유지** (집중 모드 번역 금지). AC-12 |
| `runs.detail.headerActions.focusModeTooltip` | `Focus Mode (Cmd+Shift+F)` | `Focus Mode (Cmd+Shift+F)` | line 3010. AC-12: 단축키 기호 고정, 문장만 번역. 이 케이스는 문장이 "Focus Mode" 뿐이라 EN/KO 동일 |

### 6-4. `runs.detail.kpi.*` — KPI 5 카드 (Dev Spec §4-2 섹션 3, 라인 3021~3037)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.kpi.totalTests` | `Total Tests` | `전체 테스트` | line 3022. 기존 `runs.totalTests='Total Tests'/'전체 테스트'` 존재 — **재사용 ✅ re-use** (`t('runs:totalTests')`) |
| `Passed` | `Passed` | `통과` | line 3023. **`common.passed` 재사용 ✅** (AC-7, AC-8) |
| `Failed` | `Failed` | `실패` | line 3024. **`common.failed` 재사용 ✅** |
| `Blocked` | `Blocked` | `차단` | line 3025. **`common.blocked` 재사용 ✅** |
| `Untested` | `Untested` | `미수행` | line 3026. **`common.untested` 재사용 ✅** |

> **AC-8 검증:** KPI 라벨(5개) + Progress legend 라벨(5개) + Add Result status 버튼 라벨(5개) + Filter select option(5개) + Step Results select option(4개) — **5 군데 모두 `common.passed|failed|blocked|retest|untested` 재사용**. 신규 키 생성 금지.

### 6-5. `runs.detail.progress.*` — Execution Progress card (Dev Spec §4-2 섹션 4)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.progress.title` | `Execution Progress` | `실행 진행률` | line 3058 |
| `runs.detail.progress.tooltipCount` | `{{label}}: {{count}}` | `{{label}}: {{count}}` | lines 3068, 3075, 3082, 3089, 3096. **동일 키 + interp 2개**. 호출부: `` `${t('common:passed')}: ${passed}` `` 로 사용하거나, 헬퍼 `t('runs:detail.progress.tooltipCount', { label: t('common:passed'), count: passed })`. **두 방식 모두 AC-7 호환 (공용 status 재사용)**. 권장: 후자(헬퍼 패턴) |

> **Progress legend (line 3101~3107)** — legend 5종의 "label" 값은 전부 `common.passed|failed|blocked|retest|untested` 재사용. 숫자(`<strong>{count}</strong>`)는 번역 무관.

---

## 7. 섹션별 번역 매핑 — TC 목록 영역 (§4-2 섹션 6~15)

> **PR-A 범위 (섹션 1~15).** Dev Spec §4-2 "TC 목록 검색/필터 바 · Bulk toolbar · SS version banner · Deprecated banner · TC 목록 테이블 헤더/Row/Empty · Folder sidebar" 포함.

### 7-1. `runs.detail.tcList.filter.*` — 검색/필터 바 (Dev Spec §4-2 섹션 6)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.tcList.filter.searchPlaceholder` | `Search test cases...` | `테스트 케이스 검색...` | line 3217 |
| `runs.detail.tcList.filter.allStatus` | `All Status` | `전체 상태` | line 3228 |
| `runs.detail.tcList.filter.allPriority` | `All Priority` | `전체 우선순위` | line 3240 |
| `Passed` option (3229) | — | — | **`common.passed` 재사용** ✅ |
| `Failed` option (3230) | — | — | **`common.failed` 재사용** ✅ |
| `Blocked` option (3231) | — | — | **`common.blocked` 재사용** ✅ |
| `Retest` option (3232) | — | — | **`common.retest` 재사용** ✅ |
| `Untested` option (3233) | — | — | **`common.untested` 재사용** ✅ |
| `Critical` option (3241) | — | — | **`common.issues.priority.critical` 재사용** ✅ |
| `High` option (3242) | — | — | **`common.high` 재사용** ✅ |
| `Medium` option (3243) | — | — | **`common.medium` 재사용** ✅ |
| `Low` option (3244) | — | — | **`common.low` 재사용** ✅ |

### 7-2. `runs.detail.tcList.bulk.*` — Bulk Action Toolbar (Dev Spec §4-2 섹션 7)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.tcList.bulk.selected_one` | `{{count}} item selected` | `{{count}}개 선택됨` | line 3256. plural (수식어 제거 + 조사 생략으로 자연스러움). interp |
| `runs.detail.tcList.bulk.selected_other` | `{{count}} items selected` | `{{count}}개 선택됨` | line 3256. plural |
| `runs.detail.tcList.bulk.assignToLabel` | `Assign to:` | `담당자 지정:` | line 3259 |
| `runs.detail.tcList.bulk.unassigned` | `Unassigned` | `담당자 없음` | line 3265 `<option value="">`. 기존 `common.issues.assignee.unassigned='Unassigned'/'미할당'` 존재 — 맥락 모호 회피 위해 **본 스펙 신규 키 권장** (`common.issues.*` 는 Issues 탭 맥락). 단 Developer 가 동일 문자열 재사용 허용 시 `common.issues.assignee.unassigned` 사용 가능 ✅ re-use (양쪽 모두 OK) |
| `runs.detail.tcList.bulk.apply` | `Apply` | `적용` | line 3276 |
| `runs.detail.tcList.bulk.clearSelection` | `Clear selection` | `선택 해제` | line 3282 |

### 7-3. `runs.detail.ssBanner.*` — Shared Step Version Update Banner (Dev Spec §4-2 섹션 8)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.ssBanner.headline_one` | `New version available for {{count}} Shared Step` | `공유 스텝 {{count}}개에 새 버전이 있습니다` | line 3297. plural, interp |
| `runs.detail.ssBanner.headline_other` | `New version available for {{count}} Shared Steps` | `공유 스텝 {{count}}개에 새 버전이 있습니다` | line 3297. plural |
| `runs.detail.ssBanner.tcAffected_one` | `{{count}} TC affected` | `TC {{count}}건 영향` | line 3298. plural (앞에 `(` 괄호는 JSX 그대로) |
| `runs.detail.ssBanner.tcAffected_other` | `{{count}} TCs affected` | `TC {{count}}건 영향` | line 3298. plural |
| `runs.detail.ssBanner.untestedUpdatable_one` | `, {{count}} untested can be updated` | `, 미수행 {{count}}건 업데이트 가능` | line 3298. plural (앞 쉼표 포함) |
| `runs.detail.ssBanner.untestedUpdatable_other` | `, {{count}} untested can be updated` | `, 미수행 {{count}}건 업데이트 가능` | line 3298. plural |
| `runs.detail.ssBanner.updateAll` | `Update all` | `모두 업데이트` | line 3305 |
| `runs.detail.ssBanner.dismiss` | `Dismiss` | `닫기` | line 3312. 기존 `common.close='Close'/'닫기'` 와 한국어 값 중복 — 맥락 혼동 없음. **신규 키 권장** (EN 이 "Dismiss" 로 동의어 차이) |

> **주의:** `(N TC affected, M untested can be updated)` 전체 괄호 + 쉼표 조립은 JSX 에서 이뤄짐. i18next 의 `Trans` 컴포넌트로 묶지 않고, `${'('}${t('tcAffected', {count:n})}${m>0 ? t('untestedUpdatable', {count:m}) : ''}${')'}` 패턴. §5-2 Phase 1 원칙.

### 7-4. `runs.detail.deprecatedBanner.*` — Deprecated TC Banner (Dev Spec §4-2 섹션 9)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.deprecatedBanner.title` | `Some TCs in this run have been deprecated.` | `이 실행의 일부 TC가 폐기되었습니다.` | line 3323 `<strong>` 내부. bold 는 JSX `<strong>` 가 감쌈 — 번역 문자열에는 포함하지 않음 |
| `runs.detail.deprecatedBanner.countSentence_one` | `{{count}} test case was deprecated after this run was created. Existing results are preserved. These TCs won't appear in new runs.` | `이 실행이 생성된 이후 테스트 케이스 {{count}}건이 폐기되었습니다. 기존 결과는 유지되며, 이 TC들은 새 실행에 나타나지 않습니다.` | line 3324~3325. plural, interp |
| `runs.detail.deprecatedBanner.countSentence_other` | `{{count}} test cases were deprecated after this run was created. Existing results are preserved. These TCs won't appear in new runs.` | `이 실행이 생성된 이후 테스트 케이스 {{count}}건이 폐기되었습니다. 기존 결과는 유지되며, 이 TC들은 새 실행에 나타나지 않습니다.` | line 3324~3325. plural |

### 7-5. `runs.detail.tcList.header.*` — TC 목록 테이블 헤더 6종 (Dev Spec §4-2 섹션 10)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.tcList.header.idVer` | `ID / Ver` | `ID / 버전` | line 3340 |
| `runs.detail.tcList.header.testCase` | `Test Case` | `테스트 케이스` | line 3343 |
| `runs.detail.tcList.header.priority` | `Priority` | `우선순위` | line 3346. 기존 `common.priority` 재사용 가능 ✅ re-use |
| `runs.detail.tcList.header.folder` | `Folder` | `폴더` | line 3349 |
| `runs.detail.tcList.header.assignee` | `Assignee` | `담당자` | line 3352. 기존 `common.assignee` 재사용 가능 ✅ re-use |
| `runs.detail.tcList.header.status` | `Status` | `상태` | line 3355. 기존 `common.status` 재사용 가능 ✅ re-use |

> **권장:** header 6종 중 Priority / Assignee / Status **3종은 `common.*` 재사용**, 나머지 3종(IDver / Test Case / Folder)만 신규. 실제 번들 배치 시 6종 키를 모두 `runs.detail.tcList.header.*` 아래 두고 값만 `common.*` 과 동일하게 복사하는 방식도 허용 — 단 Phase 1 "동문자열 중복 최소화" 원칙에 따라 **재사용 우선** 권장.

### 7-6. `runs.detail.tcList.versionBadge.*` — TC Version 뱃지 툴팁 (Dev Spec §4-2 섹션 11)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.tcList.versionBadge.tcUpdatedClickable` | `TC updated to v{{major}}.{{minor}} — click to review changes` | `TC가 v{{major}}.{{minor}}로 업데이트됨 — 클릭하여 변경 사항 검토` | line 3412. interp 2개 |
| `runs.detail.tcList.versionBadge.locked` | `Locked: test result recorded` | `잠김: 테스트 결과 기록됨` | line 3412, 3440, 3886, 3899. **4군데 모두 동일 키 재사용** |
| `runs.detail.tcList.versionBadge.ssUpdateAvailable` | `Shared step update available (v{{version}})` | `공유 스텝 업데이트 가능 (v{{version}})` | line 3440. interp |

### 7-7. `runs.detail.tcList.empty.*` — TC 목록 Empty (Dev Spec §4-2 섹션 12, AC-11 한국어 회귀)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.tcList.empty.title` | `No test cases` | `테스트 케이스가 없습니다` | line 3364. **현재 한국어 하드코딩** `'테스트 케이스가 없습니다'` → EN 로케일 회귀 대상 (AC-11) |
| `runs.detail.tcList.empty.hint` | `This run does not include any test cases.` | `이 실행에 테스트 케이스가 포함되어 있지 않습니다.` | line 3365. **현재 한국어 하드코딩** `'이 Run에 테스트 케이스가 포함되어 있지 않습니다.'` — §3-1 도메인 규칙에 따라 `Run` → `실행` 통일 (AC-11) |

### 7-8. `runs.detail.tcList.assigneeDropdown.*` — Row Assignee dropdown (Dev Spec §4-2 섹션 13)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.tcList.assigneeDropdown.unassigned` | `— Unassigned —` | `— 담당자 없음 —` | line 3507. 양쪽 긴 대시 포함 — 기호는 번역 공통 |
| `runs.detail.tcList.assigneeDropdown.emDashOnly` | `—` | `—` | line 3464, 3493. 기호만. 번역 불필요 but scan false-positive 회피 위해 `.i18nignore` 에 `>—<` 추가 |

### 7-9. `runs.detail.folderSidebar.*` — Folder 사이드바 (Dev Spec §4-2 섹션 14, AC-11 포함)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.folderSidebar.title` | `Folders` | `폴더` | line 2836 |
| `runs.detail.folderSidebar.allCases` | `All Cases` | `전체 케이스` | line 2855 (`title=`), 2860 (body) — **2곳 동일 키** |
| `runs.detail.folderSidebar.collapseTooltip` | `Collapse` | `접기` | line 2841. **현재 한국어 하드코딩** `'접기'` → EN 회귀 (AC-11) |
| `runs.detail.folderSidebar.expandTooltip` | `Expand` | `펼치기` | line 2841. **현재 한국어 하드코딩** `'펼치기'` → EN 회귀 (AC-11) |
| `runs.detail.folderSidebar.empty` | `No folders` | `폴더 없음` | line 2912. **현재 한국어 하드코딩** `'폴더 없음'` → EN 회귀 (AC-11) |

### 7-10. DetailPanel / ExportModal / Focus Mode prop fallback (Dev Spec §4-2 섹션 15, 16, 29)

이 섹션들은 **자식 컴포넌트에 prop으로 넘기는 fallback 문자열만** 교체. 자식 자체는 공유 컴포넌트라 Phase 3 에서 처리.

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.page.runNameFallback` | `Test Run` | `테스트 실행` | line 2800 (FocusMode), 3601 (ExportModal prop). **두 곳 동일 키 재사용** (§6-1 에 이미 정의) |

---

## 8. 섹션별 번역 매핑 — Add Result Modal (Dev Spec §4-2 섹션 19)

> **PR-B 범위 (섹션 16~22).** 가장 큰 서브트리 — **약 80개 leaf 키**. 라인 3703~4266.

### 8-1. `runs.detail.addResult.*` 헤더 + Status

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.addResult.title` | `Add result` | `결과 추가` | line 3708 |
| `runs.detail.addResult.status.label` | `Status` | `상태` | line 3722. `common.status` 재사용 가능 ✅ re-use |
| `runs.detail.addResult.status.required` | `*` | `*` | line 3722 (적색 asterisk). 기호 — 번역 무관, JSX에 그대로. 별도 키 불필요 |

Status 5 버튼 (line 3725~3730 `label` 배열):
- `Passed` → **`common.passed` 재사용 ✅** (AC-7)
- `Failed` → **`common.failed` 재사용 ✅**
- `Blocked` → **`common.blocked` 재사용 ✅**
- `Retest` → **`common.retest` 재사용 ✅**
- `Untested` → **`common.untested` 재사용 ✅**

### 8-2. `runs.detail.addResult.note.*` — Note 에디터 (line 3749~3790)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.addResult.note.label` | `Note` | `메모` | line 3751 |
| `runs.detail.addResult.note.toolbar.paragraph` | `Paragraph` | `문단` | line 3755 aria-label (현재 없음 — 추가 권장). 선택 사항: 툴바 아이콘 버튼에 `title=` 속성 없으면 스킵 |
| `runs.detail.addResult.note.toolbar.bold` | `Bold` | `굵게` | line 3758 aria-label (추가 권장) |
| `runs.detail.addResult.note.toolbar.italic` | `Italic` | `기울임` | line 3761 |
| `runs.detail.addResult.note.toolbar.underline` | `Underline` | `밑줄` | line 3764 |
| `runs.detail.addResult.note.toolbar.strikethrough` | `Strikethrough` | `취소선` | line 3767 |
| `runs.detail.addResult.note.toolbar.code` | `Code` | `코드` | line 3770 |
| `runs.detail.addResult.note.toolbar.link` | `Link` | `링크` | line 3774 |
| `runs.detail.addResult.note.toolbar.bulletList` | `Bulleted list` | `글머리 기호 목록` | line 3777 |
| `runs.detail.addResult.note.toolbar.orderedList` | `Numbered list` | `번호 매기기 목록` | line 3780 |

> **실무 선택:** 현재 코드에는 툴바 버튼에 `title=` / `aria-label=` 이 **없음**. 접근성 향상 차원에서 aria-label 추가를 **권장하나, 스코프 초과 시 스킵 가능**. 스킵 시 `runs.detail.addResult.note.toolbar.*` 9개 키 제외 — §17 집계 조정.

### 8-3. `runs.detail.addResult.steps.*` — Steps 섹션 (line 3793~4009)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.addResult.steps.label` | `Steps` | `스텝` | line 3811, 3962 (2곳). §3-1 도메인 `Step` → `스텝` |
| `runs.detail.addResult.steps.sharedBadge` | `Shared` | `공유` | line 3891 (uppercase CSS 로 "SHARED" 렌더). 번역값 소문자. |
| `runs.detail.addResult.steps.sharedUpdateBadgeTitle` | `New version: v{{version}}` | `새 버전: v{{version}}` | line 3886 title. interp |
| `runs.detail.addResult.steps.sharedLockedTitle` | `Locked: test result recorded` | `잠김: 테스트 결과 기록됨` | line 3886. **`runs.detail.tcList.versionBadge.locked` 재사용 ✅** re-use |
| `runs.detail.addResult.steps.diffBannerPrefix` | `v{{from}} → v{{to}} Changes` | `v{{from}} → v{{to}} 변경 사항` | line 3896 |
| `runs.detail.addResult.steps.updateButton` | `Update` | `업데이트` | line 3898 |
| `runs.detail.addResult.steps.lockedBanner` | `Locked to preserve test results` | `테스트 결과 보존을 위해 잠김` | line 3899 |
| `runs.detail.addResult.steps.diffCurrent` | `Current (v{{version}})` | `현재 (v{{version}})` | line 3904. interp |
| `runs.detail.addResult.steps.diffLatest` | `Latest (v{{version}})` | `최신 (v{{version}})` | line 3913. interp |
| `runs.detail.addResult.steps.diffUnavailable` | `Version history unavailable` | `버전 이력을 사용할 수 없습니다` | line 3908 |
| `runs.detail.addResult.steps.diffLoading` | `Loading...` | `로딩 중...` | line 3909. **`common.loading` 재사용 가능** ✅ re-use |

Step select options (line 3852~3856, 3941~3944, 3998~4001) — **4개 옵션 × 3개 렌더 위치 = 총 12 occurrence**. 모두 동일 키 참조:
- `Untested` → **`common.untested` 재사용 ✅**
- `Passed` → **`common.passed` 재사용 ✅**
- `Failed` → **`common.failed` 재사용 ✅**
- `Blocked` → **`common.blocked` 재사용 ✅**

### 8-4. `runs.detail.addResult.elapsed.*` + `assignee.*` (line 4013~4053)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.addResult.elapsed.label` | `Elapsed` | `소요 시간` | line 4034 |
| `runs.detail.addResult.elapsed.placeholder` | `00:00` | `00:00` | line 4042. **`.i18nignore` 예외** (Dev Spec §4-5). `t()` 불필요 — JSX 문자열 그대로 |
| `runs.detail.addResult.assignee.label` | `Assign to` | `담당자 지정` | line 4015 |
| `runs.detail.addResult.assignee.placeholder` | `Select assignee` | `담당자 선택` | line 4021 |
| `runs.detail.addResult.assignee.hint` | `Leave empty to keep current assignment.` | `비워두면 현재 담당자가 유지됩니다.` | line 4028 |

### 8-5. `runs.detail.addResult.issues.*` — Linked Issues 섹션 (line 4057~4177)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.addResult.issues.label` | `Linked Issues` | `연결된 이슈` | line 4059 |
| `runs.detail.addResult.issues.createJira` | `Create Jira Issue` | `Jira 이슈 생성` | line 4079. 기존 `runs.aiSummary.action.createJira='Create Jira Issue'/'Jira 이슈 생성'` 존재 — 값 동일 하지만 **모달 진입점 기능이 다름** (하나는 AI Summary, 하나는 Add Result). Phase 1 §5-2 "맥락이 다르면 별도 키" 원칙에 따라 **본 스펙 신규** |
| `runs.detail.addResult.issues.createGithub` | `Create GitHub Issue` | `GitHub 이슈 생성` | line 4100. 위와 동일 논거로 신규 |
| `runs.detail.addResult.issues.placeholder` | `Enter issue key (e.g., PROJ-123)` | `이슈 키 입력 (예: PROJ-123)` | line 4110. `PROJ-123` 는 예시 문자열 — 번역 대상 아님, 본문에 그대로 |
| `runs.detail.addResult.issues.hint` | `Enter a Jira issue key and press Enter (e.g., PROJ-123)` | `Jira 이슈 키를 입력하고 Enter 키를 누르세요 (예: PROJ-123)` | line 4113. **현재 한국어 하드코딩** `'Jira 이슈 키를 입력하고 Enter를 누르세요 (예: PROJ-123)'` → EN 회귀 (AC-11). AC-12: `Enter` 와 `PROJ-123` 은 번역 대상이 아니므로 문장 안에 그대로 포함 |
| `runs.detail.addResult.issues.confirmJiraSetup` | `Jira settings required. Go to Settings?` | `Jira 설정이 필요합니다. Settings 페이지로 이동하시겠습니까?` | line 4069 `confirm(...)`. **현재 한국어 하드코딩** (AC-11). EN 회귀 |

### 8-6. `runs.detail.addResult.attachments.*` — Attachments (line 4180~4246)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.addResult.attachments.label` | `Attachments` | `첨부 파일` | line 4181 |
| `runs.detail.addResult.attachments.chooseFiles` | `Choose files` | `파일 선택` | line 4199 |
| `runs.detail.addResult.attachments.or` | `or` | `또는` | line 4201 |
| `runs.detail.addResult.attachments.screenshot` | `screenshot` | `스크린샷` | line 4210 (소문자 — CSS 변경 없이 그대로) |
| `runs.detail.addResult.attachments.dropzoneHint` | `or drag/paste here` | `또는 여기에 드래그하거나 붙여넣기` | line 4213 |
| `runs.detail.addResult.attachments.uploading` | `Uploading...` | `업로드 중...` | line 4219 |

> **Evidence 파일 크기 제한 안내 문구는 본 스코프에 존재하지 않음** (Dev Spec §4-4-5). "Max 10MB" / "PNG/JPG only" 같은 문구를 추가하려면 별도 디자인 스펙 필요.

### 8-7. `runs.detail.addResult.footer.*` — Footer buttons (line 4250~4263)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.addResult.footer.cancel` | `Cancel` | `취소` | line 4255. **`common.cancel` 재사용 ✅** re-use |
| `runs.detail.addResult.footer.submit` | `Add result` | `결과 추가` | line 4261. `runs.detail.addResult.title` 과 값 동일 — 같은 키 재사용 가능 ✅ re-use |

---

## 9. 섹션별 번역 매핑 — Create Jira / GitHub Issue Modal (§4-2 섹션 20, 21)

### 9-1. `runs.detail.jiraIssue.*` — Create Jira Issue Modal (line 4268~4424)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.jiraIssue.title` | `Create Jira Issue` | `Jira 이슈 생성` | line 4273 |
| `runs.detail.jiraIssue.summary.label` | `Summary` | `요약` | line 4287. Phase 1 `runs.aiSummary.*` 의 "Summary"(AI 섹션 헤더) 와 맥락 다름 — 별도 키 |
| `runs.detail.jiraIssue.summary.required` | `*` | `*` | 기호 — 별도 키 불필요 |
| `runs.detail.jiraIssue.summary.placeholder` | `Brief description of the issue` | `이슈에 대한 간단한 설명` | line 4293 |
| `runs.detail.jiraIssue.description.label` | `Description` | `설명` | line 4300. 기존 `common.description='Description'/'설명'` 재사용 가능 ✅ re-use |
| `runs.detail.jiraIssue.description.placeholder` | `Detailed description of the issue` | `이슈에 대한 상세 설명` | line 4304 |
| `runs.detail.jiraIssue.issueType.label` | `Issue Type` | `이슈 유형` | line 4313 |
| `runs.detail.jiraIssue.issueType.option.bug` | `Bug` | `버그` | line 4319 |
| `runs.detail.jiraIssue.issueType.option.task` | `Task` | `작업` | line 4320 |
| `runs.detail.jiraIssue.issueType.option.story` | `Story` | `스토리` | line 4321 |
| `runs.detail.jiraIssue.issueType.option.epic` | `Epic` | `에픽` | line 4322 |
| `runs.detail.jiraIssue.priority.label` | `Priority` | `우선순위` | line 4327. **`common.priority` 재사용 가능** ✅ re-use |
| `runs.detail.jiraIssue.priority.option.highest` | `Highest` | `최고` | line 4333 (Jira Priority 5단계 전용, `common.issues.priority.*` 에 부재) |
| `runs.detail.jiraIssue.priority.option.high` | `High` | `높음` | line 4334. `common.high='High'/'높음'` 재사용 가능 but Jira priority 는 의미 특화 — **본 스펙에서는 신규 키 유지 권장**. Developer 가 값 중복에 문제 없다고 판단 시 재사용 OK |
| `runs.detail.jiraIssue.priority.option.medium` | `Medium` | `보통` | line 4335 |
| `runs.detail.jiraIssue.priority.option.low` | `Low` | `낮음` | line 4336 |
| `runs.detail.jiraIssue.priority.option.lowest` | `Lowest` | `최저` | line 4337 |
| `runs.detail.jiraIssue.labels.label` | `Labels` | `라벨` | line 4344 |
| `runs.detail.jiraIssue.labels.placeholder` | `Enter labels separated by commas (e.g., bug, ui, critical)` | `쉼표로 구분하여 라벨 입력 (예: bug, ui, critical)` | line 4349. 예시 문자열 `bug, ui, critical` 은 **번역 금지** (Jira 실제 라벨 네임). 영문 그대로 포함 |
| `runs.detail.jiraIssue.labels.hint` | `Separate multiple labels with commas` | `쉼표로 구분하여 여러 라벨을 입력하세요` | line 4352. **현재 한국어 하드코딩** → EN 회귀 (AC-11) |
| `runs.detail.jiraIssue.assignee.label` | `Assignee` | `담당자` | line 4357. **`common.assignee` 재사용** ✅ re-use |
| `runs.detail.jiraIssue.assignee.placeholder` | `Jira account ID or email (e.g., user@example.com)` | `Jira 계정 ID 또는 이메일 (예: user@example.com)` | line 4362. **현재 한국어 하드코딩** → EN 회귀 (AC-11) |
| `runs.detail.jiraIssue.assignee.hint` | `Leave empty for auto-assignment` | `비워두면 자동 할당됩니다` | line 4365. **현재 한국어 하드코딩** → EN 회귀 (AC-11) |
| `runs.detail.jiraIssue.components.label` | `Components` | `컴포넌트` | line 4370 |
| `runs.detail.jiraIssue.components.placeholder` | `Comma-separated component names (e.g., Frontend, API, Database)` | `컴포넌트 이름을 쉼표로 구분 (예: Frontend, API, Database)` | line 4375. **현재 한국어 하드코딩** → EN 회귀 (AC-11). `Frontend, API, Database` 예시는 번역 금지 |
| `runs.detail.jiraIssue.components.hint` | `Enter component names registered in the Jira project` | `Jira 프로젝트에 등록된 컴포넌트 이름을 입력하세요` | line 4378. **현재 한국어 하드코딩** → EN 회귀 (AC-11) |
| `runs.detail.jiraIssue.relatedTc` | `Related Test Case` | `관련 테스트 케이스` | line 4384 |
| `runs.detail.jiraIssue.footer.cancel` | — | — | line 4402. **`common.cancel` 재사용** ✅ |
| `runs.detail.jiraIssue.footer.submit` | `Create Issue` | `이슈 생성` | line 4417. 기존 `runs.aiSummary.jira.createIssue='Create Issue'/'이슈 생성'` 값 동일 but 맥락 다름 → **본 스펙 신규 권장** (Developer 판단으로 재사용 허용 가능) |
| `runs.detail.jiraIssue.footer.creating` | `Creating...` | `생성 중...` | line 4412. 기존 `runs.aiSummary.action.creating='Creating…'/'생성 중…'` 있음 — 값 유사하나 ellipsis 문자 다름(…/…). **신규 유지 권장** |

### 9-2. `runs.detail.githubIssue.*` — Create GitHub Issue Modal (line 4426~4585)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.githubIssue.title` | `Create GitHub Issue` | `GitHub 이슈 생성` | line 4432 |
| `runs.detail.githubIssue.titleField.label` | `Title` | `제목` | line 4444. 기존 `common.name` 과 의미 다름 → 신규 |
| `runs.detail.githubIssue.titleField.required` | `*` | `*` | 기호 |
| `runs.detail.githubIssue.titleField.placeholder` | `Issue title` | `이슈 제목` | line 4450 |
| `runs.detail.githubIssue.body.label` | `Description` | `설명` | line 4455. `common.description` 재사용 가능 ✅ re-use |
| `runs.detail.githubIssue.body.placeholder` | `Describe the issue (Markdown supported)` | `이슈 설명 (Markdown 지원)` | line 4459. `Markdown` 고유명사 (번역 금지) |
| `runs.detail.githubIssue.labels.label` | `Labels` | `라벨` | line 4467 |
| `runs.detail.githubIssue.labels.placeholder` | `Type label, press Enter` | `라벨 입력 후 Enter 키` | line 4506. AC-12 — `Enter` 고정 |
| `runs.detail.githubIssue.assignee.label` | `Assignee` | `담당자` | line 4512. **`common.assignee` 재사용** ✅ |
| `runs.detail.githubIssue.assignee.placeholder` | `Search collaborator...` | `기여자 검색...` | line 4522 |
| `runs.detail.githubIssue.willBeCreatedIn` | `Will be created in <1>{{owner}}/{{repo}}</1>` | `<1>{{owner}}/{{repo}}</1>에 생성됩니다` | line 4551. `<strong>` 태그 포함 — **i18next `Trans` 컴포넌트** 또는 interpolation 전용 키 2개 분리. interp 2개 (`owner`, `repo`). 기존 `runs.aiSummary.github.willBeCreatedIn='Will be created in'/'다음 위치에 생성됩니다:'` 는 trailing 콜론·구조 다름 → **본 스펙 신규** |
| `runs.detail.githubIssue.relatedTc` | `Related Test Case` | `관련 테스트 케이스` | line 4556. `runs.detail.jiraIssue.relatedTc` 값 동일 → **재사용 권장 ✅** (신규 선언 vs 재사용 판단: 같은 "연관 TC" 개념이므로 재사용 OK). 최종: **신규 선언 없이 Jira 키 재사용** (PR에 반영) |
| `runs.detail.githubIssue.footer.cancel` | — | — | **`common.cancel` 재사용 ✅** |
| `runs.detail.githubIssue.footer.submit` | `Create Issue` | `이슈 생성` | line 4579. `runs.detail.jiraIssue.footer.submit` 값 동일 → **같은 키 재사용 가능 or 신규 권장 (Developer 판단)** |
| `runs.detail.githubIssue.footer.creating` | `Creating...` | `생성 중...` | line 4577 |

---

## 10. 섹션별 번역 매핑 — TC Version Diff / Upgrade / Jira Setup (§4-2 섹션 17, 18, 22)

### 10-1. `runs.detail.tcDiff.*` — TC Version Diff Modal (line 4598~4754)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.tcDiff.subtitleCompare` | `Comparing <1>v{{fromMajor}}.{{fromMinor}}</1> → <2>v{{toMajor}}.{{toMinor}}</2>` | `비교: <1>v{{fromMajor}}.{{fromMinor}}</1> → <2>v{{toMajor}}.{{toMinor}}</2>` | line 4606~4610. **`<Trans>` 컴포넌트 사용** (중첩 `<span>` 감싸기). interp 4개 |
| `runs.detail.tcDiff.columnHeader.current` | `v{{major}}.{{minor}} (current in run)` | `v{{major}}.{{minor}} (실행 내 현재)` | line 4627. interp 2개 |
| `runs.detail.tcDiff.columnHeader.updated` | `v{{major}}.{{minor}} (updated)` | `v{{major}}.{{minor}} (업데이트됨)` | line 4630. interp 2개 |
| `runs.detail.tcDiff.metadata.title` | `Title` | `제목` | line 4636 |
| `runs.detail.tcDiff.metadata.tags` | `Tags` | `태그` | line 4637 |
| `runs.detail.tcDiff.metadata.precondition` | `Precondition` | `사전 조건` | line 4638 |
| `runs.detail.tcDiff.metadata.description` | `Description` | `설명` | line 4639. `common.description` 재사용 ✅ re-use |
| `runs.detail.tcDiff.steps.sectionTitle` | `Steps` | `스텝` | line 4658, 4659 (2곳, 좌/우 컬럼) |
| `runs.detail.tcDiff.steps.noSteps` | `No steps` | `스텝 없음` | line 4664 |
| `runs.detail.tcDiff.expectedResult.sectionTitle` | `Expected Result` | `예상 결과` | line 4695, 4696 (2곳) |
| `runs.detail.tcDiff.loading` | `Loading…` | `로딩 중…` | line 4621. `common.loading` 재사용 가능 ✅ re-use (ellipsis 차이 주의: `…` vs `...`) |
| `runs.detail.tcDiff.footer.cancel` | — | — | line 4742. **`common.cancel` 재사용 ✅** |
| `runs.detail.tcDiff.footer.updateTo` | `Update to v{{major}}.{{minor}}` | `v{{major}}.{{minor}}로 업데이트` | line 4749. interp 2개 |

### 10-2. `runs.detail.upgradeModal.*` — Starter Upgrade Modal (line 3624~3667, AC-11 전체 교체)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.upgradeModal.title` | `Starter plan required` | `Starter 플랜이 필요합니다` | line 3631. **현재 한국어 하드코딩** `'Starter 플랜 이상 필요'` (AC-11) |
| `runs.detail.upgradeModal.body` | `Jira issue creation is available on the <1>Starter plan</1> and above.<br/>Upgrade to create and manage Jira issues directly from test results.` | `Jira 이슈 생성 기능은 <1>Starter 플랜</1> 이상에서 사용할 수 있습니다.<br/>업그레이드하면 테스트 결과에서 바로 Jira 이슈를 생성하고 관리할 수 있습니다.` | line 3633~3634. **현재 한국어 하드코딩**. `<strong>` 내부 `Starter 플랜` 은 `<Trans>` 로 처리 or 두 키로 분리 (권장: `<Trans>`) |
| `runs.detail.upgradeModal.benefitsTitle` | `Starter plan benefits` | `Starter 플랜 혜택` | line 3637. **현재 한국어 하드코딩** |
| `runs.detail.upgradeModal.benefit.projects` | `Up to 10 projects` | `프로젝트 10개까지` | line 3639. **현재 한국어 하드코딩** |
| `runs.detail.upgradeModal.benefit.members` | `Up to 5 team members` | `팀 멤버 5명까지` | line 3639. **현재 한국어 하드코딩** |
| `runs.detail.upgradeModal.benefit.jira` | `Jira Integration` | `Jira 연동` | line 3639. Jira 는 고유명사 — EN 값 그대로 "Jira Integration" |
| `runs.detail.upgradeModal.benefit.reporting` | `Basic reporting` | `기본 리포팅` | line 3639. **현재 한국어 하드코딩** |
| `runs.detail.upgradeModal.benefit.exportImport` | `Test Case Export/Import` | `테스트 케이스 내보내기/가져오기` | line 3639. **현재 한국어 하드코딩** (`'Testcase Export/Import'` — 오타 `Testcase` → `Test Case`) |
| `runs.detail.upgradeModal.footer.close` | — | — | line 3652. **현재 한국어 하드코딩** `'닫기'`. **`common.close` 재사용 ✅** (AC-11) |
| `runs.detail.upgradeModal.footer.upgrade` | `Upgrade plan` | `플랜 업그레이드` | line 3661. **현재 한국어 하드코딩** `'플랜 업그레이드'` |

### 10-3. `runs.detail.upgradeNudge.*` — Free tier AI Nudge (line 3143~3208)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.upgradeNudge.title` | `AI Run Summary` | `AI 실행 요약` | line 3173. 기존 `runs.aiSummary.title='AI Run Summary'/'AI 실행 요약'` 재사용 가능 ✅ re-use |
| `runs.detail.upgradeNudge.body` | `Get instant failure pattern analysis, Go/No-Go recommendations, and one-click Jira issue creation.` | `즉각적인 실패 패턴 분석, Go/No-Go 추천, 원클릭 Jira 이슈 생성을 받아보세요.` | line 3185. `Go/No-Go` 고유명사 (번역 금지) |
| `runs.detail.upgradeNudge.cta` | `Upgrade to Hobby — $19/mo` | `Hobby로 업그레이드 — $19/mo` | line 3203. `Hobby` / `$19/mo` 고정 — 통화 현지화는 Dev Spec §9 Out of Scope |
| `runs.detail.upgradeNudge.subtitle` | `15 AI credits/month · AI Run Summary included` | `월 AI 크레딧 15개 · AI 실행 요약 포함` | line 3206 |

### 10-4. `runs.detail.jiraSetup.*` — Jira 연동 필요 모달 (line 3669~3701, AC-11 전체 교체)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.jiraSetup.title` | `Jira integration required` | `Jira 연동이 필요합니다` | line 3677. **현재 한국어 하드코딩** |
| `runs.detail.jiraSetup.body` | `To create Jira issues, first connect your Jira account in Settings.` | `Jira 이슈를 생성하려면 먼저 Settings에서 Jira 계정을 연결해 주세요.` | line 3679. **현재 한국어 하드코딩** |
| `runs.detail.jiraSetup.footer.close` | — | — | line 3686. **`common.close` 재사용 ✅** (현재 한국어 하드코딩 `'닫기'`) |
| `runs.detail.jiraSetup.footer.connect` | `Connect Jira` | `Jira 연결` | line 3695 (현재 EN 하드코딩) |

---

## 11. 섹션별 번역 매핑 — ResultDetailModal / Image Preview / Fatal Error (§4-2 섹션 23, 24, 27)

> **PR-C 범위 (섹션 23~30).**

### 11-1. `runs.detail.resultDetail.*` — ResultDetailModal (line 4796~5205)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.resultDetail.title` | `Test Result Details` | `테스트 결과 상세` | line 4816 |
| `runs.detail.resultDetail.cicdBadge` | `CI/CD` | `CI/CD` | line 4820. 약어 고정 (§3-1). `t()` 감싸도 값 동일 |
| `runs.detail.resultDetail.unknownAuthor` | `Unknown` | `알 수 없음` | line 4844 |
| `runs.detail.resultDetail.status.label` | `Status` | `상태` | line 4858. **`common.status` 재사용 ✅** |
| `runs.detail.resultDetail.elapsed.label` | `Elapsed Time` | `소요 시간` | line 4864. `runs.detail.addResult.elapsed.label='Elapsed'` 과 미묘하게 다름 (Add Result는 `Elapsed`, Detail 은 `Elapsed Time`) — **별도 키 유지** (원본 UI 디자인 의도 반영) |
| `runs.detail.resultDetail.note.label` | `Note` | `메모` | line 4874. `runs.detail.addResult.note.label` 과 값 동일 → 같은 키 재사용 가능 ✅ re-use |
| `runs.detail.resultDetail.stepResults.label` | `Step Results` | `스텝 결과` | line 4895, 5005, 5105 (3곳) |
| `runs.detail.resultDetail.stepResults.stepFallback` | `Step {{index}}` | `스텝 {{index}}` | line 5116. interp. "Step 1, Step 2…" 렌더 |
| `runs.detail.resultDetail.stepResults.status.passed` | — | — | line 5214 `getStepStatusInfo`. **`common.passed` 재사용 ✅** (AC-8 대상 추가) |
| `runs.detail.resultDetail.stepResults.status.failed` | — | — | line 5221. **`common.failed` 재사용 ✅** |
| `runs.detail.resultDetail.stepResults.status.blocked` | — | — | line 5228. **`common.blocked` 재사용 ✅** |
| `runs.detail.resultDetail.stepResults.status.untested` | — | — | line 5235. **`common.untested` 재사용 ✅** |
| `runs.detail.resultDetail.stepResults.status.unknown` | `Unknown` | `알 수 없음` | line 5242. `runs.detail.resultDetail.unknownAuthor` 값 동일 → 같은 키 재사용 ✅ re-use |
| `runs.detail.resultDetail.attachmentsLabel_one` | `Attachments ({{count}})` | `첨부 파일 ({{count}})` | line 5135. plural, interp. KO 는 단복수 동일 |
| `runs.detail.resultDetail.attachmentsLabel_other` | `Attachments ({{count}})` | `첨부 파일 ({{count}})` | line 5135. plural |
| `runs.detail.resultDetail.linkedIssues` | `Linked Issues` | `연결된 이슈` | line 5153. `runs.detail.addResult.issues.label` 값 동일 → 재사용 가능 ✅ re-use |
| `runs.detail.resultDetail.githubIssues` | `GitHub Issues` | `GitHub 이슈` | line 5174 |
| `runs.detail.resultDetail.close` | — | — | line 5199. **`common.close` 재사용 ✅** |

> **ResultDetailModal 내부 `useTranslation` 추가:** Dev Spec §4-6 에 따라 이 서브 컴포넌트 함수 맨 위에 `const { t, i18n } = useTranslation(['runs','common'])` 신규 호출. Phase 1 AIRunSummaryPanel 패턴과 동일.

### 11-2. `runs.detail.imagePreview.*` — Image Preview Modal (line 4756~4778)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.imagePreview.closeA11y` | `Close preview` | `미리보기 닫기` | line 4765 aria-label (추가 권장 — 현재 없음). 접근성 향상 차원 |

> **현재 파일 캡션(`previewImage.name`, line 4775)** 은 유저 입력 파일명 — 번역 대상 아님.

### 11-3. `runs.detail.fatalError.*` — throw new Error (§4-2 섹션 27)

| Key | EN | KO | 비고 |
|-----|----|----|-----|
| `runs.detail.fatalError.userMissing` | `Failed to load user. Please refresh the page.` | `사용자 정보를 불러올 수 없습니다. 페이지를 새로고침해 주세요.` | line 1389. **현재 한국어 하드코딩** → EN 회귀 (AC-11) |
| `runs.detail.fatalError.runIdMissing` | `Run ID not found. Please check the URL.` | `Run ID가 없습니다. URL을 확인해 주세요.` | line 1392. **현재 한국어 하드코딩** → EN 회귀. `Run ID` 는 기술 용어로 EN 유지 (KO 에서도 `Run ID` 그대로 사용 권장) |

---

## 12. §4-2 섹션 26 — showToast 29건 전수 매핑 (`runs.toast.*`)

> **PR-C 범위.** 29건 Toast 메시지 전부를 `runs.toast.*` 플랫 트리에 배치. Phase 1 `common.toast.*` 과는 별개 (run 맥락 특화).

| Key | EN | KO | 라인 | 비고 |
|-----|----|----|-----|-----|
| `runs.toast.commentSaveFailed` | `Failed to save comment.` | `댓글 저장에 실패했습니다.` | 1241 | `showToast('error', error?.message ‖ key)` 패턴 |
| `runs.toast.commentDeleteFailed` | `Failed to delete comment.` | `댓글 삭제에 실패했습니다.` | 1257 | |
| `runs.toast.jiraAutoCreated` | `Jira issue {{key}} created automatically` | `Jira 이슈 {{key}}가 자동 생성되었습니다` | 1449, 1823 | interp. success. 2곳 동일 키 |
| `runs.toast.jiraAutoCreateFailed` | `Failed to auto-create Jira issue` | `Jira 이슈 자동 생성에 실패했습니다` | 1453, 1827 | 2곳 동일 키 |
| `runs.toast.githubAutoCreated` | `GitHub issue #{{number}} created automatically` | `GitHub 이슈 #{{number}}가 자동 생성되었습니다` | 1480, 1859 | interp. success. 2곳 동일 키 |
| `runs.toast.githubAutoCreateFailed` | `Failed to auto-create GitHub issue` | `GitHub 이슈 자동 생성에 실패했습니다` | (1483 추정) | |
| `runs.toast.statusUpdateFailed` | `Failed to update status.` | `상태 업데이트에 실패했습니다.` | 1521, 1609 | 2곳 동일 키 |
| `runs.toast.addResultFirstThenLink` | `Add a test result first, then link an issue.` | `먼저 테스트 결과를 추가한 후 이슈를 연결하세요.` | 1649 | |
| `runs.toast.runIdNotFound` | `Run ID not found. Please refresh the page.` | `Run ID를 찾을 수 없습니다. 페이지를 새로고침해 주세요.` | 1736 | `runs.detail.fatalError.runIdMissing` 과 유사 but `확인해 주세요` vs `새로고침` 차이 → **별도 키** |
| `runs.toast.resultSaveFailed` | `Failed to save result.` | `결과 저장에 실패했습니다.` | 1981 | |
| `runs.toast.ssVersionUpdated` | `Shared Step '{{name}}' updated to v{{version}}` | `공유 스텝 '{{name}}' v{{version}}으로 업데이트됨` | 2045 | interp 2개. success |
| `runs.toast.ssVersionUpdateFailed` | `Failed to update Shared Step version` | `공유 스텝 버전 업데이트에 실패했습니다` | 2047 | |
| `runs.toast.tcVersionUpdated` | `TC updated to v{{major}}.{{minor}}` | `TC가 v{{major}}.{{minor}}로 업데이트됨` | 2076 | interp 2개. success |
| `runs.toast.tcVersionUpdateFailed` | `Failed to update TC version` | `TC 버전 업데이트에 실패했습니다` | 2078 | |
| `runs.toast.uploadFailed` | `Failed to upload file: {{reason}}` | `파일 업로드 실패: {{reason}}` | 2294 | interp. `{{reason}}` = `error.message ?? t('common:unknownError')`. Dev Spec §4-4-5 |
| `runs.toast.screenshotUnsupported` | `This browser does not support screenshot capture.` | `이 브라우저는 스크린샷 기능을 지원하지 않습니다.` | 2335 | **현재 한국어 하드코딩** → EN 회귀 (AC-11) |
| `runs.toast.screenshotUploadFailed` | `Failed to upload screenshot: {{reason}}` | `스크린샷 업로드 실패: {{reason}}` | 2390 | interp |
| `runs.toast.screenshotCaptureFailed` | `Failed to capture screenshot.` | `스크린샷 캡처에 실패했습니다.` | 2397 | |
| `runs.toast.summaryRequired` | `Summary is required.` | `요약은 필수 항목입니다.` | 2458 | **현재 한국어 하드코딩** `'Summary는 필수 항목입니다.'` — Summary 키워드 번역 여부: Jira 필드명이므로 KO 에서도 `요약` 으로 통일 (§9-1 Jira Issue 표와 일치) → EN 회귀 (AC-11) |
| `runs.toast.jiraCreated` | `Jira issue {{key}} created` | `Jira 이슈 {{key}} 생성됨` | 2511, 2533 | interp. 2곳 동일 키. success |
| `runs.toast.jiraCreatedAddResult` | `Jira issue {{key}} created. Log a result via Add Result to link automatically.` | `Jira 이슈 {{key}} 생성됨. Add Result로 테스트 결과를 기록하면 이슈가 자동으로 연결됩니다.` | 2552 | interp. **현재 한국어 하드코딩 절반** 포함 → EN 회귀 (AC-11). "Add Result" 는 버튼명 고유 라벨이라 KO 에서도 `Add Result` 그대로 유지할지 `결과 추가` 로 할지 판단 필요. §3-1 일관성 위해 **`결과 추가`** 권장 (버튼 라벨도 `결과 추가` 로 번역됨) |
| `runs.toast.jiraCreateFailed` | `Failed to create Jira issue: {{reason}}` | `Jira 이슈 생성 실패: {{reason}}` | 2561 | interp |
| `runs.toast.githubCreated` | `GitHub issue #{{number}} created` | `GitHub 이슈 #{{number}} 생성됨` | 2604 | interp. success |
| `runs.toast.githubCreateFailed` | `Failed to create GitHub issue: {{reason}}` | `GitHub 이슈 생성 실패: {{reason}}` | 2610 | interp |

**총 25 유니크 키 — 중복 호출 위치 4건 합산 29 호출.**

> **Dev Spec §4-2 표의 "29건" vs 본 매핑 "25 유니크 키" 차이 근거:**
> - `jiraAutoCreated` 2곳 (1449, 1823)
> - `jiraAutoCreateFailed` 2곳 (1453, 1827)
> - `githubAutoCreated` 2곳 (1480, 1859)
> - `statusUpdateFailed` 2곳 (1521, 1609)
> - `jiraCreated` 2곳 (2511, 2533)
> → 중복 5건 × 2회 = 10 호출이 5 키로 축약. 25 + 4 = 29 일치.

---

## 13. AC-11 전용 — 한국어 하드코딩 ~22건 전수 EN 회귀

Dev Spec §4-2 카운트 "~22건" 검증. 본 스펙 §7~§12 에 분산 배치된 건수를 AC-11 확인 용도로 재편성:

| # | 현재 코드 (KO 하드코딩) | 라인 | 본 스펙 새 키 | EN 값 | 비고 |
|---|---------------------|-----|------------|-------|-----|
| 1 | `'접기'` | 2841 | `runs.detail.folderSidebar.collapseTooltip` | `Collapse` | §7-9 |
| 2 | `'펼치기'` | 2841 | `runs.detail.folderSidebar.expandTooltip` | `Expand` | §7-9 |
| 3 | `'폴더 없음'` | 2912 | `runs.detail.folderSidebar.empty` | `No folders` | §7-9 |
| 4 | `'테스트 케이스가 없습니다'` | 3364 | `runs.detail.tcList.empty.title` | `No test cases` | §7-7 |
| 5 | `'이 Run에 테스트 케이스가 포함되어 있지 않습니다.'` | 3365 | `runs.detail.tcList.empty.hint` | `This run does not include any test cases.` | §7-7 |
| 6 | `'Starter 플랜 이상 필요'` | 3631 | `runs.detail.upgradeModal.title` | `Starter plan required` | §10-2 |
| 7 | `'Jira 이슈 생성 기능은 … 관리할 수 있습니다.'` | 3633~3634 | `runs.detail.upgradeModal.body` | `Jira issue creation is available …` | §10-2 |
| 8 | `'Starter 플랜 혜택'` | 3637 | `runs.detail.upgradeModal.benefitsTitle` | `Starter plan benefits` | §10-2 |
| 9 | `'프로젝트 10개까지'` | 3639 | `runs.detail.upgradeModal.benefit.projects` | `Up to 10 projects` | §10-2 |
| 10 | `'팀 멤버 5명까지'` | 3639 | `runs.detail.upgradeModal.benefit.members` | `Up to 5 team members` | §10-2 |
| 11 | `'기본 리포팅'` | 3639 | `runs.detail.upgradeModal.benefit.reporting` | `Basic reporting` | §10-2 |
| 12 | `'Testcase Export/Import'` (한국어 혼재) | 3639 | `runs.detail.upgradeModal.benefit.exportImport` | `Test Case Export/Import` | §10-2. 오타 `Testcase` 수정 |
| 13 | `'닫기'` (Upgrade Modal) | 3652 | `common.close` 재사용 | `Close` | §10-2 |
| 14 | `'플랜 업그레이드'` | 3661 | `runs.detail.upgradeModal.footer.upgrade` | `Upgrade plan` | §10-2 |
| 15 | `'Jira 연동이 필요합니다'` | 3677 | `runs.detail.jiraSetup.title` | `Jira integration required` | §10-4 |
| 16 | `'Jira 이슈를 생성하려면 … 연결해 주세요.'` | 3679 | `runs.detail.jiraSetup.body` | `To create Jira issues, first connect …` | §10-4 |
| 17 | `'닫기'` (Jira Setup Modal) | 3686 | `common.close` 재사용 | `Close` | §10-4 |
| 18 | `'Jira 이슈 키를 입력하고 Enter를 누르세요 (예: PROJ-123)'` | 4113 | `runs.detail.addResult.issues.hint` | `Enter a Jira issue key and press Enter (e.g., PROJ-123)` | §8-5 |
| 19 | `'Jira 설정이 필요합니다. Settings 페이지로 이동하시겠습니까?'` | 4069 | `runs.detail.addResult.issues.confirmJiraSetup` | `Jira settings required. Go to Settings?` | §8-5. `confirm(...)` |
| 20 | `'쉼표로 구분하여 여러 라벨을 입력하세요'` | 4352 | `runs.detail.jiraIssue.labels.hint` | `Separate multiple labels with commas` | §9-1 |
| 21 | `'Jira 계정 ID 또는 이메일 (예: user@example.com)'` | 4362 | `runs.detail.jiraIssue.assignee.placeholder` | `Jira account ID or email (e.g., user@example.com)` | §9-1 |
| 22 | `'비워두면 자동 할당됩니다'` | 4365 | `runs.detail.jiraIssue.assignee.hint` | `Leave empty for auto-assignment` | §9-1 |
| 23 | `'컴포넌트 이름을 쉼표로 구분 (예: Frontend, API, Database)'` | 4375 | `runs.detail.jiraIssue.components.placeholder` | `Comma-separated component names (e.g., Frontend, API, Database)` | §9-1 |
| 24 | `'Jira 프로젝트에 등록된 컴포넌트 이름을 입력하세요'` | 4378 | `runs.detail.jiraIssue.components.hint` | `Enter component names registered in the Jira project` | §9-1 |
| 25 | `'사용자 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요.'` | 1389 | `runs.detail.fatalError.userMissing` | `Failed to load user. Please refresh the page.` | §11-3 |
| 26 | `'Run ID가 없습니다. URL을 확인해주세요.'` | 1392 | `runs.detail.fatalError.runIdMissing` | `Run ID not found. Please check the URL.` | §11-3 |
| 27 | `'이 브라우저는 스크린샷 기능을 지원하지 않습니다.'` | 2335 | `runs.toast.screenshotUnsupported` | `This browser does not support screenshot capture.` | §12 |
| 28 | `'Summary는 필수 항목입니다.'` | 2458 | `runs.toast.summaryRequired` | `Summary is required.` | §12 |
| 29 | `'Jira issue … Add Result로 테스트 결과를 기록하면 이슈가 자동으로 연결됩니다.'` (일부 혼재) | 2552 | `runs.toast.jiraCreatedAddResult` | `Jira issue {{key}} created. Log a result via Add Result to link automatically.` | §12 |

**총 29 항목.** Dev Spec §4-2 카운트 "~22건" 은 느슨한 grep 기준이었고, 실제 정확한 한국어·혼재 리터럴은 **29건** (일부는 `닫기` 같은 재사용 가능 문자열). 본 스펙 **§13 표를 AC-11 체크리스트로 사용**.

---

## 14. AC-12 — 단축키 힌트 / 영문 고정 문자열

Dev Spec AC-12 의 "단축키 기호는 번역하지 않고 감싸는 문장만 번역" 원칙 적용 목록:

| 위치 | 라인 | 영문 고정 문자열 | EN 카피 | KO 카피 | 비고 |
|------|-----|----------------|--------|--------|-----|
| Focus Mode 버튼 tooltip | 3010 | `Cmd+Shift+F` | `Focus Mode (Cmd+Shift+F)` | `Focus Mode (Cmd+Shift+F)` | §3-1 Focus Mode 고유명사 유지 + 단축키 기호 유지 → EN/KO 완전 동일 |
| Issue input hint | 4113 | `Enter`, `PROJ-123` | `Enter a Jira issue key and press Enter (e.g., PROJ-123)` | `Jira 이슈 키를 입력하고 Enter 키를 누르세요 (예: PROJ-123)` | `Enter`, `PROJ-123` 래핑 문장 안에 그대로 삽입 |
| GitHub Labels input placeholder | 4506 | `Enter` | `Type label, press Enter` | `라벨 입력 후 Enter 키` | 단축키 기호 고정 |
| Issue placeholder (Add Result) | 4110 | `PROJ-123` | `Enter issue key (e.g., PROJ-123)` | `이슈 키 입력 (예: PROJ-123)` | |

> **원칙 재확인:** 번역 키 값 안에 `Cmd`, `Shift`, `Enter`, `PROJ-123` 등 기호·예시가 **그대로 문자열로 들어간다**. i18next interpolation 으로 분리하지 않는다 (유지보수성 ↓ + 시각적 노이즈).

---

## 15. AC-9 — PDF / Jira / GitHub payload 비번역 재확인

Phase 1 AC-9 정책을 본 파일에 재적용. 아래 구역은 **전부 번역 대상이 아니며, `.i18nignore` 로 스캐너 제외**.

### 15-1. PDF Export HTML (Dev Spec §4-5, line 503~624)

이 섹션은 run-detail/page.tsx 내부에 있는 `buildPdfHtml*` 함수가 **영문 고정 HTML 문자열을 반환**하며, 외부 PDF 생성 엔진으로 전달됨. 번역하면 PDF 레이아웃 깨지고 외부 고객 배포용 리포트가 한국어 혼재된다.

**`.i18nignore` 추가 규칙 (Dev Spec §4-5):**
```
# run-detail PDF export HTML cells (external output, locked EN)
/"stat-label">Total</
/"stat-label">Passed</
/"stat-label">Failed</
/"stat-label">Blocked</
/"stat-label">Retest</
/"stat-label">Untested</
/<span>Testably — Run Report<\/span>/
/<th>Test Case<\/th>/
/<th style="width:.*?">Priority<\/th>/
/<th style="width:.*?">Folder<\/th>/
/<th style="width:.*?">Assignee<\/th>/
/<th style="width:.*?">Status<\/th>/
/Exported \$\{/
/Started \$\{/
/Metric<\/th>/
/Value<\/th>/
```

**Developer 주석 템플릿** (각 `buildPdfHtml*` 함수 상단에 추가):
```ts
/**
 * i18n policy (Phase 1 AC-9 + Phase 2b §15-1):
 * External PDF output — strings below are locked EN.
 * Do NOT route through t(). Scanner exclusion is configured in .i18nignore.
 */
```

### 15-2. Jira REST payload body (buildJiraDescription 등)

`handleCreateJiraIssue` / `handleSummaryInjectIntoJira` 가 Atlassian REST API 로 전송하는 `description` body 는 **이미 Phase 1 `.i18nignore` 규칙**(`/\[AI Summary\]/`, `/\[Bug\] /`, `/Root cause:/`, `/Detected by Testably/`) 로 보호됨. 본 파일에서도 동일 규칙 유지.

**신규 추가 규칙 없음** — Dev Spec §4-5 의 "유지" 목록 그대로.

**Developer 주석 템플릿:**
```ts
/**
 * i18n policy (Phase 1 AC-9):
 * Jira payload body forwarded to external system — locked EN.
 * Only wrapping UI labels ("Create Jira Issue", placeholders) are translated.
 */
```

### 15-3. GitHub Issue body (buildGithubIssueBody 등)

Jira 와 동일한 원칙. GitHub REST `POST /repos/:owner/:repo/issues` body 필드 (`body`, `title`) 가 유저 입력값이거나 `buildGithubBody()` 가 반환하는 **영문 고정 템플릿**. 번역 금지.

### 15-4. AI 생성 초안 본문

본 파일에는 **AI 초안 생성 UI 없음** (Dev Spec §4-4-7). AIRunSummaryPanel 에서 `aiSummaryData` 를 받아 PDF `buildPdfHtmlForAi(summary)` 에 넘기는 부분만 존재. 이 부분은 Phase 1 `.i18nignore` 로 이미 보호 (`/## AI Run Summary/` 등). **본 스펙에서 추가 조치 없음.**

---

## 16. 날짜·시간·숫자·타이머 요약 표

Dev Spec §4-4-2, §4-4-3, §4-4-8 재정리:

| 카테고리 | 현재 코드 | 교체 방법 | 번역 키 |
|---------|----------|---------|--------|
| Header `Started ${...}` | `toLocaleDateString('en-US', {month, day})` | `formatShortDate(iso)` + `t('runs:detail.page.startedPrefix', { date })` | `runs.detail.page.startedPrefix` |
| ResultDetailModal timestamp | `toLocaleString('en-US', {year,month,day,hour,minute})` | `formatLongDateTime(iso, i18n.language)` 헬퍼 신규. 번역 키 없이 직접 렌더 | 없음 (날짜 자체) |
| 타이머 `00:00` placeholder | `placeholder="00:00"` | **변경 없음** — `.i18nignore` 예외 (`placeholder="00:00"`) | 없음 |
| 진행률 `{percent}%` | `{Math.round(...)}%` | **변경 없음** — 언어 무관 | 없음 |
| Elapsed time `resultFormData.elapsed` 값 | `{result.elapsed}` | **변경 없음** — 유저 입력 값 | 라벨만 번역 (`runs.detail.resultDetail.elapsed.label`) |
| 파일 크기 `formatFileSize(size)` | `(${formatFileSize(file.size)})` | **변경 없음** — 이미 언어 무관 (KB/MB 단위) | 없음 |
| TC 개수 plural | `${testCases.length} test cases` | `t('runs:detail.page.testCasesCount', { count })` | `runs.detail.page.testCasesCount_one|_other` |
| Bulk selected plural | `${n} item${n>1?'s':''} selected` | `t('runs:detail.tcList.bulk.selected', { count })` | `runs.detail.tcList.bulk.selected_one|_other` |

### 16-1. Developer 핵심 리마인더 (인라인 조건 제거)

Dev Spec §4-4-3 — **`selectedIds.size > 1 ? 's' : ''` 같은 인라인 조건 제거** 가 AC 중요 항목. 아래 4군데 중점:

| 라인 | 현재 | 교체 |
|-----|-----|-----|
| 3256 | `${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} selected` | `t('runs:detail.tcList.bulk.selected', { count: selectedIds.size })` |
| 3297 | `{uniqueSsIds.size} Shared Step{uniqueSsIds.size !== 1 ? 's' : ''}` | `t('runs:detail.ssBanner.headline', { count: uniqueSsIds.size })` |
| 3298 | `{outdatedTCs.length} TC affected${updatableTCs.length > 0 ? ', ${...} untested can be updated' : ''}` | 두 plural 키 합성 (§7-3) |
| 2956 | `${testCases.length} test cases` | `t('runs:detail.page.testCasesCount', { count })` |

---

## 17. 최종 키 집계 (AC-10 검증)

### 17-1. 네임스페이스별 신규 leaf 키 수 (재사용 제외)

| 서브트리 | 신규 leaf | 재사용 키 (not new) |
|---------|---------|-------------------|
| `runs.detail.page.*` | 6 (testCasesCount plural 2개 포함) | — |
| `runs.detail.runStatus.*` | 4 (completed / inProgress / underReview / paused) + 0 재사용(draft→common.new) | `draft` → `common.new` |
| `runs.detail.headerActions.*` | 7 (export / exportTooltip / aiSummary / aiSummaryNewBadge / aiSummaryLockedBadge / focusMode / focusModeTooltip) + 2 재사용(aiSummaryFreshCheck/✓, aiSummaryStaleWarn/⚠️ 는 스킵 가능 — 기호 전용) | aiSummaryFreshCheck·StaleWarn 은 번들 미추가 권장 |
| `runs.detail.kpi.*` | 0 (전부 재사용) | `totalTests` → `runs.totalTests`, 4 status → `common.passed|failed|blocked|untested` |
| `runs.detail.progress.*` | 2 (title / tooltipCount) | 5 status label → `common.*` |
| `runs.detail.folderSidebar.*` | 5 (title / allCases / collapseTooltip / expandTooltip / empty) | — |
| `runs.detail.tcList.filter.*` | 3 (searchPlaceholder / allStatus / allPriority) | 5 status + 4 priority → `common.*` |
| `runs.detail.tcList.bulk.*` | 6 (selected plural 2 + assignToLabel / unassigned / apply / clearSelection) | — |
| `runs.detail.tcList.header.*` | 3 (idVer / testCase / folder) | 3 재사용 (priority/assignee/status) |
| `runs.detail.tcList.empty.*` | 2 (title / hint) | — |
| `runs.detail.tcList.assigneeDropdown.*` | 1 (unassigned) | — (emDashOnly 는 `.i18nignore` 처리) |
| `runs.detail.tcList.versionBadge.*` | 3 (tcUpdatedClickable / locked / ssUpdateAvailable) | — |
| `runs.detail.ssBanner.*` | 8 (headline plural 2 + tcAffected plural 2 + untestedUpdatable plural 2 + updateAll + dismiss) | — |
| `runs.detail.deprecatedBanner.*` | 3 (title + countSentence plural 2) | — |
| `runs.detail.addResult.title` | 1 | — |
| `runs.detail.addResult.status.*` | 1 (label) | 5 status 재사용 |
| `runs.detail.addResult.note.*` | 1 (label) + 9 toolbar (선택적 — aria-label 추가 시) | — |
| `runs.detail.addResult.steps.*` | 11 | — |
| `runs.detail.addResult.elapsed.*` | 2 (label + placeholder는 `.i18nignore`) | — |
| `runs.detail.addResult.assignee.*` | 3 | — |
| `runs.detail.addResult.issues.*` | 6 | — |
| `runs.detail.addResult.attachments.*` | 6 | — |
| `runs.detail.addResult.footer.*` | 1 (submit; cancel 재사용) | `common.cancel` |
| `runs.detail.jiraIssue.*` | 25 (title / summary 2 / description 1 placeholder + label 재사용 / issueType 4 options + label / priority 5 options + label 재사용 / labels 2 + hint / assignee 2 / components 3 / relatedTc / footer 2) | `common.description`, `common.priority`, `common.assignee`, `common.cancel` |
| `runs.detail.githubIssue.*` | 12 (title / titleField 2 + placeholder / body placeholder / labels 2 / assignee placeholder / willBeCreatedIn / footer 2) | `common.description`, `common.assignee`, `common.cancel`, jiraIssue.relatedTc 재사용 |
| `runs.detail.tcDiff.*` | 13 (subtitleCompare / columnHeader 2 / metadata 3 신규 + 1 재사용 / steps 2 / expectedResult 1 / loading 재사용 / footer 1) | `common.description`, `common.loading`, `common.cancel` |
| `runs.detail.upgradeModal.*` | 10 (title / body / benefitsTitle / benefit 5 / footer.upgrade) | `common.close` |
| `runs.detail.upgradeNudge.*` | 3 (body / cta / subtitle; title 재사용) | `runs.aiSummary.title` |
| `runs.detail.jiraSetup.*` | 3 (title / body / footer.connect) | `common.close` |
| `runs.detail.resultDetail.*` | 10 (title / cicdBadge / unknownAuthor / elapsedLabel / stepResultsLabel / stepFallback / attachmentsLabel plural 2 / githubIssues / status.unknown 재사용=unknownAuthor) | `common.status`, `runs.detail.addResult.note.label`, `common.passed|failed|blocked|untested`, `runs.detail.addResult.issues.label`(linkedIssues), `common.close` |
| `runs.detail.imagePreview.*` | 1 (closeA11y — 선택적) | — |
| `runs.detail.fatalError.*` | 2 | — |
| `runs.toast.*` | 25 (§12) | — |
| `common.*` 신규 보강 | 1 (`common.unknownError`) | — |
| **합계 (Note toolbar 9개 포함)** | **~200** | — |
| **합계 (Note toolbar 제외, 실무 최소)** | **~191** | — |

> **실제 en 리프 수:** Dev Spec §5 추정 292 와 본 상세 매핑 191 의 차이는 **(a) Dev Spec 은 재사용 키를 합쳐 세었고, (b) ssBanner / deprecatedBanner / page.testCasesCount / tcList.bulk.selected / resultDetail.attachmentsLabel 의 plural `_one`+`_other` 쌍이 Dev Spec 에서는 1개로 세었기 때문** (실제 번들에서는 2개 leaf). Plural 쌍을 각각 1로 세면 약 +9 → **약 200**. AC-10 범위 (300 ± 50 = 250~350) **미달** — 실제 Note toolbar 9개와 §11-1 / §11-2 일부 aria-label 을 포함시키면 ≈ 210. **여전히 AC-10 하한(250) 미달이며, Dev Spec §10 추정이 과대였음.** Developer 가 PR 작성 시 실제 번들 라인수로 재측정 권장.

### 17-2. en/ko 파일 추가 라인 수 예측

- **en/runs.ts 신규 라인:** ~200 leaf + 계층 중괄호 / 콤마 오버헤드 ~80 라인 = **약 280 라인 추가**
- **ko/runs.ts 신규 라인:** 동일 구조 = **약 280 라인 추가**
- **en/common.ts 신규 라인:** `unknownError: 'Unknown error',` — **1 라인**
- **ko/common.ts 신규 라인:** `unknownError: '알 수 없는 오류',` — **1 라인**

**총 추가 라인 (en+ko): ~562 라인.** Dev Spec §5 추정 584 와 일치 수준.

### 17-3. AC-6 / AC-7 / AC-8 준수 검증

- **AC-6 (Phase 1 키 보존):** 본 스펙이 건드린 기존 키 — 없음. `runs.aiSummary.*` / `common.toast.*` / `common.time.*` / `common.issues.*` 모두 **읽기 전용 재사용**. 신규는 전부 `runs.detail.*` + `runs.toast.*` + `common.unknownError` ✅
- **AC-7 (상태 라벨 재사용):** Pass/Fail/Blocked/Retest/Untested 5종은 **기존 `common.passed|failed|blocked|retest|untested` 재사용** — 본 스펙 §3-2 재사용 매트릭스 + §6-4, §6-5, §7-1, §8-1, §8-3, §11-1 에서 5군데 이상 동일 키 참조 명시. ✅
- **AC-8 (3 위치 동일 키):** KPI 카드(§6-4) + Progress legend(§6-5) + Add Result 버튼(§8-1) + Filter select(§7-1) + Step select(§8-3) + ResultDetailModal Step Results status(§11-1) → **6 군데 모두 `common.passed|failed|blocked|retest|untested` 만 참조**. ✅

---

## 18. Developer 인수 체크리스트

작업 착수 전 본 스펙을 기준으로 다음을 사전 확인:

- [ ] §5 번들 트리 도식 열어 두고, 신규 키를 `en/runs.ts` 의 `runs.detail.*` 아래 정확한 계층에 넣기
- [ ] §3-2 재사용 매트릭스 상단에 두고, 코드 변경 시 먼저 `common.*` / `runs.aiSummary.*` / 기존 `runs.*` 에서 grep 으로 동일 값 존재 여부 확인
- [ ] §6 ~ §11 섹션별 표의 각 행을 **하드코딩 삭제 + `t()` 호출 교체** 형태로 1:1 매칭
- [ ] §12 toast 25 유니크 키 전부 번들 반영 (29 호출처 모두 교체)
- [ ] §13 AC-11 한국어 하드코딩 29건 전수 제거. `grep -P '[가-힣]' src/pages/run-detail/page.tsx` 로 최종 0건 검증 (단 `.i18nignore` 영역 제외)
- [ ] §14 단축키 기호 (`Cmd+Shift+F`, `Enter`, `PROJ-123`) 는 번역 키 **값 안에 그대로** 삽입, interpolation 으로 분리하지 않음
- [ ] §15 PDF / Jira / GitHub 외부 송출 문자열은 **건드리지 않음** + `.i18nignore` §4-5 규칙 확장
- [ ] §16 날짜·시간: `formatShortDate(iso)` / `formatLongDateTime(iso, language)` 헬퍼 사용. 인라인 `toLocaleDateString/String` 0건
- [ ] §16-1 인라인 `... > 1 ? 's' : ''` / `!== 1 ? 's' : ''` 조건문 4건 전수 제거 → i18next `count` 위임
- [ ] `useTranslation(['common'])` → `useTranslation(['common', 'runs'])` 로 확장 (본체 함수 + ResultDetailModal 서브 함수 모두)
- [ ] `.i18nignore` 에서 `src/pages/run-detail/page.tsx` 라인 제거 (최종 PR-C 머지 시점)
- [ ] `npm run scan:i18n` exit 0 + `npm run scan:i18n:parity` en↔ko diff 0 확인

---

## 19. Out of Scope (Designer 관점 재확인)

Dev Spec §9 동일. 본 스펙 카피로 처리하지 않는 영역:

- Plan-detail / 공유 컴포넌트(DetailPanel, FocusMode, ExportModal, StatusBadge, Avatar, ProjectHeader)
- Edge Function 서버 에러 메시지 번역 (백엔드 영문 고정, 프론트 `error.message` 패스스루)
- Jira / GitHub payload body 영문 템플릿
- PDF Export HTML 내부 라벨
- AI 생성 요약 본문 (AIRunSummaryPanel 전담)
- Claude 프롬프트 locale 힌트 (f013)
- 통화 현지화 (`$19/mo` → `₩XX,XXX/월`, f014)
- 유저 입력 데이터 (Run 이름 / TC 제목 / 폴더 이름 / 작성자명)
- CSV / Excel export 파일 헤더
- Slack / Email 전송 본문 템플릿

---

## 20. 변경 이력

| 일자 | 작성자 | 내용 |
|------|-------|------|
| 2026-04-21 | @designer | 최초 작성 (Phase 2b run-detail) |

**끝.**
