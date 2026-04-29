# f028 — May 11 Launch Plan: @testably.kr/playwright-reporter 1.0.1

> 작성일: 2026-04-23
> 런칭일: **2026-05-11 (월)** — 09:01 KST / 00:01 PST
> 결정된 포지셔닝: **Option A — `1.0.1` stable 공개 런칭**
> 관련 Dev Spec: `docs/specs/dev-spec-f028-playwright-reporter.md`

---

## 1. 목표

- Product Hunt 당일 Top 5 진입
- Day 1: 50 이상 npm install
- Day 7: 10 이상의 외부 팀이 CI 파이프라인에 통합
- Professional plan upgrade 전환 문의 5건 이상

## 2. 런칭 포지셔닝 (Option A)

| 항목 | Before (alpha) | After (stable) |
|------|---------------|----------------|
| npm `latest` 태그 | `1.0.0` (2026-04-07 stale) | `1.0.1` (2026-05-11 기준 최신) |
| 마케팅 문구 | "0.1.0-alpha — kick the tires" | "1.0 stable — production-ready, frozen API, strict SemVer" |
| SDK 헤더 | `.../0.1.0-alpha.0` | `.../1.0.1` |
| 유저 기대치 | Early-access, breaking 가능 | Stable, breaking=major bump |

## 3. 출시 아티팩트

### 코드
- `packages/core/package.json` → `1.0.1`
- `packages/playwright/package.json` → `1.0.1` (+ `reporter-core` dep `1.0.1`)
- `packages/core/src/client.ts` `SDK_VERSION` → `1.0.1`
- `packages/playwright/src/reporter.ts` `SDK_AGENT` → `.../1.0.1`
- `packages/core/CHANGELOG.md` + `packages/playwright/CHANGELOG.md` → 1.0.1 entry
- `packages/playwright/README.md` → Status 1.0.1

### 마케팅 (모두 1.0.1 stable 문구로 통일됨)
- `docs/marketing/f028-product-hunt-launch.md`
- `docs/marketing/f028-blog-ship-results-3-lines.md`
- `docs/marketing/f028-twitter-thread.md`
- `docs/marketing/f028-changelog.md`
- `docs/marketing/f028-readme-draft.md` (보조 자료)

### 런칭 이미지 (3종, 별도 제작 필요)
1. **Before/After split** — CI 결과 수동입력 vs Testably 자동싱크
2. **3-line setup code snippet** — `playwright.config.ts` + CI Secrets
3. **Results in Testably dashboard** — 실제 CI 싱크 결과 스크린샷
> 제작 스펙은 `docs/marketing/f028-product-hunt-launch.md` §Launch Image Concepts 참고.

## 4. 18-일 타임라인 (T-18 → T+7)

### Phase 1 — 버전/콘텐츠 정리 (T-18 ~ T-14, 4/23-4/27)

| 일자 | 작업 | 담당 | 상태 |
|------|------|------|------|
| 4/23 (수) | 버전 1.0.1 bump, CHANGELOG, 마케팅 5종 alpha→stable 리라이트 | Claude | ✅ |
| 4/23 (수) | 본 launch plan 문서 작성 | Claude | ✅ |
| 4/24 (목) | CEO 리뷰 — 콘텐츠 톤/메시지 최종 승인 | CEO | 대기 |
| 4/25 (금) | `sdk-core-v1.0.1` + `sdk-playwright-v1.0.1` 태그 → GitHub Actions publish | CEO | 대기 |
| 4/26 (토) | npm `latest` 태그가 `1.0.1`로 갱신됐는지 검증 (`npm view ... dist-tags`) | Claude | 대기 |
| 4/27 (일) | `npm install @testably.kr/playwright-reporter` 로 신규 프로젝트 E2E 검증 | Claude + CEO | 대기 |

### Phase 2 — 자산 제작 (T-13 ~ T-7, 4/28-5/4)

| 일자 | 작업 | 담당 | 상태 |
|------|------|------|------|
| 4/23 (수) | @designer 에이전트가 런칭 이미지 디자인 스펙 작성 → `docs/specs/design-spec-f028-launch-images.md` | @designer | ✅ |
| 4/23 (수) | HTML + Playwright 빌드로 Image 1/2/3 PNG v1 생성 → `docs/marketing/assets/f028/` | Claude | ✅ |
| 4/28-4/30 | Image 3 의 목업 대시보드 → 실제 Testably 앱 스크린샷으로 교체 (진정성 강화) + Figma 최종 터치 (선택) | CEO | 대기 |
| 5/1 (금) | Product Hunt 초안 등록 (비공개 preview) | CEO | 대기 |
| 5/2 (토) | 블로그 포스트 최종 교정 — `docs/marketing/f028-blog-ship-results-3-lines.md` | CEO | 대기 |
| 5/3 (일) | 트위터 스레드 예약 세팅 (Buffer 또는 Typefully) | CEO | 대기 |
| 5/4 (월) | ~~Loops 이메일 캠페인 초안~~ → **보류** (Day 1 성과 보고 재결정) | — | 보류 |

