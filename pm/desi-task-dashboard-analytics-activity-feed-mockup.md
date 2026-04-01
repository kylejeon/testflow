# Desi 디자인 목업 지시서: Dashboard Analytics & Activity Feed

## 개요

CEO 확정. Project Detail(Dashboard) 페이지의 Analytics 탭과 Activity Feed 탭을 디자인합니다.
현재 두 탭 모두 "Coming Soon" 플레이스홀더 상태이며, 실제 기능 UI로 교체합니다.

**기획안 참고:** `pm/pm-plan-dashboard-analytics-activity-feed.html`
**세션 ID:** `local_a2550f2f-b198-4d4b-910e-2f21259cda13`

**디자인 목업 총 15건을 제작해주세요.**
- Analytics 탭: 9건 (전체 레이아웃 + 위젯 8개)
- Activity Feed 탭: 6건

---

## 공통 디자인 시스템 (기존 Dashboard와 일관성 유지)

**현재 Dashboard 탭 바:**
```
탭 순서: [Overview] [Analytics] [Activity Feed]
Analytics 아이콘: ri-bar-chart-2-fill, 색상: #8B5CF6 (보라)
Activity Feed 아이콘: ri-time-fill, 색상: #F59E0B (주황)
활성 탭: 하단 보더 #6366F1 (indigo), 텍스트 #0F172A (gray-900)
비활성 탭: 텍스트 #64748B (gray-500)
```

**색상 팔레트 (기존 앱과 동일):**
```
Primary(Indigo): #6366F1 / Light: #EEF2FF
Success(Green):  #10B981 / Light: #ECFDF5
Warning(Amber):  #F59E0B / Light: #FFFBEB
Danger(Red):     #EF4444 / Light: #FEF2F2
AI(Violet):      #8B5CF6 / Light: #F5F3FF
Gray-50: #F8FAFC  Gray-100: #F1F5F9  Gray-200: #E2E8F0
Gray-500: #64748B  Gray-700: #334155  Gray-900: #0F172A
```

**Status 색상 (기존):**
```
passed: #16A34A (green-600)     blocked: #D97706 (amber-600)
failed: #DC2626 (red-600)       retest:  #7C3AED (violet-600)
untested: #64748B (gray-500)
```

**카드 스타일 (기존 Overview 위젯과 동일):**
```
배경: white
테두리: 1px solid #E2E8F0
모서리: rounded-xl (12px)
패딩: 20px~24px
그림자: 없음 (flat)
```

---

## ═══════════════════════════════════════════
## PART A: Analytics 탭 목업 (9건)
## ═══════════════════════════════════════════

---
## 목업 A-1: Analytics 탭 전체 레이아웃 (Full Page)

**목적:** Analytics 탭 선택 시 보이는 전체 페이지 구성. 8개 위젯의 그리드 배치를 보여줌.

**상단 필터 바:**
```
위치: 탭 바 바로 아래, 위젯 영역 위
배경: transparent
레이아웃: flex, justify-between, items-center
좌측:
  [7일] [14일] [30일] [전체]  ← 기간 필터 버튼 그룹
  - 기본 선택: 30일
  - 선택된 버튼: bg-#6366F1, text-white, rounded-lg
  - 비선택 버튼: bg-white, text-#64748B, border 1px #E2E8F0, rounded-lg
  - 버튼 크기: px-3 py-1.5, text-[0.75rem] (12px), font-medium
우측:
  마일스톤 드롭다운: [▼ All Milestones]
  - 스타일: bg-white, border 1px #E2E8F0, rounded-lg, px-3 py-1.5
  - text-[0.8125rem], text-#334155
  - 드롭다운 아이콘: ri-arrow-down-s-line
```

**위젯 그리드 배치 (2열 기반):**
```
┌──────────────────────────────────────────────────┐
│  [기간 필터 버튼: 7d|14d|30d|All]  [마일스톤 ▼]  │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─ A. Pass Rate 트렌드 ─── full width ────────┐ │
│  │  KPI 카드 ×4 → 라인차트                      │ │
│  └──────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ E. 마일스톤 트래커 ──┐ ┌─ H. 실행 현황 ──┐  │
│  │  번다운 차트 + 카드    │ │  요약바 + 리스트 │  │
│  │  (약 55% 너비)         │ │  (약 45% 너비)   │  │
│  └────────────────────────┘ └─────────────────┘  │
│                                                  │
│  ┌─ B. 팀원별 성과 ─── full width ─── [Pro+] ─┐ │
│  │  리더보드 테이블 + 스택 바 차트               │ │
│  └──────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ D. 커버리지 히트맵 ──┐ ┌─ F. TC 품질 ────┐  │
│  │  트리맵 (50%)          │ │  차트+도넛 (50%) │  │
│  └────────────────────────┘ └─────────────────┘  │
│                                                  │
│  ┌─ C. Flaky TC 탐지 ───┐ ┌─ G. AI 인사이트 ┐  │
│  │  테이블 [Pro+] (50%)  │ │  카드 [Pro+](50%)│  │
│  └────────────────────────┘ └─────────────────┘  │
└──────────────────────────────────────────────────┘
```

