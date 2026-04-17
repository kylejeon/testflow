# Design Spec: [기능명]

> **작성일:** YYYY-MM-DD
> **작성자:** Designer / PM
> **상태:** Draft → Review → Approved
> **관련 개발지시서:** `pm/specs/dev-spec-[기능명].md`
> **Figma 링크:** (있으면 첨부)

---

## 1. 레이아웃

### 페이지 구조

```
┌─ Header (기존 GNB) ──────────────────────────┐
│ ┌─ Sidebar (기존) ──┐ ┌─ Main Content ──────┐ │
│ │                   │ │                     │ │
│ │  네비게이션        │ │  Page Header        │ │
│ │                   │ │  ─────────────────  │ │
│ │                   │ │                     │ │
│ │                   │ │  Main Area          │ │
│ │                   │ │  (목록 / 폼 / 등)    │ │
│ │                   │ │                     │ │
│ └───────────────────┘ └─────────────────────┘ │
└───────────────────────────────────────────────┘
```

### 기준 너비

| 영역 | 너비 |
|------|------|
| Sidebar | 240px (기존) |
| Main content | fluid (나머지) |
| 최소 너비 | 768px |
| 모달 최대 너비 | max-w-lg (32rem) / max-w-2xl (42rem) |

---

## 2. Page Header

```
┌──────────────────────────────────────────────────────┐
│  페이지 제목                    [ + 만들기 ] [ ··· ]  │
│  text-xl font-bold             variant="primary"     │
│                                                      │
│  설명 텍스트 (선택)                                    │
│  text-sm text-gray-500                               │
└──────────────────────────────────────────────────────┘
```

| 요소 | Tailwind 클래스 |
|------|----------------|
| 제목 | `text-xl font-bold text-gray-900 dark:text-gray-100` |
| 설명 | `text-sm text-gray-500 dark:text-gray-400` |
| 영역 간격 | `mb-6` |

---

## 3. 컴포넌트 명세

### 3-1. 목록 아이템

```
┌──────────────────────────────────────────────────────┐
│ ☐  아이템 이름                    High   Tag1  Tag2  │
│    설명 텍스트 (1줄 truncate)                  12/25  │
└──────────────────────────────────────────────────────┘
```

| 요소 | Tailwind 클래스 |
|------|----------------|
| 컨테이너 | `px-4 py-3 border-b border-gray-100 dark:border-gray-800` |
| 이름 | `text-sm font-medium text-gray-900 dark:text-gray-100` |
| 설명 | `text-xs text-gray-500 dark:text-gray-400 truncate` |
| 호버 | `hover:bg-gray-50 dark:hover:bg-gray-800` |
| 선택됨 | `bg-brand-50 dark:bg-brand-900/20 border-l-2 border-brand-500` |
| 간격 | `gap-2` (항목 사이) |

### 우선순위 뱃지

| 우선순위 | Tailwind 클래스 |
|---------|----------------|
| Critical | `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300` |
| High | `bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300` |
| Medium | `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300` |
| Low | `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300` |

> 공통: `px-2 py-0.5 rounded text-xs font-medium`

### 상태 뱃지

| 상태 | Tailwind 클래스 |
|------|----------------|
| Active | `bg-green-100 text-green-800` |
| Draft | `bg-gray-100 text-gray-800` |
| Archived | `bg-gray-100 text-gray-500` |

---

### 3-2. 생성/수정 모달

```
┌─────────────────── 제목 ─────────────────────┐
│                                         ✕    │
│                                              │
│  Name *                                      │
│  ┌──────────────────────────────────────┐    │
│  │ placeholder                          │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Description                                 │
│  ┌──────────────────────────────────────┐    │
│  │                                      │    │
│  │                                      │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Priority                                    │
│  ┌─ Select ───────────────────── ▾ ─────┐   │
│  └──────────────────────────────────────┘    │
│                                              │
│  Tags                                        │
│  ┌──────────────────────────────────────┐    │
│  │ tag1 ✕ │ tag2 ✕ │ + 추가            │    │
│  └──────────────────────────────────────┘    │
│                                              │
│               [ Cancel ]  [ Create ]         │
└──────────────────────────────────────────────┘
```

