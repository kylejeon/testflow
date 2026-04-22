import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NonRetryableUploadError,
  RateLimitError,
  UploadError,
  withRetry,
} from '../src/retry';
import { Logger } from '../src/logger';

const silentLogger = new Logger(false);

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 3, silentLogger);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient UploadError up to maxRetries+1 times', async () => {
    const fn = vi.fn().mockRejectedValue(new UploadError('boom'));
    const promise = withRetry(fn, 3, silentLogger).catch((e) => e);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBeInstanceOf(UploadError);
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('uses exponential backoff: 1s, 2s, 4s', async () => {
    const fn = vi.fn().mockRejectedValue(new UploadError('boom'));
    const promise = withRetry(fn, 3, silentLogger).catch((e) => e);

    // attempt 1 runs immediately → reject
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);

    // advance 1s → attempt 2
    await vi.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);

    // advance 2s → attempt 3
    await vi.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(3);

    // advance 4s → attempt 4 (final)
    await vi.advanceTimersByTimeAsync(4000);
    expect(fn).toHaveBeenCalledTimes(4);

    await promise;
  });

  it('waits Retry-After seconds on RateLimitError', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitError(10))
      .mockResolvedValueOnce('ok');

    const promise = withRetry(fn, 3, silentLogger);

    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);

    // shorter wait should NOT resolve
    await vi.advanceTimersByTimeAsync(5000);
    expect(fn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000); // reach 10s total
    expect(fn).toHaveBeenCalledTimes(2);

    expect(await promise).toBe('ok');
  });

  it('does NOT retry on NonRetryableUploadError — bubbles immediately', async () => {
    const err = new NonRetryableUploadError('403 plan rejected', 403, 'nope');
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn, 3, silentLogger)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
