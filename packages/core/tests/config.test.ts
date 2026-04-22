import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigError, resolveConfig } from '../src/config';

describe('resolveConfig', () => {
  beforeEach(() => {
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
  });
  afterEach(() => {
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
  });

  it('throws ConfigError when URL is missing', () => {
    expect(() =>
      resolveConfig({ token: 'x', runId: 'y' }),
    ).toThrow(ConfigError);
  });

  it('throws ConfigError when token is missing', () => {
    expect(() =>
      resolveConfig({ url: 'https://a', runId: 'y' }),
    ).toThrow(ConfigError);
  });

  it('throws ConfigError when runId is missing', () => {
    expect(() =>
      resolveConfig({ url: 'https://a', token: 'x' }),
    ).toThrow(ConfigError);
  });

  it('falls back to env vars', () => {
    process.env['TESTABLY_URL'] = 'https://env.testably.app/';
    process.env['TESTABLY_TOKEN'] = 'testably_env_token';
    process.env['TESTABLY_RUN_ID'] = 'run-env';

    const cfg = resolveConfig({});
    expect(cfg.url).toBe('https://env.testably.app'); // trailing slash stripped
    expect(cfg.token).toBe('testably_env_token');
    expect(cfg.runId).toBe('run-env');
  });

  it('options override env vars', () => {
    process.env['TESTABLY_URL'] = 'https://env.example.com';
    process.env['TESTABLY_TOKEN'] = 'env_token';
    process.env['TESTABLY_RUN_ID'] = 'run-env';

    const cfg = resolveConfig({
      url: 'https://opt.example.com',
      token: 'opt_token',
      runId: 'run-opt',
    });
    expect(cfg.url).toBe('https://opt.example.com');
    expect(cfg.token).toBe('opt_token');
    expect(cfg.runId).toBe('run-opt');
  });

  it('applies defaults for optional fields', () => {
    const cfg = resolveConfig({
      url: 'https://a',
      token: 't',
      runId: 'r',
    });
    expect(cfg.maxRetries).toBe(3);
    expect(cfg.failOnUploadError).toBe(false);
    expect(cfg.verbose).toBe(false);
    expect(cfg.testCaseIdMapping).toBe('annotation');
  });
});