| 요소 | Tailwind 클래스 |
|------|----------------|
| 모달 오버레이 | `bg-black/50 backdrop-blur-sm` |
| 모달 컨테이너 | `bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4` |
| 모달 헤더 | `px-6 py-4 border-b border-gray-200 dark:border-gray-700` |
| 모달 제목 | `text-lg font-semibold text-gray-900 dark:text-gray-100` |
| 모달 바디 | `px-6 py-4 space-y-4` |
| 모달 푸터 | `px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3` |
| Label | `block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1` |
| 필수 표시 | `text-red-500` (* 문자) |
| Input | 기존 Input 컴포넌트 재사용 |
| Textarea | 기존 Textarea 컴포넌트 재사용, `rows={3}` |
| Cancel 버튼 | `variant="ghost"` |
| Submit 버튼 | `variant="primary"` (brand-600) |
| Submit 로딩 | 버튼 내 spinner + "Creating..." 텍스트 |

### Validation 표시

| 상태 | 스타일 |
|------|--------|
| 에러 | Input border → `border-red-500`, 아래 `text-xs text-red-500 mt-1` |
| 성공 | 기본 스타일 유지 (별도 표시 없음) |

---

## 4. 상태별 화면

### 4-1. Empty State (데이터 없을 때)

```
┌──────────────────────────────────────────────┐
│                                              │
│           (아이콘, 48px, gray-400)            │
│                                              │
│        아직 항목이 없습니다                     │
│        text-sm text-gray-500                 │
│                                              │
│        설명 텍스트 (선택)                      │
│        text-xs text-gray-400                 │
│                                              │
│           [ + 첫 항목 만들기 ]                 │
│           variant="primary"                  │
│                                              │
└──────────────────────────────────────────────┘
```

| 요소 | Tailwind 클래스 |
|------|----------------|
| 컨테이너 | `flex flex-col items-center justify-center py-16` |
| 아이콘 | `w-12 h-12 text-gray-400 dark:text-gray-600 mb-4` |
| 타이틀 | `text-sm font-medium text-gray-500 dark:text-gray-400` |
| 설명 | `text-xs text-gray-400 dark:text-gray-500 mt-1` |
| 버튼 | `mt-4` |

### 4-2. Loading State

- 기존 `Skeleton` 컴포넌트 재사용
- 목록: 3줄 반복 (높이 48px 각)
- 카드: 2x2 그리드 Skeleton

### 4-3. Error State

- 기존 에러 토스트 (sonner) 재사용
- 인라인 에러: `text-sm text-red-500 flex items-center gap-1` + AlertCircle 아이콘

### 4-4. 플랜 제한 도달

```
┌──────────────────────────────────────────────┐
│  ⚠️  Free 플랜은 최대 N개까지 생성 가능합니다   │
│                                              │
│  더 많은 항목이 필요하신가요?                    │
│  [ 플랜 업그레이드 →]                          │
└──────────────────────────────────────────────┘
```

| 요소 | Tailwind 클래스 |
|------|----------------|
| 배너 컨테이너 | `bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4` |
| 텍스트 | `text-sm text-yellow-800 dark:text-yellow-200` |
| 링크 | `text-brand-600 hover:text-brand-700 font-medium` |

---

## 5. 인터랙션

### 기본 인터랙션

| 트리거 | 동작 | 애니메이션 |
|--------|------|----------|
| 목록 아이템 클릭 | 상세 페이지로 이동 / 사이드 패널 오픈 | - |
| `+` 버튼 클릭 | 생성 모달 오픈 | fade-in 150ms |
| 모달 외부 클릭 | 모달 닫힘 | fade-out 100ms |
| ESC 키 | 모달 닫힘 | fade-out 100ms |
| 저장 성공 | 토스트 표시 + 목록에 즉시 반영 | 낙관적 업데이트 |
| 저장 실패 | 에러 토스트 | - |
| 삭제 클릭 | 확인 다이얼로그 표시 | - |

