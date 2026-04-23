import { describe, expect, it, vi } from 'vitest';
import { extractTestCaseId } from '../src/plugin';

const FILE = 'cypress/e2e/example.cy.ts';

describe('extractTestCaseId — title mode (default)', () => {
  it('matches [TC-42] in the middle of the title', () => {
    expect(
      extractTestCaseId('login flow > [TC-42] user can log in', FILE, {}),
    ).toBe('TC-42');
  });

  it('is case-insensitive ([tc-42] → TC-42 capture preserved from source)', () => {
    expect(
      extractTestCaseId('login > [tc-42] should pass', FILE, {
        testCaseIdSource: 'title',
      }),
    ).toBe('tc-42');
  });

  it('matches UUID inside brackets', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(
      extractTestCaseId(`suite > [${uuid}] test`, FILE, {
        testCaseIdSource: 'title',
      }),
    ).toBe(uuid);
  });

  it('does NOT match TC-999 without brackets', () => {
    expect(
      extractTestCaseId('login flow TC-999 without brackets', FILE, {
        testCaseIdSource: 'title',
      }),
    ).toBeUndefined();
  });

  it('returns undefined when no marker is present', () => {
    expect(
      extractTestCaseId('plain title with no id', FILE, {
        testCaseIdSource: 'title',
      }),
    ).toBeUndefined();
  });

  it('defaults to title mode when testCaseIdSource is omitted', () => {
    expect(extractTestCaseId('[TC-1] hello', FILE, {})).toBe('TC-1');
  });
});

describe('extractTestCaseId — tag mode', () => {
  it('matches suffix `@TC-7`', () => {
    expect(
      extractTestCaseId('should login @TC-7', FILE, {
        testCaseIdSource: 'tag',
      }),
    ).toBe('TC-7');
  });

  it('matches prefix `@TC-7 login`', () => {
    expect(
      extractTestCaseId('@TC-7 login', FILE, { testCaseIdSource: 'tag' }),
    ).toBe('TC-7');
  });

  it('matches middle `thing @TC-12 case`', () => {
    expect(
      extractTestCaseId('thing @TC-12 case', FILE, {
        testCaseIdSource: 'tag',
      }),
    ).toBe('TC-12');
  });

  it('does NOT match an email address (email@domain.com)', () => {
    expect(
      extractTestCaseId('send to email@domain.com succeeds', FILE, {
        testCaseIdSource: 'tag',
      }),
    ).toBeUndefined();
  });

  it('does NOT match `something@TC-7` without a leading space', () => {
    expect(
      extractTestCaseId('foo@TC-7', FILE, { testCaseIdSource: 'tag' }),
    ).toBeUndefined();
  });

  it('matches UUID-style tag', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(
      extractTestCaseId(`checkout @${uuid}`, FILE, {
        testCaseIdSource: 'tag',
      }),
    ).toBe(uuid);
  });
});

describe('extractTestCaseId — custom mode', () => {
  it('invokes mapTestCaseId(fullTitle, filePath)', () => {
    const mapper = vi.fn().mockReturnValue('TC-500');
    const id = extractTestCaseId('login works', FILE, {
      testCaseIdSource: 'custom',
      mapTestCaseId: mapper,
    });
    expect(id).toBe('TC-500');
    expect(mapper).toHaveBeenCalledWith('login works', FILE);
  });

  it('returns undefined when mapper returns undefined', () => {
    const mapper = vi.fn().mockReturnValue(undefined);
    expect(
      extractTestCaseId('random', FILE, {
        testCaseIdSource: 'custom',
        mapTestCaseId: mapper,
      }),
    ).toBeUndefined();
  });

  it('returns undefined when custom mode but no mapper', () => {
    expect(
      extractTestCaseId('random', FILE, { testCaseIdSource: 'custom' }),
    ).toBeUndefined();
  });
});