### Phase 3 — 사전 빌드업 (T-6 ~ T-2, 5/5-5/9)

| 일자 | 작업 | 담당 | 상태 |
|------|------|------|------|
| 5/5 (화) | PH "Coming Soon" 페이지 공개 → 트위터에 티저 | CEO | 대기 |
| 5/6 (수) | 내부 회귀 테스트 — 3개 샘플 repo(Next.js, Nuxt, Remix)에서 CI 통합 확인 | Claude | 대기 |
| 5/7 (목) | PH Hunter 섭외 확정 (없으면 self-hunt) | CEO | 대기 |
| 5/8 (금) | GitHub `CODEOWNERS` + `.github/FUNDING.yml` + 리포 README SDK 링크 보강 | Claude | 대기 |
| 5/9 (토) | Product Hunt 24h 부스트용 Slack/Discord 커뮤니티 타겟 리스트 확정 | CEO | 대기 |

### Phase 4 — 런칭 전일 점검 (T-1, 5/10 일)

| 시간 (KST) | 작업 | 담당 |
|-----------|------|------|
| 09:00 | `npm view @testably.kr/playwright-reporter@latest` → `1.0.1` 확정 확인 | Claude |
| 10:00 | Testably 프로덕션에서 upload-ci-results 엔드포인트 smoke test | Claude |
| 11:00 | 테스트 계정으로 신규 repo → CI 연결 → 실제 업로드 성공까지 완료 | CEO |
| 13:00 | 모든 마케팅 콘텐츠의 URL 라이브 여부 확인 (npm, GitHub, blog, pricing) | Claude |
| 15:00 | Product Hunt submit 초안 재확인 (tagline, 이미지 3종, maker comment) | CEO |
| ~~17:00~~ | ~~Loops 이메일 예약~~ → 보류 | — |
| 21:00 | 최종 go/no-go 결정 | CEO |

### Phase 5 — 런칭 당일 (T-Day, 5/11 월)

| 시간 (KST) | 작업 | 담당 |
|-----------|------|------|
| 00:01 (PST) / 16:01 (전일 KST) | Product Hunt submit → public | CEO |
| 09:01 | 트위터 스레드 라이브 (11-tweet thread) | CEO |
| 09:05 | 블로그 포스트 publish (testably.app/blog) | CEO |
| 09:10 | LinkedIn 포스팅 (blog 링크 + 요약) | CEO |
| ~~10:00~~ | ~~Loops 이메일 발송 트리거~~ → 보류 | — |
| 10:30 | Hacker News 서브미션 — `Show HN: Playwright reporter for Testably` | CEO |
| 11:00 | Dev.to / Medium 크로스포스팅 | @marketer |
| 11:00-24:00 | PH 댓글 즉시 응답 (목표: 응답 지연 15분 이내) | CEO + Claude 보조 |
| 23:00 | Day 1 메트릭 대시보드 캡처 (npm downloads, PH votes, signups) | Claude |

### Phase 6 — 런칭 후 대응 (T+1 ~ T+7, 5/12-5/18)

| 일자 | 작업 | 담당 |
|------|------|------|
| 5/12 (화) | 버그 리포트 triage → `1.0.2` hotfix 필요 여부 판단 | Claude + CEO |
| 5/13 (수) | **🎯 Cypress Reporter `1.0.1` 공개 런칭** (별도 섹션 §9 참고) | CEO |
| 5/14 (목) | Day 3 review — Playwright+Cypress 전환 깔때기 분석 | CEO |
| 5/15 (금) | 고객 인터뷰 — 통합 완료한 첫 3팀 1:1 피드백 + Retrospective 노트 | CEO |
| 5/16-18 (토-월) | `1.0.2` 패치 (필요 시) + Jest Reporter SDK 초안 | 팀 전체 |

## 5. 커뮤니케이션 채널 체크리스트

- [ ] Product Hunt (`testably.app/playwright-reporter` 페이지)
- [ ] 트위터 (@testably_app 계정 — 11-tweet thread)
- [ ] Testably 블로그 (`testably.app/blog/playwright-reporter-ci-integration`)
- [ ] ~~Loops 이메일~~ → Day 1 성과 보고 재결정 (보류)
- [ ] Dev.to 크로스포스트
- [ ] Hacker News `Show HN`
- [ ] Reddit `/r/QualityAssurance`, `/r/webdev` (Show-off 금지 규정 확인)
- [ ] LinkedIn 개인 + 회사 페이지
- [ ] GitHub Release Notes (testably/testflow repo)
- [ ] Discord/Slack 기존 유저 커뮤니티 공지

