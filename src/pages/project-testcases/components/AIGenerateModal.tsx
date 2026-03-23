import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Session {
  id: string;
  name: string;
  mission: string;
  status: string;
  created_at: string;
}

interface GeneratedCase {
  title: string;
  description: string;
  precondition: string;
  steps: string[];
  expected_result: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface AIGenerateModalProps {
  projectId: string;
  subscriptionTier: number;
  onSave: (cases: GeneratedCase[]) => Promise<void>;
  onClose: () => void;
}

// 플랜 정보
const PLAN_INFO: Record<number, { name: string; monthlyLimit: number; sessionMode: boolean }> = {
  1: { name: 'Free', monthlyLimit: 5, sessionMode: false },
  2: { name: 'Starter', monthlyLimit: 30, sessionMode: false },
  3: { name: 'Professional', monthlyLimit: 150, sessionMode: true },
  4: { name: 'Enterprise', monthlyLimit: -1, sessionMode: true },
};

type Step = 'mode' | 'input' | 'titles' | 'details' | 'saving';

export default function AIGenerateModal({
  projectId,
  subscriptionTier,
  onSave,
  onClose,
}: AIGenerateModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('mode');
  const [mode, setMode] = useState<'text' | 'session'>('text');
  const [inputText, setInputText] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set());

