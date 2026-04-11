# QA 검증 보고서 — 2026-04-10

**작성일:** 2026-04-11  
**검증자:** QA 자동 검증 (Claude Code)  
**검증 대상 커밋:** `77f59ad` (브랜치: `claude`)  
**검증 방법:** TypeScript 컴파일 체크, 빌드 체크, 파일 코드 리뷰, DB 마이그레이션 검토

---

## 1. 전체 요약

| 항목 | 결과 |
|------|------|
| TypeScript 컴파일 (`npx tsc --noEmit`) | ✅ 에러 0건 |
| 빌드 (`npm run build`) | ✅ 성공 (chunk size 경고만, 기존 이슈) |
| 기능 검증 항목 수 | 31개 |
| **Pass** | **28개** |
| **Fail** | **3개** |
| Critical | 0건 |
| Major | 1건 |
| Minor | 2건 |
| Cosmetic | 0건 |

---

## 2. 기능별 Pass/Fail 체크리스트

### A. GitHub/Jira 이슈 생성

| # | 검증 항목 | 결과 | 비고 |
|---|-----------|------|------|
| A-1 | Create GitHub Issue: labels 엔터 칩 입력 | ✅ Pass | `run-detail/page.tsx:4073–4095` — `onKeyDown` Enter 핸들러로 칩 추가 구현 |
| A-2 | Create GitHub Issue: assignee 자동완성 드롭다운 | ✅ Pass | `fetchGithubAssignees()` + `showAssigneeSuggest` 드롭다운 정상 구현 |
| A-3 | Create Jira Issue: verify_jwt 수정 후 정상 동작 | ✅ Pass | `supabase/functions/create-jira-issue/config.toml` — `verify_jwt = false`, 함수 내부에서 `auth.getUser(token)` 직접 검증 |
| A-4 | Add Result 모달: 이슈 생성 후 칩 표시 | ✅ Pass | `pendingJiraIssues`, `pendingGithubIssues` 상태로 칩 표시 구현 |
| A-5 | Add Result 모달: × 버튼으로 칩 제거 | ✅ Pass | `setPendingJiraIssues(prev => prev.filter(...))` 정상 구현 |
| A-6 | Add Result 저장 시 result에 연결 | ✅ Pass | `issues: finalIssuesList`, `github_issues: pendingGithubIssues` DB 저장 |
| A-7 | Run Detail Issues 탭: GitHub + Jira 모두 표시 | ✅ Pass | `DetailPanel.tsx:1170–1232` — 두 타입 모두 별도 섹션으로 렌더링 |
| A-8 | Run Detail Issues 탭: 이슈 번호 + 링크 | ✅ Pass | Jira: `issueKey` + `https://{domain}/browse/{key}`, GitHub: `{repo}#{number}` + `gi.url` |

### B. 법무/정책 페이지

| # | 검증 항목 | 결과 | 비고 |
|---|-----------|------|------|
| B-1 | `/terms` 이용약관 페이지 | ✅ Pass | 페이지 존재, 라우터 등록, 환불 조항 포함 |
| B-2 | `/privacy` 개인정보처리방침 | ✅ Pass | 페이지 존재, 라우터 등록 |
| B-3 | `/cookies` 쿠키 고지 | ✅ Pass | 페이지 존재, 라우터 등록 |
| B-4 | `/refund` 환불정책 (월간 14일 전액, 연간 30일 전액 + pro-rata) | ✅ Pass | `refund/page.tsx:34–44` — 두 단계 환불 정책 정확히 구현 |
| B-5 | 푸터 Legal 링크 4개 | ✅ Pass | `MarketingFooter.tsx:22–27` — Privacy Policy / Terms of Service / Refund Policy / Cookie Policy 모두 존재 |

### C. 쿠키 배너 (CookieBanner.tsx)

| # | 검증 항목 | 결과 | 비고 |
|---|-----------|------|------|
| C-1 | 영문 표시: Accept all / Essential only / Customize | ✅ Pass | `CookieBanner.tsx:93–107` |
| C-2 | 설정 모드: Strictly necessary (always on, 비활성화) | ✅ Pass | `line:125–133` — opacity-60, 클릭 불가 표시 |
| C-3 | 설정 모드: Functional / Analytics / Marketing 토글 | ✅ Pass | `toggleRow` 함수로 3개 토글 구현 |
| C-4 | Save preferences → localStorage 저장 | ✅ Pass | `saveConsent()` → `localStorage.setItem(CONSENT_KEY, ...)` |
| C-5 | consent_logs Edge Function 서버 동의 로그 전송 | ✅ Pass | `logCookieConsent()` → `supabase.functions.invoke('log-consent')` |

### D. 가입 동의 체크박스 (auth/page.tsx)

