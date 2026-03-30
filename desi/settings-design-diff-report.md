# Settings 페이지 디자인 목업 vs 실제 구현 — 차이점 및 수정 지시서

**작성자:** Desi (Designer)
**대상:** Dev2
**날짜:** 2026-03-28
**참고 목업:** `/testflow/settings-redesign.html`
**실제 사이트:** https://www.testably.app/settings

---

## 1. 탭 아이콘 — 컬러 아이콘 누락 (Critical)

### 문제
목업에서는 각 탭 이름 왼쪽에 **filled 아이콘 + 고유 색상**이 지정되어 있지만, 실제 구현에서는 **line 아이콘 + 모두 동일한 gray 색상(rgb(75,85,99))**으로 되어 있음.

### 목업 스펙 (정확한 아이콘 + 색상 매핑)

| 탭 | 아이콘 클래스 (목업) | 색상 (목업) | 현재 구현 아이콘 | 현재 색상 |
|---|---|---|---|---|
| Profile | `ri-user-settings-fill` | `#8B5CF6` (Violet) | `ri-user-settings-line` | gray-600 |
| General* | — | — | `ri-settings-3-line` | gray-600 |
| Members | `ri-team-fill` | `#22C55E` (Green) | `ri-team-line` | gray-600 |
| Integrations | `ri-plug-fill` | `#F59E0B` (Amber) | `ri-plug-line` | gray-600 |
| CI/CD | — (목업에는 별도 탭 없음, Integrations 안에 포함) | — | `ri-git-branch-line` | gray-600 |
| Notifications | `ri-notification-3-fill` | `#EF4444` (Red) | `ri-notification-3-line` | gray-600 |

> *참고: 목업에서는 "General" 탭이 없고 대신 "Billing", "Preferences", "API & Tokens" 탭이 별도로 있음. 탭 구조가 다르므로 아래 참고.

### 수정 방법
```tsx
// 각 탭 아이콘을 -line → -fill 로 변경하고, 고유 색상을 inline style 또는 className으로 적용
// active 탭이 아닌 경우에도 아이콘 색상은 유지 (탭 텍스트만 gray ↔ indigo 전환)

const tabConfig = [
  { key: 'profile',       icon: 'ri-user-settings-fill',   iconColor: '#8B5CF6', label: 'Profile' },
  { key: 'general',       icon: 'ri-settings-3-fill',      iconColor: '#6366F1', label: 'General' },
  { key: 'members',       icon: 'ri-team-fill',            iconColor: '#22C55E', label: 'Members' },
  { key: 'integrations',  icon: 'ri-plug-fill',            iconColor: '#F59E0B', label: 'Integrations' },
  { key: 'cicd',          icon: 'ri-git-branch-fill',      iconColor: '#3B82F6', label: 'CI/CD' },
  { key: 'notifications', icon: 'ri-notification-3-fill',  iconColor: '#EF4444', label: 'Notifications' },
];

// 렌더링 예시
<i className={tab.icon} style={{ color: tab.iconColor, fontSize: '0.875rem' }} />
```

**핵심:** `-line` → `-fill` 로 변경 + 각 탭별 고유 색상 적용. 아이콘 색상은 active 여부와 무관하게 항상 유지.

---

## 2. 콘텐츠 영역 너비 — max-width 미적용 (Critical)

### 문제
목업에서는 콘텐츠 영역이 `max-width: 800px`로 중앙 정렬되어 컴팩트하지만, 실제 구현에서는 `max-width: none`으로 전체 화면 폭(1639px)까지 늘어남.

### 현재 구현
```
main > .p-8 (padding: 32px, width: 1705px)
  └ .bg-white.rounded-xl (width: 1641px)
    └ 탭 row (width: 1639px)
    └ .p-8 content (width: 1639px, max-width: none)
      └ .space-y-8 (width: 1575px, max-width: none)
```

### 목업 스펙
```css
.settings-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem 2rem 3rem;  /* 24px 32px 48px */
}
```

### 수정 방법
```tsx
// 탭 콘텐츠 영역 내부에 max-width wrapper 추가
<div className="p-6 sm:p-8">
  <div className="max-w-[800px] mx-auto">
    {/* 탭 콘텐츠 */}
  </div>
</div>
```

또는 Tailwind 클래스 적용:
```
콘텐츠 wrapper: max-w-3xl mx-auto (max-width: 768px, 800px에 근사)
또는 커스텀: max-w-[800px] mx-auto
```

---

## 3. 전체 레이아웃 구조 차이

### 3-1. 페이지 헤더 영역

