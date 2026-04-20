import { useMemo, useState } from 'react';
import {
  useEnvironments,
  useCreateEnvironment,
  useUpdateEnvironment,
  useDeleteEnvironment,
} from '../../hooks/useEnvironments';
import EnvironmentFormModal from '../../components/EnvironmentFormModal';
import { useToast, getApiErrorMessage } from '../../components/Toast';
import { usePermission } from '../../hooks/usePermission';
import { ENVIRONMENT_PRESETS } from '../../lib/environments';
import { getEnvironmentLimit } from '../../types/environment';
import type { Environment, EnvironmentFormValues } from '../../types/environment';

export interface EnvironmentsSectionProps {
  projectId: string;
  subscriptionTier?: number;
}

export default function EnvironmentsSection({ projectId, subscriptionTier = 1 }: EnvironmentsSectionProps) {
  const { data: envs, isLoading, isError, refetch } = useEnvironments(projectId);
  const { showToast } = useToast();
  const { can } = usePermission(projectId);
  const canManage = can('create_testcase'); // Tester+ (same level)
  const canDelete = can('delete_project');  // Admin+

  const create = useCreateEnvironment(projectId);
  const update = useUpdateEnvironment(projectId);
  const destroy = useDeleteEnvironment(projectId);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Environment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const activeCount = useMemo(() => (envs ?? []).filter(e => e.is_active).length, [envs]);
  const limit = getEnvironmentLimit(subscriptionTier);
  const limitReached = limit !== -1 && activeCount >= limit;

  const openAddModal = () => {
    setEditing(null);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (env: Environment) => {
    setEditing(env);
    setFormError(null);
    setShowModal(true);
    setOpenMenuId(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (values: EnvironmentFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, values });
        showToast('Environment updated', 'success');
      } else {
        if (limitReached) {
          showToast(`You've reached the ${limit}-environment limit of your plan.`, 'warning');
          return;
        }
        await create.mutateAsync(values);
        showToast('Environment created', 'success');
      }
      closeModal();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === '23505') {
        setFormError('An environment with this name already exists.');
      } else {
        setFormError(getApiErrorMessage(e));
      }
    }
  };

  const handleToggleActive = async (env: Environment) => {
    try {
      await update.mutateAsync({ id: env.id, values: { is_active: !env.is_active } });
      showToast(env.is_active ? 'Environment deactivated' : 'Environment activated', 'success');
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e), 'error');
    }
  };

  const handlePresetQuickAdd = async (presetKey: string) => {
    if (limitReached) {
      showToast(`You've reached the ${limit}-environment limit of your plan.`, 'warning');
      return;
    }
    const preset = ENVIRONMENT_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    try {
      await create.mutateAsync(preset.values);
      showToast(`Added "${preset.values.name}"`, 'success');
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === '23505') {
        showToast('An environment with this name already exists.', 'error');
      } else {
        showToast(getApiErrorMessage(e), 'error');
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await destroy.mutateAsync(id);
      showToast('Environment deleted', 'success');
      setConfirmDeleteId(null);
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e), 'error');
    }
  };

  const sortedEnvs = useMemo(() => envs ?? [], [envs]);

  // ─── Header ──────────────────────────────────────────────────────
  const header = (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-[0.9375rem] font-bold text-slate-900 mb-0.5">Environments</h3>
        <p className="text-[0.8125rem] text-slate-500">
          Define OS/Browser/Device combinations to run your test suites against.
        </p>
      </div>
      <button
        type="button"
        onClick={openAddModal}
        disabled={!canManage || limitReached}
        title={
          !canManage
            ? 'You need Tester role or higher to manage environments.'
            : limitReached
              ? `Plan limit reached (${activeCount}/${limit})`
              : undefined
        }
        aria-label="Add new environment"
        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-600"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Add Environment
      </button>
    </div>
  );

  // ─── Plan limit banner ───────────────────────────────────────────
  const limitBanner = limit !== -1 && (
    <div className="flex items-center justify-between gap-3 p-4 mb-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
      <span className="flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
        {activeCount}/{limit} environments used on your plan.
      </span>
      {limitReached && (
        <a
          href="/settings?tab=billing"
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 underline"
        >
          Upgrade
        </a>
      )}
    </div>
  );

  // ─── Preset quick-add ────────────────────────────────────────────
  const presetBar = canManage && (
    <div className="mb-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
        Quick presets
      </div>
      <div className="flex flex-wrap gap-2">
        {ENVIRONMENT_PRESETS.map(p => (
          <button
            key={p.key}
            type="button"
            onClick={() => handlePresetQuickAdd(p.key)}
            disabled={limitReached || create.isPending}
            aria-label={`Add ${p.values.name} preset`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:border-brand-400 hover:bg-brand-50 text-sm text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className={`${p.icon} text-sm`} />
            {p.values.name}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Table / Empty / Loading / Error ─────────────────────────────
  let body: React.ReactNode = null;

  if (isLoading) {
    body = (
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="h-11 bg-gray-50 border-b border-gray-200" />
        {[0, 1, 2].map(i => (
          <div key={i} className="h-12 border-b border-gray-100 animate-pulse bg-gray-50/50" />
        ))}
      </div>
    );
  } else if (isError) {
    body = (
      <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          Failed to load environments.
        </span>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-3 py-1 text-xs font-semibold rounded-md bg-red-600 text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  } else if (sortedEnvs.length === 0) {
    body = (
      <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-dashed border-gray-300 bg-gray-50/50">
        <svg className="w-12 h-12 text-gray-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
        <div className="text-sm font-medium text-gray-700 mb-1">No environments yet</div>
        <div className="text-xs text-gray-400 mb-4">Add one to enable the Environment Coverage Matrix.</div>
        {canManage && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Environment
          </button>
        )}
      </div>
    );
  } else {
    body = (
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">OS</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Browser</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Device</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Active</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEnvs.map(env => (
              <tr key={env.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {env.name}
                  {env.description && (
                    <div className="text-xs font-normal text-gray-500 mt-0.5 truncate max-w-xs">{env.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {[env.os_name, env.os_version].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {[env.browser_name, env.browser_version].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 capitalize">{env.device_type}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={env.is_active}
                    aria-label="Toggle environment active status"
                    disabled={!canManage || update.isPending}
                    onClick={() => handleToggleActive(env)}
                    className={`inline-flex h-5 w-9 rounded-full items-center px-0.5 transition-colors ${
                      env.is_active ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => setOpenMenuId(openMenuId === env.id ? null : env.id)}
                      aria-label="Environment actions"
                      aria-haspopup="menu"
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                    </button>
                    {openMenuId === env.id && (
                      <div
                        className="absolute right-0 top-full mt-1 z-10 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 text-left"
                        role="menu"
                      >
                        <button
                          type="button"
                          onClick={() => openEditModal(env)}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => { setOpenMenuId(null); void handleToggleActive(env); }}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {env.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => { setOpenMenuId(null); setConfirmDeleteId(env.id); }}
                            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete permanently
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {header}
      {limitBanner}
      {presetBar}
      {body}

      <EnvironmentFormModal
        isOpen={showModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialValues={editing}
        submitting={create.isPending || update.isPending}
        error={formError}
      />

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h4 className="text-base font-semibold text-gray-900 mb-2">Delete environment?</h4>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently remove the environment. Runs using it will be unlinked. Continue?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={destroy.isPending}
                className="px-3 py-1.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
              >
                {destroy.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