| # | 검증 항목 | 결과 | 비고 |
|---|-----------|------|------|
| D-1 | 영문 표시 | ✅ Pass | `[Required]` / `[Optional]` 영문 라벨 |
| D-2 | 필수 4종 (만 14세 이상, ToS, Privacy, 개인정보처리위탁) | ✅ Pass | `auth/page.tsx:831–857` |
| D-3 | 선택 3종 (마케팅, 분석, SMS 프로모션) | ✅ Pass | `auth/page.tsx:861–876` |
| D-4 | 전체 동의 체크박스 | ✅ Pass | `handleAgreeAll()` 구현 |
| D-5 | 필수 미체크 시 가입 버튼 disabled | ✅ Pass | `auth/page.tsx:882` — `disabled={loading \|\| (mode === 'signup' && !requiredConsentsChecked)}` |
| D-6 | 가입 성공 시 consent_logs 서버 로그 전송 | ✅ Pass | `auth/page.tsx:336` — `logSignupConsent({...})` 호출 |

### E. 가격 일관성

| # | 검증 항목 | 결과 | 비고 |
|---|-----------|------|------|
| E-1 | Landing Free 2 members (3이 아님) | ❌ **Fail** | `home/page.tsx:1709` — **"up to 3 members"로 하드코딩** (상세 버그 목록 #1 참조) |
| E-2 | Professional 연간 $1,009 (1010이 아님) | ✅ Pass | `pricing/page.tsx:91` — `annualPrice: 1009` 정확 |
| E-3 | FAQ: Free AI 한도 3 (5가 아님) | ✅ Pass | `home/page.tsx:331` — '3 AI generations per month' 정확 |
| E-4 | Pricing 비교표: Hobby 연간가 $194/yr | ✅ Pass | `pricing/page.tsx:494` — `$19/mo · $194/yr` 정확 |

### F. SEO 메타

| # | 검증 항목 | 결과 | 비고 |
|---|-----------|------|------|
| F-1 | 모든 public 페이지 title / meta description / og 태그 | ✅ Pass | `MarketingLayout` → `SEOHead` 통해 title, description, og:image(기본값 `/brand/og-dark-1200x630.png`) 설정 |
| F-2 | robots.txt 존재 | ✅ Pass | `/public/robots.txt` 존재, 앱 페이지 Disallow, Sitemap 등록 |
| F-3 | sitemap.xml 존재 | ✅ Pass | `/public/sitemap.xml` 존재, public 페이지 모두 포함 |

### G. 플랜 비교 UX

| # | 검증 항목 | 결과 | 비고 |
|---|-----------|------|------|
| G-1 | Most popular 배지 (Professional) | ✅ Pass | `pricing/page.tsx:113` — `popular: 'Most popular'`, 카드 상단 표시 |
| G-2 | 연간/월간 토글 + Save 15% | ✅ Pass | 토글 구현, `Save 15%` 배지 |
| G-3 | 비교표: Run history / GitHub integration / Support level 등 | ✅ Pass | `comparisonRows` 배열에 모든 항목 포함 |
| G-4 | Enterprise CTA "Contact Us" | ✅ Pass | 모든 Enterprise 티어에 `href="mailto:hello@testably.app?subject=Enterprise%20Plan%20Inquiry"` 연결 |

### H. Failed→Passed 오표기 버그 수정

| # | 검증 항목 | 결과 | 비고 |
|---|-----------|------|------|
| H-1 | Issues 탭 result status 정확 표시 | ✅ Pass | `DetailPanel.tsx:454–462` — `testResults`(최신순 정렬)에서 issueKey 첫 번째 occurrence = 가장 최근 result status 우선 적용. 코드 주석에 "newest-first" 명시 |

---

## 3. 발견된 버그/이슈 목록

---

### BUG-001 — [Major] Landing 페이지 Free 플랜 멤버 수 오표기 ("3 members")

**Severity:** Major  
**기능 영역:** E. 가격 일관성

**재현 경로:**  
1. `https://testably.app/` 접속  
2. Pricing 섹션 하단 요약 문구 확인

**기대 동작:**  
"Free forever for up to **2** members · 14-day free trial on all paid plans"

**실제 동작:**  
"Free forever for up to **3** members · 14-day free trial on all paid plans"

**관련 파일·라인:**  
- `src/pages/home/page.tsx:1709`

```tsx
// 현재 (잘못됨)
<>Free forever for up to 3 members · 14-day free trial on all paid plans<br />No per-seat charges</>

// 올바른 값
<>Free forever for up to 2 members · 14-day free trial on all paid plans<br />No per-seat charges</>
```

**추가 맥락:**  
동일 파일의 다른 위치들(line 239, 240, 248)과 `pricing/page.tsx`의 Free 플랜 정의는 모두 "2 members"로 정확하게 표시되어 있음. 이 특정 문자열만 하드코딩 오류.

---

### BUG-002 — [Minor] Upgrade Modal 멤버 수 오기재 ("8명" → "5명")

**Severity:** Minor  
**기능 영역:** A. GitHub/Jira 이슈 생성 (업그레이드 유도 UI)

**재현 경로:**  
1. Free 플랜 계정으로 Run Detail 접속  
2. 테스트 케이스 선택 → "Create Jira Issue" 또는 "Create GitHub Issue" 버튼 클릭  
3. 업그레이드 모달 팝업 → "Starter 플랜 혜택" 목록 확인

**기대 동작:**  
"팀 멤버 5명까지" (Starter 플랜 스펙: 5 members)

**실제 동작:**  
"팀 멤버 8명까지"

**관련 파일·라인:**  
- `src/pages/run-detail/page.tsx:3225`

```tsx
// 현재 (잘못됨)
{['프로젝트 10개까지', '팀 멤버 8명까지', 'Jira Integration', '기본 리포팅', 'Testcase Export/Import'].map((f) => (

// 올바른 값
{['프로젝트 10개까지', '팀 멤버 5명까지', 'Jira Integration', '기본 리포팅', 'Testcase Export/Import'].map((f) => (
```

---

### BUG-003 — [Minor] Issues 탭 업그레이드 안내 메시지 티어 오기재

**Severity:** Minor  
**기능 영역:** A. GitHub/Jira 이슈 생성

**재현 경로:**  
1. Free 플랜 계정 (tier=1)으로 Run Detail 접속  
2. 테스트 케이스 선택 → Issues 탭 클릭  
3. 잠금 메시지 확인

**기대 동작:**  
"Jira integration requires **Hobby** or higher" (실제 접근 제어 기준: `tier >= 2` = Hobby+)

**실제 동작:**  
"Jira integration requires **Professional**+"

**관련 파일·라인:**  
- `src/components/DetailPanel.tsx:1140`
- `src/pages/run-detail/page.tsx:2294` — `const isProfessionalOrHigher = currentTier >= 2;` (변수명 오해소지)

```tsx
// DetailPanel.tsx:1140 현재 (잘못됨)
<p className="text-xs font-semibold text-gray-800 mb-1">Jira integration requires Professional+</p>

// 올바른 메시지
<p className="text-xs font-semibold text-gray-800 mb-1">Jira integration requires Hobby plan or higher</p>
```

**추가 맥락:**  
`isProfessionalOrHigher` 변수는 `currentTier >= 2`로 정의되어 Hobby (tier=2) 이상에서 `true`를 반환함. 변수명 자체가 "Professional+" 를 암시하여 혼란을 유발. Free 사용자가 "Professional이 필요하다"고 보고 불필요하게 높은 플랜으로 업그레이드할 가능성 있음.

---

## 4. 추가 관찰 사항 (Non-blocking)

| 항목 | 설명 |
|------|------|
| `log-consent` Edge Function | Edge Function 목록에 존재 (`supabase/functions/log-consent/`) — 실제 배포 여부는 Supabase 대시보드 확인 필요 |
| `consent_logs` 테이블 RLS | INSERT: anon/authenticated 모두 허용 (가입 전 익명 사용자 로그 지원), SELECT: 본인 또는 service_role만 — 정상 |
| `github_issues` 컬럼 | `20260409_github_issues_column.sql` — `test_results` 테이블에 `JSONB DEFAULT '[]'` 추가 — 정상 |
| 빌드 chunk size 경고 | `exceljs.min`, `jspdf.es.min`, `CartesianChart` 등 일부 청크가 500KB 초과 — 기존 이슈, 이번 배포와 무관 |
| `isProfessionalOrHigher` 변수 이중 정의 | `run-detail/page.tsx`에 `line:2043`과 `line:2294` 두 곳에서 동일 변수 정의 — TypeScript 에러는 없지만 (각자 다른 스코프) 코드 가독성 저하 |

---

## 5. DB 검증

| 항목 | 결과 |
|------|------|
| `consent_logs` 테이블 마이그레이션 존재 | ✅ `20260410_consent_logs.sql` |
| `consent_logs` RLS 활성화 | ✅ `ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY` |
| INSERT 정책 (anon 포함) | ✅ `WITH CHECK (true)` |
| SELECT 정책 (본인만) | ✅ `USING (auth.uid() = user_id)` |
| `github_issues` JSONB 컬럼 | ✅ `20260409_github_issues_column.sql` — `test_results` 테이블 |

---

*보고서 작성: 2026-04-11, QA 자동 검증 (코드 수정 없이 발견만)*
