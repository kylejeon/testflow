# PITR (Point-in-Time Recovery) Drill Runbook

## Drill 실시 기록

| 항목 | 내용 |
|------|------|
| **최초 점검일** | 2026-04-10 |
| **점검자** | Kyle |
| **Supabase 프로젝트** | TMS (`ahzfskzuyzcmgilcvozn`, Northeast Asia - Seoul) |
| **WAL-G 물리 백업** | 활성 (✅) |
| **PITR 활성 여부** | 비활성 (❌) |
| **PITR 최초 타임스탬프** | N/A (미활성) |
| **PITR 최신 타임스탬프** | N/A (미활성) |
| **다음 drill 예정일** | 2026-07-10 (분기별 권장) |

> **결론:** PITR이 활성화되어 있지 않으므로 실제 복구 drill은 스킵합니다.
> WAL-G 물리 백업은 활성 상태이므로 매일 스냅샷 복구는 가능하나, 분 단위 복구는 불가합니다.

---

## 현재 백업 상태 확인 방법

```bash
supabase backups list --project-ref ahzfskzuyzcmgilcvozn
```

출력 예시:
```
REGION                 | WALG | PITR  | EARLIEST TIMESTAMP | LATEST TIMESTAMP
------------------------|------|-------|--------------------|------------------
Northeast Asia (Seoul) | true | false | 0                  | 0
```

---

## PITR 활성화 방법 (권장 조치)

### 전제 조건
- Supabase **Pro 플랜 이상** 필요 (PITR은 유료 기능)
- 현재 플랜이 Free라면 Pro로 업그레이드 필요

### 활성화 절차

1. [Supabase Dashboard](https://supabase.com/dashboard) → **TMS 프로젝트** 선택
2. 왼쪽 메뉴 **Settings > Add-ons** 클릭
3. **Point in Time Recovery** 섹션에서 보존 기간 선택:
   - 7일 보존: $100/월
   - 14일 보존: $200/월
   - 28일 보존: $400/월
4. **Enable PITR** 클릭 → 결제 확인
5. 활성화 후 WAL 아카이빙 시작까지 약 30분 소요

### 활성화 확인

```bash
supabase backups list --project-ref ahzfskzuyzcmgilcvozn
# PITR 컬럼이 true로 변경되고, EARLIEST/LATEST TIMESTAMP가 채워지면 정상
```

---

## PITR 활성화 이후 Drill 절차 (향후 실시용)

PITR이 활성화된 이후에는 아래 절차로 drill을 진행합니다.

### Step 1 — Drill 마커 생성

```sql
-- Supabase SQL Editor에서 실행
CREATE TABLE IF NOT EXISTS pitr_drill_marker (
  id serial PRIMARY KEY,
  note text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO pitr_drill_marker (note)
VALUES ('PITR drill marker - ' || now()::text);

-- 생성 시각 기록해 둘 것 (복구 목표 시각 T0)
SELECT now() AS drill_start_time;
```

### Step 2 — 마커 삭제 (10분 대기 후)

```sql
DROP TABLE pitr_drill_marker;
-- 삭제 시각 기록 (복구 목표는 T0 ~ 삭제 직전 사이)
SELECT now() AS marker_dropped_at;
```

### Step 3 — 복구 UI 확인 (실제 복구는 사용자 승인 필요)

1. Supabase Dashboard → **Settings > Backups**
2. **Point in Time** 탭 클릭
3. 복구 목표 시각 입력 (T0 + 2분 등, 마커가 존재하던 시각)
4. **"Restore"** 버튼까지의 경로 확인 → **실제 클릭 금지** (프로덕션 DB 롤백됨)
5. 예상 복구 소요 시간: DB 크기에 따라 10분~수 시간

또는 CLI로 복구 시뮬레이션:

```bash
# 실제 실행 금지 — 아래는 명령어 확인용
supabase backups restore --project-ref ahzfskzuyzcmgilcvozn \
  --recovery-timestamp "2026-07-10T10:05:00Z"
```

### Step 4 — Drill 결과 기록

이 문서의 "Drill 실시 기록" 표를 업데이트하고, 확인된 내용을 아래 항목에 기록:

- [ ] PITR retention 기간 (예: 7일)
- [ ] 복구 목표 시각 (T0)
- [ ] Supabase Dashboard 복구 UI 경로 스크린샷 → `docs/runbooks/screenshots/pitr-drill-YYYY-MM-DD.png`
- [ ] 예상 복구 소요 시간
- [ ] 실제 복구 실행 여부 (staging 환경에서만 실행 권장)

---

## Drill 이력

| 날짜 | 점검자 | PITR 상태 | 비고 |
|------|--------|-----------|------|
| 2026-04-10 | Kyle | 비활성 | 초기 점검 — drill 스킵, 활성화 가이드 문서화 |
| 2026-07-10 | (담당자 기입) | | 다음 분기 drill |

---

## 참고 링크

- [Supabase PITR 공식 문서](https://supabase.com/docs/guides/platform/backups#point-in-time-recovery)
- [Supabase Add-ons 가격](https://supabase.com/pricing)
- On-call 런북: `docs/runbooks/oncall.md`
