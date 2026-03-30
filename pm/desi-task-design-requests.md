# Desi 디자인 요청 — 미구현 기능 UI 디자인

**발신:** PM  
**수신:** Desi (local_a2550f2f-b198-4d4b-910e-2f21259cda13)  
**일시:** 2026-03-30  
**기획서:** `/Users/yonghyuk/testflow/pm/pm-plan-unimplemented-homepage-features.html`

---

## 요청 1: Jira 설정 화면 확장 (P0 — 우선)

**기획서 섹션:** S3, S4, S5

현재 Settings → Integrations → Jira Integration 섹션에 추가할 UI:

1. **커스텀 필드 매핑 카드**
   - "Fetch Fields" 버튼 → Jira에서 필드 목록 가져오기
   - 매핑 테이블: 좌(Testably 필드) ↔ 우(Jira 필드 드롭다운)
   - "+ Add Custom Field" 버튼
   - 기존 Testably 디자인 시스템(indigo, border-[#E2E8F0]) 준수

2. **상태 매핑 테이블**
   - Testably Status (Passed/Failed/Blocked/Retest) ↔ Jira Transition 매핑
   - 각 행에 드롭다운

3. **동기화 방향 설정**
   - Radio 또는 Select: "Outbound only / Inbound only / Bidirectional"
   - Webhook URL 표시 (복사 버튼)

4. **자동 이슈 생성 토글**
   - "Auto-create Jira issue on test failure" 토글
   - 조건 선택: "All failures / First failure only / Disabled"

---

## 요청 2: Folder Drag-and-Drop (P1)

**기획서 섹션:** S8

테스트 케이스 페이지의 폴더 트리에서 DnD 기능:

1. **드래그 중 시각적 피드백**
   - Ghost 아이템 (반투명, 원본 위치에 placeholder)
   - 드래그 중 커서 변경

2. **드롭 타겟 하이라이트**
   - 폴더 위에 hover 시 indigo border + 배경 하이라이트
   - 유효/무효 드롭 영역 시각 구분

3. **다중 선택 드래그**
   - 체크박스로 여러 TC 선택 후 드래그 시 "3 items" 뱃지

---

## 요청 3: Milestone Timeline View (P1)

**기획서 섹션:** S11

Milestone 리스트 페이지에 추가할 타임라인 뷰:

1. **뷰 토글 버튼**
   - 기존 탭 바 영역에 "List | Timeline" 아이콘 토글

2. **타임라인 레이아웃**
   - 수평 시간축 (월 단위 눈금)
   - 각 Milestone을 start_date ~ end_date 기간의 수평 바로 표시
   - 상태별 색상: Upcoming(#DBEAFE), In Progress(#EEF2FF/indigo), Completed(#F0FDF4/green), Past Due(#FEF2F2/red)
   - Sub-milestone은 parent 아래 들여쓰기

3. **인터랙션**
   - 바 hover → tooltip (이름, 날짜, 진행률)
   - 바 클릭 → Milestone Detail로 이동
   - 오늘 날짜 수직선 표시 (점선, red)

---

## 참고
- 전체 기획서(HTML)에 각 기능의 상세 스펙, 데이터 흐름, UI 위치 명시
- 기존 Testably 디자인 시스템: indigo(#6366F1) 기조, rounded-lg, border #E2E8F0
- 디자인 완료 후 Dev2에게 전달 예정
