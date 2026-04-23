/**
 * Minimal shapes used by unit tests to simulate Cypress `after:run` payloads.
 * We deliberately avoid importing from the `cypress` package at test time —
 * the plugin only reads a narrow subset of CypressCommandLine.CypressRunResult.
 */

export type CypressState = 'passed' | 'failed' | 'pending' | 'skipped';

export interface FakeCypressAttempt {
  state?: CypressState | string;
  error?: { message?: string } | null;
}

export interface FakeCypressTest {
  title: string[];
  state: CypressState | string;
  displayError?: string | null;
  duration?: number | null;
  attempts?: FakeCypressAttempt[];
}

export interface FakeCypressRun {
  spec: { relative: string };
  tests: FakeCypressTest[];
}

export interface FakeCypressRunResult {
  runs: FakeCypressRun[];
}

export function makeTest(overrides: Partial<FakeCypressTest> = {}): FakeCypressTest {
  return {
    title: ['suite', 'some test'],
    state: 'passed',
    displayError: null,
    duration: 100,
    attempts: [{ state: 'passed' }],
    ...overrides,
  };
}

export function makeRun(
  tests: FakeCypressTest[],
  relative = 'cypress/e2e/example.cy.ts',
): FakeCypressRun {
  return {
    spec: { relative },
    tests,
  };
}

export function makeRunResult(
  tests: FakeCypressTest[],
  relative?: string,
): FakeCypressRunResult {
  return { runs: [makeRun(tests, relative)] };
}

/**
 * Drives the plugin's `after:run` handler directly. `setupTestablyReporter`
 * registers the handler with the `on` callback we pass in; we capture it and
 * invoke it with a synthesized result.
 */
export function createPluginEventsCapture(): {
  on: (event: string, handler: (results: unknown) => Promise<void> | void) => void;
  fire: (results: unknown) => Promise<void>;
} {
  let afterRun: ((r: unknown) => Promise<void> | void) | undefined;
  const on = (event: string, handler: (r: unknown) => Promise<void> | void) => {
    if (event === 'after:run') {
      afterRun = handler;
    }
  };
  const fire = async (results: unknown) => {
    if (!afterRun) throw new Error('after:run handler was not registered');
    await afterRun(results);
  };
  return { on, fire };
}