| 항목 | 목업 | 현재 구현 | 수정 필요 |
|---|---|---|---|
| 헤더 높이 | 3.25rem (52px) | 69px | ⬇ 줄여야 함 |
| 헤더 padding | `0 1.25rem` (0 20px) | `16px 24px` | 수정 필요 |
| "Settings" 제목 위치 | 헤더 Row 1 안에 인라인 (좌측 "← Projects" 옆) | 헤더 아래 별도 블록 (`h1` 30px bold) | 구조 변경 필요 |
| "Settings" 폰트 | 0.8125rem (13px), font-weight: 600 | 30px, font-weight: 700 | ⬇ 크게 줄여야 함 |
| 서브타이틀 | 없음 | "Manage your application settings..." (16px) | 제거 필요 |
| ← Projects 백버튼 | 있음 (인디고 색상, 헤더 안) | 없음 (로고만 링크) | 추가 필요 |

### 목업 헤더 구조
```
┌─────────────────────────────────────────────────────┐
│ [Logo] Testably │ ← Projects │ ⚙ Settings │ ... 🔍 🔔 ⌨ [KJ] │  ← Row 1 (52px)
├─────────────────────────────────────────────────────┤
│ 🟣Profile  🔵Billing  🔵Preferences  🟢Members ...  │  ← Row 2 (42px, subtab)
├─────────────────────────────────────────────────────┤
│              [max-width: 800px content]              │
└─────────────────────────────────────────────────────┘
```

### 현재 구현 구조
```
┌─────────────────────────────────────────────────────┐
│ [Logo] Testably │ Settings                          │  ← Header (69px)
├─────────────────────────────────────────────────────┤
│ Settings (h1 30px)                                   │  ← 별도 타이틀 블록
│ Manage your application settings...                  │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Profile  General  Members  Integrations  CI/CD  │ │  ← 탭 (55px, 카드 안)
│ ├─────────────────────────────────────────────────┤ │
│ │ [full-width content, no max-width]              │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 수정 방향
- 큰 "Settings" h1 제목 + 서브타이틀 블록 → **제거** (또는 헤더 안으로 이동)
- 탭 row → 카드 안이 아닌 **독립 subtab row**로 변경 (또는 현재 카드 구조 유지하되 목업 스타일 적용)

---

## 4. 탭 Row 스타일 차이

| 항목 | 목업 | 현재 구현 |
|---|---|---|
| 높이 | 2.625rem (42px) | 55px |
| 탭 padding | `0 0.75rem` (0 12px) | `16px 24px` |
| 탭 font-size | 0.8125rem (13px) | 14px |
| 탭 font-weight (inactive) | 500 | 600 |
| 탭 font-weight (active) | 600 | 600 |
| Active 표시 | `::after` 2.5px indigo underline (bottom: -1px) | `border-b-2 border-indigo-600` |
| Active 배경 | 없음 (투명) | `bg-indigo-50/50` |
| 아이콘 크기 | 0.875rem (14px) | 상속 (14px) |
| 아이콘 gap | 0.3125rem (5px) | `mr-2` (8px) |

### 수정 CSS
```css
/* 탭 버튼 */
.settings-tab {
  padding: 0 0.75rem;          /* 기존 px-6 py-4 → 0 12px */
  height: 2.625rem;            /* 42px */
  font-size: 0.8125rem;        /* 13px */
  font-weight: 500;            /* inactive: medium */
  display: flex;
  align-items: center;
  gap: 0.3125rem;              /* 5px, 기존 mr-2(8px) → 줄임 */
}

/* Active 탭 */
.settings-tab.active {
  font-weight: 600;
  color: #6366F1;
  background: transparent;     /* 기존 bg-indigo-50/50 제거 */
  border-bottom: none;
  position: relative;
}
.settings-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2.5px;
  background: #6366F1;
  border-radius: 1px 1px 0 0;
}
```

---

## 5. 콘텐츠 내부 섹션 카드 스타일 차이

| 항목 | 목업 | 현재 구현 |
|---|---|---|
| 카드 배경 | `#fff` (별도 카드) | 투명 (border-t 구분선만) |
| 카드 border | `1px solid #E2E8F0` | 없음 (상단 border-t만) |
| 카드 border-radius | `0.625rem` (10px) | 0 |
| 카드 padding | `1.5rem` (24px) | 0 (상단 pt-8만) |
| 카드 margin-bottom | `1.25rem` (20px) | `space-y-8` (32px) |
| 섹션 제목 font-size | 0.9375rem (15px) | 20px |
| 섹션 설명 font-size | 0.8125rem (13px) | 14px |
| 섹션 설명 color | `#64748B` (slate-500) | `rgb(75, 85, 99)` (gray-600) |

### 수정 CSS
```css
/* 섹션 카드 */
.section-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 0.625rem;     /* 10px */
  padding: 1.5rem;             /* 24px */
  margin-bottom: 1.25rem;      /* 20px */
}

/* 섹션 제목 */
.section-title {
  font-size: 0.9375rem;        /* 15px, 기존 20px에서 축소 */
  font-weight: 700;
  color: #0F172A;              /* slate-900 */
  margin-bottom: 0.25rem;
}

/* 섹션 설명 */
.section-desc {
  font-size: 0.8125rem;        /* 13px */
  color: #64748B;              /* slate-500 */
  margin-bottom: 1.25rem;
}
```

