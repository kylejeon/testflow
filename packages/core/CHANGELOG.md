# Changelog

All notable changes to `@testably.kr/reporter-core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-alpha.0] - 2026-04-22

### Added

- First public preview. Core HTTP client used by
  `@testably.kr/playwright-reporter` (and future Cypress / Jest reporters).
- Handles batching (100 results / request), exponential-backoff retry for
  transient errors, 429 rate-limit (`Retry-After`) handling, and the
  non-retryable 4xx error type (`NonRetryableUploadError`) used by reporters
  to distinguish "CI-fatal" from "upload-skipped" situations.
- Exports: `TestablyClient`, `resolveConfig`, `ConfigError`, `Logger`,
  `withRetry`, `RateLimitError`, `UploadError`, `NonRetryableUploadError`.

[Unreleased]: https://github.com/kylejeon/testflow/compare/v0.1.0-alpha.0...HEAD
[0.1.0-alpha.0]: https://github.com/kylejeon/testflow/releases/tag/reporter-core-v0.1.0-alpha.0
