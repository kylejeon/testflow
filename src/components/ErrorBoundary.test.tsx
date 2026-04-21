/**
 * Tests for ErrorBoundary (f024).
 *
 * AC-6 (Dev Spec §3): throw child renders FullPage fallback, section prop
 * renders Section fallback, retry resets state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Silence React's expected console.error noise from ErrorBoundary.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function Boom({ message = 'boom' }: { message?: string }): JSX.Element {
  throw new Error(message);
}

function Ok(): JSX.Element {
  return <div data-testid="ok">ok</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <Ok />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('ok')).toBeInTheDocument();
  });

  it('renders FullPage fallback with i18n title when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    // Use i18n key's EN fallback — the singleton is initialised at module load.
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/something went wrong/i);
    // Try again + Go to dashboard buttons are present
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toBeInTheDocument();
  });

  it('renders Section fallback + retry button when section=true', () => {
    render(
      <ErrorBoundary section sectionName="Project Overview">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/Project Overview/);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('section retry resets state and re-renders children', () => {
    let shouldThrow = true;
    function ToggleBoom(): JSX.Element {
      if (shouldThrow) throw new Error('boom');
      return <div data-testid="recovered">recovered</div>;
    }
    render(
      <ErrorBoundary section sectionName="Widget">
        <ToggleBoom />
      </ErrorBoundary>,
    );
    // Fallback is shown first
    expect(screen.getByRole('alert')).toBeInTheDocument();
    // Flip the switch and click retry
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });

  it('uses the generic section title when no sectionName is provided', () => {
    render(
      <ErrorBoundary section>
        <Boom />
      </ErrorBoundary>,
    );
    // EN fallback copy from common.errorBoundary.section.titleGeneric
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load this section/i);
  });
});
