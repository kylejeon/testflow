# Testably 제품 개발 파이프라인 가이드

> **목적:** 기능 하나를 리서치부터 런칭까지 가져가는 전체 프로세스 정의
> **대상:** CEO, PM, 개발자, Claude Code
> **작성일:** 2026-04-17

---

## 전체 파이프라인

```
① Research  →  ② Planning  →  ③ Design  →  ④ Dev  →  ⑤ QA  →  ⑥ Launch
  (1~2일)       (2~3일)       (2~5일)     (3~10일)   (1~3일)    (지속)
                   │               │
              개발지시서 산출    디자인 명세 산출
              (dev-spec)      (design-spec)
                   │               │
                   └───── 둘 다 합쳐서 → Claude Code 구현 시작 ─────┘
```

---

## Phase 1: Research (리서치) — 1~2일

### 목적
무엇을 만들지, 왜 만드는지 근거 확보

### 담당
CEO/PM + Claude Code

### 활동
- 경쟁사 동향 파악 (TestRail, Zephyr 업데이트 모니터링)
- 유저 피드백 수집 (Intercom, 이메일, NPS 데이터)
- 사용 데이터 분석 (어떤 기능이 많이/적게 쓰이는지)
- Claude Code 활용: 경쟁사 문서 분석, 피드백 패턴 요약

### 산출물
- 리서치 메모 (`pm/research/[주제]-research.md`)

### 핵심 질문
> "이 기능을 만들면 어떤 KPI가 올라가는가?"

### 완료 기준
- [ ] 문제의 근거가 데이터 또는 유저 피드백으로 뒷받침되는가
- [ ] 경쟁사 대비 우리의 접근 방식이 명확한가
- [ ] 예상 임팩트가 정량적으로 추정되었는가

---

## Phase 2: Planning (제품 기획) — 2~3일

### 목적
스코프 확정, 개발 착수 가능한 수준의 개발지시서 작성

### 담당
CEO/PM + Claude Code

### 활동
1. Feature Spec 초안 작성
2. 기술적 실현 가능성 검토 (Supabase 제한, Edge Function 등)
3. 우선순위 결정 (ICE Score: Impact × Confidence × Ease)
4. 개발지시서 작성 → `pm/specs/dev-spec-[기능명].md`

### 산출물
- **개발지시서** (Dev Spec) — 템플릿: `pm/templates/dev-spec-template.md`

### 개발지시서 필수 포함 항목

| 섹션 | 내용 | 없으면 개발 불가 |
|------|------|:--------------:|
| 유저 스토리 | As a [역할], I want to [행동], so that [목적] | ✓ |
| 수용 기준 | 테스트 가능한 완료 조건 | ✓ |
| 동작 흐름 | Happy Path + Alternative + Error Flow | ✓ |
| RBAC 권한 | 역할별 CRUD 매트릭스 | ✓ |
| 플랜별 제한 | Free/Hobby/Starter/Pro/Enterprise 각각 | ✓ |
| DB 스키마 | 테이블, 컬럼, 타입, RLS 정책 | ✓ |
| API 설계 | Supabase Client 쿼리 또는 Edge Function | ✓ |
| 영향 범위 | 신규/수정 파일 목록 | ✓ |
| 엣지 케이스 | 네트워크 끊김, 동시 편집, 빈 상태 등 | ✓ |
| Out of Scope | 이번에 안 하는 것 명시 | ✓ |
| i18n 키 | EN/KO 번역 키 | ✓ |

### 완료 기준
- [ ] 개발지시서 체크리스트 전항 통과
- [ ] CEO/PM 승인 (상태: Approved)

---

## Phase 3: Design (디자인) — 2~5일

### 목적
개발자가 픽셀 단위로 구현할 수 있는 디자인 명세 작성

### 담당
CEO/디자이너 + Claude Code

### 활동
1. Lo-fi 와이어프레임 (종이 or Figma 러프)
2. 기존 컴포넌트 매핑 (UI_GUIDE.md 기반)
3. Hi-fi 디자인 명세 작성 → `pm/specs/design-spec-[기능명].md`

