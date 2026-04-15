import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAiFeature } from '../../hooks/useAiFeature';

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
  onApply: (suggestedTcIds: string[], planName: string) => void;
}

const RISK_CONFIG = {
  low:      { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Low Risk' },
  medium:   { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Medium Risk' },
  high:     { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High Risk' },
  critical: { bg: 'bg-rose-100',   text: 'text-rose-700',   label: 'Critical Risk' },
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#F59E0B',
  low:      '#94A3B8',
};

export default function AIPlanAssistantModal({ projectId, milestones, onClose, onApply }: Props) {
  const aiFeature = useAiFeature('plan_assistant');

  const [step, setStep] = useState<'input' | 'loading' | 'result'>('input');
  const [affectedAreas, setAffectedAreas] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [error, setError] = useState('');
  const [selectedTcIds, setSelectedTcIds] = useState<Set<string>>(new Set());

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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/plan-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          affected_areas: affectedAreas.split(',').map(s => s.trim()).filter(Boolean),
          target_milestone_id: selectedMilestone || undefined,
          context: context.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');

      setResult(data);
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStep('input');
    }
  };

  const toggleTc = (id: string) => {
    setSelectedTcIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = () => {
    const mName = milestones.find(m => m.id === selectedMilestone)?.name;
    const planName = mName
      ? `${mName} — AI Plan`
      : affectedAreas
        ? `${affectedAreas.split(',')[0].trim()} — AI Plan`
        : 'AI Generated Plan';
    onApply([...selectedTcIds], planName);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '0.875rem', width: '100%', maxWidth: '38rem', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ri-sparkling-2-line" style={{ color: '#fff', fontSize: '1.125rem' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>AI Plan Assistant</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>Recommends test cases based on your changes</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1.25rem' }}>
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Credit badge */}
        {!aiFeature.loading && (
          <div style={{ padding: '0.75rem 1.5rem', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
            <i className="ri-copper-coin-line" style={{ color: '#6366F1' }} />
            <span style={{ color: '#64748B' }}>
              {aiFeature.monthlyLimit === -1
                ? 'Unlimited credits'
                : `${aiFeature.remainingCredits} of ${aiFeature.monthlyLimit} credits remaining`}
            </span>
            <span style={{ marginLeft: 'auto', background: '#EEF2FF', color: '#6366F1', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontWeight: 500 }}>
              1 credit
            </span>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>

          {/* ── Upgrade gate ── */}
          {!aiFeature.loading && !aiFeature.tierOk && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <i className="ri-vip-crown-2-line" style={{ fontSize: '2.5rem', color: '#6366F1', display: 'block', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.5rem' }}>Free Feature</h3>
              <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1.25rem' }}>
                AI Plan Assistant is available on all plans. Sign in to use it.
              </p>
            </div>
          )}

          {/* ── Input step ── */}
          {step === 'input' && (aiFeature.loading || aiFeature.tierOk) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Affected Areas / Changed Components
                </label>
                <input
                  type="text"
                  value={affectedAreas}
                  onChange={e => setAffectedAreas(e.target.value)}
                  placeholder="e.g. login, payment, checkout"
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '0.25rem 0 0' }}>Separate multiple areas with commas</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Target Milestone <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
                </label>
                <select
                  value={selectedMilestone}
                  onChange={e => setSelectedMilestone(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff', outline: 'none' }}
                >
                  <option value="">— No specific milestone —</option>
                  {milestones.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Additional Context <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
                </label>
                <textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="Describe what changed, known risks, or specific scenarios to focus on..."
                  rows={3}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.8125rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="ri-error-warning-line" />
                  {error}
                </div>
              )}

              <button
                onClick={handleRun}
                disabled={aiFeature.loading || !aiFeature.available}
                style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: '0.5rem', background: aiFeature.available ? '#6366F1' : '#E2E8F0', color: aiFeature.available ? '#fff' : '#94A3B8', fontSize: '0.9375rem', fontWeight: 600, cursor: aiFeature.available ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <i className="ri-sparkling-2-line" />
                Generate Plan
              </button>
            </div>
          )}

          {/* ── Loading step ── */}
          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', animation: 'pulse 2s ease-in-out infinite' }}>
                <i className="ri-sparkling-2-line" style={{ fontSize: '1.75rem', color: '#6366F1' }} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.5rem' }}>Analyzing your project...</h3>
              <p style={{ fontSize: '0.875rem', color: '#64748B' }}>
                Reviewing test cases and generating recommendations
              </p>
            </div>
          )}

          {/* ── Result step ── */}
          {step === 'result' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Summary card */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.625rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '9999px' }}
                    className={`${RISK_CONFIG[result.risk_level].bg} ${RISK_CONFIG[result.risk_level].text}`}>
                    {RISK_CONFIG[result.risk_level].label}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    ~{result.estimated_effort_hours}h estimated
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {result.suggested_test_cases.length} TCs suggested
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0, lineHeight: 1.6 }}>{result.summary}</p>
                {result.coverage_areas.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.75rem' }}>
                    {result.coverage_areas.map(area => (
                      <span key={area} style={{ fontSize: '0.6875rem', background: '#EEF2FF', color: '#6366F1', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>
                        {area}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* TC list */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', margin: 0 }}>
                    Recommended Test Cases ({selectedTcIds.size} selected)
                  </h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setSelectedTcIds(new Set(result.suggested_test_cases.map(tc => tc.id)))}
                      style={{ fontSize: '0.75rem', color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Select all
                    </button>
                    <button onClick={() => setSelectedTcIds(new Set())}
                      style={{ fontSize: '0.75rem', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Clear
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '18rem', overflow: 'auto' }}>
                  {result.suggested_test_cases.map(tc => (
                    <div
                      key={tc.id}
                      onClick={() => toggleTc(tc.id)}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', border: `1px solid ${selectedTcIds.has(tc.id) ? '#C7D2FE' : '#E2E8F0'}`, borderRadius: '0.5rem', cursor: 'pointer', background: selectedTcIds.has(tc.id) ? '#EEF2FF' : '#fff', transition: 'all 0.1s' }}
                    >
                      <div style={{ width: '1.125rem', height: '1.125rem', borderRadius: '0.25rem', border: `2px solid ${selectedTcIds.has(tc.id) ? '#6366F1' : '#D1D5DB'}`, background: selectedTcIds.has(tc.id) ? '#6366F1' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.125rem' }}>
                        {selectedTcIds.has(tc.id) && <i className="ri-check-line" style={{ color: '#fff', fontSize: '0.6875rem' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1E293B', flex: 1 }}>{tc.title}</span>
                          <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: PRIORITY_COLOR[tc.priority] || '#94A3B8', flexShrink: 0 }} title={tc.priority} />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>{tc.rationale}</p>
                        {tc.folder && (
                          <span style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: '0.2rem', display: 'block' }}>
                            <i className="ri-folder-line" style={{ marginRight: '0.2rem' }} />{tc.folder}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => { setStep('input'); setResult(null); }}
                  style={{ flex: 1, padding: '0.625rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: '#374151' }}>
                  Regenerate
                </button>
                <button
                  onClick={handleApply}
                  disabled={selectedTcIds.size === 0}
                  style={{ flex: 2, padding: '0.625rem', border: 'none', borderRadius: '0.5rem', background: selectedTcIds.size > 0 ? '#6366F1' : '#E2E8F0', color: selectedTcIds.size > 0 ? '#fff' : '#94A3B8', fontSize: '0.875rem', fontWeight: 600, cursor: selectedTcIds.size > 0 ? 'pointer' : 'not-allowed' }}>
                  Use {selectedTcIds.size} TCs in New Plan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
