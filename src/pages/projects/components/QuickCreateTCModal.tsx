import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { markOnboardingStep } from '../../../lib/onboardingMarker';

interface QuickCreateTCModalProps {
  /** Empty string / undefined = no project exists → show no-project state */
  projectId?: string;
  projectName?: string;
  onClose: () => void;
  /** Called after successful creation — parent should navigate + toast */
  onCreated: (projectId: string, title: string) => void;
  /** Called when user clicks "Create Project" in the no-project state */
  onCreateProject?: () => void;
}

const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

/** Shared input/select styling per design */
const fieldCls = `
  w-full bg-white border border-slate-200 rounded-[7px] text-[0.8125rem] text-slate-800
  px-[0.6875rem] py-[0.4375rem]
  focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]
  transition-colors
`.replace(/\s+/g, ' ').trim();

const fieldClsRO = `
  w-full bg-slate-50 border border-slate-200 rounded-[7px] text-[0.8125rem] text-slate-500
  px-[0.6875rem] py-[0.4375rem] cursor-default select-none
`.replace(/\s+/g, ' ').trim();

const labelCls = 'block text-[0.6875rem] font-semibold text-gray-700 mb-[0.25rem]';

export default function QuickCreateTCModal({
  projectId,
  projectName,
  onClose,
  onCreated,
  onCreateProject,
}: QuickCreateTCModalProps) {
  const hasProject = !!(projectId && projectId.trim());

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [type, setType] = useState<'manual' | 'automated'>('manual');
  const [folder, setFolder] = useState('');
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [titleError, setTitleError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Auto-focus title when project exists
  useEffect(() => {
    if (hasProject) titleRef.current?.focus();
  }, [hasProject]);

  // Fetch folders when project is available
  useEffect(() => {
    if (!hasProject) return;
    supabase
      .from('folders')
      .select('id, name')
      .eq('project_id', projectId!)
      .order('created_at', { ascending: true })
      .then(({ data }) => setFolders(data || []));
  }, [projectId, hasProject]);

  // ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });

  const handleClose = () => {
    if (hasProject && title.trim()) {
      if (!window.confirm('Discard changes?')) return;
    }
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setTitleError('Title is required');
      titleRef.current?.focus();
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setTitleError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: projectData } = await supabase
        .from('projects')
        .select('prefix')
        .eq('id', projectId!)
        .maybeSingle();

      let custom_id: string | undefined;
      if (projectData?.prefix) {
        const { data: existingCases } = await supabase
          .from('test_cases')
          .select('custom_id')
          .eq('project_id', projectId!)
          .not('custom_id', 'is', null);

        let maxNum = 0;
        (existingCases || []).forEach((tc: any) => {
          const match = tc.custom_id?.match(/-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        custom_id = `${projectData.prefix}-${maxNum + 1}`;
      }

      const { error } = await supabase.from('test_cases').insert([{
        project_id: projectId!,
        title: title.trim(),
        priority,
        folder: folder || null,
        status: 'untested',
        lifecycle_status: 'draft',
        is_automated: type === 'automated',
        created_by: user?.id,
        ...(custom_id ? { custom_id } : {}),
      }]);

      if (error) throw error;

      void markOnboardingStep('createTestcase');
      onCreated(projectId!, title.trim());
    } catch (e) {
      console.error('Quick create TC error:', e);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      style={{ background: 'rgba(15,23,42,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="bg-white w-full mx-4 flex flex-col"
        style={{
          maxWidth: '540px',
          borderRadius: '0.75rem',
          boxShadow: '0 20px 40px -12px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #E2E8F0' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center"
              style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', background: '#EEF2FF' }}
            >
              <i className="ri-file-add-line text-sm text-indigo-500"></i>
            </div>
            <span className="text-[0.9375rem] font-semibold text-slate-900">Create Test Case</span>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            style={{ width: '1.625rem', height: '1.625rem', borderRadius: '0.375rem', background: '#F1F5F9' }}
          >
            <i className="ri-close-line text-base"></i>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '1.125rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {!hasProject ? (
            /* ── No projects state ── */
            <div
              className="flex items-start gap-2.5"
              style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '0.625rem',
                padding: '1rem',
              }}
            >
              <i className="ri-error-warning-line text-[1.125rem] text-amber-400 flex-shrink-0 mt-px"></i>
              <div>
                <p className="text-[0.8125rem] font-semibold text-amber-800 mb-0.5">No project available</p>
                <p className="text-[0.6875rem] text-yellow-700 leading-snug">
                  You need a project before creating a test case. Create your first project to get started.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Project (read-only) */}
              <div>
                <label className={labelCls}>Project</label>
                <div className={fieldClsRO}>{projectName}</div>
              </div>

              {/* Title */}
              <div>
                <label className={labelCls}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                  placeholder="e.g. Login functionality test"
                  className={`${fieldCls} ${titleError ? '!border-red-400 !shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : ''}`}
                />
                {titleError && (
                  <p className="text-[0.625rem] text-red-500 mt-1">{titleError}</p>
                )}
              </div>

              {/* Folder */}
              <div>
                <label className={labelCls}>
                  Folder <span className="text-[0.625rem] font-normal text-slate-400">(optional)</span>
                </label>
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className={`${fieldCls} cursor-pointer`}
                >
                  <option value="">No folder</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Priority + Type */}
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <div style={{ flex: 1 }}>
                  <label className={labelCls}>Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className={`${fieldCls} cursor-pointer`}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className={labelCls}>Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'manual' | 'automated')}
                    className={`${fieldCls} cursor-pointer`}
                  >
                    <option value="manual">Manual</option>
                    <option value="automated">Automated</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-end gap-2"
          style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #E2E8F0' }}
        >
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer transition-colors"
            style={{ padding: '0.4375rem 0.875rem', borderRadius: '0.4375rem', fontSize: '0.8125rem' }}
          >
            Cancel
          </button>
          {!hasProject ? (
            <button
              onClick={() => { onClose(); onCreateProject?.(); }}
              className="flex items-center gap-1.5 font-semibold text-white bg-indigo-500 hover:bg-indigo-600 cursor-pointer transition-colors"
              style={{ padding: '0.4375rem 0.875rem', borderRadius: '0.4375rem', fontSize: '0.8125rem' }}
            >
              <i className="ri-folder-add-line text-sm"></i>
              Create Project
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 font-semibold text-white bg-indigo-500 hover:bg-indigo-600 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ padding: '0.4375rem 0.875rem', borderRadius: '0.4375rem', fontSize: '0.8125rem' }}
            >
              {submitting
                ? <i className="ri-loader-4-line animate-spin text-sm"></i>
                : <i className="ri-add-line text-sm"></i>
              }
              {submitting ? 'Creating...' : 'Create'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
