import { Logger } from './logger';

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter}s`);
    this.name = 'RateLimitError';
  }
}

export class UploadError extends Error {
  constructor(message: string) {
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
