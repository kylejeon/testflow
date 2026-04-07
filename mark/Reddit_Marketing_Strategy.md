# Testably × Reddit 마케팅 전략

**작성일:** 2026-04-08
**작성자:** Mark (Testably Marketing)
**중요:** Reddit은 자기 홍보에 가장 민감한 플랫폼입니다. 이 문서의 순서대로 진행하지 않으면 계정이 shadowban 처리될 수 있습니다.

---

## 0. 먼저 알아야 할 것: "글이 게시되지 않았어"의 원인

Kyle이 Reddit에 글을 올렸는데 게시되지 않았다면, 원인은 거의 항상 다음 중 하나입니다:

| 원인 | 증상 | 해결 |
|------|------|------|
| **계정 카르마 부족** | 글이 올라가는 것처럼 보이지만 남들에게 안 보임 (shadowban) | 카르마 쌓은 후 재시도 |
| **신규 계정 제한** | 특정 subreddit은 일정 카르마 이상만 게시 가능 | 해당 subreddit 규칙 확인 |
| **Spam 필터 걸림** | 링크 포함 게시글, 자기 도메인 반복 | 링크 없이 텍스트만 먼저 |
| **Mod 자동 삭제** | subreddit에 자기 홍보 금지 룰 | 해당 subreddit 사이드바 규칙 확인 |
| **도메인 필터** | 해당 도메인이 subreddit에서 차단됨 | 링크 없이 게시 후 댓글에 링크 |

**지금 당장 확인:** Reddit 계정에서 본인 글을 로그아웃 상태로 확인해보세요. 보이면 정상, 안 보이면 shadowban입니다.

---

## 1. Testably에 적합한 Subreddit 리스트

### Tier 1 — 핵심 타겟 (QA/테스팅 커뮤니티)

| Subreddit | 규모 | 자기홍보 | 특성 | 전략 |
|-----------|------|---------|------|------|
| **r/QualityAssurance** | ~50K | ❌ 금지 | QA 전문가들의 진지한 토론 공간. 광고성 글은 즉시 삭제 | 인사이트 글 → 댓글에서 자연스럽게 언급 |
| **r/softwaretesting** | ~30K | ❌ 금지 | r/QA와 비슷. 기술적 토론 중심 | 동일 |
| **r/devops** | ~200K | ❌ 금지 | DevOps/QA 겹치는 영역. CI/CD, 자동화 테스팅 관심 | QA 자동화 인사이트 글 |
| **r/programming** | ~6M | ❌ 금지 | 매우 큰 커뮤니티. 광고에 극도로 민감 | 기술적 글만 |

### Tier 2 — 인디/사이드 프로젝트 커뮤니티 (자기소개 OK)

| Subreddit | 규모 | 자기홍보 | 특성 | 전략 |
|-----------|------|---------|------|------|
| **r/SideProject** | ~200K | ✅ 허용 | "I built X" 형식의 프로젝트 소개 환영. 가장 관대한 커뮤니티 | 첫 소개 게시글 최적 |
| **r/IndieHackers** | ~50K | ✅ 허용 | 수익, 성장, 빌딩 과정 공유. 숫자 투명성 중요 | 빌딩 여정 + 솔직한 숫자 |
| **r/startups** | ~1.5M | 조건부 | 스타트업 여정 공유 OK, 노골적 홍보 ❌ | 창업 스토리 중심 |
| **r/Entrepreneur** | ~3M | 조건부 | 큰 커뮤니티. 일반적 창업 이야기 OK | 사이드 프로젝트 여정 |

### Tier 3 — B2B/SaaS 커뮤니티

| Subreddit | 규모 | 자기홍보 | 특성 | 전략 |
|-----------|------|---------|------|------|
| **r/SaaS** | ~100K | 조건부 | SaaS 창업자/마케터. "Show HN" 스타일 소개 가능 | 제품 + 빌딩 과정 |
| **r/webdev** | ~900K | ❌ 금지 | 개발자 중심. 기술 스택 이야기 중심 | 기술 글만 |
| **r/learnprogramming** | ~5M | ❌ 금지 | 학습자 중심. 맞지 않음 | 제외 |

### 진입 순서 추천
```
Week 2: r/SideProject (가장 관대)
Week 3: r/IndieHackers, r/SaaS
Week 4: r/QualityAssurance, r/softwaretesting (인사이트 글로)
Week 5+: r/devops, r/Entrepreneur, r/startups
```

---

## 2. 카르마 빌딩 전략 (Week 1 — 절대 건너뛰지 말 것)