---

## 6. 폼 요소 스타일 차이

| 항목 | 목업 | 현재 구현 |
|---|---|---|
| Label font-size | 0.8125rem (13px) | 14px |
| Label font-weight | 600 | 600 |
| Label color | `#334155` (slate-700) | `rgb(55, 65, 81)` (gray-700, 유사) |
| Input font-size | 0.8125rem (13px) | 14px |
| Input padding | `0.5rem 0.75rem` (8px 12px) | `10px 12px` |
| Input border-radius | 0.375rem (6px) | 8px |
| Input background | `#F8FAFC` (slate-50) | `#fff` (white) |
| Input border | `1px solid #E2E8F0` | `1px solid rgb(209, 213, 219)` (gray-300) |
| Input focus border | `#C7D2FE` (indigo-200) | 미확인 |

### 수정 CSS
```css
/* 폼 입력 */
.form-input, .form-select {
  font-size: 0.8125rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #E2E8F0;
  border-radius: 0.375rem;     /* 6px, 기존 8px에서 축소 */
  background: #F8FAFC;         /* slate-50, 기존 white에서 변경 */
}
.form-input:focus {
  border-color: #C7D2FE;
  background: #fff;
}

/* 폼 라벨 */
.form-label {
  font-size: 0.8125rem;        /* 기존 14px에서 축소 */
  font-weight: 600;
  color: #334155;
}
```

---

## 7. 버튼 스타일 차이

| 항목 | 목업 | 현재 구현 |
|---|---|---|
| Primary 버튼 font-size | 0.8125rem (13px) | 14px |
| Primary 버튼 padding | `0.4375rem 1rem` (7px 16px) | 더 큰 padding |
| Primary 버튼 border-radius | 0.375rem (6px) | 8px |
| Primary 버튼 shadow | `0 1px 3px rgba(99,102,241,0.3)` | 미확인 |
| Ghost 버튼 font-size | 0.8125rem (13px) | 14px |
| Ghost 버튼 border | `1px solid #E2E8F0` | 미확인 |

---

## 8. 전체 요약 — 우선순위별 수정 목록

### P0 (Critical — CEO 직접 지적)
1. **탭 아이콘**: `-line` → `-fill` 변경 + 탭별 고유 색상 적용 (Section 1 참고)
2. **콘텐츠 max-width**: `max-width: 800px; margin: 0 auto` 적용 (Section 2 참고)

### P1 (High — 레이아웃 구조)
3. **콘텐츠 padding**: `p-8` (32px) → `1.5rem 2rem 3rem` (24px 32px 48px) 으로 조정
4. **탭 row 높이/padding**: 55px → 42px, padding `px-6 py-4` → `0 0.75rem`
5. **Active 탭 배경 제거**: `bg-indigo-50/50` 제거, `::after` underline 방식으로 변경
6. **섹션 카드 border+radius 추가**: 현재 border-t 구분선 → 개별 카드(border + border-radius: 10px)

### P2 (Medium — 세부 스타일)
7. **섹션 제목 축소**: 20px → 15px
8. **폰트 사이즈 전반 축소**: label/input/desc 14px → 13px
9. **Input background**: white → `#F8FAFC`
10. **Input border-radius**: 8px → 6px
11. **버튼 border-radius**: 8px → 6px
12. **간격 축소**: `space-y-8` (32px) → `margin-bottom: 1.25rem` (20px)

### P3 (Nice-to-have)
13. **페이지 타이틀/서브타이틀 간소화**: 30px h1 + subtitle → 헤더 인라인 또는 제거
14. **← Projects 백버튼** 헤더에 추가

---

## 9. 참고: Tailwind 클래스 매핑 (주요 변경사항)

```
/* 탭 버튼 (현재 → 변경) */
px-6 py-4       → px-3 h-[42px] items-center
text-sm          → text-[13px]
font-semibold    → font-medium (inactive) / font-semibold (active)
mr-2             → gap-[5px]

/* 콘텐츠 wrapper */
p-8              → px-8 pt-6 pb-12
(없음)           → max-w-[800px] mx-auto

/* 섹션 카드 */
(없음)           → bg-white border border-slate-200 rounded-[10px] p-6 mb-5
space-y-8        → (제거, 카드 자체 mb-5로 대체)

/* 섹션 제목 */
text-xl          → text-[15px]

/* 폼 */
text-sm          → text-[13px]
rounded-lg       → rounded-md (6px)
bg-white         → bg-slate-50
border-gray-300  → border-slate-200
```
