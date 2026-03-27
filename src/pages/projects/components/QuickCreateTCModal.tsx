import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

interface QuickCreateTCModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  /** Called after successful creation — parent should navigate + toast */
  onCreated: (projectId: string, title: string) => void;
}

const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

export default function QuickCreateTCModal({
  projectId,
  projectName,
  onClose,
  onCreated,
}: QuickCreateTCModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [folder, setFolder] = useState('');
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [titleError, setTitleError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Auto-focus title on mount
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Fetch folders for the project
  useEffect(() => {
    supabase
      .from('folders')
      .select('id, name')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setFolders(data || []));
  }, [projectId]);

  // Close on ESC — confirm if title has input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });

  const handleClose = () => {
    if (title.trim()) {
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

      // Fetch project prefix for custom_id
      const { data: projectData } = await supabase
        .from('projects')
        .select('prefix')
        .eq('id', projectId)
        .maybeSingle();

      let custom_id: string | undefined;
      if (projectData?.prefix) {
        const { data: existingCases } = await supabase
          .from('test_cases')
          .select('custom_id')
          .eq('project_id', projectId)
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
        project_id: projectId,
        title: title.trim(),
        priority,
        folder: folder || null,
        status: 'untested',
        lifecycle_status: 'draft',
        is_automated: false,
        created_by: user?.id,
        ...(custom_id ? { custom_id } : {}),
      }]);

      if (error) throw error;

      onCreated(projectId, title.trim());
    } catch (e) {
      console.error('Quick create TC error:', e);
      // Don't close modal on error — let user retry
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Quick Create Test Case</h2>
            <p className="text-xs text-gray-500 mt-0.5">Project: <span className="font-medium text-gray-700">{projectName}</span></p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors p-1"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="Enter test case title"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${titleError ? 'border-red-400' : 'border-gray-300'}`}
            />
            {titleError && (
              <p className="text-xs text-red-500 mt-1">{titleError}</p>
            )}
          </div>

          {/* Priority + Folder row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {folders.length > 0 && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Folder <span className="text-gray-400 font-normal">(optional)</span></label>
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
                >
                  <option value="">No folder</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {submitting && <i className="ri-loader-4-line animate-spin text-sm"></i>}
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