### 키보드 단축키

| 단축키 | 동작 | 조건 |
|--------|------|------|
| `Cmd+K` → "create [기능명]" | 생성 모달 오픈 | Command Palette 내 |
| `G` + `[key]` | 해당 페이지로 이동 | G-chord 등록 시 |
| `Enter` | 선택된 아이템 열기 | 목록 포커스 시 |
| `Delete` / `Backspace` | 삭제 확인 | 아이템 선택 시 |

### 토스트 메시지

| 이벤트 | 메시지 (EN) | 메시지 (KO) | 타입 |
|--------|------------|------------|------|
| 생성 성공 | "Created successfully" | "생성 완료" | success |
| 수정 성공 | "Updated successfully" | "수정 완료" | success |
| 삭제 성공 | "Deleted successfully" | "삭제 완료" | success |
| 에러 | "Something went wrong" | "문제가 발생했습니다" | error |

---

## 6. 반응형

| 브레이크포인트 | 변경점 |
|--------------|--------|
| >= 1280px (xl) | 기본 레이아웃 |
| 1024~1279px (lg) | 사이드바 좁아짐 (아이콘만) |
| 768~1023px (md) | 사이드바 접힘 (햄버거 메뉴), 2열 → 1열 |
| < 768px (sm) | 모바일 레이아웃, 테이블 → 카드 뷰 |

### 모바일 카드 뷰 (< 768px)

```
┌──────────────────────────────┐
│  아이템 이름            High  │
│  설명 텍스트                  │
│  Tag1  Tag2          12/25  │
└──────────────────────────────┘
(카드 사이 gap-3)
```

---

## 7. 다크모드 색상 매핑

| 요소 | Light | Dark |
|------|-------|------|
| 페이지 배경 | `bg-white` | `bg-gray-950` |
| 카드 배경 | `bg-white` | `bg-gray-900` |
| 카드 보더 | `border-gray-200` | `border-gray-700` |
| 주요 텍스트 | `text-gray-900` | `text-gray-100` |
| 보조 텍스트 | `text-gray-500` | `text-gray-400` |
| 구분선 | `border-gray-100` | `border-gray-800` |
| 호버 | `bg-gray-50` | `bg-gray-800` |
| 인풋 배경 | `bg-white` | `bg-gray-800` |
| 인풋 보더 | `border-gray-300` | `border-gray-600` |

---

## 8. 기존 컴포넌트 재사용 목록

### 재사용 (수정 없이)

| 컴포넌트 | 위치 | 용도 |
|---------|------|------|
| `Button` | 기존 | primary, ghost, danger variant |
| `Modal` | 기존 | 모달 래퍼 |
| `Input` | 기존 | 텍스트 입력 |
| `Textarea` | 기존 | 긴 텍스트 입력 |
| `Select` | 기존 | 드롭다운 선택 |
| `Badge` | 기존 | 우선순위, 상태 뱃지 |
| `Skeleton` | 기존 | 로딩 상태 |
| `Toast (sonner)` | 기존 | 알림 토스트 |

### 신규 생성

| 컴포넌트 | 역할 |
|---------|------|
| `FeatureList` | 이 기능 전용 목록 |
| `FeatureForm` | 생성/수정 폼 |
| `FeatureCard` | 모바일 카드 뷰 (필요 시) |

---

## 디자인 개발 착수 전 체크리스트

> 아래 항목을 모두 통과해야 Phase 4(개발)로 진행

- [ ] 모든 상태가 정의되었는가 (정상, 빈 상태, 로딩, 에러, 제한 도달)
- [ ] Tailwind 클래스가 구체적으로 명시되었는가
- [ ] 다크모드 색상 매핑이 있는가
- [ ] 기존 컴포넌트 재사용 목록이 있는가
- [ ] 인터랙션 (클릭, 호버, 키보드)이 정의되었는가
- [ ] 반응형 브레이크포인트별 변경점이 있는가
- [ ] 토스트 메시지가 en/ko 모두 있는가
- [ ] 관련 개발지시서와 수용 기준이 일치하는가
