# Testably 성능 개선 정량 분석 보고서 (P1–P3)

**작성:** QA Team | **일자:** 2026-03-31 | **분석 방법:** 소스코드 기반 이론적 추정

---

## Executive Summary

P1–P3 성능 개선으로 **초기 로딩 체감 속도 40–60% 개선**, **반복 탐색 시 90% 이상 네트워크 요청 제거**, **체감 대기 시간(perceived wait) 거의 0ms** 달성이 예상됩니다.

---

## 1. Projects 페이지 — 병렬 fetch (P1)

### Before (순차 실행)

```
auth.getSession()          ─── 50ms ───→
project_members (IDs)      ─── 80ms ───→
project_members (roles)    ─── 80ms ───→
projects                   ─── 100ms ──→
test_cases                 ─── 80ms ───→
test_runs                  ─── 80ms ───→
test_runs (stats)          ─── 80ms ───→
test_results               ─── 120ms ──→
test_runs (active)         ─── 80ms ───→
test_cases (recent)        ─── 80ms ───→
project_members (profiles) ─── 100ms ──→
                                        총합: ~930ms (11개 순차)
```

### After (Promise.all 병렬 + React Query 캐시)

```
auth.getSession()          ─── 50ms ───→
project_members (IDs)      ─── 80ms ───→
project_members (roles)    ─── 80ms ───→
┌─ projects ──── 100ms ─┐
├─ test_cases ── 80ms ──┤ Promise.all → max 100ms
└─ test_runs ─── 80ms ──┘
test_runs (stats)          ─── 80ms ───→
test_results               ─── 120ms ──→
test_runs (active)         ─── 80ms ───→
test_cases (recent)        ─── 80ms ───→
project_members (profiles) ─── 100ms ──→
                                        총합: ~770ms (순차8 + 병렬1그룹)
```

### 수치 비교

| 지표 | Before | After | 개선 |
|------|--------|-------|------|
| Supabase 쿼리 수 | 11개 (순차) | 11개 (3개 병렬 + 8개 순차) | 쿼리 수 동일, 실행 방식 변경 |
| 네트워크 왕복(RTT) | 11회 | 9회 | **-2 RTT (~18% 감소)** |
| 예상 초기 로딩 | ~930ms | ~770ms | **~160ms 절감 (~17%)** |
| 재방문 (staleTime 60s 내) | ~930ms | **0ms** (React Query 캐시) | **100% 절감** |

### 추가 최적화 기회

현재 순차 실행되는 8개 쿼리 중 `test_runs(stats)`, `test_runs(active)`, `test_cases(recent)`, `project_members(profiles)` 4개를 추가 Promise.all로 묶으면 이론적으로 ~530ms까지 단축 가능합니다. (roles → Promise.all[3개] → Promise.all[2개 stats] → Promise.all[4개 하위 집계])

---

## 2. Settings 페이지 — 탭 캐시 + 초기 병렬화 (P1+P2)

### Before (탭 전환마다 전체 재요청)

```
Profile 탭 진입:    profiles + jira_settings + project_members → 순차 3개 → ~240ms
→ API 탭 전환:     ci_tokens                                   → ~80ms
→ Integrations:    ci_tokens + project_members + integrations   → ~240ms
→ Profile 복귀:    profiles + jira_settings + project_members   → ~240ms (재요청!)
→ API 복귀:        ci_tokens                                   → ~80ms  (재요청!)
                                                    5회 탭 전환 총: ~880ms
```

### After (React Query + Boolean 캐시 + Promise.all)

```
Profile 탭 진입:    Promise.all[profiles, jira, members]        → max ~100ms (병렬)
→ API 탭 전환:     ci_tokens (1회)                              → ~80ms
→ Integrations:    webhooks (1회, ci_tokens 캐시 재사용)        → ~160ms
→ Profile 복귀:    캐시 히트 (staleTime 5분)                    → 0ms
→ API 복귀:        캐시 히트 (ciTokensFetched=true)             → 0ms
                                                    5회 탭 전환 총: ~340ms
```

### 수치 비교

| 지표 | Before | After | 개선 |
|------|--------|-------|------|
| 초기 로딩 쿼리 | 3개 (순차) | 3개 (Promise.all 병렬) | **RTT 3→1 (~67% 감소)** |
| 초기 로딩 시간 | ~240ms | ~100ms | **~140ms 절감 (~58%)** |
| 탭 5회 전환 총 쿼리 | 10개 | 6개 | **-4 쿼리 (~40% 감소)** |
| 탭 5회 전환 총 시간 | ~880ms | ~340ms | **~540ms 절감 (~61%)** |
| 재방문 탭 응답 시간 | ~80–240ms | **0ms** | **100% 절감** |

