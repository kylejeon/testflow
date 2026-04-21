/**
 * Tests for src/lib/sentry.ts — resolveSentryEnvironment boundary.
 */
import { describe, it, expect } from 'vitest';
import { resolveSentryEnvironment } from './sentry';

describe('resolveSentryEnvironment', () => {
  it('maps apex + www testably.app to production', () => {
    expect(resolveSentryEnvironment('testably.app')).toBe('production');
    expect(resolveSentryEnvironment('www.testably.app')).toBe('production');
  });

  it('maps Vercel preview hostnames to preview', () => {
    expect(resolveSentryEnvironment('testably-git-claude-abc.vercel.app')).toBe('preview');
    expect(resolveSentryEnvironment('some-preview-xyz.vercel.app')).toBe('preview');
  });

  it('maps hostnames containing "preview" to preview', () => {
    expect(resolveSentryEnvironment('preview.internal')).toBe('preview');
  });

  it('falls back to development for localhost / unknown hosts', () => {
    expect(resolveSentryEnvironment('localhost')).toBe('development');
    expect(resolveSentryEnvironment('127.0.0.1')).toBe('development');
    expect(resolveSentryEnvironment('')).toBe('development');
  });
});
