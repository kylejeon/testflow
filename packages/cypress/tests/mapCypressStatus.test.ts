import { describe, expect, it } from 'vitest';
import { mapCypressStatus } from '../src/plugin';

describe('mapCypressStatus', () => {
  it('maps passed → passed', () => {
    expect(mapCypressStatus('passed')).toBe('passed');
  });
  it('maps failed → failed', () => {
    expect(mapCypressStatus('failed')).toBe('failed');
  });
  it('maps pending (it.skip / describe.skip) → blocked', () => {
    expect(mapCypressStatus('pending')).toBe('blocked');
  });
  it('maps skipped (dynamic / before-all fail) → blocked', () => {
    expect(mapCypressStatus('skipped')).toBe('blocked');
  });
  it('maps unknown future state → untested (forward-compat fallback)', () => {
    expect(mapCypressStatus('weird-new-state')).toBe('untested');
  });
  it('maps undefined state → untested', () => {
    expect(mapCypressStatus(undefined)).toBe('untested');
  });
});
