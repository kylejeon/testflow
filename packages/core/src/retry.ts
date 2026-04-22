import { Logger } from './logger';

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter}s`);
    this.name = 'RateLimitError';
  }
}

/**
 * Non-retryable upload error — terminal HTTP 4xx (401/403/404/400).
 * Bubbles out immediately; reporter turns this into a 1-line warn + exit 0.
 */
export class NonRetryableUploadError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = 'NonRetryableUploadError';
  }
}

/**
 * Retryable upload error — transient 5xx or network. Retried with backoff.
 */
export class UploadError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string,
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  logger: Logger,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;

      // Non-retryable: bubble out immediately
      if (err instanceof NonRetryableUploadError) {
        throw err;
      }

      if (attempt === maxRetries) break;

      let delay: number;
      if (err instanceof RateLimitError) {
        delay = err.retryAfter * 1000;
        logger.warn(`Rate limited. Waiting ${err.retryAfter}s before retry...`);
      } else {
        delay = Math.min(1000 * Math.pow(2, attempt), 30000); // 1s, 2s, 4s... max 30s
        logger.warn(
          `Upload attempt ${attempt + 1} failed: ${(err as Error).message}. Retrying in ${delay / 1000}s...`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
