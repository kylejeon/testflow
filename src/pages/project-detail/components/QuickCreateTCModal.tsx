import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ModalShell } from '../../../components/ModalShell';

interface Folder {
  id: string;
  name: string;
  icon: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface Toast {
  id: string;
  title: string;
  tcId?: string;
}

export default function QuickCreateTCModal({ isOpen, onClose, projectId }: Props) {
  const navigate = useNavigate();
  const titleRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [type, setType] = useState<'functional' | 'smoke' | 'regression' | 'edge_case'>('functional');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      setTimeout(() => titleRef.current?.focus(), 50);
    } else {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    setIsDirty(title.trim().length > 0);
  }, [title]);

  const fetchFolders = async () => {
    const { data } = await supabase
      .from('folders')
      .select('id, name, icon')
      .eq('project_id', projectId)
      .order('name');
    setFolders(data || []);
  };

  const resetForm = (keepSticky = false) => {
    setTitle('');
    setTitleError(false);
    setError('');
    setIsDirty(false);
    if (!keepSticky) {
      setFolderId('');
      setPriority('medium');
      setType('functional');
      setShowMoreOptions(false);
    }
  };

  const addToast = (title: string, tcId?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, tcId }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleCreate = useCallback(async (andClose = false, andCreateAnother = false) => {
    if (!title.trim()) {
      setTitleError(true);
      titleRef.current?.focus();
      return;
    }
    setTitleError(false);
    setError('');
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const folder = folders.find(f => f.id === folderId);

      const { data, error: insertError } = await supabase
        .from('test_cases')
        .insert({
          project_id: projectId,
          title: title.trim(),
          priority,
          status: 'untested',
          folder: folder?.name || null,
          created_by: user?.id || null,
          is_automated: false,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (data && user) {
        await supabase.from('test_case_history').insert({
          test_case_id: data.id,
          user_id: user.id,
          action_type: 'created',
        });
      }

      addToast(title.trim(), data?.id);

      if (andClose) {
        onClose();
      } else if (andCreateAnother) {
        resetForm(true);
        setTimeout(() => titleRef.current?.focus(), 50);
      } else {
        resetForm(true);
        setTimeout(() => titleRef.current?.focus(), 50);
      }
    } catch (err: any) {
      setError('Failed to create. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [title, folderId, folders, priority, projectId, onClose]);

  const requestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      }
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'SELECT' || target.tagName === 'BUTTON') return;
        if (target === titleRef.current) {
          e.preventDefault();
          handleCreate(false, false);
        }
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleCreate(true, false);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleCreate(false, true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, handleCreate, isDirty]);

  if (!isOpen) {
    return (
      <>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slide-up"
            style={{ animation: 'slideUp 0.2s ease-out' }}
          >
            <i className="ri-checkbox-circle-fill text-green-400 text-base"></i>
            <span>"{toast.title}" created</span>
            {toast.tcId && (
              <button
                onClick={() => navigate(`/projects/${projectId}/testcases`)}
                className="text-indigo-400 hover:text-indigo-300 font-semibold ml-1"
              >
                View
              </button>
            )}
          </div>
        ))}
      </>
    );
  }

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-slate-500 bg-slate-100' },
    { value: 'medium', label: 'Medium', color: 'text-amber-600 bg-amber-50' },
    { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-50' },
    { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-50' },
  ];

  const typeOptions = [
    { value: 'functional', label: 'Functional', color: 'text-indigo-600 bg-indigo-50' },
    { value: 'smoke', label: 'Smoke', color: 'text-emerald-600 bg-emerald-50' },
    { value: 'regression', label: 'Regression', color: 'text-amber-600 bg-amber-50' },
    { value: 'edge_case', label: 'Edge Case', color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <>
    <ModalShell onClose={requestClose}>
      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full flex flex-col"
        style={{
          maxWidth: 480,
          maxHeight: '80vh',
          background: 'rgba(15,23,42,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          animation: 'quickModalIn 0.2s ease-out',
          color: '#F1F5F9',
        }}
        onClick={e => e.stopPropagation()}
      >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <i className="ri-file-add-line text-indigo-400 text-sm"></i>
              </div>
              <h2 className="text-sm font-semibold text-white">New Test Case</h2>
            </div>
            <button
              onClick={requestClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <i className="ri-close-line text-base"></i>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {/* Title */}
            <div>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); setTitleError(false); }}
                placeholder="Test case title..."
                className={`w-full bg-white/[0.04] border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                  titleError
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-white/[0.08] focus:border-indigo-500 focus:bg-white/[0.06]'
                }`}
              />
              {titleError && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <i className="ri-error-warning-line"></i>
                  Title is required
                </p>
              )}
            </div>

            {/* Folder */}
            <div>
              <select
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500 focus:bg-white/[0.06] transition-all appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                <option value="" style={{ background: '#0F172A' }}>No folder (root)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id} style={{ background: '#0F172A' }}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* More options toggle */}
            <button
              type="button"
              onClick={() => setShowMoreOptions(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              <i className={`ri-arrow-${showMoreOptions ? 'up' : 'down'}-s-line text-sm`}></i>
              {showMoreOptions ? 'Hide options' : 'More options'}
            </button>

            {showMoreOptions && (
              <div className="space-y-3 pt-1">
                {/* Priority */}
                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1.5">Priority</label>
                  <div className="flex flex-wrap gap-1.5">
                    {priorityOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value as any)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                          priority === opt.value
                            ? `${opt.color} border-transparent ring-1 ring-indigo-500`
                            : 'text-slate-400 bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1.5">Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {typeOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value as any)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                          type === opt.value
                            ? `${opt.color} border-transparent ring-1 ring-indigo-500`
                            : 'text-slate-400 bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2.5 border border-red-500/20">
                <i className="ri-error-warning-line flex-shrink-0"></i>
                <span>{error}</span>
                <button
                  onClick={() => handleCreate()}
                  className="ml-auto text-red-400 hover:text-red-300 font-semibold"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06] flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}/testcases`)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              Open Full Editor
              <i className="ri-arrow-right-line text-xs"></i>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCreate(false, true)}
                disabled={submitting}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-white/[0.05] border border-white/[0.08] rounded-lg hover:bg-white/[0.09] transition-all disabled:opacity-40"
              >
                Create Another
              </button>
              <button
                type="button"
                onClick={() => handleCreate(true)}
                disabled={submitting}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-all disabled:opacity-40 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>
    </ModalShell>

    {/* Discard confirm */}
      {showDiscardConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="p-5 rounded-xl text-white"
            style={{
              maxWidth: 320,
              background: 'rgba(15,23,42,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <h3 className="font-semibold text-sm mb-1">Discard draft?</h3>
            <p className="text-xs text-slate-400 mb-4">Your changes will be lost.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDiscardConfirm(false); onClose(); }}
                className="flex-1 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 py-2 text-xs font-medium text-slate-300 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.10] transition-colors"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium pointer-events-auto"
            style={{ animation: 'slideUp 0.2s ease-out' }}
          >
            <i className="ri-checkbox-circle-fill text-green-400 text-base flex-shrink-0"></i>
            <span className="max-w-[200px] truncate">"{toast.title}" created</span>
            {toast.tcId && (
              <button
                onClick={() => navigate(`/projects/${projectId}/testcases`)}
                className="text-indigo-400 hover:text-indigo-300 font-semibold ml-1"
              >
                View
              </button>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes quickModalIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