  const [generatedCases, setGeneratedCases] = useState<GeneratedCase[]>([]);
  const [selectedCaseIndices, setSelectedCaseIndices] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);

  const planInfo = PLAN_INFO[subscriptionTier] || PLAN_INFO[1];

  // 당월 사용량 조회
  useEffect(() => {
    fetchMonthlyUsage();
  }, []);

  const fetchMonthlyUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('ai_generation_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('step', 1)
        .gte('created_at', startOfMonth.toISOString());

      setMonthlyUsage(count || 0);
    } catch {
      // silent
    } finally {
      setUsageLoaded(true);
    }
  };

  // 세션 목록 조회 (Session 모드 선택 시)
  useEffect(() => {
    if (mode === 'session') fetchSessions();
  }, [mode]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data } = await supabase
        .from('sessions')
        .select('id, name, mission, status, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      setSessions(data || []);
    } catch {
      // silent
    } finally {
      setLoadingSessions(false);
    }
  };

  const callEdgeFunction = async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-testcases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  };

  // Step 1: 제목 생성
  const handleGenerateTitles = async () => {
    setError('');
    setLoading(true);
    try {
      const body: any = { project_id: projectId, mode, step: 1 };
      if (mode === 'text') body.input_text = inputText;
      else body.session_id = selectedSessionId;

      const data = await callEdgeFunction(body);
      setTitles(data.titles || []);
      setSelectedTitles(new Set(data.titles || [])); // 기본 전체 선택
      setCurrentStep('titles');
      setMonthlyUsage(prev => prev + 1);
    } catch (err: any) {
      if (err.message?.includes('limit')) {
        setError(`이번 달 AI 생성 한도(${planInfo.monthlyLimit}회)에 도달했습니다. 플랜을 업그레이드하세요.`);
      } else {
        setError(err.message || '생성 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: 상세 케이스 생성
  const handleGenerateDetails = async () => {
    setError('');
    setLoading(true);
    try {
      const selectedList = Array.from(selectedTitles);
      const data = await callEdgeFunction({
        project_id: projectId,
        mode,
        step: 2,
        selected_titles: selectedList,
      });
      const cases: GeneratedCase[] = data.cases || [];
      setGeneratedCases(cases);
      setSelectedCaseIndices(new Set(cases.map((_, i) => i))); // 기본 전체 선택
      setCurrentStep('details');
    } catch (err: any) {
      setError(err.message || '상세 케이스 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 선택한 케이스 저장
  const handleSave = async () => {
    setCurrentStep('saving');
    const casesToSave = generatedCases.filter((_, i) => selectedCaseIndices.has(i));
    try {
      await onSave(casesToSave);
      onClose();
    } catch (err: any) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
      setCurrentStep('details');
    }
  };

  const toggleTitle = (title: string) => {
    setSelectedTitles(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const toggleCase = (idx: number) => {
    setSelectedCaseIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const priorityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  };

  const limitReached = planInfo.monthlyLimit !== -1 && usageLoaded && monthlyUsage >= planInfo.monthlyLimit;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-teal-500 rounded-lg flex items-center justify-center">
              <i className="ri-sparkling-2-fill text-white text-sm"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">AI 테스트 케이스 생성</h2>
              <p className="text-xs text-gray-500">
                {usageLoaded && (
                  planInfo.monthlyLimit === -1
                    ? `${planInfo.name} · 무제한`
                    : `${planInfo.name} · 이번 달 ${monthlyUsage} / ${planInfo.monthlyLimit}회`
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
            <i className="ri-close-line text-gray-500 text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP: mode 선택 ── */}
          {currentStep === 'mode' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">테스트 케이스를 생성할 방식을 선택하세요.</p>
              <div className="grid grid-cols-2 gap-3">
                {/* Text 모드 */}
                <button
                  onClick={() => { setMode('text'); setCurrentStep('input'); }}
                  className="flex flex-col items-start p-4 border-2 border-gray-200 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer text-left group"
                  disabled={limitReached}
                >
                  <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-teal-200">
                    <i className="ri-text-snippet text-teal-600 text-lg"></i>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">텍스트 입력</p>
                  <p className="text-xs text-gray-500 mt-1">기능 설명을 입력하면 AI가 테스트 케이스를 생성합니다.</p>
                  <span className="mt-2 text-xs text-teal-600 font-medium">모든 플랜 사용 가능</span>
                </button>

                {/* Session 모드 */}
                <button
                  onClick={() => {
                    if (!planInfo.sessionMode) return;
                    setMode('session');
                    setCurrentStep('input');
                  }}
                  className={`flex flex-col items-start p-4 border-2 rounded-xl transition-all text-left group ${
                    planInfo.sessionMode
                      ? 'border-gray-200 hover:border-violet-400 hover:bg-violet-50 cursor-pointer'
                      : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                  disabled={!planInfo.sessionMode || limitReached}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${planInfo.sessionMode ? 'bg-violet-100 group-hover:bg-violet-200' : 'bg-gray-100'}`}>
                    <i className={`ri-play-circle-line text-lg ${planInfo.sessionMode ? 'text-violet-600' : 'text-gray-400'}`}></i>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">세션 기반 생성</p>
                  <p className="text-xs text-gray-500 mt-1">탐색 테스트 세션 기록을 분석해 자동으로 생성합니다.</p>
                  {planInfo.sessionMode ? (
                    <span className="mt-2 text-xs text-violet-600 font-medium">Professional+ 전용</span>
                  ) : (
                    <span className="mt-2 text-xs text-gray-400 font-medium flex items-center gap-1">
                      <i className="ri-lock-line"></i> Professional 이상 필요
                    </span>
                  )}
                </button>
              </div>

              {limitReached && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  <i className="ri-error-warning-line"></i>
                  이번 달 AI 생성 한도에 도달했습니다. 다음 달에 다시 시도하거나 플랜을 업그레이드하세요.
                </div>
              )}
            </div>
          )}

          {/* ── STEP: input ── */}
          {currentStep === 'input' && (
            <div className="space-y-4">
              <button
                onClick={() => setCurrentStep('mode')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <i className="ri-arrow-left-line"></i> 모드 선택으로
              </button>

              {mode === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    기능 설명 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="예: 사용자가 이메일과 비밀번호로 로그인하는 기능. 소셜 로그인(Google)도 지원하며, 비밀번호 찾기 기능이 있습니다..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">더 상세하게 설명할수록 더 정확한 테스트 케이스가 생성됩니다.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    세션 선택 <span className="text-red-500">*</span>
                  </label>
                  {loadingSessions ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                      <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      세션 불러오는 중...
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-400 border border-gray-200 rounded-lg">
                      이 프로젝트에 세션이 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {sessions.map(s => (
                        <label
                          key={s.id}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedSessionId === s.id ? 'bg-violet-50 border border-violet-200' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="radio"
                            name="session"
                            value={s.id}
                            checked={selectedSessionId === s.id}
                            onChange={() => setSelectedSessionId(s.id)}
                            className="mt-0.5 accent-violet-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                            {s.mission && <p className="text-xs text-gray-500 truncate">{s.mission}</p>}
                          </div>
                          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                            s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {s.status}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: titles 선택 ── */}
          {currentStep === 'titles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  AI가 생성한 테스트 케이스 제목입니다. 상세 생성할 항목을 선택하세요.
                </p>
                <button
                  onClick={() => {
                    if (selectedTitles.size === titles.length) {
                      setSelectedTitles(new Set());
                    } else {
                      setSelectedTitles(new Set(titles));
                    }
                  }}
                  className="text-xs text-teal-600 hover:text-teal-700 cursor-pointer whitespace-nowrap"
                >
                  {selectedTitles.size === titles.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="space-y-2">
                {titles.map((title, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTitles.has(title)
                        ? 'border-teal-300 bg-teal-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTitles.has(title)}
                      onChange={() => toggleTitle(title)}
                      className="accent-teal-600"
                    />
                    <span className="text-sm text-gray-800">{title}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400">{selectedTitles.size}개 선택됨</p>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: details ── */}
          {currentStep === 'details' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">저장할 테스트 케이스를 선택하세요.</p>
                <button
                  onClick={() => {
                    if (selectedCaseIndices.size === generatedCases.length) {
                      setSelectedCaseIndices(new Set());
                    } else {
                      setSelectedCaseIndices(new Set(generatedCases.map((_, i) => i)));
                    }
                  }}
                  className="text-xs text-teal-600 hover:text-teal-700 cursor-pointer whitespace-nowrap"
                >
                  {selectedCaseIndices.size === generatedCases.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>

              <div className="space-y-3">
                {generatedCases.map((tc, i) => (
                  <div
                    key={i}
                    onClick={() => toggleCase(i)}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedCaseIndices.has(i)
                        ? 'border-teal-300 bg-teal-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedCaseIndices.has(i)}
                        onChange={() => toggleCase(i)}
                        onClick={e => e.stopPropagation()}
                        className="accent-teal-600 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColors[tc.priority] || priorityColors.medium}`}>
                            {tc.priority}
                          </span>
                          <p className="text-sm font-semibold text-gray-900 truncate">{tc.title}</p>
                        </div>
                        {tc.description && (
                          <p className="text-xs text-gray-500 mb-2">{tc.description}</p>
                        )}
                        {tc.steps?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-600 mb-1">Steps ({tc.steps.length})</p>
                            <ol className="space-y-0.5">
                              {tc.steps.slice(0, 3).map((s, si) => (
                                <li key={si} className="text-xs text-gray-500 flex gap-1.5">
                                  <span className="shrink-0 font-medium text-gray-400">{si + 1}.</span>
                                  <span className="truncate">{s}</span>
                                </li>
                              ))}
                              {tc.steps.length > 3 && (
                                <li className="text-xs text-gray-400">+{tc.steps.length - 3}개 더...</li>
                              )}
                            </ol>
                          </div>
                        )}
                        {tc.expected_result && (
                          <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">
                            <span className="font-medium text-gray-600">Expected: </span>
                            {tc.expected_result}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400">{selectedCaseIndices.size}개 선택됨 · 저장 시 테스트 케이스 목록에 추가됩니다.</p>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: saving ── */}
          {currentStep === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600">테스트 케이스를 저장하는 중...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            취소
          </button>

          <div className="flex items-center gap-2">
            {/* Step 1: 제목 생성 버튼 */}
            {currentStep === 'input' && (
              <button
                onClick={handleGenerateTitles}
                disabled={
                  loading ||
                  (mode === 'text' ? !inputText.trim() : !selectedSessionId)
                }
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-500 to-teal-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    생성 중...
                  </>
                ) : (
                  <>
                    <i className="ri-sparkling-2-fill"></i>
                    제목 목록 생성
                  </>
                )}
              </button>
            )}

            {/* Step 2: 상세 생성 버튼 */}
            {currentStep === 'titles' && (
              <button
                onClick={handleGenerateDetails}
                disabled={loading || selectedTitles.size === 0}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-500 to-teal-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    생성 중...
                  </>
                ) : (
                  <>
                    <i className="ri-sparkling-2-fill"></i>
                    {selectedTitles.size}개 상세 생성
                  </>
                )}
              </button>
            )}

            {/* Step 3: 저장 버튼 */}
            {currentStep === 'details' && (
              <button
                onClick={handleSave}
                disabled={selectedCaseIndices.size === 0}
                className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="ri-save-line"></i>
                {selectedCaseIndices.size}개 저장
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