**위젯 간 간격:** gap-5 (20px)
**위젯 공통 헤더:**
```
레이아웃: flex, justify-between, items-center
좌측: 아이콘 + 위젯 제목
  - 아이콘: 16px, 위젯별 색상
  - 제목: text-[0.9375rem] (15px), font-semibold, text-#0F172A
우측: 부가 정보 또는 액션 버튼
패딩: 16px 20px
하단 보더: 1px solid #F1F5F9
```

---
## 목업 A-2: Pass Rate 트렌드 위젯 (Widget A)

**위치:** 전체 너비 (full width), 필터 바 바로 아래 첫 번째 위젯
**아이콘:** ri-line-chart-line, 색상 #6366F1 (indigo)

**KPI 카드 영역 (위젯 상단, 4개 나란히):**
```
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Overall Pass  │ │ Total         │ │ Failed        │ │ Blocked       │
│ Rate          │ │ Executed      │ │               │ │               │
│               │ │               │ │               │ │               │
│ 87.3%         │ │ 1,247         │ │ 89            │ │ 42            │
│ ▲ +2.1%       │ │ ▲ +156        │ │ ▼ -12         │ │ ▼ -5          │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

**각 KPI 카드 스타일:**
```
배경: #F8FAFC (gray-50)
테두리: 없음
모서리: rounded-lg (8px)
패딩: 16px
라벨: text-[0.6875rem] (11px), text-#64748B, uppercase, letter-spacing 0.05em
값: text-[1.5rem] (24px), font-bold, text-#0F172A
델타 배지:
  상승(▲): text-#10B981 (green), bg-#ECFDF5, rounded-full, px-2 py-0.5, text-[0.6875rem]
  하락(▼): text-#EF4444 (red), bg-#FEF2F2
```

**차트 영역:**
```
높이: 240px
차트 타입: 라인 차트 (Pass Rate %) + 바 차트 오버레이 (실행 건수)
라인: 색상 #6366F1, 두께 2px, 점 4px 원형
바: 색상 #E2E8F0 (gray-200), 투명도 0.5, 뒤쪽 레이어
X축: 날짜 (Mar 2, Mar 3, ... Mar 31)
Y축 좌: 0~100% (Pass Rate)
Y축 우: 실행 건수
그리드: 수평선만, 색상 #F1F5F9, 점선
호버 툴팁:
  배경: #1E293B (dark), 모서리: rounded-lg
  텍스트: white, text-[0.75rem]
  내용: "Mar 15 · Pass Rate: 89.2% · Executed: 45"
```

---
## 목업 A-3: 마일스톤 트래커 & 번다운 차트 (Widget E)

**위치:** 좌측 약 55% 너비
**아이콘:** ri-flag-2-fill, 색상 #F59E0B (amber)

**번다운 차트:**
```
높이: 200px
라인 1 (Ideal): 색상 #CBD5E1 (gray-300), 점선, 좌상→우하 직선
라인 2 (Actual): 색상 #6366F1 (indigo), 실선, 두께 2px
면적: Actual 라인 아래 #EEF2FF 반투명 fill
X축: 날짜 (마일스톤 기간)
Y축: 잔여 미실행 TC 수
```

**마일스톤 카드 (번다운 아래, 가로 스크롤):**
```
┌──────────────────────┐ ┌──────────────────────┐
│ 🟢 Sprint 12         │ │ 🟠 v2.5 Release      │
│ On Track             │ │ At Risk              │
│ ████████░░ 82%       │ │ ████░░░░░░ 45%       │
│ D-5 (Apr 6)          │ │ D-12 (Apr 13)        │
│ 18 remaining         │ │ 54 remaining         │
└──────────────────────┘ └──────────────────────┘

카드 스타일:
  배경: white, 테두리: 1px #E2E8F0, 모서리: rounded-lg (8px)
  패딩: 14px 16px
  최소 너비: 200px
상태 배지:
  On Track: bg-#ECFDF5, text-#10B981, 좌측 원형 도트 #10B981
  At Risk:  bg-#FFFBEB, text-#F59E0B, 좌측 원형 도트 #F59E0B
  Overdue:  bg-#FEF2F2, text-#EF4444, 좌측 원형 도트 #EF4444
진행률 바: 높이 4px, 모서리 rounded-full
  배경: #E2E8F0, 채움: 상태별 색상
