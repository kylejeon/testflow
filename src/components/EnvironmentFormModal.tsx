import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Environment, EnvironmentFormValues, DeviceType } from '../types/environment';
import { ENVIRONMENT_PRESETS } from '../lib/environments';

export interface EnvironmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: EnvironmentFormValues) => Promise<void> | void;
  initialValues?: Environment | null;
  submitting?: boolean;
  error?: string | null;
  /** z-index override so it stacks above another modal (Run modal inline add-new case) */
  zIndex?: number;
}

const EMPTY: EnvironmentFormValues = {
  name: '',
  os_name: '',
  os_version: '',
  browser_name: '',
  browser_version: '',
  device_type: 'desktop',
  description: '',
};

function toValues(env: Environment | null | undefined): EnvironmentFormValues {
  if (!env) return { ...EMPTY };
  return {
    name: env.name ?? '',
    os_name: env.os_name ?? '',
    os_version: env.os_version ?? '',
    browser_name: env.browser_name ?? '',
    browser_version: env.browser_version ?? '',
    device_type: env.device_type,
    description: env.description ?? '',
  };
}

export default function EnvironmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  submitting = false,
  error,
  zIndex = 50,
}: EnvironmentFormModalProps) {
  const { t } = useTranslation('environments');
  const [values, setValues] = useState<EnvironmentFormValues>(toValues(initialValues));
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const isEdit = !!initialValues;

  useEffect(() => {
    if (isOpen) {
      setValues(toValues(initialValues));
      // focus name input after open
      setTimeout(() => { nameInputRef.current?.focus(); }, 0);
    }
  }, [isOpen, initialValues]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!submitting) void handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, submitting, values]);

  const setField = <K extends keyof EnvironmentFormValues>(key: K, v: EnvironmentFormValues[K]) => {
    setValues(prev => ({ ...prev, [key]: v }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = ENVIRONMENT_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    setValues(prev => ({
      ...prev,
      ...preset.values,
      // keep the user's description if they were typing
      description: prev.description || preset.values.description,
    }));
  };

  async function handleSubmit() {
    if (!values.name.trim()) return;
    await onSubmit({
      ...values,
      name: values.name.trim(),
    });
  }

  if (!isOpen) return null;

  const nameInvalid = !values.name.trim();

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="env-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <h3 id="env-modal-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? t('editTitle') : t('addButton')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('form.cancel')}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Preset row */}
          {!isEdit && (
            <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-100">
              {ENVIRONMENT_PRESETS.map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:border-brand-400 hover:bg-brand-50 text-sm text-gray-700 transition-colors"
                >
                  <i className={`${p.icon} text-sm`} />
                  {p.values.name}
                </button>
              ))}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="env-name" className="block text-xs font-medium text-gray-700 mb-1">
              {t('form.name')} <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="env-name"
              type="text"
              value={values.name}
              onChange={e => setField('name', e.target.value)}
              placeholder={t('form.namePlaceholder')}
              maxLength={120}
              className={`w-full px-3 py-2 rounded-md border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 ${
                error || nameInvalid ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {error && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </p>
            )}
          </div>

          {/* OS + OS version */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="env-os" className="block text-xs font-medium text-gray-700 mb-1">{t('form.osName')}</label>
              <input
                id="env-os"
                type="text"
                value={values.os_name}
                onChange={e => setField('os_name', e.target.value)}
                placeholder="macOS / Windows / Ubuntu"
                className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="env-os-ver" className="block text-xs font-medium text-gray-700 mb-1">{t('form.osVersion')}</label>
              <input
                id="env-os-ver"
                type="text"
                value={values.os_version}
                onChange={e => setField('os_version', e.target.value)}
                placeholder="14"
                className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Browser + version */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="env-browser" className="block text-xs font-medium text-gray-700 mb-1">{t('form.browserName')}</label>
              <input
                id="env-browser"
                type="text"
                value={values.browser_name}
                onChange={e => setField('browser_name', e.target.value)}
                placeholder="Chrome / Firefox / Safari"
                className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="env-browser-ver" className="block text-xs font-medium text-gray-700 mb-1">{t('form.browserVersion')}</label>
              <input
                id="env-browser-ver"
                type="text"
                value={values.browser_version}
                onChange={e => setField('browser_version', e.target.value)}
                placeholder="124"
                className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Device */}
          <div>
            <span className="block text-xs font-medium text-gray-700 mb-1">{t('form.deviceType')}</span>
            <div className="flex gap-2" role="radiogroup" aria-label={t('form.deviceType')}>
              {(['desktop', 'mobile', 'tablet'] as DeviceType[]).map(d => {
                const active = values.device_type === d;
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setField('device_type', d)}
                    className={
                      active
                        ? 'px-3 py-1.5 rounded-full text-sm bg-brand-100 text-brand-700 border border-brand-300'
                        : 'px-3 py-1.5 rounded-full text-sm bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                    }
                  >
                    {t(`form.device.${d}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="env-desc" className="block text-xs font-medium text-gray-700 mb-1">{t('form.description')}</label>
            <textarea
              id="env-desc"
              value={values.description}
              onChange={e => setField('description', e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            {t('form.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || nameInvalid}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md shadow-sm transition-colors"
          >
            {submitting && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {submitting ? t('form.saving') : t('form.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