## 6. KPI & 측정

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| PH Day 1 votes | 200+ | PH 페이지 직접 |
| PH Day 1 ranking | Top 5 | PH leaderboard |
| npm Day 1 downloads | 50+ | `npm view ... downloads` |
| npm Day 7 downloads | 500+ | 동일 |
| GitHub star Day 7 | +30 | GH API |
| Professional plan 업그레이드 문의 | 5+ | Intercom 태그 `playwright-reporter` |
| CI 통합 완료한 외부 팀 수 | 10+ | `upload-ci-results` 호출한 unique workspace count |

## 7. 리스크 & 컨틴전시

| 리스크 | 대응 |
|--------|------|
| `1.0.1` 배포 후 치명 버그 발견 | `1.0.2` hotfix 즉시 publish — publish-sdk.yml 은 태그 push만으로 자동 배포 |
| PH submit 당일 reject (duplicate, guideline) | 이틀 버퍼 — 5/13 재등록, 준비 콘텐츠는 모두 그대로 재사용 |
| Supabase Edge Function 다운 | 로드밸런서 상태 모니터링 + 사전 보강 스크립트 `supabase/functions/upload-ci-results/` 의 rate limit 완화 |
| CI Secrets 설정 문서 오해 → 실패 리포트 폭주 | README 의 `## 5-minute quick start` 섹션 선점 강화 + `dryRun` 모드 적극 안내 |
| Free/Hobby 유저가 403 문의 폭주 | 현재 reporter 의 "upgrade notice" 메시지가 이미 존재. PH 댓글 템플릿에도 미리 준비 |

## 8. Confirmed Decisions (2026-04-23 CEO 확정)

| # | 질문 | 확정 |
|---|------|------|
| 1 | PH Hunter | **Self-hunt** (섭외 불가) |
| 2 | 런칭 이미지 | **@designer 에이전트가 디자인 스펙 작성 → `docs/specs/design-spec-f028-launch-images.md`** |
| 3 | 블로그 퍼블리시 | **Crosspost**: `testably.app/blog` (canonical) + `dev.to` (rel=canonical 설정) |
| 4 | 5/11 당일 on-call | CEO + Claude 보조 (메인 상주) |
| 5 | Loops 이메일 캠페인 | **보류** — Day 1 이후 성과 보고 재결정 |

### Self-hunt 체크리스트 (PH)

- [ ] PH 계정 "maker" 프로필 완비 (프로필 사진, bio, 이전 launch 경력 링크)
- [ ] 런칭 24시간 전 PH 계정으로 Testably follow/보드 팔로워 확보
- [ ] 5/11 00:01 PST 에 self-submit, maker comment 즉시 고정
- [ ] 첫 3시간 내 50 vote 확보 (Discord/개인 네트워크 중심)

### 블로그 crosspost 절차

1. **Primary**: `testably.app/blog/playwright-reporter-ci-integration` 먼저 publish (5/11 09:05 KST)
2. **Dev.to crosspost**: `canonical_url: https://testably.app/blog/playwright-reporter-ci-integration` 메타 설정 (SEO 중복 방지)
3. dev.to 태그: `#playwright`, `#qa`, `#testing`, `#ci`, `#devops`
4. Medium 은 Phase 6 까지 보류 (반응 보고 선택적으로 crosspost)

---

## 부록 A — npm 배포 명령

```bash
# 1. 버전 커밋 + 태그
git add packages/core/package.json packages/playwright/package.json \
        packages/core/CHANGELOG.md packages/playwright/CHANGELOG.md \
        packages/core/src/client.ts packages/playwright/src/reporter.ts \
        packages/playwright/README.md
git commit -m "release: SDK 1.0.1 stable for May 11 launch"
git push origin claude

# 2. CEO 가 main 머지 후 태그 push (publish-sdk.yml 자동 트리거)
git tag sdk-core-v1.0.1 -m 'release: reporter-core 1.0.1'
git tag sdk-playwright-v1.0.1 -m 'release: playwright-reporter 1.0.1 stable'
git push origin sdk-core-v1.0.1
git push origin sdk-playwright-v1.0.1

# 3. 배포 후 확인
npm view @testably.kr/reporter-core dist-tags
npm view @testably.kr/playwright-reporter dist-tags
# expected: latest: 1.0.1
```