### 왜 카르마가 중요한가

Reddit 신규 계정으로 자기 제품 링크를 포함한 글을 올리면 **99%가 spam 필터에 걸립니다.** 이게 "글이 게시되지 않은" 가장 흔한 원인입니다.

**최소 목표: 게시글 카르마 100+ / 댓글 카르마 100+ (각각)**

### 카르마 빠르게 쌓는 방법

**댓글 카르마 (더 빠름):**
- r/AskReddit, r/todayilearned, r/worldnews 같은 대형 커뮤니티에서 진짜 관심 있는 스레드에 댓글
- QA/테스팅 관련 질문에 전문적인 답변 달기 (가장 효율적)
- 예: r/QualityAssurance에서 "What tool do you use for test management?" 같은 글에 Testably 언급 없이 경험 공유

**게시글 카르마 (더 느림):**
- r/SideProject에 가벼운 진행 상황 공유
- r/AskReddit 스타일 질문 글

### Week 1 일일 플랜

```
매일 20~30분:
- 3~5개 댓글 작성 (QA 관련 스레드 우선)
- 좋은 글 5개 upvote
- 절대 자기 제품 링크 포함하지 않기
```

---

## 3. 첫 포스트 초안 (복붙용)

---

### 📌 POST 1 — r/SideProject | Week 2 권장

**제목:**
```
I built a test case management tool because spreadsheets were driving QA teams crazy — here's what I learned
```

**본문:**
```
Hey r/SideProject,

Long-time lurker, first time sharing my own thing. I've been building Testably for the past year on weekends and early mornings while working my day job.

**What it is:**
A test case management tool for QA teams. Think: simpler than TestRail, not a spreadsheet.

**Why I built it:**
I kept seeing the same thing — QA teams managing hundreds of test cases in Google Sheets with 47 tabs. It works for about 3 months, then becomes a nightmare. Enterprise tools exist but they're overkill and expensive for most teams.

So I built something in between.

**What I learned building it as a side project:**

1. The hardest part isn't the code, it's convincing yourself the problem is real enough
I almost quit three times because I thought "surely someone's already solved this." They kind of have, but not in a way that normal-sized teams actually want to use.

2. Your first 10 users will find bugs you never imagined
I thought my onboarding was solid. User #3 couldn't get past step 2 and I had no idea.

3. "Build in public" pressure is real but useful
Posting about it (on Disquiet, LinkedIn) forced me to keep going even when motivation dipped.

**Current status:**
Beta, free plan available. About [X] users so far, mostly QA leads and engineering managers.

Happy to answer anything — what have you built and how do you handle the "is this problem real?" question?

[Testably link]
```

---

### 📌 POST 2 — r/QualityAssurance | Week 4 권장 (인사이트 글)

**제목:**
```
After talking to 50+ QA teams, here's why most test case management setups fail
```

**본문:**
```
I've spent the last year talking to QA leads and engineering managers about how they manage test cases. Some patterns kept coming up that I think are worth sharing.

**The 5 most common reasons QA setups break down:**

**1. The spreadsheet trap**
Teams start with Google Sheets because it's free and familiar. It works until it doesn't — usually around 200+ test cases or 3+ team members. Then version control, execution tracking, and search all become painful simultaneously.

**2. Ownership vacuum**
Someone creates the test cases. Nobody owns updating them. 6 months later, 40% of your TCs are outdated and everyone knows it but nobody has time to fix it.

**3. Execution results live somewhere else**
TCs in Confluence, results in Jira, bugs in Slack. Connecting these manually for every release is a mini-project in itself.

**4. "Automate everything" pressure**
Teams feel pressure to reach 100% automation and deprioritize manual/exploratory testing. Then a critical UX bug ships because nobody was doing exploratory testing.

**5. Reporting is always manual**
"How's testing going?" still requires someone to compile a spreadsheet at 11 PM before a release.

---

What patterns do you see in your teams? Curious if these match your experience or if I'm missing something.

*(I'm also building a tool around some of these problems — happy to share if anyone's curious, but that's not why I'm posting this.)*
```

**[중요]** r/QualityAssurance에는 링크 없이 올리세요. "I'm also building a tool" 언급에 댓글이 달리면 그때 링크를 공유하는 방식이 가장 자연스럽습니다.

---

### 📌 POST 3 — r/IndieHackers | Week 3 권장

**제목:**
```
6 months building a B2B SaaS as a side project: what the numbers actually look like
```

