import { useEffect, useMemo, useRef, useState } from 'react';
import { useEnvironments, useCreateEnvironment } from '../hooks/useEnvironments';
import { useToast, getApiErrorMessage } from './Toast';
import EnvironmentFormModal from './EnvironmentFormModal';
import type { Environment, EnvironmentFormValues } from '../types/environment';
import { getEnvironmentDisplayName, groupEnvironmentsByOS } from '../lib/environments';

export interface EnvironmentDropdownProps {
  projectId: string;
  /** Selected environment id. Null when fallback/freeform or unset. */
  value?: string | null;
  /** Legacy freeform text fallback (used when catalog is empty). */
  legacyValue?: string | null;
  /**
   * Called when selection changes.
   * - catalog mode: (envId, displayName)
   * - freeform mode: (null, freeformText)
   */
  onChange: (envId: string | null, displayName: string) => void;
  disabled?: boolean;
  /** Optional label to render above trigger */
  label?: string;
}

export default function EnvironmentDropdown({
  projectId,
  value,
  legacyValue,
  onChange,
  disabled,
  label,
}: EnvironmentDropdownProps) {
  const { data: allEnvs, isLoading, isError } = useEnvironments(projectId);
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const create = useCreateEnvironment(projectId);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const activeEnvs = useMemo(() => (allEnvs ?? []).filter(e => e.is_active), [allEnvs]);
  const groups = useMemo(() => groupEnvironmentsByOS(activeEnvs), [activeEnvs]);

  // selected env (even if it became inactive we still show it)
  const selectedEnv = useMemo<Environment | null>(() => {
    if (!value) return null;
    return (allEnvs ?? []).find(e => e.id === value) ?? null;
  }, [allEnvs, value]);

  // Fallback mode: no catalog rows at all (active + inactive both empty)
  const useFallback = !isLoading && !isError && (allEnvs ?? []).length === 0;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handlePick = (env: Environment) => {
    onChange(env.id, getEnvironmentDisplayName(env));
    setOpen(false);
  };

  const handleFallbackChange = (text: string) => {
    onChange(null, text);
  };

  const handleCreate = async (values: EnvironmentFormValues) => {
    setFormError(null);
    try {
      const newEnv = await create.mutateAsync(values);
      setShowAddModal(false);
      showToast('Environment created', 'success');
      // auto-select the newly created environment
      onChange(newEnv.id, getEnvironmentDisplayName(newEnv));
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === '23505') {
        setFormError('An environment with this name already exists.');
      } else {
        setFormError(getApiErrorMessage(e));
      }
    }
  };

  // ─── Fallback mode (no catalog) ────────────────────────────────
  if (useFallback) {
    return (
      <div>
        {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
        <input
          type="text"
          value={legacyValue ?? ''}
          onChange={e => handleFallbackChange(e.target.value)}
          disabled={disabled}
          placeholder="Environment (e.g. Chrome 124 / macOS 14)"
          className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          No environments in this project yet.
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-brand-600 hover:text-brand-700 underline"
          >
            Add one
          </button>
        </p>

        <EnvironmentFormModal
          isOpen={showAddModal}
          onClose={() => { setShowAddModal(false); setFormError(null); }}
          onSubmit={handleCreate}
          submitting={create.isPending}
          error={formError}
          zIndex={60}
        />
      </div>
    );
  }

  // ─── Dropdown mode ─────────────────────────────────────────────
  const triggerLabel = selectedEnv
    ? getEnvironmentDisplayName(selectedEnv)
    : 'Select environment';

  return (
    <div ref={rootRef} className="relative">
      {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled || isLoading}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-900 hover:border-gray-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
      >
        {isLoading ? (
          <span className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            Loading...
          </span>
        ) : (
          <span className={selectedEnv ? 'text-gray-900' : 'text-gray-400'}>
            {triggerLabel}
            {selectedEnv && !selectedEnv.is_active && (
              <span className="ml-1.5 text-[10px] uppercase tracking-wider text-gray-400">(inactive)</span>
            )}
          </span>
        )}
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md bg-white border border-gray-200 shadow-lg"
        >
          {activeEnvs.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-500">
              No active environments. Add one to get started.
            </div>
          ) : (
            groups.map(g => (
              <div key={g.os}>
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {g.os}
                </div>
                {g.columns.map(col => {
                  const env = col.env;
                  const selected = env.id === value;
                  return (
                    <button
                      key={env.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => handlePick(env)}
                      className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 cursor-pointer ${
                        selected ? 'bg-brand-50' : ''
                      }`}
                    >
                      <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selected ? 'text-brand-600' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        {selected && <circle cx="12" cy="12" r="4" fill="currentColor" />}
                      </svg>
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {getEnvironmentDisplayName(env)}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {[env.browser_name, env.browser_version].filter(Boolean).join(' · ') || env.device_type}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}

          <div className="border-t border-gray-100" />
          <button
            type="button"
            onClick={() => { setOpen(false); setShowAddModal(true); }}
            className="sticky bottom-0 w-full flex items-center gap-2 px-3 py-2 bg-gray-50 text-sm font-medium text-brand-600 hover:bg-gray-100 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add new…
          </button>
        </div>
      )}

      <EnvironmentFormModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setFormError(null); }}
        onSubmit={handleCreate}
        submitting={create.isPending}
        error={formError}
        zIndex={60}
      />
    </div>
  );
}
