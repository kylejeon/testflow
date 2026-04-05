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
        const { error: err } = await supabase
          .from('shared_steps')
          .update({ ...payload, version: sharedStep.version + 1 })
          .eq('id', sharedStep.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('shared_steps')
          .insert({ ...payload, project_id: projectId, created_by: user.id });
        if (err) throw err;
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
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
    </>
  );
}
