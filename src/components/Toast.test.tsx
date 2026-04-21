/**
 * Tests for getApiErrorMessage (f024).
 *
 * Dev Spec §6-4 / Design Spec §5 — 13+ branches of API error code mapping.
 * Each branch is expected to return a non-empty, human-readable string via
 * the i18n singleton.
 */
import { describe, it, expect } from 'vitest';
import { getApiErrorMessage } from './Toast';

describe('getApiErrorMessage', () => {
  it('returns generic copy when error is null / undefined', () => {
    expect(getApiErrorMessage(null)).toMatch(/something went wrong/i);
    expect(getApiErrorMessage(undefined)).toMatch(/something went wrong/i);
  });

  it('maps PGRST116 → record not found', () => {
    expect(getApiErrorMessage({ code: 'PGRST116' })).toMatch(/no data found/i);
  });

  it('maps PGRST301 → permission denied', () => {
    expect(getApiErrorMessage({ code: 'PGRST301' })).toMatch(/permission/i);
  });

  it('maps 23505 unique violation → record exists', () => {
    expect(getApiErrorMessage({ code: '23505' })).toMatch(/already exists/i);
  });

  it('maps 23503 FK violation → related missing', () => {
    expect(getApiErrorMessage({ code: '23503' })).toMatch(/related record/i);
  });

  it('maps 42501 insufficient_privilege → plan/role hint', () => {
    expect(getApiErrorMessage({ code: '42501' })).toMatch(/plan or role/i);
  });

  it('maps auth/invalid-email', () => {
    expect(getApiErrorMessage({ code: 'auth/invalid-email' })).toMatch(/email/i);
  });

  it('maps auth/user-not-found', () => {
    expect(getApiErrorMessage({ code: 'auth/user-not-found' })).toMatch(/no account found/i);
  });

  it('maps auth/wrong-password', () => {
    expect(getApiErrorMessage({ code: 'auth/wrong-password' })).toMatch(/incorrect password/i);
  });

  it('maps HTTP 401 → session expired', () => {
    expect(getApiErrorMessage({ status: 401 })).toMatch(/session expired/i);
  });

  it('maps HTTP 403 → permission denied', () => {
    expect(getApiErrorMessage({ status: 403 })).toMatch(/permission/i);
  });

  it('maps HTTP 404 → not found', () => {
    expect(getApiErrorMessage({ status: 404 })).toMatch(/not found/i);
  });

  it('maps HTTP 409 → conflict', () => {
    expect(getApiErrorMessage({ status: 409 })).toMatch(/conflict/i);
  });

  it('maps HTTP 429 → rate limited', () => {
    expect(getApiErrorMessage({ status: 429 })).toMatch(/too many requests/i);
  });

  it('maps HTTP 5xx → server error', () => {
    expect(getApiErrorMessage({ status: 500 })).toMatch(/server error/i);
    expect(getApiErrorMessage({ status: 503 })).toMatch(/server error/i);
  });

  it('maps network message → network error', () => {
    expect(getApiErrorMessage({ message: 'Failed to fetch' })).toMatch(/connection/i);
    expect(getApiErrorMessage({ message: 'Load failed' })).toMatch(/connection/i);
    expect(getApiErrorMessage({ message: 'network error' })).toMatch(/connection/i);
  });

  it('maps timeout message → timeout', () => {
    expect(getApiErrorMessage({ message: 'request timeout' })).toMatch(/timed out/i);
  });

  it('maps aborted message → cancelled', () => {
    expect(getApiErrorMessage({ message: 'Request aborted' })).toMatch(/cancelled/i);
  });

  it('falls back to err.message when short and readable', () => {
    expect(getApiErrorMessage({ message: 'Custom short message' })).toBe('Custom short message');
  });

  it('falls back to generic when message is too long', () => {
    const long = 'x'.repeat(200);
    expect(getApiErrorMessage({ message: long })).toMatch(/something went wrong/i);
  });
});