남은 일수: text-[0.75rem], font-medium, text-#64748B
  D-3 이하: text-#EF4444 (빨강)
```

---

## 목업 A-4: 실행 현황 요약 (Widget H)

**위치:** 우측 약 45% 너비 (마일스톤 트래커 옆)
**아이콘:** ri-play-circle-fill, 색상 #10B981 (green)

**요약 바 (상단):**
```
┌─────────────────────────────────────────────────┐
│  Total: 12 runs  │  Active: 4  │  Completed: 6  │
│                   │  Paused: 1  │  Review: 1     │
└─────────────────────────────────────────────────┘
숫자: font-bold, text-[1rem]
라벨: text-[0.6875rem], text-#64748B
Active 숫자: text-#10B981
```

**스택 진행률 바:**
```
높이: 8px, 모서리 rounded-full, 전체 너비
┌██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░┐
│ Passed(#16A34A) | Failed(#DC2626) | Blocked(#D97706) | Untested(#64748B)
└─────────────────────────────────────────────────┘
아래 범례: 각 상태 dot(6px) + 라벨 + 카운트, flex row, gap-4
```

**Run 카드 리스트 (스크롤):**
```
각 Run 카드:
  좌측: 미니 원형 진행률 (24px, 도넛)
  중앙: Run 이름 (font-medium, 13px) + 마일스톤 라벨 (11px, gray-500)
  우측: "23/40 TC" 텍스트 (11px)
  하단: 미니 스택 바 (높이 3px, 카드 전체 너비)
  간격: 카드 간 8px
  최대 표시: 5개, 이후 "View all runs →" 링크
```

---
## 목업 A-5: 팀원별 성과 분석 (Widget B) — Professional+ 전용

**위치:** 전체 너비 (full width)
**아이콘:** ri-team-fill, 색상 #8B5CF6 (violet)
**티어 배지:** 위젯 헤더 우측에 "Pro+" 배지 표시
```
배지 스타일: bg-#F5F3FF, text-#8B5CF6, text-[0.6875rem], font-semibold,
  rounded-full, px-2 py-0.5, border 1px #DDD6FE
```

**리더보드 테이블:**
```
┌────┬──────────────────┬──────────┬──────────┬──────────┬──────────────┐
│ #  │ 팀원              │ 실행 건수 │ 발견 실패 │ 응답 속도 │ 7일 활동     │
├────┼──────────────────┼──────────┼──────────┼──────────┼──────────────┤
│ 1  │ 🟣 김민수         │ 142      │ 18       │ 1.2h     │ ▂▅▇▆▃▇█     │
│ 2  │ 🔵 이정현         │ 118      │ 23       │ 0.8h     │ ▃▆▅▇▂▅▆     │
│ 3  │ 🟢 박지은         │ 96       │ 11       │ 2.1h     │ ▅▃▂▁▆▇▅     │
│ 4  │ 🟠 최서연         │ 64       │ 8        │ 3.5h     │ ▁▂▃▁▁▅▃     │
└────┴──────────────────┴──────────┴──────────┴──────────┴──────────────┘

테이블 스타일:
  헤더: bg-#F8FAFC, text-#64748B, text-[0.75rem], uppercase, font-semibold
  행: 패딩 py-3 px-4, hover bg-#F8FAFC
  구분선: border-b 1px #F1F5F9
  팀원 컬럼: 아바타 이모지(20px 원형 배경) + 이름(font-medium, 13px)
  숫자: text-[0.875rem], font-semibold, text-#0F172A
  응답 속도: ≤1h → text-#10B981, 1~3h → text-#F59E0B, >3h → text-#EF4444
  스파크라인: 높이 20px, 너비 56px, 바 너비 5px, gap 2px
    색상: #6366F1 (indigo), 높이 비율은 해당 일 활동량 비례
```

**스택 바 차트 (테이블 아래):**
```
가로 스택 바: 각 팀원별 Passed(#16A34A) / Failed(#DC2626) / Blocked(#D97706) 비율
바 높이: 24px, 모서리 rounded-md
팀원 이름 좌측 라벨, 바 우측에 총 건수
간격: 바 간 12px
```

**Free/Starter 사용자에게는 블러 처리:**
```
위젯 전체에 backdrop-filter: blur(6px) 오버레이
중앙에 잠금 아이콘(ri-lock-fill, 32px, #8B5CF6) + 텍스트:
  "팀 성과 분석은 Professional 플랜에서 사용할 수 있습니다"
  text-[0.875rem], text-#334155, font-medium
  아래: [업그레이드 →] 링크 버튼, text-#6366F1, font-semibold
```

---

## 목업 A-6: Flaky TC 탐지 (Widget C) — Professional+ 전용

**위치:** 좌측 50% 너비
**아이콘:** ri-bug-fill, 색상 #EF4444 (red)
**헤더 우측:** "Pro+" 티어 배지 + Flaky TC 총 카운트 배지 (bg-#FEF2F2, text-#EF4444, "3 Flaky")

**Flaky Score 테이블:**
```
┌──────────────────────────────┬─────────────────┬───────┬──────────┐
│ TC                           │ 최근 실행 시퀀스 │ Score │ 마지막   │
├──────────────────────────────┼─────────────────┼───────┼──────────┤
│ ⚠️ TC-042 로그인 세션 만료    │ ●●○●○●○●●○     │ 67%   │ 2시간 전 │
│ ⚠️ TC-015 결제 취소 플로우    │ ●○●○●●○●○●     │ 56%   │ 5시간 전 │
│ ⚠️ TC-089 파일 업로드 검증    │ ●●●○●○●●○●     │ 50%   │ 1일 전   │
│    TC-023 회원가입 이메일      │ ●●●●○●●●●○     │ 22%   │ 3시간 전 │
└──────────────────────────────┴─────────────────┴───────┴──────────┘

시퀀스 도트:
  ● (Passed): #16A34A, 8px 원형
  ○ (Failed): #DC2626, 8px 원형, 빈 원(stroke only, 1.5px)
  간격: 3px

Score 표시:
  ≥50%: text-#EF4444, font-bold — "Flaky" 경고 아이콘(⚠️) TC명 앞에 표시
  <50%: text-#64748B, font-medium

테이블 스타일:
  헤더: bg-#F8FAFC, text-[0.75rem], text-#64748B
  행: py-3 px-4, hover bg-#FEF2F2 (flaky행) 또는 bg-#F8FAFC (정상행)
  Flaky 행: 좌측 보더 2px solid #EF4444
```

---
## 목업 A-7: 폴더/모듈별 커버리지 히트맵 (Widget D)

**위치:** 좌측 50% 너비
**아이콘:** ri-layout-grid-fill, 색상 #6366F1 (indigo)

**트리맵 히트맵:**
```
높이: 220px
각 사각형 = 1개 폴더
  크기: TC 수에 비례 (TC 많은 폴더 = 더 큰 사각형)
  색상: Pass Rate에 따른 그라데이션
    100%:  #16A34A (green-600)
    80~99%: #4ADE80 (green-400)
    60~79%: #FCD34D (amber-300)
    40~59%: #FB923C (orange-400)
    0~39%:  #EF4444 (red-500)
    0% (미실행): #CBD5E1 (gray-300)
  모서리: rounded-sm (2px)
  간격: gap 2px
  텍스트 (사각형 내부):
    큰 사각형: 폴더명 (white, text-[0.75rem], font-semibold)
                TC수 (white, text-[0.625rem], opacity 0.8)
    작은 사각형: 폴더명만 또는 생략

예시 레이아웃:
┌──────────────────┬─────────────┬──────┐
│                  │             │      │
│   Auth Module    │  Payment    │ Cart │
│   (24 TC, 92%)   │  (18 TC,   │(8 TC,│
│   🟢 밝은 초록    │   67%) 🟡   │ 45%) │
│                  │             │ 🟠   │
├──────────┬───────┼─────────────┤      │
│ Profile  │Search │  Settings   │──────┤
│(12 TC,   │(6 TC, │  (15 TC,    │Upload│
│ 100%) 🟢 │ 83%)  │   78%) 🟡   │(4 TC)│
│          │ 🟢    │             │ 🔴   │
└──────────┴───────┴─────────────┴──────┘
```

**호버 툴팁:**
```
배경: #1E293B, 모서리: rounded-lg, 패딩: 10px 14px
폴더명: white, font-semibold, text-[0.8125rem]
상세: 3줄
  "24 Test Cases"
  "Pass: 22 · Fail: 1 · Untested: 1"
  "Pass Rate: 92%"
텍스트: #CBD5E1, text-[0.75rem]
```

**범례 (차트 하단):**
```
flex row, gap-3, justify-center
각 항목: 12px 사각형 색상 + 라벨 (text-[0.6875rem], text-#64748B)
[🟢 90-100%] [🟢 80-89%] [🟡 60-79%] [🟠 40-59%] [🔴 0-39%] [⬜ Untested]
```

---

## 목업 A-8: TC 품질 & 성장 분석 (Widget F)

**위치:** 우측 50% 너비 (히트맵 옆)
**아이콘:** ri-test-tube-fill, 색상 #10B981 (green)

**레이아웃 (위→아래):**

**1) TC 성장 에어리어 차트 (상단 절반):**
```
높이: 120px
에어리어 차트: 주별 누적 TC 수
  라인: #10B981, 두께 2px
  면적: #ECFDF5 반투명 fill
X축: 주 (W1, W2, ... W10)
Y축: TC 수
우측 상단: 총 TC 수 배지 "248 Total" (bg-#ECFDF5, text-#10B981, font-bold)
```

**2) 하단 3열 그리드:**
```
┌─ Priority 도넛 ──┐ ┌─ Lifecycle 바 ──┐ ┌─ 자동화율 ──────┐
│  🔴 Critical: 12  │ │ ████ Active 180 │ │                  │
│  🟠 High: 45      │ │ ██░░ Draft 48   │ │   62%            │
│  🟣 Medium: 142   │ │ █░░░ Depr. 20   │ │  Automated       │
│  ⚪ Low: 49       │ │                 │ │  (반원 게이지)    │
└──────────────────┘ └─────────────────┘ └──────────────────┘

도넛 차트: 80px × 80px, 중앙에 총 TC 수
  Critical: #EF4444, High: #F59E0B, Medium: #6366F1, Low: #94A3B8
수평 바: 높이 6px, rounded-full, 최대 너비 기준 비율
자동화 게이지: 반원형, 180도 아크
  채움: #8B5CF6 (violet), 배경: #E2E8F0
  중앙 텍스트: "62%", text-[1.125rem], font-bold
```

**3) Top Failed TC (아래 접이식):**
```
"Top 5 Failed TCs" 링크 — 클릭 시 펼침
펼쳤을 때: TC명, 실패 횟수, Priority 배지, 마지막 실패일
```

---
## 목업 A-9: AI 인사이트 패널 (Widget G) — Professional+ 전용

**위치:** 우측 50% 너비 (Flaky TC 옆)
**아이콘:** ri-sparkling-2-fill, 색상 #8B5CF6 (violet)
**헤더 우측:** "Pro+" 배지 + "Updated 5 min ago" 텍스트 (#94A3B8, 11px)

**인사이트 카드 리스트 (3~4개):**
```
각 카드 스타일:
  배경: #F5F3FF (violet-50)
  좌측 보더: 3px solid (카테고리별 색상)
  모서리: rounded-lg (8px)
  패딩: 14px 16px
  간격: 카드 간 10px

카드 내부:
  상단: 카테고리 태그 + 타임스탬프
    태그: rounded-full, px-2 py-0.5, text-[0.6875rem], font-semibold
  본문: text-[0.8125rem], text-#334155, line-height 1.5
  하단: 액션 링크 (있는 경우)
```

**인사이트 카테고리별 스타일:**
```
📊 일일 요약:   보더 #8B5CF6, 태그 bg-#F5F3FF text-#8B5CF6
⚠️ 리스크 경고: 보더 #EF4444, 태그 bg-#FEF2F2 text-#EF4444
⏱️ 완료 예측:   보더 #6366F1, 태그 bg-#EEF2FF text-#6366F1
👥 팀 밸런스:   보더 #F59E0B, 태그 bg-#FFFBEB text-#F59E0B
```

**예시 카드 3개:**
```
┌─ 📊 Daily Summary ─────────────────────── 5분 전 ─┐
│                                                     │
│ 오늘 팀이 142건의 TC를 실행했고, Pass Rate가 어제   │
│ 대비 3.2% 상승(91.2%)했습니다. 특히 '결제 모듈'    │
│ 폴더의 Pass Rate가 95%로 안정화되었습니다.          │
│                                                     │
└─────────────────────────────────────────────────────┘
┌─ ⚠️ Risk Alert ─────────────────────────── 1시간 전 ┐
│                                                      │
│ '사용자 인증' 폴더의 Pass Rate가 3일간 78% → 65% →  │
│ 52%로 급락 중입니다. 최근 코드 변경의 영향일 수      │
│ 있으니 확인이 필요합니다.                             │
│                                                      │
│ [인증 폴더 확인하기 →]                                │
└──────────────────────────────────────────────────────┘
┌─ ⏱️ Completion Forecast ────────────────── 3시간 전 ┐
│                                                      │
│ 현재 속도(일 평균 45건)로 진행하면, Sprint 12        │
│ 마일스톤은 4/8 완료 예상입니다. 기한(4/10)보다       │
│ 2일 여유가 있습니다.                                  │
└──────────────────────────────────────────────────────┘
```

**Free/Starter 블러 오버레이:** 목업 A-5와 동일한 블러 + 잠금 패턴

---

## ═══════════════════════════════════════════
## PART B: Activity Feed 탭 목업 (6건)
## ═══════════════════════════════════════════

---
## 목업 B-1: Activity Feed 전체 레이아웃

**목적:** Activity Feed 탭 선택 시 보이는 전체 페이지 구성.

**전체 구조:**
```
┌──────────────────────────────────────────────────────┐
│  ┌─ 필터 바 ──────────────────────────────────────┐  │
│  │ [팀원▼] [유형▼] [날짜: 최근 7일▼]  [🔍 검색]  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ AI 일일 요약 카드 ─────────────── [Pro+] ────┐  │
│  │ 🤖 접이식 카드 — 기본 펼침                     │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ● 실시간 인디케이터: "Live · 12 events today"       │
│                                                      │
│  ── 오늘 ────────────────────────────────────────    │
│  ┌─ 이벤트 카드 ─────────────────────────────────┐  │
│  │ 🟢 김민수 · TC-042 로그인 세션 만료 → Passed  │  │
│  └────────────────────────────────────────────────┘  │
│  ┌─ 중요 이벤트 카드 (하이라이트) ──────────────┐   │
│  │ 🔴 이정현 · TC-015 결제 취소 → Failed         │  │
│  │    💬 "타임아웃 에러 — 서버 응답 지연"         │  │
│  └────────────────────────────────────────────────┘  │
│  ┌─ 그룹 이벤트 (접힘) ─────────────────────────┐   │
│  │ 📊 박지은 · Run "회원가입" 에서 12건 실행     │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ── 어제 ────────────────────────────────────────    │
│  ...                                                 │
│                                                      │
│  [더 보기 ▼]                                         │
└──────────────────────────────────────────────────────┘
```

**날짜 구분선 스타일:**
```
레이아웃: flex, items-center, gap-3
좌측: 텍스트 "오늘" 또는 "어제" 또는 "3월 28일 (금)"
  text-[0.75rem], font-semibold, text-#64748B
우측: 수평선 flex-1, border-t 1px #E2E8F0
패딩: py-3
```

---

## 목업 B-2: 이벤트 유형별 아이콘/색상 체계 (14종)

**목적:** 각 활동 유형을 한눈에 구분할 수 있는 아이콘+색상 시스템.

**이벤트 유형 테이블:**
```
┌─────────────────────┬───────────────────────┬──────────┬──────────┐
│ 유형                 │ 아이콘                │ 아이콘색  │ 배경 원형 │
├─────────────────────┼───────────────────────┼──────────┼──────────┤
│ TC Passed           │ ri-checkbox-circle-fill│ #16A34A  │ #ECFDF5  │
│ TC Failed           │ ri-close-circle-fill   │ #DC2626  │ #FEF2F2  │
│ TC Blocked          │ ri-forbid-fill         │ #D97706  │ #FFFBEB  │
│ TC Retest           │ ri-refresh-fill        │ #7C3AED  │ #F5F3FF  │
│ Run Started         │ ri-play-circle-fill    │ #6366F1  │ #EEF2FF  │
│ Run Completed       │ ri-flag-fill           │ #10B981  │ #ECFDF5  │
│ TC Created          │ ri-file-add-fill       │ #6366F1  │ #EEF2FF  │
│ TC Modified         │ ri-edit-fill           │ #F59E0B  │ #FFFBEB  │
│ Comment Added       │ ri-chat-3-fill         │ #64748B  │ #F1F5F9  │
│ Milestone Created   │ ri-flag-2-fill         │ #F59E0B  │ #FFFBEB  │
│ Milestone Completed │ ri-trophy-fill         │ #10B981  │ #ECFDF5  │
│ Member Joined       │ ri-user-add-fill       │ #6366F1  │ #EEF2FF  │
│ Role Changed        │ ri-shield-user-fill    │ #8B5CF6  │ #F5F3FF  │
│ Jira Issue Created  │ ri-bug-fill            │ #0052CC  │ #E9F2FF  │
└─────────────────────┴───────────────────────┴──────────┴──────────┘
```

**아이콘 원형 배경 스타일:**
```
크기: 32px × 32px
모서리: rounded-full
배경: 위 표의 "배경 원형" 색상
아이콘 크기: 16px, 색상: 위 표의 "아이콘색"
flex, items-center, justify-center
```

---
## 목업 B-3: 필터 바 상세

**위치:** Activity Feed 탭 최상단
**레이아웃:** flex, items-center, gap-3, flex-wrap

**필터 항목 4개:**

**1) 팀원 필터 (멀티셀렉트 드롭다운):**
```
버튼: [👥 All Members ▼]
  bg-white, border 1px #E2E8F0, rounded-lg, px-3 py-1.5
  text-[0.8125rem], text-#334155

드롭다운 (클릭 시):
  너비: 240px
  최상단: 검색 인풋 (ri-search-line + "Search members...")
  체크박스 리스트: 각 팀원 아바타 이모지 + 이름 + 체크박스
  하단: [Clear all] [Apply] 버튼 쌍
  선택 시 버튼 텍스트: "👥 김민수 외 2명" + 카운트 배지
```

**2) 유형 필터 (싱글 셀렉트 드롭다운):**
```
버튼: [📋 All Types ▼]
옵션:
  - 전체 (All)
  - 테스트 실행 (Test Execution)
  - TC 관리 (Test Case Management)
  - 마일스톤 (Milestones)
  - 팀 활동 (Team)
  - Jira 연동 (Jira Integration)
각 옵션 좌측에 해당 카테고리 대표 아이콘
```

**3) 날짜 필터:**
```
버튼: [📅 Last 7 days ▼]
옵션: Today | Last 7 days | Last 30 days | Custom range
Custom range 선택 시: 날짜 피커 2개 (From, To) 인라인 표시
```

**4) 검색:**
```
인풋: [🔍 Search activity...]
  bg-white, border 1px #E2E8F0, rounded-lg, px-3 py-1.5
  너비: 200px, focus 시 280px (transition width 200ms)
  placeholder: text-#94A3B8
  아이콘: ri-search-line, text-#94A3B8
```

**활성 필터 표시:**
```
필터 바 아래, 활성 필터가 있을 때만 표시
각 필터: 칩(chip) 스타일
  bg-#EEF2FF, text-#6366F1, rounded-full, px-2.5 py-1
  텍스트: text-[0.75rem], font-medium
  우측 X 버튼: ri-close-line, hover text-#EF4444
예: [👤 김민수 ×] [📋 Test Execution ×] [Clear all]
```

---

## 목업 B-4: AI 일일 요약 카드 — Professional+ 전용

**위치:** 필터 바 아래, 피드 리스트 위 (상단 고정)
**기본 상태:** 펼침 (접을 수 있음)

**카드 스타일:**
```
배경: 그라데이션 bg-gradient-to-r from-#F5F3FF to-#EEF2FF
테두리: 1px solid #DDD6FE (violet-200)
모서리: rounded-xl (12px)
패딩: 18px 22px
```

**카드 내부:**
```
┌─────────────────────────────────────────────────────┐
│ 🤖 AI Daily Summary          [Pro+]    [▲ 접기]    │
│ ─────────────────────────────────────────────────── │
│                                                     │
│ 오늘 팀이 87건의 TC를 실행했고, Pass Rate가 91.2%로 │
│ 전일 대비 +2.3% 상승했습니다. 김민수 님이 가장      │
│ 활발(32건)했습니다. '결제 모듈'에서 3건의 새 실패가 │
│ 발견되었으며, 모두 Critical priority입니다.          │
│                                                     │
│ 📌 주요 포인트:                                     │
│ · Sprint 12 마일스톤 진행률 72% (D-5)               │
│ · 신규 Flaky TC 1건 감지 (TC-089)                   │
│ · 이정현 님 TC 배정 38건 대기 중                     │
│                                                     │
│ Updated 5 min ago                                   │
└─────────────────────────────────────────────────────┘

헤더:
  좌측: 🤖 아이콘(20px) + "AI Daily Summary" (font-semibold, 15px, text-#0F172A)
  중앙: "Pro+" 배지
  우측: 접기/펼치기 토글 (ri-arrow-up-s-line / ri-arrow-down-s-line)

본문: text-[0.875rem], text-#334155, line-height 1.6
주요 포인트: 도트 리스트, text-[0.8125rem]
타임스탬프: text-[0.6875rem], text-#94A3B8, 우측 정렬
```

**접힌 상태:**
```
┌─────────────────────────────────────────────────────┐
│ 🤖 AI Daily Summary  "오늘 87건 실행, 91.2%..." [▼] │
└─────────────────────────────────────────────────────┘
한 줄 미리보기, text-ellipsis, max-width 60%
```

---
## 목업 B-5: 중요 이벤트 하이라이트 스타일 (5종)

**목적:** 일반 피드 아이템 vs 중요 이벤트의 시각적 차별화.

**일반 피드 아이템 스타일:**
```
┌─ 아이콘 원형 ─┬─ 내용 ──────────────────────── 시간 ─┐
│ (32px 원형)   │ 김민수 · TC-042 로그인 → Passed       │
│               │ Run: Sprint 12 리그레션                │
└───────────────┴───────────────────────────────────────┘

배경: transparent
패딩: 12px 16px
하단 보더: 1px solid #F1F5F9
hover: bg-#F8FAFC

내용 좌측:
  액터 이름: font-semibold, text-[0.8125rem], text-#0F172A
  구분자 "·": text-#CBD5E1
  대상: font-medium, text-[0.8125rem], text-#334155
  상태 배지: 상태별 색상 pill (text-[0.6875rem])
보조 텍스트 (아래줄): text-[0.75rem], text-#94A3B8
시간: text-[0.6875rem], text-#94A3B8, 우측 끝
```

**하이라이트 유형 5가지:**

**1) Critical TC 실패 (빨간 하이라이트):**
```
좌측 보더: 3px solid #EF4444
배경: #FEF2F2 (red-50)
아이콘 원형: bg-#FEE2E2, 아이콘 #DC2626
우측 상단: 🔴 배지 "Critical Failure"
  bg-#EF4444, text-white, text-[0.625rem], font-bold, rounded-full, px-2
```

**2) Run 완료 (Pass Rate 낮음, 주황 하이라이트):**
```
좌측 보더: 3px solid #F59E0B
배경: #FFFBEB (amber-50)
하단 미니 바: Pass Rate 시각화 (스택 바)
경고 텍스트: "⚠️ Pass Rate 62% — below 70% threshold"
  text-[0.75rem], text-#D97706, font-medium
```

**3) 마일스톤 기한 임박 (주황 하이라이트):**
```
좌측 보더: 3px solid #F59E0B
배경: #FFFBEB
아이콘: ri-alarm-warning-fill
추가 텍스트: "⏰ D-2, 진행률 68% — 기한 내 완료 위험"
```

**4) 대량 연속 실패 (빨간 그룹 카드):**
```
좌측 보더: 3px solid #EF4444
배경: #FEF2F2
그룹 표시: "🔴 3건 연속 실패 in Run 'Sprint 12'"
접힌 상태: 요약만 표시, 클릭 시 개별 실패 TC 펼침
펼침 시: 들여쓰기 된 개별 실패 카드 리스트
```

**5) 새 피드 아이템 애니메이션 (실시간 도착):**
```
신규 아이템이 상단에 추가될 때:
  슬라이드 다운 애니메이션: translateY(-20px) → 0, opacity 0 → 1
  duration: 300ms, ease-out
  좌측에 파란 도트(6px, #6366F1) 1초간 표시 후 fade out
```

---

## 목업 B-6: 실시간 업데이트 인디케이터

**위치:** AI 요약 카드와 첫 번째 날짜 구분선 사이

**Live 인디케이터 스타일:**
```
┌──────────────────────────────────────────────────────┐
│  ● Live  ·  12 events today  ·  Last: 2 min ago     │
└──────────────────────────────────────────────────────┘

레이아웃: flex, items-center, gap-2, py-2

● Live 도트:
  크기: 8px 원형
  색상: #10B981 (green)
  애니메이션: pulse (opacity 1 → 0.4 → 1, duration 2s, infinite)
"Live" 텍스트: text-[0.75rem], font-semibold, text-#10B981
구분자 "·": text-#CBD5E1
카운트: text-[0.75rem], text-#64748B
마지막 업데이트: text-[0.75rem], text-#94A3B8
```

**새 이벤트 도착 알림 (스크롤 내린 상태에서):**
```
피드 상단에 플로팅 알림 바:
┌──────────────────────────────────────┐
│ ↑ 3 new events — Click to refresh   │
└──────────────────────────────────────┘

스타일:
  position: sticky, top: 0
  배경: #6366F1 (indigo)
  텍스트: white, text-[0.8125rem], font-medium
  모서리: rounded-lg
  패딩: 8px 16px
  text-align: center
  cursor: pointer
  그림자: 0 4px 12px rgba(99,102,241,0.3)
  클릭 시: 상단으로 스크롤 + 새 이벤트 표시
```

**연결 끊김 상태:**
```
● 도트 색상: #EF4444 (빨강)로 변경
텍스트: "Reconnecting..." text-#EF4444
도트 애니메이션: 빠른 깜빡임 (duration 0.8s)
```

---

## 추가 참고: 기존 Dashboard 일관성 체크리스트

목업 제작 시 아래 항목을 반드시 확인해주세요:

1. **폰트:** 시스템 폰트 스택 (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto)
2. **기본 텍스트 크기:** 13px (0.8125rem) — 앱 전체 기본
3. **카드 모서리:** 12px (rounded-xl) — Overview 위젯과 동일
4. **아이콘:** Remix Icon (ri-*) — 앱 전체 통일
5. **탭 전환 시 애니메이션:** 없음 (즉시 전환) — 기존과 동일
6. **반응형:** 최소 너비 1024px 기준, 2열 그리드가 1열로 스택
7. **빈 상태:** 데이터 없을 때 empty state 일러스트 + "No data yet" 메시지
8. **로딩 상태:** 스켈레톤 UI (회색 펄스 애니메이션)

---

*End of Desi Mockup Instructions*
