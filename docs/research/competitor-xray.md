# Competitor: Xray (Atlassian Marketplace)

> Slug: `xray` · Last researched: 2026-05-13

## 1. Product Snapshot

- **공식 사이트:** https://www.getxray.app / https://marketplace.atlassian.com/apps/1211769/xray-test-management-for-jira
- **가격 (as of 2026-05):**
  - Cloud (Atlassian Marketplace 기준): $100/year for up to 10 Jira users (Standard). 10명 초과 시 per-Jira-user 단가 ($1/user/month~, 규모에 따라 하락)
  - Standard 에디션: 스토리지 100GB, API 60 req/min, Manual Step Library 10개
  - Advanced 에디션: 스토리지 250GB, API 100 req/min, AI Test Script Generation 추가
  - Enterprise: 별도 앱으로 제공 (marketplace.atlassian.com/apps/1229688/xray-enterprise), custom pricing
  - 모든 Cloud 플랜은 Jira Cloud 구독 필수
- **무료 플랜:** 없음. 트라이얼만 제공.
- **트라이얼:** Standard/Advanced 모두 free trial 가능
- **주요 기능:**
  1. Jira native 테스트 케이스 관리 (테스트를 Jira 이슈로 관리)
  2. BDD (Gherkin) 지원
  3. AI Test Case Generation (Standard)
  4. AI Test Script Generation (Advanced)
  5. Xray Enterprise: Visual Test Model Generation
  6. 탐색적 테스팅
  7. 자동화 결과 수집 (CI/CD 연동 — Enterprise 필요)
  8. Traceability: 요구사항 → 테스트 → 버그
  9. Cross-project 리포팅
  10. REST / GraphQL API
- **통합:** Jira (필수), Jenkins (Enterprise), GitHub Actions (Enterprise), Bamboo, Robot Framework, Cucumber, TestNG, JUnit, Playwright 등 자동화 프레임워크
- **타겟 고객:** Jira 중심 엔터프라이즈 팀. 특히 BDD·자동화 비중이 높은 조직.

## 2. User Pain Points (G2 / Atlassian Community 리뷰)

1. **UI 복잡성 + 가파른 러닝 커브**
   "The learning curve can be a bit steep initially, especially when setting up test plans or test executions... some areas in Xray could be more user-friendly."
   — Source: https://www.g2.com/products/xray-test-management/reviews

2. **대용량 시 느린 응답**
   "Writing test steps in a test case with Xray cloud is slow, taking a couple of seconds to load and increasing time to complete tasks."
   — Source: https://www.g2.com/products/xray-test-management/reviews

3. **리포트 생성에 별도 플러그인 필요 (추가 비용)**
   "To generate or export some reports, you'd need Xporter (an additional plugin which costs extra) to enable this."
   — Source: https://thectoclub.com/tools/xray-review/

4. **Jenkins / GitHub CI 연동이 Enterprise에만 제공**
   "Connectors for tools such as Jenkins and GitHub require Xray enterprise licensing, which may be more costly."
   — Source: https://www.g2.com/products/xray-test-management/reviews

5. **Jira 완전 종속 — 독립 운영 불가**
   Xray는 Jira 이슈로 테스트를 관리하므로 Jira 없이는 아무것도 열람 불가.
   — Source: https://community.atlassian.com/forums/Jira-articles/Comparison-between-Zephyr-amp-Xray/ba-p/1504907

## 3. Testably Differentiation (우리 우위 3개)

1. **Jira 없이도 완전히 작동**
   Xray는 Jira 이슈 = 테스트 케이스 구조로 Jira 완전 의존. Testably는 Jira와 독립적으로 운영되며 선택적 two-way 연동 제공. 카피 hook: *"Your test cases are yours — not Jira issues that disappear if you cancel."*

2. **즉시 온보딩 — 복잡한 셋업 없음**
   Xray는 Jira 설정 + 플러그인 설치 + 역할 구성 필요. Testably는 5분 셋업. 카피 hook: *"Skip the Jira plugin rabbit hole. Be testing in 5 minutes."*

3. **Flat-rate 과금 — Jira 유저 수 상관없음**
   Xray는 Jira 유저 수 기준 과금. Testably는 QA 팀만을 위한 flat-rate. 카피 hook: *"Pay for testers, not the entire engineering org."*

## 4. Target Keywords (5~10개)

| 키워드 | 검색량 추정 | 검색 의도 |
|---|---|---|
| xray test management alternative | mid (100~1K) | commercial |
| xray jira alternative | mid (100~1K) | commercial |
| xray pricing | mid (100~1K) | commercial |
| xray vs zephyr | mid (100~1K) | commercial |
| xray test management review | mid (100~1K) | informational |
| jira test management plugin alternative | mid (100~1K) | commercial |
| xray bdd alternative | low (<100) | commercial |
| xray competitor | low (<100) | commercial |
| xray enterprise pricing | low (<100) | commercial |

## 5. Copy Hooks (3개)

1. **Alternative 페이지 H1:** "The Xray Alternative That Works Without Jira (and Costs Less)"
2. **블로그 제목:** "Xray vs Testably: Do You Really Need a Jira Plugin for Test Management?"
3. **vs 페이지 H1:** "Testably vs Xray: Standalone Platform vs Jira-Locked Plugin"

## 데이터 소스

- https://www.getxray.app/
- https://marketplace.atlassian.com/apps/1211769/xray-test-management-for-jira
- https://www.g2.com/products/xray-test-management/reviews
- https://thectoclub.com/tools/xray-review/
- https://www.automation-consultants.com/jira-test-case-management/
- https://testdino.com/blog/test-management-tools-pricing/
