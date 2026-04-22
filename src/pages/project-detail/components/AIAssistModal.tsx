import { useState, useEffect, useRef } from 'react';
import i18n from '../../../i18n';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ModalShell } from '../../../components/ModalShell';
import { normalizeLocale } from '../../../lib/claudeLocale';
import { aiFetch } from '../../../lib/aiFetch';
import { showAiCreditToast } from '../../../lib/aiCreditToast';
import { useToast } from '../../../components/Toast';
import { useTranslation } from 'react-i18next';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onOpenGenerate: () => void;
}

interface Action {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  comingSoon: boolean;
  comingSoonFeatures?: { icon: string; iconColor: string; label: string }[];
  comingSoonDesc?: string;
}

const ACTIONS: Action[] = [
  {
    id: 'generate',
    title: 'Generate Test Cases',
    description: 'Auto-generate structured test cases from text, Jira issues, or discovery logs',
    icon: 'ri-magic-fill',
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400',
    comingSoon: false,
  },
  {
    id: 'edge-cases',
    title: 'Suggest Edge Cases',
    description: 'Discover boundary conditions and edge scenarios AI identifies',
    icon: 'ri-lightbulb-flash-fill',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
    comingSoon: false,
  },
];

type Phase = 'menu' | 'edge-cases';

interface GeneratedTC {
  id: string;
  title: string;
  description?: string;
  type: string;
  selected: boolean;
  isEdgeCase?: boolean;
}

