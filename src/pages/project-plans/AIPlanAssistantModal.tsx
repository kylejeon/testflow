import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useAiFeature } from '../../hooks/useAiFeature';
import { normalizeLocale } from '../../lib/claudeLocale';
import { aiFetch } from '../../lib/aiFetch';
import { showAiCreditToast } from '../../lib/aiCreditToast';
import { useToast } from '../../components/Toast';

interface Milestone {
  id: string;
  name: string;
  status: string;
  end_date: string | null;
}

interface SuggestedTC {
  id: string;
  title: string;
  folder?: string;
  priority: string;
  tags?: string[];
  rationale: string;
  /** DB 의 custom_id (e.g. "TC-001") — Claude 응답엔 없고 client-side 에서 enrichment */
  custom_id?: string | null;
}

interface AssistantResult {
  suggested_test_cases: SuggestedTC[];
  estimated_effort_hours: number;
  summary: string;
  coverage_areas: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  meta: {
    credits_used: number;
    credits_remaining: number;
    monthly_limit: number;
  };
}

interface Props {
  projectId: string;
  milestones: Milestone[];
  onClose: () => void;
  /** milestoneId: dropdown 에서 선택한 milestone. 빈 문자열이면 standalone.
   *  onApply 가 Promise 를 반환하면 모달이 submitting 상태로 전환된다. */
  onApply: (suggestedTcIds: string[], planName: string, milestoneId: string) => void | Promise<void>;
  /** 'create-plan' = milestones 페이지에서 새 plan 생성 (기본).
   *  'add-to-plan' = plan-detail 페이지에서 현재 열린 plan 에 TC 추가.
   *  mode=add-to-plan 일 땐 Plan Name/Attach 필드 숨김 + 버튼 라벨 변경. */
  mode?: 'create-plan' | 'add-to-plan';
}

// Risk score helper (0–100 scale from priority)
const RISK_SCORE: Record<string, number> = { critical: 92, high: 78, medium: 55, low: 32 };

// Rationale tags
type RatTag = { key: string; cls: string; label: string };
const RAT_MAP: Record<string, RatTag> = {
  changed:  { key:'changed',  cls:'bg-orange-50 text-orange-700 border border-orange-200',  label:'● Recent changes' },
  failure:  { key:'failure',  cls:'bg-red-50 text-red-700 border border-red-200',            label:'● Failure history' },
  flaky:    { key:'flaky',    cls:'bg-yellow-50 text-yellow-800 border border-yellow-200',   label:'● Flaky' },
  req:      { key:'req',      cls:'bg-blue-50 text-blue-700 border border-blue-200',         label:'● Requirements' },
  ai:       { key:'ai',       cls:'bg-violet-50 text-violet-700 border border-violet-200',   label:'● AI analysis' },
  critical: { key:'critical', cls:'bg-red-50 text-red-800 border border-red-300 font-semibold', label:'● Critical' },
};

const SIGNAL_OPTIONS = [
  { id: 'code', label: 'Recent code changes (7d)' },
  { id: 'failures', label: 'Failure history' },
  { id: 'flaky', label: 'Flaky tests' },
  { id: 'req', label: 'Linked requirements' },
  { id: 'coverage', label: 'Coverage gaps' },
  { id: 'stale', label: 'Untested ≥30d' },
];

