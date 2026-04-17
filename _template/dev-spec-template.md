# Dev Spec: [기능명]

> **작성일:** YYYY-MM-DD
> **작성자:** PM
> **상태:** Draft → Review → Approved
> **관련 디자인:** `pm/templates/design-spec-[기능명].md`

---

## 1. 개요

- **문제:** 현재 유저가 겪는 문제 (한 문장)
- **해결:** 이 기능이 문제를 어떻게 해결하는지 (한 문장)
- **성공 지표:** 이 기능이 성공하면 어떤 숫자가 바뀌는가

---

## 2. 유저 스토리

- As a [역할], I want to [행동], so that [목적]
- As a [역할], I want to [행동], so that [목적]

---

## 3. 수용 기준 (Acceptance Criteria)

> 모호한 표현 금지.
> "적절히 표시된다" ✗ → "3초 내에 토스트가 나타나고 5초 후 사라진다" ✓

- [ ] AC-1:
- [ ] AC-2:
- [ ] AC-3:

---

## 4. 기능 상세

### 4-1. 동작 흐름 (Flow)

**정상 흐름 (Happy Path):**
1. 유저가 ~
2. ~
3. ~

**대안 흐름 (Alternative):**
1. ~

**에러 흐름:**
1. ~

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | | |
| BR-2 | | |

### 4-3. 권한 (RBAC)

| 역할 | 조회 | 생성 | 수정 | 삭제 |
|------|------|------|------|------|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✗ |
| Tester | ✓ | ✓ | ✗ | ✗ |
| Viewer | ✓ | ✗ | ✗ | ✗ |
| Guest | ✗ | ✗ | ✗ | ✗ |

### 4-4. 플랜별 제한

| 플랜 | 제한 | 초과 시 동작 |
|------|------|-------------|
| Free | | 업그레이드 유도 배너 표시 |
| Hobby | | |
| Starter | | |
| Professional | | |
| Enterprise | 무제한 | - |

---

## 5. 데이터 설계

### 신규 테이블

**테이블명: `table_name`**

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| id | uuid | ✓ | gen_random_uuid() | PK |
| project_id | uuid | ✓ | - | FK → projects.id |
| name | text | ✓ | - | 이름 (max 100) |
| description | text | ✗ | null | 설명 |
| created_by | uuid | ✓ | auth.uid() | FK → profiles.id |
| created_at | timestamptz | ✓ | now() | 생성일 |
| updated_at | timestamptz | ✓ | now() | 수정일 |

**인덱스:**
- `idx_table_project_id` ON table_name(project_id)

### 기존 테이블 변경

| 테이블 | 변경 내용 | 마이그레이션 필요 |
|--------|---------|----------------|
| | | Y / N |

### RLS 정책

```sql
-- SELECT: project_member인 경우만
CREATE POLICY "select_policy" ON table_name
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: role이 tester 이상
-- UPDATE: role이 tester 이상
-- DELETE: role이 admin 이상
```

---

## 6. API 설계

### Supabase Client (프론트에서 직접 호출)

**목록 조회:**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

**생성:**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .insert({ project_id, name, description })
  .select()
  .single();
```

### Edge Function (복잡한 로직이 필요한 경우)

**엔드포인트:** `POST /functions/v1/function-name`

**Request:**
```json
{
  "project_id": "uuid",
  "name": "string"
}
```

**Response (성공):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Response (에러):**
```json
{
  "error": "메시지",
  "code": "ERROR_CODE"
}
```

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/pages/FeaturePage.tsx` | 메인 페이지 |
| `src/components/feature/FeatureList.tsx` | 목록 컴포넌트 |
| `src/components/feature/FeatureForm.tsx` | 생성/수정 폼 |
| `src/hooks/useFeature.ts` | TanStack Query 훅 |
| `src/types/feature.ts` | 타입 정의 |

### 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `src/router.tsx` | 라우트 추가 |
| `src/locales/en.json` | 영어 번역 키 추가 |
| `src/locales/ko.json` | 한국어 번역 키 추가 |

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| 네트워크 끊김 | 낙관적 업데이트 롤백, 에러 토스트 |
| 동시 편집 | Last-write-wins |
| 빈 상태 | Empty State UI 표시 |
| 권한 없는 접근 | 403 → 권한 없음 안내 |
| 플랜 제한 초과 | 업그레이드 유도 배너 |
| 매우 긴 텍스트 입력 | max length 제한, 초과 시 validation 에러 |

---

## 9. Out of Scope (이번에 안 하는 것)

> 스코프 크리프 방지를 위해 명시적으로 제외하는 항목

- [ ] ~
- [ ] ~
- [ ] ~

---

## 10. i18n 키

| 키 | EN | KO |
|----|----|----|
| `feature.title` | "Feature" | "기능" |
| `feature.create` | "Create" | "만들기" |
| `feature.empty` | "No items yet" | "아직 항목이 없습니다" |
| `feature.delete_confirm` | "Are you sure?" | "정말 삭제하시겠습니까?" |

---

## 개발 착수 전 체크리스트

> 아래 항목을 모두 통과해야 Phase 4(개발)로 진행

- [ ] 수용 기준이 전부 테스트 가능한 문장인가
- [ ] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가
- [ ] RLS 정책이 정의되었는가
- [ ] 플랜별 제한이 명시되었는가
- [ ] RBAC 권한 매트릭스가 있는가
- [ ] 변경 파일 목록이 구체적인가
- [ ] 엣지 케이스가 식별되었는가
- [ ] Out of Scope이 명시되었는가
- [ ] i18n 키가 en/ko 둘 다 있는가
- [ ] 관련 디자인 명세가 Approved 상태인가
