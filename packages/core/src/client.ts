import { TestablyConfig, TestResult, UploadResponse, DryRunResponse } from './types';
import { resolveConfig, ResolvedConfig } from './config';
import { Logger } from './logger';
import { withRetry, RateLimitError, UploadError, NonRetryableUploadError } from './retry';

const SDK_NAME = '@testably.kr/reporter-core';
const SDK_VERSION = '0.1.0-alpha.0';

export class TestablyClient {
  private config: ResolvedConfig;
  private logger: Logger;
  private sdkAgent: string;

  constructor(config: Partial<TestablyConfig> = {}, sdkAgent?: string) {
    this.config = resolveConfig(config);
    this.logger = new Logger(this.config.verbose);
    this.sdkAgent = sdkAgent ?? `${SDK_NAME}/${SDK_VERSION}`;
  }

  /**
   * 결과를 Testably에 업로드한다.
   * - 100개 단위로 배치 분할 (API 부하 방지)
   * - 실패 시 지수 백오프 재시도
   * - Rate Limit 429 응답 시 Retry-After 헤더 존중
   */
  async uploadResults(results: TestResult[]): Promise<UploadResponse> {
    if (results.length === 0) {
      this.logger.warn('No results to upload');
      return {
        success: true,
        partial_failure: false,
        message: '0 results (skipped)',
        stats: { passed: 0, failed: 0, blocked: 0, untested: 0 },
        uploaded_count: 0,
        failed_count: 0,
      };
    }

    this.logger.info(`Uploading ${results.length} results to run ${this.config.runId}`);

    // 100개 단위 배치 분할
    const batches = chunk(results, 100);
    const allResponses: UploadResponse[] = [];

    for (const batch of batches) {
      const response = await withRetry(
        () => this.postResults(batch),
        this.config.maxRetries,
        this.logger,
      );
      allResponses.push(response);
    }

    const merged = mergeResponses(allResponses);
    this.logger.info(merged.message);

    return merged;
  }

  /**
   * dry_run=true로 연결 테스트만 수행한다. DB에 아무것도 저장하지 않는다.
   */
  async testConnection(runId?: string): Promise<DryRunResponse> {
    const response = await fetch(`${this.config.url}/functions/v1/upload-ci-results`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        run_id: runId ?? this.config.runId,
        dry_run: true,
      }),
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') ?? '5', 10);
      throw new RateLimitError(retryAfter);
    }

    if (
      response.status === 400 ||
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404
    ) {
      const body = await response.text();
      throw new NonRetryableUploadError(
        `Connection test rejected (${response.status}): ${body}`,
        response.status,
        body,
      );
    }

    if (!response.ok) {
      const body = await response.text();
      throw new UploadError(
        `Connection test failed (${response.status}): ${body}`,
        response.status,
        body,
      );
    }

    return response.json() as Promise<DryRunResponse>;
  }

  private async postResults(results: TestResult[]): Promise<UploadResponse> {
    const response = await fetch(`${this.config.url}/functions/v1/upload-ci-results`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        run_id: this.config.runId,
        format: 'json',
        results,
      }),
    });

    // Rate Limit 처리 (retry 대상)
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') ?? '5', 10);
      throw new RateLimitError(retryAfter);
    }

    // Terminal 4xx — 재시도 불가
    if (
      response.status === 400 ||
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404
    ) {
      const body = await response.text();
      throw new NonRetryableUploadError(
        `Upload rejected (${response.status}): ${body}`,
        response.status,
        body,
      );
    }

    // 207 partial_failure 는 성공 분기로 통과
    if (!response.ok && response.status !== 207) {
      const body = await response.text();
      throw new UploadError(
        `Upload failed (${response.status}): ${body}`,
        response.status,
        body,
      );
    }

    return response.json() as Promise<UploadResponse>;
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      'User-Agent': this.sdkAgent,
      'X-Testably-SDK-Version': this.sdkAgent,
    };
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, (i + 1) * size),
  );
}

function mergeResponses(responses: UploadResponse[]): UploadResponse {
  const merged: UploadResponse = {
    success: responses.every((r) => r.success),
    partial_failure: responses.some((r) => r.partial_failure),
    message: '',
    stats: { passed: 0, failed: 0, blocked: 0, untested: 0 },
    uploaded_count: 0,
    failed_count: 0,
    failed_test_case_ids: [],
  };

  for (const r of responses) {
    merged.stats.passed += r.stats.passed;
    merged.stats.failed += r.stats.failed;
    merged.stats.blocked += r.stats.blocked;
    merged.stats.untested += r.stats.untested;
    merged.uploaded_count += r.uploaded_count;
    merged.failed_count += r.failed_count;
    if (r.failed_test_case_ids) {
      merged.failed_test_case_ids!.push(...r.failed_test_case_ids);
    }
  }

  merged.message = `${merged.uploaded_count} results uploaded`;
  if (merged.failed_count > 0) {
    merged.message += ` (${merged.failed_count} failed)`;
  }

  return merged;
}
