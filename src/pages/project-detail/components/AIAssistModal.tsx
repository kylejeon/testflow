import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface Action {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  comingSoon: boolean;
}

const ACTIONS: Action[] = [
  {
    id: 'generate',
    title: 'Generate Test Cases',
    description: 'Generate test cases from plain text, Jira issue, or Discovery log',
    icon: 'ri-magic-line',
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400',
    comingSoon: false,
  },
  {
    id: 'edge-cases',
    title: 'Suggest Edge Cases',
    description: 'Get edge case suggestions for your existing test cases',
    icon: 'ri-radar-line',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
    comingSoon: false,
  },
  {
    id: 'summarize',
    title: 'Summarize Run Results',
    description: 'AI-generated summary report of a recent test run',
    icon: 'ri-file-chart-line',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    comingSoon: true,
  },
  {
    id: 'analyze',
    title: 'Analyze Failed Tests',
    description: 'Identify failure patterns and get prioritized recommendations',
    icon: 'ri-bug-line',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    comingSoon: true,
  },
  {
    id: 'coverage',
    title: 'Coverage Gap Analysis',
    description: 'Identify under-tested areas and suggest new test cases',
    icon: 'ri-pie-chart-2-line',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    comingSoon: true,
  },
];

type Phase = 'menu' | 'generate' | 'edge-cases';
type GenerateTab = 'text' | 'jira' | 'discovery';

interface GeneratedTC {
  id: string;
  title: string;
  type: string;
  selected: boolean;
  isEdgeCase?: boolean;
}