export default function AIAssistModal({ isOpen, onClose, projectId, onOpenGenerate }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { showToast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [phase, setPhase] = useState<Phase>('menu');
  const [search, setSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [targetFolderId, setTargetFolderId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedTCs, setGeneratedTCs] = useState<GeneratedTC[]>([]);
  const [adding, setAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPhase('menu');
      setSearch('');
      setGeneratedTCs([]);
      setAddSuccess(false);
      setError('');
      fetchFolders();
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (phase !== 'menu') setPhase('menu');
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, phase, onClose]);

  const fetchFolders = async () => {
    const { data } = await supabase
      .from('folders')
      .select('id, name')
      .eq('project_id', projectId)
      .order('name');
    setFolders(data || []);
  };

  const filteredActions = ACTIONS.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleActionClick = (action: Action) => {
    if (action.id === 'generate') {
      // Delegate to AIGenerateModal
      onClose();
      onOpenGenerate();
      return;
    }
    if (action.comingSoon) {
      // Show Coming Soon phase
      setPhase(action.id as Phase);
      return;
    }
    setPhase(action.id as Phase);
    setError('');
    setGeneratedTCs([]);
    setInputText('');
    setAddSuccess(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError('Please describe the feature to analyze for edge cases.');
      return;
    }
    setError('');
    setGenerating(true);
    setGeneratedTCs([]);

    try {
      const resp = await aiFetch('generate-testcases', {
        project_id: projectId,
        source: 'text',
        input: inputText.trim(),
        folder_id: targetFolderId || null,
        include_edge_cases: true,
        locale: normalizeLocale(i18n.language), // f021
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

      const tcs: GeneratedTC[] = (data?.test_cases || []).map((tc: any, i: number) => ({
        id: `tc-${i}`,
        title: tc.title || `Edge Case ${i + 1}`,
        description: tc.description || '',
        type: tc.type || 'Edge Case',
        selected: true,
        isEdgeCase: true,
      }));
      setGeneratedTCs(tcs);
      showAiCreditToast(showToast, t, data);
    } catch {
      setError('Failed to generate edge cases. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddToProject = async () => {
    const selected = generatedTCs.filter(tc => tc.selected);
    if (selected.length === 0) return;

    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const folder = folders.find(f => f.id === targetFolderId);

      const { data: inserted, error: insertError } = await supabase
        .from('test_cases')
        .insert(
          selected.map(tc => ({
            project_id: projectId,
            title: tc.title,
            priority: 'medium',
            status: 'untested',
            folder: folder?.name || null,
            created_by: user?.id || null,
            is_automated: false,
          }))
        )
        .select('id');

      if (insertError) throw insertError;

      if (inserted && user) {
        await supabase.from('test_case_history').insert(
          inserted.map((tc: { id: string }) => ({
            test_case_id: tc.id,
            user_id: user.id,
            action_type: 'created',
          }))
        );
      }

      setAddSuccess(true);
    } catch {
      setError('Failed to add test cases. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  const currentAction = ACTIONS.find(a => a.id === phase);
  const isComingSoonPhase = phase !== 'menu' && phase !== 'edge-cases' && currentAction?.comingSoon;

  const phaseTitle = phase === 'menu'
    ? 'AI Assist'
    : currentAction?.title || 'AI Assist';

  return (
    <ModalShell onClose={onClose}>
      {/* Modal */}
      <div
        className="relative flex flex-col w-full"
        style={{
          maxWidth: 520,
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
              {phase !== 'menu' && (
                <button
                  onClick={() => { setPhase('menu'); setGeneratedTCs([]); setError(''); setAddSuccess(false); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors mr-0.5"
                >
                  <i className="ri-arrow-left-line text-base"></i>
                </button>
              )}
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <i className="ri-sparkling-line text-violet-400 text-sm"></i>
              </div>
              <h2 className="text-sm font-semibold text-white">{phaseTitle}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <i className="ri-close-line text-base"></i>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {/* MENU phase */}
            {phase === 'menu' && (
              <div className="px-4 py-3">
                {/* Search */}
                <div className="relative mb-3">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search AI actions..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:bg-white/[0.06] transition-all"
                  />
                </div>

                {/* Action list */}
                <div className="space-y-1.5">
                  {filteredActions.map(action => (
                    <div
                      key={action.id}
                      onClick={() => handleActionClick(action)}
                      className={`flex items-center gap-3.5 p-3.5 rounded-xl transition-all cursor-pointer ${
                        action.comingSoon
                          ? 'opacity-70 hover:bg-white/[0.03]'
                          : 'hover:bg-white/[0.05]'
                      }`}
                      style={{ border: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${action.iconBg}`}>
                        <i className={`${action.icon} text-base ${action.iconColor}`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{action.title}</p>
                          {action.comingSoon && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 uppercase tracking-wider">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{action.description}</p>
                      </div>
                      <i className="ri-arrow-right-s-line text-slate-500 flex-shrink-0"></i>
                    </div>
                  ))}
                  {filteredActions.length === 0 && (
                    <p className="text-center text-sm text-slate-500 py-6">No matching actions</p>
                  )}
                </div>
              </div>
            )}

            {/* COMING SOON phase */}
            {isComingSoonPhase && currentAction && (
              <div className="px-5 py-6">
                <div className="text-center">
                  <div className={`w-14 h-14 rounded-2xl ${currentAction.iconBg} flex items-center justify-center mx-auto mb-3`}>
                    <i className={`${currentAction.icon} text-2xl ${currentAction.iconColor}`}></i>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">{currentAction.title}</h3>
                  <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded bg-amber-500/15 text-amber-400 uppercase tracking-wider mb-3">
                    Coming Soon
                  </span>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto mb-5">
                    {currentAction.comingSoonDesc}
                  </p>

                  {currentAction.comingSoonFeatures && (
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-left max-w-xs mx-auto">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2.5">What you'll get:</p>
                      <div className="space-y-2">
                        {currentAction.comingSoonFeatures.map(f => (
                          <div key={f.label} className="flex items-center gap-2.5 text-sm text-slate-300">
                            <i className={`${f.icon} ${f.iconColor} text-sm`}></i>
                            <span>{f.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EDGE-CASES phase */}
            {phase === 'edge-cases' && (
              <div className="px-5 py-4 space-y-4">
                {generatedTCs.length === 0 && !generating && (
                  <>
                    {/* Phase header */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <i className="ri-lightbulb-flash-fill text-violet-400 text-base"></i>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Suggest Edge Cases</p>
                        <p className="text-[11px] text-slate-500">Describe a feature or paste existing TC titles</p>
                      </div>
                    </div>

                    {/* Input */}
                    <div>
                      <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={e => { setInputText(e.target.value); setError(''); }}
                        placeholder="Describe the feature or paste test case titles to analyze for edge cases...&#10;&#10;Example: User login with email/password, Google SSO, magic link..."
                        rows={5}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:bg-white/[0.06] transition-all resize-none"
                      />
                      {error && (
                        <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                          <i className="ri-error-warning-line"></i>
                          {error}
                        </p>
                      )}
                    </div>

                    {/* Target folder */}
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                        Target Folder
                      </label>
                      <select
                        value={targetFolderId}
                        onChange={e => setTargetFolderId(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 focus:bg-white/[0.06] transition-all appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                      >
                        <option value="" style={{ background: '#0F172A' }}>Root (no folder)</option>
                        {folders.map(f => (
                          <option key={f.id} value={f.id} style={{ background: '#0F172A' }}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Generating spinner */}
                {generating && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <i className="ri-loader-4-line animate-spin text-2xl text-violet-500" />
                    <p className="text-sm text-slate-400 animate-pulse">Analyzing for edge cases...</p>
                  </div>
                )}

                {/* Generated edge case list */}
                {generatedTCs.length > 0 && !generating && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <i className="ri-lightbulb-line text-violet-400 text-sm"></i>
                      <p className="text-xs font-semibold text-slate-300">
                        {generatedTCs.length} edge cases identified
                      </p>
                      <span className="ml-auto text-[11px] text-slate-500">Select to add to project</span>
                    </div>

                    <div className="space-y-2">
                      {generatedTCs.map(tc => (
                        <label
                          key={tc.id}
                          className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors"
                          style={{ border: '1px solid rgba(139,92,246,0.15)', background: tc.selected ? 'rgba(139,92,246,0.06)' : 'transparent' }}
                        >
                          <input
                            type="checkbox"
                            checked={tc.selected}
                            onChange={() => setGeneratedTCs(prev => prev.map(t => t.id === tc.id ? { ...t, selected: !t.selected } : t))}
                            className="mt-0.5 flex-shrink-0 accent-violet-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium">{tc.title}</p>
                            {tc.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{tc.description}</p>
                            )}
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 uppercase tracking-wider flex-shrink-0">
                            Edge Case
                          </span>
                        </label>
                      ))}
                    </div>

                    {addSuccess && (
                      <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2.5 border border-green-500/20">
                        <i className="ri-checkbox-circle-fill flex-shrink-0"></i>
                        <span>{generatedTCs.filter(tc => tc.selected).length} edge cases added to project.</span>
                        <button
                          onClick={() => { navigate(`/projects/${projectId}/testcases`); onClose(); }}
                          className="ml-auto text-green-400 hover:text-green-300 font-semibold"
                        >
                          View
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {phase === 'menu' && (
            <div className="px-5 py-3 border-t border-white/[0.06] flex-shrink-0 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <i className="ri-sparkling-line text-violet-400"></i>
                AI Assist
              </span>
              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {isComingSoonPhase && (
            <div className="px-5 py-3 border-t border-white/[0.06] flex-shrink-0 flex items-center justify-end">
              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-all"
              >
                Close
              </button>
            </div>
          )}

          {phase === 'edge-cases' && (
            <div className="px-5 py-4 border-t border-white/[0.06] flex-shrink-0">
              {generatedTCs.length === 0 ? (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-sm" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <i className="ri-sparkling-2-fill"></i>
                      Suggest Edge Cases
                    </>
                  )}
                </button>
              ) : !addSuccess ? (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {generatedTCs.filter(tc => tc.selected).length} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddToProject}
                      disabled={adding || generatedTCs.filter(tc => tc.selected).length === 0}
                      className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {adding ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-sm" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <i className="ri-add-line"></i>
                          Add {generatedTCs.filter(tc => tc.selected).length} to Project
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all"
                >
                  Done
                </button>
              )}
            </div>
          )}
        </div>

      <style>{`
        @keyframes quickModalIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ModalShell>
  );
}
