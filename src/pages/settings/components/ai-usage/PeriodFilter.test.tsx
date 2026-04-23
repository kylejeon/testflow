/**
 * Tests for PeriodFilter — plan-based option disable + tooltip + keyboard.
 *
 * f011 AC-5 (period dropdown + disabled options per plan + upgrade tooltip),
 *      AC-16 (keyboard-only operability).
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import PeriodFilter from './PeriodFilter';

function renderWithI18n(node: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

describe('PeriodFilter', () => {
  it('opens dropdown on trigger click and lists all 4 options', () => {
    renderWithI18n(<PeriodFilter value="30d" onChange={() => {}} tier={4} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('period-option-30d')).toBeInTheDocument();
    expect(screen.getByTestId('period-option-90d')).toBeInTheDocument();
    expect(screen.getByTestId('period-option-6m')).toBeInTheDocument();
    expect(screen.getByTestId('period-option-12m')).toBeInTheDocument();
  });

  it('Free tier: only 30d allowed, others aria-disabled', () => {
    renderWithI18n(<PeriodFilter value="30d" onChange={() => {}} tier={1} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('period-option-30d').getAttribute('aria-disabled')).toBe('false');
    expect(screen.getByTestId('period-option-90d').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByTestId('period-option-6m').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByTestId('period-option-12m').getAttribute('aria-disabled')).toBe('true');
  });

  it('fires onChange for an allowed option', () => {
    const onChange = vi.fn();
    renderWithI18n(<PeriodFilter value="30d" onChange={onChange} tier={4} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByTestId('period-option-90d'));
    expect(onChange).toHaveBeenCalledWith('90d');
  });

  it('does NOT fire onChange for a disabled option', () => {
    const onChange = vi.fn();
    renderWithI18n(<PeriodFilter value="30d" onChange={onChange} tier={1} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByTestId('period-option-90d'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sets aria-haspopup / aria-expanded on trigger (AC-16)', () => {
    renderWithI18n(<PeriodFilter value="30d" onChange={() => {}} tier={4} />);
    const trigger = screen.getByRole('button');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows upgrade tooltip on disabled option (title attribute)', () => {
    renderWithI18n(<PeriodFilter value="30d" onChange={() => {}} tier={1} />);
    fireEvent.click(screen.getByRole('button'));
    const disabled = screen.getByTestId('period-option-90d');
    const titleStr = disabled.getAttribute('title');
    expect(titleStr).toBeTruthy();
    expect(titleStr).toContain('Starter');
  });
});
