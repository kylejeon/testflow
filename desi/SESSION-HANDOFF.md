# Desi 세션 핸드오프 문서
> **날짜:** 2026-04-02
> **목적:** 다음 세션에서 Desi 역할을 이어받을 때 사용하는 컨텍스트 문서

---

## 1. 역할 & 규칙

- **역할:** Desi (Designer) — CEO Kyle의 Testably 프로젝트 전담 디자이너
- **저장 경로:** 모든 디자인 결과물은 `/Users/yonghyuk/testflow/desi/` 에 저장
- **언어:** CEO가 한국어로 지시하면 한국어로 응답, 파일 내용은 영어/한국어 혼용
- **목업 패턴:** 인터랙티브 HTML (스크린 네비게이터 버튼 + 어노테이션 카드(amber) + 개발 노트(gray))

---

## 2. 제품 정보 — Testably (testably.app)

### 2.1 기술 스택
- React SPA (Vite), Supabase, Tailwind CSS, Remix Icon 4.5.0

### 2.2 브랜드 시스템
- **폰트:** Inter (UI) + Pacifico (로고)
- **로고:** Squircle (bg #6366F1, rounded) + 체크마크
- **Primary:** Indigo #6366F1
- **Accent:** Violet #8B5CF6

### 2.3 디자인 시스템 토큰
```
Primary:   #6366F1 / RGB(99,102,241)
Violet:    #8B5CF6
Green:     #10B981 / #22C55E
Red:       #EF4444
Amber:     #F59E0B
Gray 스케일: #F8FAFC → #0F172A
```

### 2.4 상태 색상 (앱 내)
```
passed:   #16A34A
failed:   #DC2626
blocked:  #D97706
retest:   #7C3AED
untested: #64748B
```

### 2.5 PDF 전용 RGB
```
Primary:  RGB(99,102,241)
Passed:   RGB(16,163,127)
Failed:   RGB(239,68,68)
Blocked:  RGB(249,115,22)
Retest:   RGB(234,179,8)
Untested: RGB(203,213,225)
```

---

## 3. 이번 세션에서 완료한 작업

### 3.1 Reddit 배너
| 파일 | 설명 |
|------|------|
| `reddit-banner-testably.html` | 원본 1920×384 HTML 배너 (다크 테마, indigo/violet) |
| `reddit-banner-testably.png` | 1500×500px PNG (Python Cairo 렌더링, 3:1 비율) |

- CEO 피드백: "좌우 폭 너무 길다" → 1500×500 중앙 수직 스택으로 리디자인
- 시스템 폰트 대체: URW Bookman L Italic(로고), Liberation Sans(본문) 사용

### 3.2 Run Detail "..." More Actions 드롭다운 목업
| 파일 | 스크린 수 |
|------|----------|
| `run-detail-more-actions-mockup.html` | 4 스크린 |

- Screen 1: 기본 드롭다운 (Export Run Report PDF + Export Results CSV)
- Screen 2: 호버 상태
- Screen 3: 버튼 Active 비교
- Screen 4: 에디터 툴바 Before/After (dead code "..." 제거)

### 3.3 Dashboard Export Report 버튼 목업
| 파일 | 스크린 수 |
|------|----------|
| `dashboard-export-report-mockup.html` | 5 스크린 |

- Screen 1: Default + Hover (PDF/CSV 3개 아이템)
- Screen 2: Loading 상태 (spinner)
- Screen 3: Tier Gating Free (잠금 + 업그레이드 배너)
- Screen 4: Toast 알림 (success/error)
- Screen 5: 버튼 Active 상태

### 3.4 Dashboard Analytics & Activity Feed 목업
| 파일 | 스크린 수 |
|------|----------|
| `dashboard-analytics-activity-feed-mockup.html` | 15 스크린 |

- A-1~A-9: Analytics (와이어프레임, KPI, 마일스톤, Run Status, 팀 성과, Flaky TC, 히트맵, TC 품질, AI 인사이트)
- B-1~B-6: Activity Feed (전체 레이아웃, 이벤트 아이콘, 필터, AI 요약, 하이라이트 스타일, 라이브 인디케이터)

### 3.5 Dashboard Export PDF — 8페이지 Executive Report 목업
| 파일 | 스크린 수 |
|------|----------|
| `dashboard-export-pdf-mockup.html` | 8 스크린 |

- P1: Cover + Executive Summary (Go/No-Go, KPI 6개, Risk, TOC)
- P2: Quality Scorecard (스택바, KPI 6개, Priority 바, Project Info)
- P3: Quality Trends (라인차트, WoW 테이블, Velocity 바차트)
- P4: Test Execution Detail (Run 테이블, Module Coverage)
- P5: Milestone & Readiness (카드 2×2, Burndown, Quality Gates)
- P6: Risk Assessment (Top Failed, Flaky 시퀀스, Coverage Gaps)
- P7: Team Performance (멤버 테이블, Contribution, Defect Discovery)
- P8: TC Appendix (Lifecycle, 전체 TC 테이블, 동적 페이지)

### 3.6 jsPDF 레이아웃 스펙 (긴급 추가)
| 파일 | 라인 수 |
|------|---------|
| `pdf-jspdf-layout-spec.md` | 1,340줄 |

- **배경:** CEO가 3번 수정에도 PDF가 목업과 다르다고 피드백 → Dev2용 정확한 mm 좌표 스펙 작성
- P1~P8 모든 요소의 `x, y, w, h, radius, fill, stroke, font, align` 명시
- 글로벌 상수, 색상 팔레트(js 변수), 폰트 체계, 공통 헤더/푸터/KPI/테이블 스펙
- jsPDF 유틸리티 함수 시그니처 + pt→mm 변환표
- P8 동적 페이지네이션 JS 로직 코드 포함

---

## 4. PM 지시서 위치 (참고용)

PM이 업로드한 디자인 지시서 파일들:
- `pm/desi-task-run-detail-more-actions-mockup.md` — More Actions 드롭다운
- `pm/desi-task-dashboard-export-report-mockup.md` — Export Report 버튼
- `desi-task-dashboard-analytics-activity-feed-mockup.md` — Analytics & Activity Feed
- `desi-task-dashboard-export-pdf-mockup.md` — 8페이지 PDF (830줄 상세 스펙)

---

## 5. 기술적 제약 & 해결책

| 문제 | 해결 |
|------|------|
| Puppeteer/Playwright 설치 불가 (403/프록시) | Python Cairo(pycairo)로 PNG 렌더링 |
| Google Fonts 다운로드 실패 (exit 56) | 시스템 폰트 대체: URW Bookman L Italic + Liberation Sans |
| jsPDF는 gradient/이모지 미지원 | 단색 대체, 이모지→텍스트 기호(✓, ✕, !) |
| npm registry 403 | pip --break-system-packages 또는 pre-installed 패키지 사용 |

---

## 6. desi/ 폴더 주요 파일 목록 (총 120+ 파일)

이전 세션에서 만든 것들 포함하여 전체 파일이 `desi/` 에 있음:
- **HTML 목업:** 08~41번 시리즈 + 개별 목업 파일들 (80+ 파일)
- **DOCX 문서:** Dev Handoff, 분석 보고서, 전략 문서 등 (25+ 파일)
- **기타:** PNG 배너, MD 스펙, 디자인 diff 보고서

---

## 7. 진행 중 / 대기 중 작업

현재 알려진 대기 작업 없음. CEO의 다음 지시를 기다리는 상태.

가능한 후속 작업:
- Dev2가 `pdf-jspdf-layout-spec.md` 기반으로 구현 후 디자인 QA 요청
- 추가 목업 또는 디자인 수정 요청
- 새로운 PM 지시서에 따른 목업 제작

---

## 8. 세션 시작 시 필수 설정

다음 세션에서 아래 내용을 시스템 프롬프트 또는 첫 메시지로 전달하세요:

```
너의 역할은 "Desi" (Designer)야.
CEO Kyle의 Testably(testably.app) 프로젝트 전담 디자이너로 일해.
모든 디자인 결과물은 /Users/yonghyuk/testflow/desi/ 폴더에 저장해.
이전 작업 컨텍스트는 /Users/yonghyuk/testflow/desi/SESSION-HANDOFF.md 파일을 읽어.
```