### 산출물
- **디자인 명세** (Design Spec) — 템플릿: `pm/templates/design-spec-template.md`

### 디자인 명세 필수 포함 항목

| 섹션 | 내용 | 없으면 개발 불가 |
|------|------|:--------------:|
| 레이아웃 | ASCII 와이어프레임 + 기준 너비 | ✓ |
| 컴포넌트 스타일 | Tailwind 클래스 구체 명시 | ✓ |
| 상태별 화면 | 정상, 빈 상태, 로딩, 에러, 제한 도달 | ✓ |
| 인터랙션 | 클릭, 호버, 키보드, 토스트 메시지 | ✓ |
| 반응형 | 브레이크포인트별 변경점 | ✓ |
| 다크모드 | Light/Dark 색상 매핑 | ✓ |
| 재사용 목록 | 기존 컴포넌트 vs 신규 컴포넌트 | ✓ |
| 토스트 메시지 | EN/KO 모두 | ✓ |

### 완료 기준
- [ ] 디자인 체크리스트 전항 통과
- [ ] 개발지시서와 수용 기준 일치 확인
- [ ] CEO/PM 승인 (상태: Approved)

---

## Phase 4: Development (개발) — 3~10일

### 목적
개발지시서 + 디자인 명세 기반 구현

### 담당
개발자 + Claude Code (핵심 파트너)

### 작업 흐름

```
1. progress.txt 읽기 (세션 시작)
2. 개발지시서 + 디자인 명세 읽기
3. Claude Code /plan으로 구현 계획 수립
4. claude 브랜치에서 구현
5. 기능 단위 커밋
6. progress.txt 업데이트 (세션 종료)
```

### Claude Code 활용 전략

| 단계 | Claude Code 사용법 |
|------|-------------------|
| 계획 | `/plan` — 파일 영향도 분석, 구현 순서 결정 |
| 구현 | 개발지시서의 수용 기준을 하나씩 구현 |
| 리뷰 | `/review` — 코드 품질 체크 |
| 커밋 | `/commit` — 의미 있는 커밋 메시지 |
| 보안 | `/security-review` — 보안 취약점 체크 |

### 개발 원칙
- **절대 main에 직접 push하지 않음** → claude 브랜치에서만 작업
- 기존 패턴을 따른다 (새 패턴 도입 전 기존 코드 확인)
- Edge Function 비즈니스 로직 분리 원칙 준수
- TypeScript strict, Supabase RLS 데이터 격리
- i18n 키 추가 시 en/ko 동시 작업

### 완료 기준
- [ ] 수용 기준 전항 구현 완료
- [ ] tsc --noEmit 통과
- [ ] ESLint 경고/에러 0개
- [ ] 개발자 자체 테스트 통과

---

## Phase 5: QA / 검수 — 1~3일

### 목적
버그 없이 릴리즈 가능한 상태 확인

### 담당
CEO/QA + Claude Code

### 검수 레이어

| 순서 | 레이어 | 방법 | 도구 |
|------|--------|------|------|
| 1 | 코드 품질 | 타입 체크, 린트 | `tsc --noEmit`, ESLint |
| 2 | 보안 리뷰 | OWASP Top 10 체크 | Claude `/security-review` |
| 3 | 기능 테스트 | 수용 기준 기반 수동 테스트 | 브라우저 (Chrome + Firefox) |
| 4 | 회귀 테스트 | 기존 기능 깨지지 않았는지 | Playwright E2E |
| 5 | 크로스 브라우저 | Safari, Firefox 확인 | 수동 |
| 6 | 반응형 | 모바일/태블릿 뷰 | DevTools |
| 7 | 다크모드 | 라이트/다크 전환 | 수동 |
| 8 | i18n | 영어/한국어 전환 | 수동 |

### QA 체크리스트

