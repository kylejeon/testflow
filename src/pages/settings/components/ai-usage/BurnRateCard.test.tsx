/**
 * Tests for BurnRateCard — pure helpers + render branches.
 *
 * f011 AC-3 (Burn Rate card with projected depletion),
 *      AC-12 (Enterprise unlimited variant).
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import BurnRateCard, {
  calcBurnRatePerDay,
  calcEstimatedDepletionDays,
} from './BurnRateCard';

function renderWithI18n(node: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

describe('calcBurnRatePerDay', () => {
  it('returns 0 when no days have elapsed', () => {
    expect(calcBurnRatePerDay(10, 0)).toBe(0);
    expect(calcBurnRatePerDay(10, -1)).toBe(0);
  });
  it('divides used credits by elapsed days', () => {
    expect(calcBurnRatePerDay(50, 10)).toBe(5);
    expect(calcBurnRatePerDay(7, 14)).toBe(0.5);
  });
});

describe('calcEstimatedDepletionDays', () => {
  it('returns null for unlimited (-1)', () => {
    expect(calcEstimatedDepletionDays(100, -1, 5)).toBeNull();
  });
  it('returns null when no burn rate', () => {
    expect(calcEstimatedDepletionDays(10, 150, 0)).toBeNull();
  });
  it('returns 0 when limit already reached', () => {
    expect(calcEstimatedDepletionDays(150, 150, 5)).toBe(0);
    expect(calcEstimatedDepletionDays(151, 150, 5)).toBe(0);
  });
  it('computes (limit - used) / perDay floor', () => {
    // (150 - 40) / 1.8 = 61.11 → 61 days (Dev Spec §AC-3 example)
    expect(calcEstimatedDepletionDays(40, 150, 1.8)).toBe(61);
  });
});

describe('BurnRateCard — thisMonth variant', () => {
  it('renders used / limit and progress bar for a normal plan', () => {
    renderWithI18n(
      <BurnRateCard
        variant="thisMonth"
        used={37}
        limit={150}
        daysElapsedInCycle={15}
        daysLeftInCycle={15}
      />,
    );
    expect(screen.getByText('37')).toBeInTheDocument();
    expect(screen.getByText(/\/ 150/)).toBeInTheDocument();
    expect(screen.getByTestId('burn-rate-progress-fill')).toBeInTheDocument();
  });

  it('renders "Unlimited" with Enterprise badge when limit is -1 (AC-12)', () => {
    renderWithI18n(
      <BurnRateCard
        variant="thisMonth"
        used={500}
        limit={-1}
        daysElapsedInCycle={15}
        daysLeftInCycle={15}
      />,
    );
    expect(screen.getByText(/Unlimited/)).toBeInTheDocument();
    expect(screen.getByText(/Enterprise/)).toBeInTheDocument();
    // Progress bar must NOT be rendered (AC-12)
    expect(screen.queryByTestId('burn-rate-progress-fill')).toBeNull();
  });

  it('uses amber fill when 80% threshold crossed', () => {
    renderWithI18n(
      <BurnRateCard
        variant="thisMonth"
        used={130}
        limit={150}
        daysElapsedInCycle={15}
        daysLeftInCycle={15}
      />,
    );
    const fill = screen.getByTestId('burn-rate-progress-fill');
    expect(fill.className).toContain('bg-amber-500');
  });

  it('uses red fill when 100%+ used', () => {
    renderWithI18n(
      <BurnRateCard
        variant="thisMonth"
        used={160}
        limit={150}
        daysElapsedInCycle={15}
        daysLeftInCycle={15}
      />,
    );
    const fill = screen.getByTestId('burn-rate-progress-fill');
    expect(fill.className).toContain('bg-red-500');
  });
});

describe('BurnRateCard — burnRate variant', () => {
  it('shows "On track" when projected usage stays under limit', () => {
    // 5 used over 10 days = 0.5/day * 20 days left + 5 = 15 ≤ 150 ✓
    renderWithI18n(
      <BurnRateCard
        variant="burnRate"
        used={5}
        limit={150}
        daysElapsedInCycle={10}
        daysLeftInCycle={20}
      />,
    );
    expect(screen.getByTestId('burn-rate-on-track')).toBeInTheDocument();
  });

  it('shows "Warning" when projected usage exceeds limit', () => {
    // 100 used over 10 days = 10/day * 20 days left + 100 = 300 > 150 ✗
    renderWithI18n(
      <BurnRateCard
        variant="burnRate"
        used={100}
        limit={150}
        daysElapsedInCycle={10}
        daysLeftInCycle={20}
      />,
    );
    expect(screen.getByTestId('burn-rate-warning')).toBeInTheDocument();
  });

  it('hides trend badge entirely for Enterprise unlimited', () => {
    renderWithI18n(
      <BurnRateCard
        variant="burnRate"
        used={1000}
        limit={-1}
        daysElapsedInCycle={10}
        daysLeftInCycle={20}
      />,
    );
    expect(screen.queryByTestId('burn-rate-on-track')).toBeNull();
    expect(screen.queryByTestId('burn-rate-warning')).toBeNull();
  });
});
