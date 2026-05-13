# Competitor: Kiwi TCMS

> Slug: `kiwi-tcms` · Last researched: 2026-05-13

## 1. Product Snapshot

- **공식 사이트:** https://kiwitcms.org / https://github.com/kiwitcms/Kiwi
- **가격 (as of 2026-05):**
  - Community Edition: 무료 (Docker 셀프호스팅, GPL-2.0, 무보증)
  - Self Support: $25/month — 셀프호스팅 + tagged release 접근 + 제한적 지원
  - Private Tenant: $75/month — SaaS 호스팅 + 기술 지원 (Mon-Fri, 10-16 UTC)
  - Private Tenant Extras: $150/month (2× Private Tenant) — raw SQL 익스포트 + 암호화 접근
  - Enterprise: $600/month — 온프레미스 + 전체 관리 패널 + OAuth/LDAP/Kerberos
  - Managed Hosting: $2,000/month — AWS 호스팅 + 포괄 지원 (Mon-Sun, 07-22 UTC)
  - 연간 결제 시 5~10% 할인
- **무료 플랜:** Community Edition (셀프호스팅, Docker 지식 필요, 보증 없음)
- **트라이얼:** 무료 demo / SaaS 구독 trial 가능
- **주요 기능:**
  1. 오픈소스 테스트 케이스 관리
  2. 테스트 플랜, 테스트 런, 실행 추적
  3. 버그 트래커 1-click 연동 (GitHub, GitLab, Jira, Bugzilla 등)
  4. CI/CD 자동화 프레임워크 플러그인 (pytest, nose, JUnit, Robot Framework 등)
  5. JSON REST API
  6. IEEE 829 호환
  7. 다중 네임스페이스 (Enterprise — multi-tenant)
  8. OAuth, LDAP, Kerberos 인증 (Enterprise)
  9. 보고서 및 분석
  10. SCIM provisioning (Enterprise)
- **통합:** GitHub, GitLab, Jira, Bugzilla, Redmine + 다수 자동화 프레임워크
- **타겟 고객:** 오픈소스 애호가, 인프라 자체 운영 팀, 정부·국방 기관 (AstraZeneca, Airbus Cybersecurity, U.S. DoD 사례), 비용 절감 우선 팀

## 2. User Pain Points (커뮤니티 / 리뷰 사이트)

1. **셀프호스팅 운영 부담**
   Community Edition은 Docker 설치, DNS 설정, SSL 인증서, 업그레이드, 백업을 모두 직접 관리해야 함. DevOps 리소스 없는 팀에게 실질적 장벽.
   — Source: https://kiwitcms.org/blog/kiwi-tcms-team/2026/02/18/community-edition-explained/

2. **UI/UX 구식**
   오픈소스 특성상 디자인 투자가 적음. 모던 SaaS 대비 UX가 열위.
   — Source: https://www.softwaresuggest.com/kiwi-tcms

3. **Community Edition 광고 노출**
   "Community edition comes with built-in advertisement from EthicalAds" — 유료 구독자만 광고 없는 UI 사용 가능.
   — Source: https://kiwitcms.org/

4. **지원 시간 제한 (Private Tenant: Mon-Fri 10-16 UTC)**
   유럽 시간대 외 팀, 미국 팀에게 지원 접근성 저하.
   — Source: https://kiwitcms.org/

5. **Managed Hosting이 $2,000/mo — 중소기업에 부적합**
   완전 관리형 SaaS를 원하면 $2,000/mo (연 $24,000). 중소기업 예산 초과.
   — Source: https://kiwitcms.org/

## 3. Testably Differentiation (우리 우위 3개)

1. **셋업 없이 즉시 사용 — SaaS 순수형**
   Kiwi TCMS Community는 Docker 셋업, SSL, 백업 직접 관리. Testably는 가입 후 5분 이내 시작. 카피 hook: *"Skip the Docker rabbit hole. Be testing in 5 minutes."*

2. **모던 AI UX — 오픈소스 대비 압도적**
   Kiwi TCMS는 AI 기능 없음. Testably는 AI 테스트 생성, 탐색적 테스팅, Focus Mode 등 모던 UX. 카피 hook: *"Open source gave you control. Testably gives you AI."*

3. **합리적인 SaaS 가격 — Managed Hosting의 1/20 비용**
   Kiwi TCMS Managed Hosting $2,000/mo vs Testably Professional $99/mo. SaaS 편의성을 원하면 Testably가 훨씬 저렴. 카피 hook: *"All the convenience. None of the $2,000/month."*

## 4. Target Keywords (5~10개)

| 키워드 | 검색량 추정 | 검색 의도 |
|---|---|---|
| kiwi tcms alternative | low (<100) | commercial |
| open source test management alternative | mid (100~1K) | commercial |
| free test management self-hosted | low (<100) | commercial |
| kiwi tcms review | low (<100) | informational |
| open source tcm saas alternative | low (<100) | commercial |
| test management tool no setup | low (<100) | commercial |
| kiwi tcms pricing | low (<100) | commercial |
| self hosted test management | low (<100) | commercial |

## 5. Copy Hooks (3개)

1. **Alternative 페이지 H1:** "The Kiwi TCMS Alternative That's Ready in 5 Minutes (No Docker Required)"
2. **블로그 제목:** "Kiwi TCMS vs Testably: Open Source Self-Hosting vs Modern SaaS — What's the Real Cost?"
3. **vs 페이지 H1:** "Testably vs Kiwi TCMS: SaaS Convenience at 1/20th the Managed Hosting Price"

## 데이터 소스

- https://kiwitcms.org/
- https://github.com/kiwitcms/Kiwi
- https://kiwitcms.org/blog/kiwi-tcms-team/2026/02/18/community-edition-explained/
- https://www.softwaresuggest.com/kiwi-tcms
- https://technologycounter.com/products/kiwi-tcms
