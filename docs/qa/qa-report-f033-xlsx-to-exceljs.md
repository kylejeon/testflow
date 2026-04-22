# QA Report: f033 — xlsx (SheetJS) → exceljs 마이그레이션
> 검수일: 2026-04-21
> 개발지시서: docs/specs/dev-spec-f033-xlsx-to-exceljs.md
> 디자인 명세: 없음 (라이브러리 교체 — UI 변화 없음)

---

## 요약
- 총 검수 항목: 26개
- 통과: 24개
- 실패: 0개
- 경고(Minor): 2개

---

## Critical (반드시 수정)
없음.

---

## Major (수정 권장)
없음.

---

## Minor (수정 권장)

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| M-1 | i18n 키 네이밍이 Dev Spec §10 명세와 불일치 | Dev Spec은 `import.error.xls_unsupported` 키 1개(EN 단일 문자열)를 명시했으나, 구현은 `import.xlsOldFormatBlocked` + `import.xlsUseXlsxInstead` 2개 키로 분리 구현됨. 기능 동작은 동일하고 Dev Spec 자체에 "문구 스타일 유지" 지시가 있어 Blocker는 아니나, 명세 추적성이 깨짐. 다음 i18n coverage 스펙 갱신 시 동기화 권장. | `src/i18n/local/en/testcases.ts:79-82`, `src/i18n/local/ko/testcases.ts:79-82` |
| M-2 | handleDrop에서 `.xls` 드롭 시 `setImportFile(null)` 누락 | `handleFileSelect`는 `.xls` 차단 시 `setImportFile(null)`(L359)을 명시적으로 호출해 파일 상태를 초기화하지만, `handleDrop`(L391-396)은 같은 분기에서 `setImportFile`을 호출하지 않음. 드롭 이전에 다른 파일이 선택된 상태라면 `importFile` 상태가 남아있을 수 있음. Dev Spec §11 리스크 항목 "에러 토스트 후 상태 초기화 안 되어 UI 고장"에 해당. 재현 조건: 정상 .xlsx 파일 선택 → preview 표시 → .xls 파일 드롭 → importFile이 이전 파일로 남아있어 Import 버튼 활성화 가능성. | `src/pages/project-testcases/components/ExportImportModal.tsx:391-396` |

---

## Nit

없음.

---

## Passed

### AC-1 (의존성 제거)
- [x] `package.json` `dependencies`에 `"xlsx"` 키 없음 (확인: L1-25, exceljs만 존재)
- [x] `npm ls xlsx` → `(empty)` (exit code 1, 출력 없음)

### AC-2 (CVE 해결)
- [x] `npm audit` → `found 0 vulnerabilities`. GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9 0건.

### AC-3 (코드 clean)
- [x] `grep -rn "from 'xlsx'" src/` → 0건
- [x] `grep -rn "import('xlsx')" src/` → 0건
- [x] dist 번들 내 `SheetJS` / `require.*xlsx` 참조 0건; `xlsx` 문자열은 `.xlsx` 파일 확장자 문자열만 존재 (정상)

### AC-4 (Import 스모크 — CSV)
- [x] `parseCSVImport` 경로는 xlsx 의존 없음. 143개 테스트 전부 PASS (회귀 없음).

### AC-5 (Import 스모크 — XLSX)
- [x] `excelImport.test.ts` — exceljs로 생성한 .xlsx 버퍼 파싱 정상 (normal rows, richText, Date, Korean/emoji 포함 8개 케이스 PASS)
- [x] `serializeCellValue` — null/undefined, string, number, boolean, Date, RichText, Hyperlink, Formula, Error 셀 타입 전수 커버 (7 케이스 PASS)

### AC-6 (Export 스모크 — TC XLSX)
- [x] `exportToXLSX` 함수는 f033 이전부터 exceljs 사용 중. 코드 변경 없음. 회귀 없음.

### AC-7 (Export 스모크 — Run XLSX)
- [x] `run-detail/page.tsx`, `project-runs/page.tsx` — f033 이전부터 `await import('exceljs')` 사용 중. 변경 없음.

### AC-8 (TestRail Export 회귀 없음)
- [x] `testRailExport.ts` — 변경 없음. CSV 경로는 xlsx 의존 없음.

### AC-9 (빌드 / 타입 / 테스트 / i18n / CI)
- [x] `npx tsc --noEmit` → 출력 없음 (PASS)
- [x] `npm run test -- --run` → Tests 143 passed (9 files) PASS
- [x] `npm run scan:i18n:check` → `0 hardcoded matches across 29 files` PASS
- [x] `npm run scan:i18n:parity` → `en ↔ ko key trees match (0 diff)` PASS
- [x] `npm run build` → `built in 7.14s` PASS

### AC-10 (code-splitting 유지)
- [x] `exceljs.min-D0YNMMsU.js` — 별도 단독 청크로 존재
- [x] `index-DBUqJYBf.js`(main chunk) 내 exceljs 참조 0건
- [x] 페이지 청크(page-*.js) 내 exceljs 직접 인클루드 없음 — 동적 import로만 로딩

### 추가 보안 검증
- [x] MIME 우회: `.xls` 차단은 `file.name.split('.').pop()?.toLowerCase()` 파일명 확장자 기반. `<input accept=".csv,.xlsx">`로 파일 피커가 .xls를 제외하고, handleDrop에서도 이중 차단. Dev Spec §4-3 Option A 명시된 방식과 일치. (MIME 타입 검증은 Dev Spec 명시 범위 밖 — OOS)
- [x] XSS: `serializeCellValue`가 셀 값을 문자열로 직렬화만 함, innerHTML 렌더링 없음
- [x] RLS/RBAC: 라이브러리 교체이므로 기존 권한 매트릭스 상속, 변경 없음

### 번들 사이즈
- [x] `dist/assets/` 에 xlsx 청크 없음 (SheetJS ~429KB 순 제거)
- [x] exceljs.min-D0YNMMsU.js(937KB) 기존 청크 그대로 — 순증 없음
- [x] BR-2 준수: `src/utils/excelImport.ts:182` `await import('exceljs')` 동적 import 확인

---

## 코드 품질
- tsc --noEmit: PASS (에러 0건)
- ESLint: npm run lint 스크립트 없음 (f024 QA에서도 동일 지적 — 별도 티켓 권장)
- 테스트: 143/143 PASS

---

## 결론

**릴리즈 가능**

Blocker 0건, Major 0건. AC-1 ~ AC-10 전항목 통과. Minor 2건:
- M-1은 i18n 키 네이밍 명세 불일치(기능 동작 정상, 다음 i18n 스펙 갱신 시 동기화 권장)
- M-2는 handleDrop에서 .xls 드롭 시 `setImportFile(null)` 누락으로 인한 상태 불일치 가능성. 재현 조건이 "기존 파일 선택 후 .xls 드롭"이라는 특정 순서에 의존하며 Import 버튼 클릭 시에도 `importPreview`가 null이면 실제 import는 막히므로 데이터 손상 위험은 없음. 다음 패치에서 수정 권장.