### 캐싱 계층 구조

```
┌──────────────────────────────────────────────┐
│ Layer 1: React Query (staleTime 5분)         │ ← 초기 데이터 (profile, jira, projects)
├──────────────────────────────────────────────┤
│ Layer 2: Boolean Flag (세션 내 영구)          │ ← ciTokensFetched, webhooksFetched
├──────────────────────────────────────────────┤
│ Layer 3: useState (컴포넌트 생명주기)         │ ← 모든 탭 데이터 메모리 유지
└──────────────────────────────────────────────┘
```

---

## 3. 스켈레톤 UI — 체감 속도 개선 (P2)

### Before (스피너)

```
사용자 행동: 페이지 진입
화면:        [            🔄 Loading...            ]  ← 정보 없는 빈 화면
체감:        "아무것도 안 보임, 느리다"
인지 대기:   실제 로딩 시간 전체 (800–1500ms)
```

### After (레이아웃 보존형 스켈레톤)

```
사용자 행동: 페이지 진입
화면:        [▓▓▓▓▓▓  ░░░░]  [▓▓▓▓▓▓  ░░░░]       ← 콘텐츠 형태가 보임
             [▓▓▓▓▓▓  ░░░░]  [▓▓▓▓▓▓  ░░░░]
체감:        "콘텐츠가 곧 나올 것 같다"
인지 대기:   ~200–400ms (뇌가 레이아웃 인식하면 대기 체감 감소)
```

### 구현 현황

| 페이지 | 스켈레톤 형태 | 플레이스홀더 수 | 매칭 요소 |
|--------|-------------|----------------|----------|
| Projects 목록 | 6개 카드 그리드 | 제목 + 설명 + 아바타 + 통계 | 실제 카드 레이아웃과 일치 |
| Test Cases 목록 | 8개 테이블 행 | 체크박스 + 제목 + 폴더 + 배지 | 실제 테이블 행과 일치 |
| Runs 목록 | 5개 카드 리스트 | 제목 + 배지 + 진행바 + 메타 | 실제 런 카드와 일치 |

### 체감 효과 (UX 리서치 기반 추정)

| 지표 | 스피너 | 스켈레톤 | 근거 |
|------|--------|---------|------|
| 인지 로딩 시간 | 실제 시간 × 1.0 | 실제 시간 × **0.5–0.7** | Nielsen Norman Group 연구 |
| 이탈률 영향 | 3초 이상 시 53% 이탈 | 스켈레톤으로 3초 체감 → ~1.5초 | Google UX 연구 참고 |
| 사용자 만족도 | "느리다" | "빠르다" | 레이아웃 예측 가능성 ↑ |

---

## 4. React Query 캐싱 — 재방문 즉시 렌더링 (P3)

### 캐시 설정 현황

| queryKey | staleTime | gcTime | 적용 페이지 |
|----------|-----------|--------|------------|
| `['projects']` | 60s (기본값) | 5분 | Projects 목록 |
| `['settings']` | 5분 | 5분 | Settings |
| `['project-detail', id]` | 60s (기본값) | 5분 | Project Detail |
| `['project', id]` | 5분 | 5분 | Test Cases |
| `['testCases', id]` | 60s | 5분 | Test Cases |
| `['userProfile']` | 10분 | 5분 | 전역 (여러 페이지 공유) |

### Before vs After — 페이지 재방문

| 시나리오 | Before (매번 fetch) | After (React Query) | 절감 |
|---------|-------------------|-------------------|------|
| Projects → Detail → Projects (30초 내) | ~930ms | **0ms** (캐시) | 100% |
| Settings → 다른 페이지 → Settings (3분 내) | ~240ms | **0ms** (캐시) | 100% |
| TC 목록 → TC 편집 → TC 목록 (50초 내) | ~160ms | **0ms** (캐시) | 100% |
| userProfile 공유 (어디서든 10분 내) | 매 페이지 ~80ms | **0ms** (캐시) | 100% |

### 네트워크 요청 절감 — 일반적 사용 시나리오 (10분 세션)

```
시나리오: Projects → Detail → TC 목록 → Runs → Projects → Detail → Settings → Projects

Before:  9 + 7 + 3 + 5 + 9 + 7 + 6 + 9 = 55 쿼리
After:   9 + 7 + 3 + 5 + 0 + 0 + 6 + 0 = 30 쿼리
                                            절감: 25 쿼리 (45%)
```

---

## 5. Prefetch — 호버 시 선로딩 (P3)

### 작동 메커니즘