export default function AIPlanAssistantModal({ projectId, milestones, onClose, onApply, mode = 'create-plan' }: Props) {
  const isAddToPlan = mode === 'add-to-plan';
  const aiFeature = useAiFeature('plan_assistant');
  const { t } = useTranslation('common');
  const { showToast } = useToast();

  const [step, setStep] = useState<'input' | 'loading' | 'result'>('input');
  const [planName, setPlanName] = useState('');
  const [affectedAreas, setAffectedAreas] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [error, setError] = useState('');
  const [selectedTcIds, setSelectedTcIds] = useState<Set<string>>(new Set());
  const [signals, setSignals] = useState<Set<string>>(new Set(['code','failures','flaky','req']));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (result) {
      setSelectedTcIds(new Set(result.suggested_test_cases.map(tc => tc.id)));
    }
  }, [result]);

  const handleRun = async () => {
    if (aiFeature.loading) return;
    if (!aiFeature.available) {
      setError(aiFeature.tierOk
        ? `You've used all ${aiFeature.monthlyLimit} AI credits this month.`
        : `AI Plan Assistant requires ${aiFeature.requiresTierName} plan or higher.`);
      return;
    }
    setStep('loading');
    setError('');
    try {
      const res = await aiFetch('plan-assistant', {
        project_id: projectId,
        affected_areas: affectedAreas.split(',').map(s => s.trim()).filter(Boolean),
        target_milestone_id: selectedMilestone || undefined,
        context: context.trim() || undefined,
        locale: normalizeLocale(i18n.language), // f021
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');

      // Enrich with custom_id (Claude 응답의 tc.id 는 UUID. 사용자에게 TC-XXX 형태로 보여줘야 함)
      const suggestedTCs = (data.suggested_test_cases as SuggestedTC[] | undefined) ?? [];
      if (suggestedTCs.length > 0) {
        const ids = suggestedTCs.map(tc => tc.id);
        const { data: tcRows } = await supabase
          .from('test_cases')
          .select('id, custom_id')
          .in('id', ids);
        const customIdMap = new Map<string, string | null>(
          (tcRows ?? []).map((row: { id: string; custom_id: string | null }) => [row.id, row.custom_id]),
        );
        data.suggested_test_cases = suggestedTCs.map(tc => ({
          ...tc,
          custom_id: customIdMap.get(tc.id) ?? null,
        }));
      }

      setResult(data);
      setStep('result');
      showAiCreditToast(showToast, t, data);
      aiFeature.refetch?.(); // credit 카운터 새로고침
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStep('input');
    }
  };

  const toggleTc = (id: string) => {
    setSelectedTcIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleApply = async () => {
    console.log('[AIPlanAssistantModal] handleApply clicked', { submitting, selectedCount: selectedTcIds.size });
    if (submitting) return;
    const mName = milestones.find(m => m.id === selectedMilestone)?.name;
    const trimmedName = planName.trim();
    // 우선순위: 사용자 입력 > 선택한 milestone 이름 기반 > affected areas > default.
    const finalPlanName = trimmedName
      ? trimmedName
      : mName ? `${mName} — AI Plan`
      : affectedAreas ? `${affectedAreas.split(',')[0].trim()} — AI Plan`
      : 'AI Generated Plan';
    if (!finalPlanName) {
      setError('Plan name is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      console.log('[AIPlanAssistantModal] calling onApply', { finalPlanName, selectedMilestone, tcCount: selectedTcIds.size });
      await Promise.resolve(onApply([...selectedTcIds], finalPlanName, selectedMilestone));
      console.log('[AIPlanAssistantModal] onApply completed without error');
    } catch (err: any) {
      console.error('[AIPlanAssistantModal] onApply threw:', err);
      setError(err?.message || 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMilestoneName = milestones.find(m => m.id === selectedMilestone)?.name;
  const totalCount = result?.suggested_test_cases.length ?? 0;
  const selectedCount = selectedTcIds.size;
  const estimatedHours = result ? Math.round(result.estimated_effort_hours * (selectedCount / Math.max(totalCount, 1) * 10) / 10) : 0;

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:2000, display:'flex', alignItems:'flex-start', justifyContent:'center',
        background:'rgba(17,24,39,0.45)', backdropFilter:'blur(2px)', padding:'40px 20px', overflowY:'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:980,
        boxShadow:'0 25px 80px rgba(16,24,40,0.35)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', display:'flex', alignItems:'center', gap:10,
          background:'linear-gradient(135deg,#f5f3ff 0%,#eef2ff 100%)',
          borderBottom:'1px solid #e0e7ff' }}>
          <div style={{ width:36, height:36, borderRadius:10,
            background:'linear-gradient(135deg,#6366f1,#7c3aed)',
            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg style={{width:18,height:18}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:600, margin:0 }}>
              {isAddToPlan ? 'AI Optimize — Add TCs to Plan' : 'AI Plan Assistant'}
            </div>
            <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>
              {isAddToPlan
                ? 'Recommends additional test cases to add to this plan'
                : 'Analyzes milestones & recent changes to recommend test cases for your plan'}
            </div>
          </div>
          {!aiFeature.loading && (
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                <span style={{ fontSize:11, fontWeight:600, color:'#6366f1' }}>
                  {aiFeature.monthlyLimit === -1 ? 'Unlimited' : `${aiFeature.usedCredits} / ${aiFeature.monthlyLimit}`}
                </span>
                <span style={{ fontSize:10, color:'#9CA3AF' }}>credits used this month</span>
              </div>
            </div>
          )}
          <button onClick={onClose}
            style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
              color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', marginLeft: aiFeature.loading ? 'auto' : undefined }}>
            <svg style={{width:18,height:18}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body: 2-column (300px left | 1fr right). 높이는 좌측 패널 full 표시 기준. */}
        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', height:720 }}>

          {/* ── LEFT: Context / Prompt panel ── */}
          {/* overflowY:'auto' — signals 가 4행 wrap 될 때 좌측 패널 overflow 방어. */}
          <div style={{ padding:18, borderRight:'1px solid #E2E8F0', background:'#F8FAFC', display:'flex', flexDirection:'column', gap:14, minHeight:0, overflowY:'auto' }}>

            {/* Plan Name field — create-plan mode only */}
            {!isAddToPlan && (
              <div>
                <div style={{ fontSize:11, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600, marginBottom:8 }}>
                  Plan Name
                </div>
                <input
                  type="text"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  placeholder={
                    milestones.find(m => m.id === selectedMilestone)?.name
                      ? `${milestones.find(m => m.id === selectedMilestone)?.name} — AI Plan`
                      : 'AI Generated Plan'
                  }
                  style={{ width:'100%', padding:'8px 12px', border:'1px solid #E2E8F0', borderRadius:8,
                    fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box' }}
                />
                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:4 }}>
                  Leave empty to auto-generate from milestone / affected areas
                </div>
              </div>
            )}

            {/* Affected areas */}
            <div>
              <div style={{ fontSize:11, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600, marginBottom:8 }}>
                Affected Areas / Scope
              </div>
              <input
                type="text"
                value={affectedAreas}
                onChange={e => setAffectedAreas(e.target.value)}
                placeholder="e.g. login, payment, checkout"
                style={{ width:'100%', padding:'8px 12px', border:'1px solid #E2E8F0', borderRadius:8,
                  fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box' }}
              />
              <div style={{ fontSize:11, color:'#9CA3AF', marginTop:4 }}>Separate multiple areas with commas</div>
            </div>

            {/* Attach to Milestone — create-plan mode only */}
            {!isAddToPlan && (
            <div>
              <div style={{ fontSize:11, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600, marginBottom:8 }}>
                Attach Plan to
                <span style={{ color:'#CBD5E1', fontWeight:400, textTransform:'none', letterSpacing:0 }}> — optional</span>
              </div>
              <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:10, padding:'10px 12px' }}>
                <select
                  value={selectedMilestone}
                  onChange={e => setSelectedMilestone(e.target.value)}
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid #E2E8F0', borderRadius:8,
                    fontSize:13, background:'#fff', outline:'none', cursor:'pointer' }}
                >
                  <option value="">— Standalone Plan —</option>
                  {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {selectedMilestoneName && (
                  <div style={{ marginTop:8, padding:'6px 8px', background:'#F8FAFC', borderRadius:6,
                    fontSize:11, color:'#9CA3AF', display:'flex', alignItems:'center', gap:4 }}>
                    <svg style={{width:12,height:12,color:'#22C55E'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Will attach to <b style={{color:'#7C3AED'}}>{selectedMilestoneName}</b>
                  </div>
                )}
                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:6, lineHeight:1.45 }}>
                  Leave empty to create a <b>standalone Plan</b> (can be attached to a Milestone later)
                </div>
              </div>
            </div>
            )}

            {/* Include signals */}
            <div>
              <div style={{ fontSize:11, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600, marginBottom:8 }}>
                Include Signals
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {SIGNAL_OPTIONS.map(s => {
                  const on = signals.has(s.id);
                  return (
                    <button key={s.id}
                      onClick={() => setSignals(prev => { const n=new Set(prev); on?n.delete(s.id):n.add(s.id); return n; })}
                      style={{ padding:'4px 10px', borderRadius:14,
                        border:`1px solid ${on?'#C7D2FE':'#E2E8F0'}`,
                        background:on?'#EEF2FF':'#fff', fontSize:11,
                        color:on?'#6366F1':'#9CA3AF', cursor:'pointer', fontWeight:on?500:400 }}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom prompt */}
            <div>
              <div style={{ fontSize:11, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600, marginBottom:8 }}>
                Custom Prompt <span style={{color:'#CBD5E1',fontWeight:400,textTransform:'none',letterSpacing:0}}>optional</span>
              </div>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Describe what changed, known risks, or specific scenarios..."
                rows={3}
                style={{ width:'100%', padding:'8px 12px', border:'1px solid #E2E8F0', borderRadius:8,
                  fontSize:12, resize:'vertical', outline:'none', boxSizing:'border-box', background:'#fff' }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 12px',
                fontSize:12, color:'#DC2626', display:'flex', alignItems:'center', gap:6 }}>
                <svg style={{width:14,height:14,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {error}
              </div>
            )}

            {/* Run button */}
            <button
              onClick={handleRun}
              disabled={step==='loading' || (!aiFeature.available && !aiFeature.loading)}
              style={{ padding:'10px 12px', borderRadius:10, border:'none',
                background:step==='loading'||(!aiFeature.available&&!aiFeature.loading)?'#E2E8F0':'linear-gradient(135deg,#6366f1,#7c3aed)',
                color:step==='loading'||(!aiFeature.available&&!aiFeature.loading)?'#94A3B8':'#fff',
                fontSize:13, fontWeight:600, cursor:step==='loading'?'wait':(!aiFeature.available&&!aiFeature.loading)?'not-allowed':'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <svg style={{width:15,height:15}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/>
              </svg>
              {step==='loading' ? 'Analyzing…' : result ? 'Re-run analysis' : 'Generate Plan'}
            </button>

            {/* Meta info */}
            {(result || step==='result') && (
              <div style={{ padding:'10px 12px', background:'#fff', borderRadius:8, border:'1px solid #E2E8F0',
                fontSize:11, color:'#9CA3AF', display:'flex', alignItems:'center', gap:4 }}>
                <svg style={{width:13,height:13,color:'#7C3AED'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Analyzed <b style={{color:'#0F172A'}}>{result?.suggested_test_cases.length ?? 0} TCs</b> · last 7 days
              </div>
            )}
          </div>

          {/* ── RIGHT: Recommendations ── */}
          <div style={{ display:'flex', flexDirection:'column', minHeight:0 }}>
            <div style={{ padding:'14px 18px 0', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontWeight:600, fontSize:14 }}>
                Recommended TCs
                {result && <span style={{ color:'#9CA3AF', fontWeight:400 }}> ({result.suggested_test_cases.length})</span>}
              </div>
              {result && (
                <>
                  <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:20,
                    background:'#EDE9FE', color:'#6D28D9' }}>AI-scored</span>
                  <div style={{ marginLeft:'auto', display:'flex', gap:6, fontSize:12, color:'#9CA3AF' }}>
                    <button onClick={() => setSelectedTcIds(new Set(result.suggested_test_cases.map(tc=>tc.id)))}
                      style={{ fontSize:12, color:'#6366F1', background:'none', border:'none', cursor:'pointer' }}>
                      Select all
                    </button>
                    <button onClick={() => setSelectedTcIds(new Set())}
                      style={{ fontSize:12, color:'#9CA3AF', background:'none', border:'none', cursor:'pointer' }}>
                      Clear
                    </button>
                  </div>
                </>
              )}
            </div>

            <div style={{ padding:'14px 18px', overflowY:'auto', flex:1, minHeight:0 }}>

              {/* Loading state */}
              {step === 'loading' && (
                <div style={{ textAlign:'center', padding:'4rem 1rem' }}>
                  <div style={{ width:64, height:64, borderRadius:'50%',
                    background:'linear-gradient(135deg,#EEF2FF,#E0E7FF)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    margin:'0 auto 1.25rem', animation:'ai-pulse 2s ease-in-out infinite' }}>
                    <svg style={{width:28,height:28,color:'#6366F1'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize:16, fontWeight:600, color:'#0F172A', marginBottom:8 }}>Analyzing your project...</h3>
                  <p style={{ fontSize:14, color:'#64748B', margin:0 }}>Reviewing test cases and generating recommendations</p>
                </div>
              )}

              {/* Upgrade gate */}
              {!aiFeature.loading && !aiFeature.tierOk && step==='input' && (
                <div style={{ textAlign:'center', padding:'4rem 1rem' }}>
                  <svg style={{width:48,height:48,color:'#6366F1',margin:'0 auto 16px',display:'block'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4"/><path d="M21 20a9 9 0 0 0-18 0"/>
                  </svg>
                  <h3 style={{ fontSize:16, fontWeight:600, margin:'0 0 8px' }}>AI Plan Assistant</h3>
                  <p style={{ fontSize:14, color:'#9CA3AF', margin:0 }}>
                    {aiFeature.tierOk
                      ? `You've used all ${aiFeature.monthlyLimit} AI credits this month.`
                      : `Requires ${aiFeature.requiresTierName} plan or higher.`}
                  </p>
                </div>
              )}

              {/* Input idle state */}
              {step === 'input' && (aiFeature.loading || aiFeature.tierOk) && (
                <div style={{ textAlign:'center', padding:'4rem 1rem', color:'#CBD5E1' }}>
                  <svg style={{width:48,height:48,margin:'0 auto 16px',display:'block'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/>
                  </svg>
                  <p style={{ fontSize:14, margin:0 }}>
                    Configure the analysis on the left, then click <b>Generate Plan</b> to see recommendations.
                  </p>
                </div>
              )}

              {/* Results */}
              {step === 'result' && result && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {result.suggested_test_cases.map(tc => {
                    const selected = selectedTcIds.has(tc.id);
                    const score = RISK_SCORE[tc.priority] ?? 50;
                    const scoreColor = score>=80?'#7C3AED':score>=60?'#F59E0B':'#22C55E';
                    return (
                      <div key={tc.id} onClick={() => toggleTc(tc.id)}
                        style={{ display:'grid', gridTemplateColumns:'24px minmax(0,1fr) auto auto',
                          gap:12, alignItems:'center', padding:'12px 14px',
                          border:`1px solid ${selected?'#DDD6FE':'#E2E8F0'}`, borderRadius:10,
                          background:selected?'#F5F3FF':'#fff', cursor:'pointer', transition:'all 0.1s' }}>
                        {/* Checkbox */}
                        <div style={{ width:18, height:18, borderRadius:4,
                          border:`2px solid ${selected?'#7C3AED':'#D1D5DB'}`,
                          background:selected?'#7C3AED':'#fff',
                          display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}>
                          {selected && <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        {/* Content */}
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                            {tc.custom_id && (
                              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700,
                                padding:'1px 5px', borderRadius:4, background:'#EEF2FF', color:'#6366F1' }}>
                                {tc.custom_id}
                              </span>
                            )}
                            {tc.title}
                          </div>
                          <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{tc.rationale}</div>
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
                            {tc.priority==='critical' && <span style={{...ratStyle(RAT_MAP.critical)}}>{RAT_MAP.critical.label}</span>}
                            {(tc.tags||[]).includes('changed') && <span style={{...ratStyle(RAT_MAP.changed)}}>{RAT_MAP.changed.label}</span>}
                            {(tc.tags||[]).includes('flaky') && <span style={{...ratStyle(RAT_MAP.flaky)}}>{RAT_MAP.flaky.label}</span>}
                            {(tc.tags||[]).includes('req') && <span style={{...ratStyle(RAT_MAP.req)}}>{RAT_MAP.req.label}</span>}
                            {tc.priority==='high' && <span style={{...ratStyle(RAT_MAP.failure)}}>{RAT_MAP.failure.label}</span>}
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 7px', borderRadius:10, fontSize:10, fontWeight:500, background:'#F5F3FF', color:'#6D28D9', border:'1px solid #DDD6FE' }}>{RAT_MAP.ai.label}</span>
                          </div>
                        </div>
                        {/* Risk score */}
                        <div style={{ textAlign:'right', minWidth:56 }}>
                          <div style={{ fontSize:16, fontWeight:700, color:scoreColor }}>{score}</div>
                          <div style={{ fontSize:10, color:'#9CA3AF' }}>risk</div>
                        </div>
                        {/* Info btn */}
                        <button onClick={e=>{e.stopPropagation();}}
                          style={{ width:28, height:28, borderRadius:6, border:'1px solid #E2E8F0',
                            background:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                            color:'#9CA3AF', cursor:'pointer' }}>
                          <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {(step === 'result' && result) && (
          <div style={{ padding:'14px 22px', borderTop:'1px solid #E2E8F0', display:'flex', alignItems:'center', gap:10, background:'#F8FAFC' }}>
            <div style={{ fontSize:12, color:'#9CA3AF' }}>
              <b style={{ color:'#0F172A' }}>{selectedCount} of {totalCount}</b> selected
              {selectedCount > 0 && <> · Est. time <b style={{color:'#0F172A'}}>~{estimatedHours}h</b></>}
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button onClick={() => { setStep('input'); setResult(null); }}
                style={{ padding:'8px 16px', border:'1px solid #E2E8F0', borderRadius:8, background:'#fff',
                  fontSize:13, cursor:'pointer', color:'#374151' }}>
                Regenerate
              </button>
              <button onClick={handleApply} disabled={selectedCount === 0 || submitting}
                style={{ padding:'8px 16px', border:'none', borderRadius:8,
                  background:(selectedCount>0 && !submitting)?'#6366F1':'#E2E8F0',
                  color:(selectedCount>0 && !submitting)?'#fff':'#94A3B8', fontSize:13, fontWeight:600,
                  cursor:submitting?'wait':(selectedCount>0?'pointer':'not-allowed') }}>
                {submitting
                  ? (isAddToPlan ? 'Adding…' : 'Creating plan…')
                  : isAddToPlan
                    ? `Add ${selectedCount > 0 ? selectedCount : ''} TCs to This Plan`
                    : `Create Plan with ${selectedCount > 0 ? selectedCount : ''} TCs`}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ai-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(.97)} }
      `}</style>
    </div>
  );
}

// Helper to turn RatTag class string into inline style
function ratStyle(tag: RatTag): React.CSSProperties {
  return {
    display:'inline-flex', alignItems:'center', gap:4,
    padding:'2px 7px', borderRadius:10, fontSize:10, fontWeight:500,
    // we can't use tailwind here so use simple inline colors
    background: tag.cls.includes('orange')  ? '#FFF7ED' :
                tag.cls.includes('red')      ? '#FEF2F2' :
                tag.cls.includes('yellow')   ? '#FFFBEB' :
                tag.cls.includes('blue')     ? '#EFF6FF' :
                tag.cls.includes('violet')   ? '#F5F3FF' : '#F1F5F9',
    color: tag.cls.includes('orange')  ? '#C2410C' :
           tag.cls.includes('red')     ? '#B91C1C' :
           tag.cls.includes('yellow')  ? '#92400E' :
           tag.cls.includes('blue')    ? '#1D4ED8' :
           tag.cls.includes('violet')  ? '#6D28D9' : '#475569',
    border: `1px solid ${
      tag.cls.includes('orange')  ? '#FED7AA' :
      tag.cls.includes('red')     ? '#FECACA' :
      tag.cls.includes('yellow')  ? '#FDE68A' :
      tag.cls.includes('blue')    ? '#BFDBFE' :
      tag.cls.includes('violet')  ? '#DDD6FE' : '#E2E8F0'
    }`,
  };
}
