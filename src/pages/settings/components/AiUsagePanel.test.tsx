/**
 * Smoke tests for AiUsagePanel. Full integration is covered by manual
 * / Playwright flows; here we only assert that:
 *   - Panel renders without crashing
 *   - Empty state is shown when there is no usage data
 *
 * f011 AC-1 (renders inside /settings?tab=ai-usage)
 *      AC-13 (empty state)
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '../../../i18n';

// Mock supabase — keep chain API minimal enough for all queries to resolve empty.
vi.mock('../../../lib/supabase', () => {
  const passthrough = (): Record<string, unknown> => {
    const api: Record<string, unknown> = {};
    api.select = () => api;
    api.eq = () => api;
    api.in = () => api;
    api.gte = () => api;
    api.lt = () => api;
    api.gt = () => api;
    api.order = () => api;
    api.limit = () => api;
    api.maybeSingle = async () => ({ data: null, error: null });
    api.single = async () => ({ data: null, error: null });
    api.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: [], error: null });
    return api;
  };
  return {
    supabase: {
      from: () => passthrough(),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    },
  };
});

// Mock the toast hook — no-op
vi.mock('../../../components/Toast', async () => {
  return {
    useToast: () => ({ showToast: vi.fn() }),
    getApiErrorMessage: (e: unknown) => String(e),
    ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    ToastContainer: () => null,
  };
});

import AiUsagePanel from './AiUsagePanel';

function renderPanel() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/settings?tab=ai-usage']}>
          <AiUsagePanel />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('AiUsagePanel', () => {
  it('renders the page header title', async () => {
    renderPanel();
    await waitFor(() => {
      // Matches either team or self title depending on the resolved tier.
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  it('shows empty state when usage data is empty', async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId('ai-usage-empty')).toBeInTheDocument();
    });
  });
});