```
시간축: 0ms ──────────── 300ms ──── 500ms ──────── 1000ms ──── 1500ms
        │                 │          │                │          │
        호버 시작         데이터     클릭             │          렌더링
        prefetch 시작     도착       ↓                │          완료
                         (캐시)     캐시 히트!        │
                                   즉시 렌더링        │
                                                     │
        [── Before: 클릭 후 800ms 대기 ──────────────→ 렌더링]
        [── After:  호버 중 선로딩 → 클릭 시 0ms ──→ 즉시 렌더링]
```

### Prefetch 데이터 범위

`loadProjectDetailData(id)` 함수가 7개 Supabase 쿼리를 2개 Promise.all 배치로 실행:

| 배치 | 쿼리 | 데이터 |
|------|------|--------|
| 1차 (5개 병렬) | projects, test_cases(count), milestones, test_runs, sessions | 프로젝트 기본 정보 전체 |
| 2차 (2개 병렬) | test_results, session_logs | 실행 결과 + 세션 로그 |

### 수치 비교

| 지표 | Before (클릭 후 fetch) | After (호버 prefetch) | 개선 |
|------|----------------------|---------------------|------|
| 클릭 → 첫 렌더링 | ~500–800ms | **0ms** (캐시 히트) | **100% 절감** |
| 네트워크 요청 | 클릭 후 7개 | 호버 중 7개 (미리 완료) | 시점만 이동 |
| 사용자 체감 | "클릭하면 로딩 걸림" | "즉시 열림" | 극적 개선 |
| Prefetch staleTime | — | 30초 | 호버 후 30초 내 클릭 시 유효 |

---

## 6. 종합 정량 분석

### 페이지별 초기 로딩 시간 (예상)

| 페이지 | Before | After (첫 방문) | After (재방문) | 첫 방문 개선 | 재방문 개선 |
|--------|--------|----------------|---------------|------------|------------|
| Projects 목록 | ~930ms | ~770ms | **0ms** | 17% ↓ | **100% ↓** |
| Settings | ~240ms | ~100ms | **0ms** | 58% ↓ | **100% ↓** |
| Project Detail | ~500ms | ~500ms (첫 방문) / **0ms** (prefetch) | **0ms** | 0–100% ↓ | **100% ↓** |
| Test Cases | ~160ms | ~160ms | **0ms** | 0% | **100% ↓** |

### 전체 세션 기준 (10분, 일반적 탐색 패턴)

| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| 총 Supabase 쿼리 수 | ~55회 | ~30회 | **45% 감소** |
| 총 네트워크 대기 시간 | ~4,500ms | ~1,600ms | **64% 감소** |
| 빈 화면 노출 시간 | ~4,500ms | **0ms** (스켈레톤) | **100% 감소** |
| 사용자 체감 대기 | ~4,500ms | ~800ms | **82% 감소** |

### 투자 대비 효과 (ROI)

| 개선 항목 | 구현 난이도 | 성능 효과 | 코드 변경량 | ROI |
|----------|-----------|----------|-----------|-----|
| Promise.all 병렬화 (P1) | 낮음 | 중간 (~17%) | ~20줄 | ★★★★★ |
| Settings 탭 캐시 (P1) | 낮음 | 높음 (~61%) | ~15줄 | ★★★★★ |
| 스켈레톤 UI (P2) | 중간 | 높음 (체감) | ~100줄 | ★★★★☆ |
| React Query 적용 (P3) | 높음 | 매우 높음 (재방문 0ms) | ~200줄 | ★★★★☆ |
| Prefetch 호버 (P3) | 낮음 | 높음 (클릭 0ms) | ~10줄 | ★★★★★ |

---

## 7. 미완료 및 추가 권장 사항

### 미완료

- **milestone-detail** 페이지에 React Query 미적용 — Dev1에게 별도 지시 필요

### 추가 최적화 기회

1. **Projects loadProjectsData 추가 병렬화**: 현재 순차 실행되는 8개 쿼리 중 4개를 추가 Promise.all로 묶으면 ~530ms까지 단축 가능
2. **project-runs 페이지 React Query 확대**: 현재 userProfile만 적용. 런 목록 전체에 useQuery 적용 권장
3. **useMutation 도입**: 데이터 변경(TC 생성, 런 생성 등) 후 자동 캐시 무효화로 수동 refetch 제거 가능
4. **Suspense 모드 전환**: React Query의 suspense 옵션과 React.Suspense를 결합하면 로딩 상태 관리 더 단순화 가능

---

*이 보고서의 수치는 Supabase 평균 응답시간 ~80ms (단순 쿼리) ~ ~120ms (조인/집계 쿼리) 기준으로 추정했습니다. 실제 수치는 네트워크 환경, 데이터 크기, Supabase 리전에 따라 달라질 수 있습니다.*