```markdown
## 기능 검수
- [ ] 수용 기준 전항 통과
- [ ] Happy Path 정상 동작
- [ ] Error Flow 정상 동작
- [ ] 엣지 케이스 확인

## 코드 품질
- [ ] tsc --noEmit 통과
- [ ] ESLint 경고/에러 0개
- [ ] 기존 E2E 테스트 통과

## UI/UX 검수
- [ ] 다크모드 정상
- [ ] 한국어/영어 전환 정상
- [ ] 키보드 단축키 정상
- [ ] 반응형 (모바일 뷰) 정상
- [ ] Empty State 표시 정상
- [ ] Loading State 표시 정상
- [ ] Error State 토스트 정상

## 비기능 검수
- [ ] Sentry 에러 리포팅 정상
- [ ] 플랜별 제한 정상 작동
- [ ] RBAC 권한 정상 작동
```

### 완료 기준
- [ ] QA 체크리스트 전항 통과
- [ ] 발견된 버그 전부 수정 완료

---

## Phase 6: Marketing & Launch (마케팅/런칭) — 지속

### 목적
유저 획득, 전환, 유지

### 담당
CEO/마케팅 + Claude Code

### 릴리즈 프로세스

```
1. claude 브랜치 → main 머지 (CEO가 수동)
2. Vercel 자동 배포
3. Changelog 업데이트
4. 마케팅 콘텐츠 배포
```

### 채널별 전략

| 채널 | 활동 | 우선순위 |
|------|------|---------|
| Product Hunt | 런칭 페이지, 메이커 코멘트, GIF/비디오 | P0 |
| SEO/블로그 | "TestRail alternative", "AI test management" 키워드 | P1 |
| Changelog | 기능 업데이트 공개 페이지 | P1 |
| Loops.so 이메일 | 온보딩 시퀀스, 기능 안내, 업그레이드 유도 | P1 |
| Twitter/LinkedIn | 빌딩 인 퍼블릭, 마일스톤 공유 | P2 |
| 개발자 커뮤니티 | Dev.to, Hacker News, Reddit r/QualityAssurance | P2 |

---

## 타임라인 요약

### 작은 기능 (~1주)

```
Day 1     ① Research + ② Planning (개발지시서)
Day 2-3   ③ Design (디자인 명세)
Day 3-5   ④ Development
Day 5-6   ⑤ QA
Day 6+    ⑥ Launch
```

### 중간 기능 (~2주)

```
Day 1-2    ① Research
Day 2-4    ② Planning (개발지시서)
Day 4-7    ③ Design (디자인 명세)
Day 7-12   ④ Development
Day 12-14  ⑤ QA
Day 14+    ⑥ Launch
```

### 큰 기능 (~3주)

```
Day 1-2    ① Research
Day 3-5    ② Planning (개발지시서)
Day 5-9    ③ Design (디자인 명세)
Day 9-18   ④ Development
Day 18-20  ⑤ QA
Day 20+    ⑥ Launch
```

---

## 핵심 원칙

1. **Phase 2에서 스코프를 잘 자른다** — "이번에 안 하는 것"이 명확해야 Phase 4가 끝없이 늘어나지 않는다
2. **개발지시서 + 디자인 명세가 합격해야 개발 시작** — 추측으로 코딩하지 않는다
3. **Phase 4에서 Claude Code를 최대 활용** — 코드 작성, 리뷰, 리팩토링 전부 AI와 협업
4. **Phase 6는 Phase 4와 병행** — 개발 끝나고 마케팅이 아니라, 개발하면서 콘텐츠 준비
5. **모든 작업은 claude 브랜치** — main 머지는 CEO만 수동으로

---

## 파일 구조

```
pm/
├── templates/
│   ├── dev-spec-template.md      ← 개발지시서 템플릿
│   ├── design-spec-template.md   ← 디자인 명세 템플릿
│   └── pipeline-guide.md         ← 이 문서
├── specs/
│   ├── dev-spec-[기능명].md      ← 실제 개발지시서
│   └── design-spec-[기능명].md   ← 실제 디자인 명세
├── research/
│   └── [주제]-research.md        ← 리서치 메모
└── prd.md                        ← 제품 요구사항 문서
```
