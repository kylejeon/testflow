export interface FeatureRow {
  feature: string;
  testably: boolean | string;
  competitor: boolean | string;
}

export interface PricingRow {
  plan: string;
  testably: { price: string; detail: string };
  competitor: { price: string; detail: string };
}

export interface KeyDifference {
  title: string;
  body: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

// ─── 신규 — Alternative 페이지 (/alternatives/{slug}) 전용 ───

export interface AlternativePageData {
  /** Alternative 페이지 H1. 카피 hook 활용 */
  h1: string;
  /** Hero subhead, 2~3 문장 */
  subhead: string;
  /** 인트로 paragraph (페이지별 고유 카피, 200+ 단어) */
  introBody: string;
  /** "Why developers leave {Competitor}" 섹션 — 경쟁사 약점 3~5개 */
  whyLeave: { title: string; body: string }[];
  /** "Why Testably is the better alternative" 섹션 */
  whySwitch: { title: string; body: string }[];
  /** Alternative 페이지 전용 메타 (compare 페이지의 metaTitle/Description 와 분리) */
  metaTitle: string;
  metaDescription: string;
  /** Alternative 페이지에서 노출할 FAQ (compare 페이지 faqs와 별도 또는 일부 공유 가능) */
  faqs?: FAQ[];
}

// ─── 신규 — 마이그레이션 가이드 ───

export interface MigrationGuide {
  /** "5분 안에 옮기는 법" 같은 sub-title */
  title: string;
  /** 단계 리스트 (CSV export → 매핑 → import → 검증) */
  steps: { num: number; title: string; body: string }[];
  /** 호환 import 포맷 (CSV / API) */
  importFormats: string[];
  /** 도구 매핑 표 (경쟁사 필드 → Testably 필드) */
  fieldMapping?: { from: string; to: string; note?: string }[];
}

// ─── 신규 — vs-매트릭스 데이터 (M3 에서 사용, 타입만 미리 정의) ───

export interface ThreeWayFeatureRow {
  feature: string;
  testably: boolean | string;
  a: boolean | string;
  b: boolean | string;
}

export interface ThreeWayPricingRow {
  plan: string;
  testably: { price: string; detail: string };
  a: { price: string; detail: string };
  b: { price: string; detail: string };
}

export interface VsMatrixData {
  /** "practitest-vs-testrail" 형식의 슬러그 (알파벳 오름차순) */
  slug: string;
  /** 두 경쟁사 슬러그 (a < b, 알파벳 오름차순) */
  a: string;
  b: string;
  /** 페이지 H1 */
  h1: string;
  /** subhead */
  subhead: string;
  /** intro paragraph (페이지별 고유) */
  introBody: string;
  /** A vs B vs Testably 3-way feature matrix */
  featureMatrix: ThreeWayFeatureRow[];
  /** A vs B vs Testably 3-way pricing matrix */
  pricingMatrix: ThreeWayPricingRow[];
  /** "왜 A 도 B 도 한계가 있나" — 양쪽 약점 요약 */
  bothLimitations: { competitor: 'a' | 'b'; title: string; body: string }[];
  /** "왜 Testably 가 더 나은 선택인가" */
  testablyWins: { title: string; body: string }[];
  /** 페이지 메타 */
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  /** FAQ */
  faqs: FAQ[];
  /** Last reviewed */
  lastReviewed: string;
}

// ─── 기존 CompetitorData — 신규 옵셔널 필드 4개 추가 ───

export interface CompetitorData {
  // ─── 기존 필드 (그대로 유지) ───
  slug: string;
  name: string;
  tagline: string;
  description: string;
  savingsCallout: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  features: FeatureRow[];
  keyDifferences: KeyDifference[];
  pricingRows: PricingRow[];
  faqs: FAQ[];
  ctaText: string;
  ctaSubtext: string;

  // ─── 신규 옵셔널 필드 (M1 산출, 점진적 채움) ───

  /** Alternative 페이지 (/alternatives/{slug}) 전용 카피 */
  alternativePageData?: AlternativePageData;

  /** 이 경쟁사와 자주 비교되는 다른 경쟁사들 (UI 추천 슬롯용) */
  relatedCompetitors?: string[]; // slug 배열

  /** 마이그레이션 가이드 (CSV import 등 단계) */
  migrationGuide?: MigrationGuide;

  /** Last reviewed date (콘텐츠 신선도 표기용, ISO yyyy-mm-dd) */
  lastReviewed?: string;
}
