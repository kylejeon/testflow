import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { StepEditor, Step } from '../../../components/StepEditor';
import type { SharedTestStep } from '../../../types/shared-steps';

const fieldCls = `w-full border border-slate-200 rounded-lg text-sm text-slate-700 px-3 py-2 bg-white focus:outline-none focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-colors`;
const labelCls = `block text-xs font-semibold text-slate-600 mb-1`;

interface Props {
  projectId: string;
  sharedStep: SharedTestStep | null;
  onClose: () => void;
  onSaved: () => void;
}

function makeDefaultStep(): Step {
  return { id: String(Date.now()), step: '', expectedResult: '' };
}

export default function SharedStepModal({ projectId, sharedStep, onClose, onSaved }: Props) {
  const isEdit = !!sharedStep;

  const [name, setName] = useState(sharedStep?.name || '');
  const [description, setDescription] = useState(sharedStep?.description || '');
  const [category, setCategory] = useState(sharedStep?.category || '');
  const [tags, setTags] = useState(sharedStep?.tags || '');
  const [tagInput, setTagInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [steps, setSteps] = useState<Step[]>(
    sharedStep?.steps && sharedStep.steps.length > 0
      ? sharedStep.steps
      : [makeDefaultStep()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState(sharedStep?.usage_count || 0);

  // Bulk TC update dialog (shown after saving an edit when TCs reference this shared step)
  interface UsageTC { test_case_id: string; custom_id: string; title: string; priority: string; linked_version: number; }
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [usageTCs, setUsageTCs] = useState<UsageTC[]>([]);
  const [selectedTCIds, setSelectedTCIds] = useState<Set<string>>(new Set());
  const [savedNewVersion, setSavedNewVersion] = useState(0);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const getTagsArray = () =>
    tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      const trimmed = tagInput.trim();
      if (trimmed) {
        const current = getTagsArray();
        if (!current.includes(trimmed)) {
          setTags([...current, trimmed].join(', '));
        }
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(getTagsArray().filter(t => t !== tagToRemove).join(', '));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    const validSteps = steps.filter(s => s.step.trim());
    if (validSteps.length === 0) { setError('At least one step is required.'); return; }

    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        tags: tags.trim() || null,
        steps: validSteps,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const newVersion = sharedStep!.version + 1;

        // Record the current (old) version content in shared_step_versions before updating
        await supabase.from('shared_step_versions').insert({
          shared_step_id: sharedStep!.id,
          version: sharedStep!.version,
          steps: sharedStep!.steps,
          name: sharedStep!.name,
          changed_by: user.id,
          change_summary: `Updated to v${newVersion}`,
        });

        const { error: err } = await supabase
          .from('shared_steps')
          .update({ ...payload, version: newVersion })
          .eq('id', sharedStep!.id);
        if (err) throw err;

        // Query TCs that reference this shared step
        const { data: usages } = await supabase
          .from('shared_step_usage')
          .select('test_case_id, linked_version, test_cases!inner(custom_id, title, priority)')
          .eq('shared_step_id', sharedStep!.id);

        if (usages && usages.length > 0) {
          // Deduplicate by test_case_id
          const seen = new Set<string>();
          const unique = (usages as any[]).filter(u => {
            if (seen.has(u.test_case_id)) return false;
            seen.add(u.test_case_id);
            return true;
          });
          const tcList = unique.map((u: any) => ({
            test_case_id: u.test_case_id,
            custom_id: u.test_cases?.custom_id || '',
            title: u.test_cases?.title || '',
            priority: u.test_cases?.priority || 'medium',
            linked_version: u.linked_version,
          }));
          setUsageTCs(tcList);
          setSelectedTCIds(new Set(tcList.map((t: any) => t.test_case_id)));
          setSavedNewVersion(newVersion);
          setShowBulkUpdate(true);
          // Don't call onSaved yet — wait for user decision
        } else {
          onSaved();
        }
      } else {
        const { error: err } = await supabase
          .from('shared_steps')
          .insert({ ...payload, project_id: projectId, created_by: user.id });
        if (err) throw err;
        onSaved();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpdate = async () => {
    setBulkUpdating(true);
    try {
      const tcIds = [...selectedTCIds];
      const { data: tcs } = await supabase
        .from('test_cases')
        .select('id, steps')
        .in('id', tcIds);

      for (const tc of (tcs || [])) {
        try {
          const raw = typeof tc.steps === 'string' ? JSON.parse(tc.steps) : (tc.steps || []);
          const updated = (Array.isArray(raw) ? raw : []).map((s: any) =>
            s?.type === 'shared_step_ref' && s.shared_step_id === sharedStep!.id
              ? { ...s, shared_step_version: savedNewVersion }
              : s
          );
          await supabase.from('test_cases').update({ steps: JSON.stringify(updated) }).eq('id', tc.id);
        } catch {}
      }
    } finally {
      setBulkUpdating(false);
      onSaved();
    }
  };

  const handleSkipBulkUpdate = () => {
    onSaved();
  };

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 999, backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '680px',
          maxWidth: 'calc(100vw - 2rem)',
          maxHeight: '90vh',
          background: '#fff',
          borderRadius: '1rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <i className="ri-links-line text-indigo-600 text-base" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  {isEdit ? `Edit ${sharedStep.custom_id}` : 'New Shared Step'}
                </h2>
                {isEdit && (
                  <p className="text-xs text-slate-400">v{sharedStep.version} · Used by {usageCount} TC{usageCount !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className={labelCls}>Name <span className="text-red-400">*</span></label>
              <input
                className={fieldCls}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Login Flow"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                className={fieldCls}
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Purpose or usage notes (optional)"
              />
            </div>

            {/* Category + Tags */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Category</label>
                <input
                  className={fieldCls}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g. Authentication"
                />
              </div>
              <div>
                <label className={labelCls}>Tags</label>
                <input
                  className={fieldCls}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="Enter tag and press Enter"
                />
                {getTagsArray().length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {getTagsArray().map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="w-3.5 h-3.5 flex items-center justify-center text-indigo-500 hover:text-indigo-800 hover:bg-indigo-200 rounded-full transition-colors"
                        >
                          <i className="ri-close-line text-[10px]" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Steps */}
            <div>
              <label className={labelCls}>Steps <span className="text-red-400">*</span></label>
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <StepEditor steps={steps} onChange={setSteps} />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            {isEdit && usageCount > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <i className="ri-information-line text-sm flex-shrink-0 mt-0.5" />
                <span>This shared step is used by <strong>{usageCount} test case{usageCount !== 1 ? 's' : ''}</strong>. Changes will be reflected immediately.</span>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F1F5F9', flexShrink: 0 }} className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>

      {/* Bulk TC update dialog */}
      {showBulkUpdate && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1100 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '560px', maxWidth: 'calc(100vw - 2rem)', maxHeight: '80vh',
            background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            zIndex: 1101, display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-refresh-line text-amber-600 text-base" />
                </div>
                <h2 className="text-sm font-semibold text-slate-800">
                  {usageTCs.length} test case{usageTCs.length !== 1 ? 's' : ''} using this shared step
                </h2>
              </div>
              <p className="text-xs text-slate-500 ml-10">
                Select which test cases to update to v{savedNewVersion}. Others will keep their current pinned version and show an ↑ indicator.
              </p>
            </div>

            {/* TC list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem' }}>
              {/* Select all */}
              <label className="flex items-center gap-2 py-2 border-b border-slate-100 cursor-pointer mb-1">
                <input
                  type="checkbox"
                  checked={selectedTCIds.size === usageTCs.length}
                  onChange={e => setSelectedTCIds(e.target.checked ? new Set(usageTCs.map(t => t.test_case_id)) : new Set())}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="text-xs font-semibold text-slate-600">Select all</span>
              </label>
              <div className="space-y-1">
                {usageTCs.map(tc => (
                  <label key={tc.test_case_id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTCIds.has(tc.test_case_id)}
                      onChange={e => {
                        const next = new Set(selectedTCIds);
                        if (e.target.checked) next.add(tc.test_case_id);
                        else next.delete(tc.test_case_id);
                        setSelectedTCIds(next);
                      }}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-[0.65rem] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded flex-shrink-0">
                      {tc.custom_id}
                    </span>
                    <span className="text-xs text-slate-700 flex-1 truncate">{tc.title}</span>
                    <span className="text-[0.65rem] text-slate-400 flex-shrink-0">v{tc.linked_version}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F1F5F9' }} className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSkipBulkUpdate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Update later
              </button>
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={bulkUpdating || selectedTCIds.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {bulkUpdating ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-refresh-line" />}
                {bulkUpdating ? 'Updating…' : `Update ${selectedTCIds.size} TC${selectedTCIds.size !== 1 ? 's' : ''} to v${savedNewVersion}`}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