**본문:**
```
Sharing this because most "I built a SaaS" posts skip the uncomfortable early numbers. Here's mine, honestly.

**What I built:** Testably — test case management for QA teams
**Time building:** ~6 months of nights and weekends
**Status:** Beta, just launched publicly

**The real numbers:**

Users: [X] (be honest here — even if it's 12, say 12)
MRR: $0 (free beta, working on converting to paid)
Time spent per week: ~8-12 hours
Biggest week: the week I posted on [Disquiet/LinkedIn] and got [X] signups in a day
Worst week: spent 3 days on a feature nobody asked for

**What I got wrong:**

I spent 2 months building before talking to a single potential user. Classic mistake. When I finally showed it to a QA lead, her first question was about a workflow I hadn't considered at all.

**What surprised me:**

The people most interested weren't the ones I expected. I built this for QA leads — but engineering managers and CTOs are the ones most eager to pay.

**Current focus:**

Getting to 50 active users before thinking about pricing. Right now every user conversation is more valuable than any line of code.

---

If you're building something similar (B2B, productivity tool, doing it alongside a day job) — what's been your biggest unexpected lesson?

[Testably link in comments if curious]
```

---

### 📌 POST 4 — r/SaaS | Week 3 권장

**제목:**
```
Show r/SaaS: I built a test case management tool for QA teams tired of spreadsheets
```

**본문:**
```
**What:** Testably — test case management for QA teams. Create test cases, run them as a team, track results. Simpler than TestRail, not a spreadsheet.

**Who it's for:** QA leads and engineering managers at teams of 5-50 people who've outgrown spreadsheets but don't need (or want) enterprise-complexity tools.

**Why I built it:** Kept seeing the same frustrated QA teams. Spreadsheets get messy fast. Enterprise tools cost $50+/seat/month and take weeks to set up. Nothing in between.

**Current status:** Beta. Free plan available.

**Honest ask:** Looking for feedback more than users right now. What would you want to see in a test case management tool that you're not getting from what you use today?

[Link]
```

---

## 4. 첫 4주 Reddit 콘텐츠 캘린더

| 주차 | 활동 | 세부 내용 |
|------|------|----------|
| **Week 1** | 카르마 빌딩 | 매일 댓글 3~5개. r/QualityAssurance, r/softwaretesting에서 QA 관련 질문에 전문적 답변. 제품 언급 없이. |
| **Week 2** | 첫 포스트 | r/SideProject에 POST 1 게시. 링크 포함 OK. 댓글 모두 답변. |
| **Week 3** | 확장 | r/IndieHackers에 POST 3 게시. r/SaaS에 POST 4 게시. 각 게시글 댓글 적극 답변. |
| **Week 4** | 인사이트 글 | r/QualityAssurance에 POST 2 게시 (링크 없이). 반응에 따라 댓글에서 자연스럽게 Testably 언급. |
| **Week 5+** | 유지 | 주 1~2회 관련 스레드 댓글 참여. 새 질문에 답변. 자기 포스트는 월 1~2회로 제한. |

---

## 5. Reddit 베스트 프랙티스

### 반드시 지켜야 할 것

**제목 작성 원칙:**
- ❌ "Check out my new QA tool!" → 즉시 downvote
- ❌ "This will change how you manage test cases" → 클릭베이트, 신뢰도 하락
- ✅ "I built X because Y problem kept frustrating me"
- ✅ "After talking to 50 QA teams, here's what I learned"
- ✅ 구체적인 숫자나 경험 포함

**포스팅 타이밍 (ET 기준):**
- 최적: 화~목 오전 9~11시 ET (한국 시간 밤 10시~자정)
- 피해야 할 시간: 금요일 오후, 주말

**링크 전략:**
- r/QualityAssurance, r/softwaretesting: 링크 없이 글 올리고 댓글에서 요청 시 공유
- r/SideProject, r/IndieHackers: 글 안에 링크 포함 가능, 댓글 첫 번째로 링크 달아도 OK

### 절대 하지 말아야 할 것

- ❌ Cross-posting: 같은 글을 여러 subreddit에 동시에 올리기 (Reddit이 감지함)
- ❌ 친구에게 upvote 부탁 (vote manipulation으로 계정 정지 위험)
- ❌ 삭제하고 다시 올리기 (이미 downvote 받은 글을 삭제 후 재게시)
- ❌ 새 계정 여러 개 만들기 (영구 ban 위험)
- ❌ 댓글에서 "DM me for more info" 남발

---

## 6. Reddit + 다른 채널 통합 전략

### 같은 소재의 채널별 변형