## 부록 B — Day-1 디버그 러쉬 체크포인트

- [ ] npm install 실패 리포트 → peer dep 문제인지 Node 버전 문제인지 구분
- [ ] 첫 upload 실패 리포트 → 403(plan), 401(token), 404(run_id) 구분
- [ ] Edge Function 응답 시간 p95 > 2s 시 알림 (Supabase dashboard)
- [ ] PH 댓글 중 "feature request" 는 별도 `docs/feedback/f028-ph-day1-feedback.md` 에 수집

---

## 9. Cypress Reporter SDK 2026-05-13 서브 런칭 (Option B)

> **전략:** 5/11 Playwright 런칭 48 시간 후 **별도 sub-launch**. 단일 SDK 가
> 아니라 **"SDK family"** 포지셔닝으로 헤드라인 재활성화 + 48h 안정성 버퍼.
> 구현 상태: **Ship-ready** (27e828a, 76/76 테스트 PASS — QA 리포트 `docs/qa/qa-report-cypress-reporter.md`).

### 9.1 5/13 타임라인 (KST)

| 시간 | 작업 | 담당 |
|------|------|------|
| 09:00 | `main` 머지 (claude → main, CEO 수동) | CEO |
| 09:30 | 루트 `README.md` 의 SDK 테이블 → "Stable" + npm 링크로 업데이트 (AC-J4) | CEO |
| 10:00 | `docs/marketing/f028-*.md` 의 "Coming Soon: Cypress" → "Available now" 플립 커밋 | CEO |
| 11:00 | `sdk-cypress-v1.0.1` 태그 push → publish-sdk.yml 자동 배포 | CEO |
| 11:10 | `npm view @testably.kr/cypress-reporter dist-tags.latest` → `1.0.1` 확인 | CEO |
| 11:30 | PH 코멘트 업데이트 ("Cypress Reporter is live as of today") | CEO |
| 12:00 | 트위터 **5-tweet thread** (Cypress 전용, Playwright thread 에 reply) | CEO |
| 13:00 | 블로그 포스트 게시 (`testably.app/blog/cypress-reporter-ci-integration`) | CEO |
| 14:00 | Dev.to 크로스포스트 | @marketer |
| 15:00 | LinkedIn 포스팅 | CEO |
| 15:30 | Hacker News `Show HN` (또는 skip — Playwright 때 썼으면 중복) | CEO |
| 16:00-24:00 | 댓글/이슈 대응 | CEO + Claude |

### 9.2 배포 명령 (부록)

```bash
# 사전: CEO 가 claude → main 수동 머지 완료 상태
git tag sdk-cypress-v1.0.1 -m 'release: cypress-reporter 1.0.1'
git push origin sdk-cypress-v1.0.1

# 배포 확인
npm view @testably.kr/cypress-reporter dist-tags
# expected: latest: 1.0.1
```

### 9.3 마케팅 플립 체크리스트

- [ ] `README.md` (루트) — SDK 테이블 cypress 행 "Planned" → "Stable (1.0.1)" + npm 링크
- [ ] `docs/marketing/f028-product-hunt-launch.md` — "Coming Soon" 섹션 제거 or 업데이트
- [ ] `docs/marketing/f028-blog-ship-results-3-lines.md` — Cypress 언급 활성
- [ ] `docs/marketing/f028-twitter-thread.md` — Cypress reply thread 초안 추가
- [ ] `docs/marketing/f028-changelog.md` — Cypress 1.0.1 엔트리 추가
- [ ] `packages/cypress/README.md` status 라인 확인 (이미 "1.0.1 stable" 완료)

### 9.4 Day-1 Cypress KPI

| 지표 | 목표 |
|------|------|
| npm Day 1 downloads | 30+ (Playwright 의 60%) |
| GitHub star 증가 | +10 |
| Cypress Professional upgrade 문의 | 2+ |
| Playwright thread 에 달린 reply 인지율 | 30%+ (리트윗/좋아요 측정) |

### 9.5 리스크 & 컨틴전시

| 리스크 | 대응 |
|--------|------|
| 5/11 Playwright 런칭에서 critical 버그 발견 → 5/13 일정 연기 | Cypress 는 5/18 로 슬라이드, 동일 콘텐츠 재사용 |
| npm publish 실패 (OIDC 토큰 만료 등) | 부록 A 의 publish-sdk.yml 디버그 가이드 재활용 |
| "왜 Cypress 가 Playwright 보다 늦어요?" 질문 | 답변 템플릿: "Playwright stable 검증 후 48h 버퍼로 품질 보장. 코어는 같은 `@testably.kr/reporter-core`." |
