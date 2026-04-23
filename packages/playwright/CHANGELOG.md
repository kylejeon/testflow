# Changelog

All notable changes to `@testably.kr/playwright-reporter` are documented in this
file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-05-11

First stable release — the official public launch of `@testably.kr/playwright-reporter`.

### Added

- Bumped SDK agent string to `1.0.1` (`User-Agent` + `X-Testably-SDK-Version`
  headers).
- Locked peer dependency on `@testably.kr/reporter-core@1.0.1` so stable
  installs never resolve against the 4/7 `1.0.0` placeholder build.

### Changed

- Marketing and positioning updated: the reporter is now a stable 1.x release.
  API surface is frozen and will follow strict SemVer going forward.

### Notes

- Local versions `0.1.0-alpha.0` and `1.0.0` on npm were pre-release artifacts.
  `1.0.1` is the first version that reflects the full feature set shipped for
  the public launch.

## [0.1.0-alpha.0] - 2026-04-22

### Added

- First public preview of the official Testably Playwright reporter.
- Implements `Reporter` interface from `@playwright/test/reporter`
  (`onBegin`, `onTestEnd`, `onEnd`).
- Four test-case ID extraction strategies (`annotation`, `tag`, `title`,
  `custom`) configurable via the `testCaseIdSource` option.
- Automatic batching of results (100 per request) and exponential-backoff
  retry (1s / 2s / 4s, up to `maxRetries=3` by default) for transient 5xx
  errors. Honors `Retry-After` on 429 responses.
- Plan-gate fallback: on HTTP 403 the reporter prints an upgrade notice and
  exits the test run with code 0 (it will never fail CI for you by default —
  set `failOnUploadError: true` to opt in).
- Dry-run mode (`dryRun: true` or `TESTABLY_DRY_RUN=true`) verifies
  authentication and run id without writing to the database.
- Sends `User-Agent` and `X-Testably-SDK-Version` headers so uploads are
  tagged `source=playwright` in Testably.

### Notes

- Requires `@playwright/test >= 1.40.0`.
- Requires a Testably **Professional** plan or higher on the server side.
  Free / Hobby / Starter plans will receive an HTTP 403 and the reporter will
  log an upgrade notice without failing CI.

[Unreleased]: https://github.com/kylejeon/testflow/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/kylejeon/testflow/releases/tag/playwright-reporter-v1.0.1
[0.1.0-alpha.0]: https://github.com/kylejeon/testflow/releases/tag/playwright-reporter-v0.1.0-alpha.0