| 소재 | Reddit | LinkedIn | 디스콰이엇 |
|------|--------|----------|-----------|
| TC 관리 실패 패턴 | "After talking to 50 QA teams..." 인사이트 글 | "팀들이 자주 하는 실수 3가지" 전문가 포스트 | 짧은 메이커로그 |
| 사이드 프로젝트 여정 | r/IndieHackers 빌딩 스토리 | "직장 다니면서 SaaS 만들기" | "Testably 3주차 업데이트" |
| 베타 런칭 | r/SideProject Show & Tell | 조용한 소개 톤 포스트 | 첫 공개 로그 |
| PH 런칭 | r/SideProject "Launching on PH" | PH 알림 포스트 | 응원 요청 로그 |

**시너지 전략:** Reddit에서 인사이트 글로 반응이 좋으면 → 해당 댓글들에서 인사이트 추가 수집 → LinkedIn에서 더 다듬은 버전으로 발행 → 디스콰이엇에 배운 것으로 메이커로그 작성.

---

## 7. 리스크 관리

### 익명 계정 vs 실명 계정

**결론: 익명 계정 권장 (하지만 완전 익명은 아님)**

Kyle이라는 이름과 Testably Founder라는 타이틀은 유지하되, 실명(성)+현 직장 연결은 피하세요. Reddit에서 실명 사용은 오히려 드물고, "Kyle from Testably" 정도로 충분히 신뢰감을 줍니다.

**계정 설정 권장:**
- Username: `kyle_testably` 또는 `testably_kyle` (제품과 연결되어 있어 투명함)
- 본인임을 증명할 필요 없음 — 행동과 글의 질로 신뢰 쌓기

### Shadowban 예방

```
계정 생성 후:
1주차: 댓글만 (자기 제품 언급 없이)
2주차: 댓글 계속 + 첫 게시글 1개 (링크 없이)
3주차: 링크 포함 게시글 가능
```

**Shadowban 확인 방법:** reddit.com/user/[username] 을 로그아웃 상태로 확인. 페이지가 뜨면 정상, 안 뜨면 shadowban.

### 실패 시나리오

**downvote 폭격을 받았다면:**
- 삭제하지 마세요. 삭제하면 더 의심받습니다.
- 정중하게 댓글로 "홍보 글처럼 느껴졌다면 사과드립니다. 피드백 주시면 개선하겠습니다" 정도로 대응.
- 해당 subreddit에서는 2~3주 쉬고 다시 도전.

**mod에게 글이 삭제됐다면:**
- Mod에게 정중하게 DM: "어떤 부분이 규칙에 위배됐는지 알 수 있을까요? 수정해서 다시 올릴 수 있다면 좋겠습니다."
- 대부분의 mod는 악의가 없고, 규칙을 잘 모르는 경우 친절하게 안내해줍니다.

---

## 8. 현재 상황 진단 및 즉시 해야 할 것

**"글이 게시되지 않았어" 원인 파악 순서:**

```
Step 1: 로그아웃 후 본인 계정 확인 → shadowban 여부
Step 2: 해당 subreddit 사이드바 규칙 확인 → 어떤 규칙 위반인지
Step 3: 계정 카르마 확인 → 100 미만이면 카르마 빌딩 먼저
Step 4: 링크 제거 후 텍스트만으로 재시도
```

**지금 당장 해야 할 것:**
1. Reddit 계정 카르마 현황 확인
2. shadowban 여부 확인 (로그아웃 상태로)
3. 목표 subreddit 사이드바 규칙 읽기 (각각 다름)
4. Week 1 카르마 빌딩 시작

---

## 9. 채널 전체 우선순위 정리

지금까지 수립한 채널들의 Kyle 상황(재직 중, 혼자)에서의 현실적 우선순위:

| 순위 | 채널 | 이유 |
|------|------|------|
| 1 | **LinkedIn** | 타겟(QA 리드, EM)이 가장 많음. 이미 시작함. |
| 2 | **디스콰이엇** | 사이드 프로젝트 커뮤니티. 재직 중에도 자연스러움. |
| 3 | **Reddit** | 올바르게 하면 강력하지만 준비 필요. |
| 4 | **Product Hunt** | 5월 5일 런칭 예정. 일회성 이벤트지만 임팩트 큼. |

Reddit은 LinkedIn/디스콰이엇과 병행하되, 카르마 빌딩에 Week 1을 온전히 투자하는 것이 장기적으로 훨씬 효과적입니다.

---

**Mark, Testably Marketing**