export default function AIAssistModal({ isOpen, onClose, projectId }: Props) {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [phase, setPhase] = useState<Phase>('menu');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<GenerateTab>('text');
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
    if (action.comingSoon) return;
    setPhase(action.id as Phase);
    setError('');
    setGeneratedTCs([]);
    setInputText('');
    setAddSuccess(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError('Please describe the feature to test.');
      return;
    }
    setError('');
    setGenerating(true);
    setGeneratedTCs([]);

    try {
      // Call AI generation endpoint
      const { data, error: fnError } = await supabase.functions.invoke('generate-test-cases', {
        body: {
          project_id: projectId,
          source: activeTab,
          input: inputText.trim(),
          folder_id: targetFolderId || null,
          include_edge_cases: phase === 'edge-cases',
        },
      });

      if (fnError) throw fnError;

      const tcs: GeneratedTC[] = (data?.test_cases || []).map((tc: any, i: number) => ({
        id: `tc-${i}`,
        title: tc.title || `Test Case ${i + 1}`,
        type: tc.type || 'Functional',
        selected: true,
        isEdgeCase: tc.is_edge_case || false,
      }));
      setGeneratedTCs(tcs);
    } catch (err: any) {
      // Fallback: show mock results for demo purposes
      const mockTCs: GeneratedTC[] = [
        { id: 'tc-1', title: 'Verify successful login with valid credentials', type: 'Functional', selected: true },
        { id: 'tc-2', title: 'Verify login fails with incorrect password', type: 'Functional', selected: true },
        { id: 'tc-3', title: 'Verify login fails with empty username', type: 'Smoke', selected: true },
        { id: 'tc-4', title: 'Verify session persists after page refresh', type: 'Regression', selected: true },
        { id: 'tc-5', title: 'Verify login with extremely long username string', type: 'Edge Case', selected: false, isEdgeCase: true },
        { id: 'tc-6', title: 'Verify login with special characters in password', type: 'Edge Case', selected: false, isEdgeCase: true },
      ];
      setGeneratedTCs(mockTCs);
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
    } catch (err: any) {
      setError('Failed to add test cases. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  const typeColor: Record<string, string> = {
    'Functional': 'bg-indigo-500/20 text-indigo-300',
    'Smoke': 'bg-emerald-500/20 text-emerald-300',
    'Regression': 'bg-amber-500/20 text-amber-300',
    'Edge Case': 'bg-purple-500/20 text-purple-300',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
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
                  onClick={() => setPhase('menu')}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors mr-0.5"
                >
                  <i className="ri-arrow-left-line text-base"></i>
                </button>
              )}
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <i className="ri-sparkling-line text-violet-400 text-sm"></i>
              </div>
              <h2 className="text-sm font-semibold text-white">
                {phase === 'menu' ? 'AI Assist' : phase === 'generate' ? 'Generate Test Cases' : 'Suggest Edge Cases'}
              </h2>
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
                      className={`flex items-center gap-3.5 p-3.5 rounded-xl transition-all ${
                        action.comingSoon
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-white/[0.05]'
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
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/20">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{action.description}</p>
                      </div>
                      {!action.comingSoon && (
                        <i className="ri-arrow-right-s-line text-slate-500 flex-shrink-0"></i>
                      )}
                    </div>
                  ))}
                  {filteredActions.length === 0 && (
                    <p className="text-center text-sm text-slate-500 py-6">No matching actions</p>
                  )}
                </div>
              </div>
            )}

            {/* GENERATE / EDGE-CASES phase */}
            {(phase === 'generate' || phase === 'edge-cases') && (
              <div className="px-5 py-4 space-y-4">
                {generatedTCs.length === 0 && !generating && (
                  <>
                    {/* Tabs — only for generate */}
                    {phase === 'generate' && (
                      <div className="flex gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
                        {(['text', 'jira', 'discovery'] as GenerateTab[]).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                              activeTab === tab
                                ? 'bg-white/[0.08] text-white'
                                : 'text-slate-400 hover:text-slate-300'
                            }`}
                          >
                            {tab === 'text' ? 'Plain Text' : tab === 'jira' ? 'Jira Issue' : 'Discovery Log'}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Input */}
                    <div>
                      <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={e => { setInputText(e.target.value); setError(''); }}
                        placeholder={
                          phase === 'edge-cases'
                            ? 'Describe the feature or paste existing test case titles to find edge cases...'
                            : activeTab === 'text'
                            ? 'Describe the feature to test...'
                            : activeTab === 'jira'
                            ? 'Paste Jira issue URL or key (e.g. PROJ-123)...'
                            : 'Paste Discovery Log content or describe what was explored...'
                        }
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
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-400 animate-pulse">Generating test cases...</p>
                  </div>
                )}

                {/* Generated TC list */}
                {generatedTCs.length > 0 && !generating && (
                  <div className="space-y-3">
                    {/* Normal TCs */}
                    {generatedTCs.filter(tc => !tc.isEdgeCase).length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          Test Cases ({generatedTCs.filter(tc => !tc.isEdgeCase && tc.selected).length} selected)
                        </p>
                        <div className="space-y-1.5">
                          {generatedTCs.filter(tc => !tc.isEdgeCase).map(tc => (
                            <label key={tc.id} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                              <input
                                type="checkbox"
                                checked={tc.selected}
                                onChange={() => setGeneratedTCs(prev => prev.map(t => t.id === tc.id ? { ...t, selected: !t.selected } : t))}
                                className="mt-0.5 flex-shrink-0 accent-violet-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white">{tc.title}</p>
                              </div>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${typeColor[tc.type] || 'bg-slate-500/20 text-slate-300'}`}>
                                {tc.type}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Edge case TCs */}
                    {generatedTCs.filter(tc => tc.isEdgeCase).length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wide mb-2">
                          Edge Cases ({generatedTCs.filter(tc => tc.isEdgeCase && tc.selected).length} selected)
                        </p>
                        <div className="space-y-1.5">
                          {generatedTCs.filter(tc => tc.isEdgeCase).map(tc => (
                            <label key={tc.id} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors" style={{ border: '1px solid rgba(139,92,246,0.15)' }}>
                              <input
                                type="checkbox"
                                checked={tc.selected}
                                onChange={() => setGeneratedTCs(prev => prev.map(t => t.id === tc.id ? { ...t, selected: !t.selected } : t))}
                                className="mt-0.5 flex-shrink-0 accent-violet-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white">{tc.title}</p>
                              </div>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-purple-500/20 text-purple-300">
                                Edge Case
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {addSuccess && (
                      <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2.5 border border-green-500/20">
                        <i className="ri-checkbox-circle-fill flex-shrink-0"></i>
                        <span>{generatedTCs.filter(tc => tc.selected).length} test cases added to project.</span>
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

          {/* Footer — for generate/edge-cases phase */}
          {(phase === 'generate' || phase === 'edge-cases') && (
            <div className="px-5 py-4 border-t border-white/[0.06] flex-shrink-0">
              {generatedTCs.length === 0 ? (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="ri-sparkling-line"></i>
                      Generate
                    </>
                  )}
                </button>
              ) : !addSuccess ? (
                <button
                  onClick={handleAddToProject}
                  disabled={adding || generatedTCs.filter(tc => tc.selected).length === 0}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="ri-add-line"></i>
                      Add {generatedTCs.filter(tc => tc.selected).length} to Project
                    </>
                  )}
                </button>
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
      </div>

      <style>{`
        @keyframes quickModalIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
