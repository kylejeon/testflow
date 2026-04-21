/**
 * Vitest global setup — jsdom env stubs, jest-dom matchers, RTL cleanup.
 *
 * Related spec: pm/specs/dev-spec-vitest-infra.md §6-4, AC-6, AC-9
 */
import '@testing-library/jest-dom/vitest';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// AC-9: stub Supabase env vars so src/lib/supabase.ts does not throw on import.
vi.stubEnv('VITE_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
vi.stubEnv('VITE_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

// AC-6: matchMedia mock — jsdom does not ship with one.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ResizeObserver mock — Recharts / TipTap rendering requires it.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
  ResizeObserverMock;

// React Testing Library auto cleanup after each test.
afterEach(() => cleanup());
