import { describe, expect, it } from 'vitest';
import { extractNote } from '../src/plugin';

describe('extractNote', () => {
  it('returns undefined for passed tests (no note)', () => {
    expect(
      extractNote({
        state: 'passed',
        displayError: null,
        attempts: [{ state: 'passed' }],
      }),
    ).toBeUndefined();
  });

  it('uses displayError for a failed single-attempt test', () => {
    expect(
      extractNote({
        state: 'failed',
        displayError: 'AssertionError: expected foo to equal bar',
        attempts: [{ state: 'failed', error: { message: 'AssertionError' } }],
      }),
    ).toBe('AssertionError: expected foo to equal bar');
  });

  it('prefixes "Retried N times. " when attempts.length > 1 and ended failed', () => {
    const note = extractNote({
      state: 'failed',
      displayError: 'Timeout waiting for element',
      attempts: [
        { state: 'failed', error: { message: 'first' } },
        { state: 'failed', error: { message: 'second' } },
        { state: 'failed', error: { message: 'final' } },
      ],
    });
    expect(note).toMatch(/^Retried 2 times\. Timeout waiting for element/);
  });

  it('uses "Retried 1 time." (singular) when there is exactly one retry', () => {
    const note = extractNote({
      state: 'failed',
      displayError: 'boom',
      attempts: [
        { state: 'failed', error: { message: 'x' } },
        { state: 'failed', error: { message: 'y' } },
      ],
    });
    expect(note).toMatch(/^Retried 1 time\. boom/);
  });

  it('returns undefined for pending tests with no error body', () => {
    expect(
      extractNote({
        state: 'pending',
        displayError: null,
        attempts: [],
      }),
    ).toBeUndefined();
  });

  it('truncates very long error messages to 800 characters', () => {
    const longError = 'x'.repeat(2000);
    const note = extractNote({
      state: 'failed',
      displayError: longError,
      attempts: [{ state: 'failed', error: { message: longError } }],
    });
    expect(note).toBeDefined();
    expect(note!.length).toBeLessThanOrEqual(800);
  });

  it('keeps the retry prefix even if every attempt has no error message', () => {
    const note = extractNote({
      state: 'failed',
      displayError: null,
      attempts: [
        { state: 'failed', error: null },
        { state: 'failed', error: null },
      ],
    });
    // "Retried 1 time." preserved, trailing period kept
    expect(note).toBe('Retried 1 time.');
  });
});
