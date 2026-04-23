/**
 * Tests for src/components/IssueCreateInlineModal.tsx
 *
 * AC-L5 (Dev Spec): Jira-only / GitHub-only / both / neither render paths.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
    },
  };
});

vi.mock('../lib/aiFetch', () => ({
  aiFetch: vi.fn(),
  invokeEdge: vi.fn(),
}));

vi.mock('./Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../i18n'; // initialise i18n singleton so useTranslation resolves keys
import IssueCreateInlineModal from './IssueCreateInlineModal';
import { supabase } from '../lib/supabase';
import { invokeEdge } from '../lib/aiFetch';

function mockConnections({ jira, github }: { jira: any; github: any }) {
  (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-1' } } });
  (supabase.from as any).mockImplementation((table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => {
        if (table === 'jira_settings') return { data: jira, error: null };
        if (table === 'github_settings') return { data: github, error: null };
        return { data: null, error: null };
      },
    };
    return chain;
  });
}

function renderModal(props: Partial<React.ComponentProps<typeof IssueCreateInlineModal>> = {}) {
  return render(
    <MemoryRouter>
      <IssueCreateInlineModal
        open={true}
        onClose={() => {}}
        projectId="proj-1"
        defaultTitle="Critical env failure"
        defaultBody="Safari 17 pass rate is 20%."
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('IssueCreateInlineModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when neither Jira nor GitHub connected', async () => {
    mockConnections({ jira: null, github: null });
    renderModal();

    await waitFor(() => {
      expect(screen.getByText(/Connect an issue tracker first/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Open Settings/i)).toBeInTheDocument();
  });

  it('renders Jira form when only Jira is connected', async () => {
    mockConnections({
      jira: { domain: 'co.atlassian.net', email: 'x@y.z', api_token: 'tok', project_key: 'TBL', issue_type: 'Bug' },
      github: null,
    });
    renderModal();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Critical env failure')).toBeInTheDocument();
    });
    // Priority select visible (Jira tab only)
    expect(screen.getByText(/Priority/i)).toBeInTheDocument();
    // No tab strip (single integration)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('renders GitHub form when only GitHub is connected', async () => {
    mockConnections({
      jira: null,
      github: { token: 'ghp_x', owner: 'acme', repo: 'web', default_labels: [] },
    });
    renderModal();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Critical env failure')).toBeInTheDocument();
    });
    // GitHub repo input visible
    expect(screen.getByDisplayValue('web')).toBeInTheDocument();
    // Priority select NOT visible (GitHub tab)
    expect(screen.queryByText(/^Priority$/i)).not.toBeInTheDocument();
  });

  it('renders both tabs when both Jira + GitHub connected', async () => {
    mockConnections({
      jira: { domain: 'co.atlassian.net', email: 'x@y.z', api_token: 'tok', project_key: 'TBL', issue_type: 'Bug' },
      github: { token: 'ghp_x', owner: 'acme', repo: 'web', default_labels: ['bug'] },
    });
    renderModal();

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBe(2);
    });
  });

  it('submits GitHub issue and calls onClose on success', async () => {
    mockConnections({
      jira: null,
      github: { token: 'ghp_x', owner: 'acme', repo: 'web', default_labels: [] },
    });
    (invokeEdge as any).mockResolvedValueOnce({
      data: { success: true, issue: { number: 42, html_url: 'https://github.com/acme/web/issues/42' } },
      error: null,
    });
    const onClose = vi.fn();
    renderModal({ onClose });

    await waitFor(() => expect(screen.getByDisplayValue('web')).toBeInTheDocument());

    const createBtn = screen.getByRole('button', { name: /Create issue/i });
    fireEvent.click(createBtn);

    await waitFor(() => expect(invokeEdge).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('preserves modal and shows error banner when Jira API fails', async () => {
    mockConnections({
      jira: { domain: 'co.atlassian.net', email: 'x@y.z', api_token: 'tok', project_key: 'TBL', issue_type: 'Bug' },
      github: null,
    });
    (invokeEdge as any).mockResolvedValueOnce({
      data: { success: false, error: 'Boom' },
      error: null,
    });
    const onClose = vi.fn();
    renderModal({ onClose });

    await waitFor(() => expect(screen.getByDisplayValue('Critical env failure')).toBeInTheDocument());
    const createBtn = screen.getByRole('button', { name: /Create issue/i });
    fireEvent.click(createBtn);

    await waitFor(() => expect(invokeEdge).toHaveBeenCalled());
    // Modal should NOT close on failure
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
