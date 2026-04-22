# @testably.kr/reporter-core

> Internal HTTP client used by the official Testably reporters
> (`@testably.kr/playwright-reporter`, and future Cypress / Jest reporters).
>
> You probably don't need to depend on this directly. If you're wiring
> Playwright tests to Testably, install
> [`@testably.kr/playwright-reporter`](https://www.npmjs.com/package/@testably.kr/playwright-reporter)
> instead.

## What's in here

- `TestablyClient` — sends batched uploads to
  `POST /functions/v1/upload-ci-results`.
- Retry engine with exponential backoff, `Retry-After` support for 429,
  and a `NonRetryableUploadError` class that short-circuits retries on
  terminal 4xx (401 / 403 / 404 / 400).
- `resolveConfig` — reads options + `TESTABLY_URL` / `TESTABLY_TOKEN` /
  `TESTABLY_RUN_ID` env vars into a validated config.

## License

[MIT](./LICENSE) — Testably, 2026.
