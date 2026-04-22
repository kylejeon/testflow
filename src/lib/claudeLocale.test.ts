/**
 * Tests for src/lib/claudeLocale.ts (client mirror of _shared/localePrompt.ts).
 *
 * AC: docs/specs/dev-spec-f021-claude-locale.md §3 AC-3 (allowlist) + §12-1.
 *
 * 서버 측 supabase/functions/_shared/localePrompt.ts 는 동일 로직의 Deno 거울이며
 * vitest는 Deno 모듈을 실행하지 않으므로 본 테스트가 주 검증이다.
 */
import { describe, it, expect } from 'vitest';
import { resolveLocale, normalizeLocale } from './claudeLocale';

describe('resolveLocale — allowlist (strict match)', () => {
  it.each([
    ['ko', 'ko'],
    ['en', 'en'],
  ])('resolveLocale(%p) === %p (allowed)', (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });

  it.each([
    ['KO', 'en'],              // 대문자 미허용
    ['ko-KR', 'en'],            // BCP47 언어태그 미허용
    ['en-US', 'en'],            // BCP47 언어태그는 en 으로도 정확 match 아님
    ['fr', 'en'],               // 제3 언어
    ['ja', 'en'],
    ['zh', 'en'],
    [' ko ', 'en'],             // 공백 포함
    ['ko ', 'en'],
    [' ko', 'en'],
    ['', 'en'],                 // 빈 문자열
    [null, 'en'],
    [undefined, 'en'],
    [123, 'en'],                // 비문자열
    [{}, 'en'],
    [[], 'en'],
    [true, 'en'],
    [false, 'en'],
  ])('resolveLocale(%p) === %p (fallback to en)', (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });
});

describe('normalizeLocale — alias for resolveLocale', () => {
  it('normalizeLocale mirrors resolveLocale for allowed inputs', () => {
    expect(normalizeLocale('ko')).toBe('ko');
    expect(normalizeLocale('en')).toBe('en');
  });

  it('normalizeLocale falls back to en for invalid inputs', () => {
    expect(normalizeLocale('ko-KR')).toBe('en');
    expect(normalizeLocale('fr')).toBe('en');
    expect(normalizeLocale(undefined)).toBe('en');
    expect(normalizeLocale(null)).toBe('en');
  });
});

describe('KO AI response JSON fixtures parse successfully (AC-5)', () => {
  // 서버 KO 응답 샘플 3건 — keys 는 영문 유지, 자연어 values 만 한국어.
  // 기존 JSON.parse / parseJsonSafely 로 100% 파싱 통과해야 한다.
  const fixtures: Array<[string, string]> = [
    [
      'milestone-risk-predictor',
      `{"risk_level":"at_risk","confidence":72,"summary":"Milestone 이 위험 상태입니다. Pass Rate 가 52% 입니다.","bullets":["Test Case 총 120건 중 Untested 62건이 남아 있습니다."],"recommendations":["#payment 태그의 Failed 를 우선 해결하세요."]}`,
    ],
    [
      'plan-assistant',
      `{"suggested_test_cases":[{"id":"abc","title":"로그인 실패","folder":"auth","priority":"high","tags":["auth"],"rationale":"회귀 테스트가 필요합니다."}],"estimated_effort_hours":4,"summary":"이번 스프린트 계획입니다.","coverage_areas":["auth"],"risk_level":"medium"}`,
    ],
    [
      'run-summary',
      `{"riskLevel":"MEDIUM","riskReason":"실패가 누적되었습니다.","narrative":"결제 경로에서 Failed 가 집중됩니다.","clusters":[],"recommendations":["#payment 를 재실행하세요."],"goNoGo":"CONDITIONAL","goNoGoCondition":"Pass Rate 90% 이상 시 GO."}`,
    ],
  ];

  it.each(fixtures)('parses %s KO fixture without throwing', (_name, json) => {
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(typeof parsed).toBe('object');
    expect(parsed).not.toBeNull();
  });

  it('milestone-risk-predictor KO fixture preserves English keys', () => {
    const parsed = JSON.parse(fixtures[0][1]);
    expect(parsed.risk_level).toBe('at_risk');
    expect(typeof parsed.confidence).toBe('number');
    expect(Array.isArray(parsed.bullets)).toBe(true);
    expect(Array.isArray(parsed.recommendations)).toBe(true);
  });

  it('plan-assistant KO fixture preserves English enum values', () => {
    const parsed = JSON.parse(fixtures[1][1]);
    expect(parsed.risk_level).toBe('medium');                // enum remains english
    expect(parsed.suggested_test_cases[0].priority).toBe('high');
  });

  it('run-summary KO fixture preserves English enum values', () => {
    const parsed = JSON.parse(fixtures[2][1]);
    expect(parsed.riskLevel).toBe('MEDIUM');
    expect(parsed.goNoGo).toBe('CONDITIONAL');
  });
});
