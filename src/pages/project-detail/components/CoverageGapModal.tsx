import { useState, useEffect } from 'react';
import i18n from '../../../i18n';
import { supabase } from '../../../lib/supabase';
import { ModalShell } from '../../../components/ModalShell';
import { normalizeLocale } from '../../../lib/claudeLocale';
import { aiFetch } from '../../../lib/aiFetch';
import { showAiCreditToast } from '../../../lib/aiCreditToast';
import { useToast } from '../../../components/Toast';
import { useTranslation } from 'react-i18next';

interface GapSuggestion {
  title: string;
  type: string;
  priority: 'P1' | 'P2' | 'P3';
}

interface Gap {
  module: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  currentCount: number;
  missingTypes: string[];
  reason: string;
  suggestions: GapSuggestion[];
}

interface TypeBalance {
  positive: number;
  negative: number;
  boundary: number;
  errorHandling: number;
  security: number;
  performance: number;
}

interface GapResult {
  gaps: Gap[];
  typeBalance: TypeBalance;
  typeAssessment: string;
}

interface CoverageGapModalProps {
  projectId: string;
  onClose: () => void;
  onGenerateTCs: (titles: string[]) => void;
}

const SEVERITY_CONFIG = {
  CRITICAL: { bg: '#FEF2F2', border: '#FCA5A5', dot: '#DC2626', label: '🔴 CRITICAL', textColor: '#991B1B' },
  HIGH:     { bg: '#FFFBEB', border: '#FCD34D', dot: '#F59E0B', label: '🟡 HIGH',     textColor: '#92400E' },
  MEDIUM:   { bg: '#F0FDF4', border: '#86EFAC', dot: '#16A34A', label: '🟢 MEDIUM',   textColor: '#14532D' },
};

const TYPE_LABELS: Record<string, string> = {
  negative: 'Negative',
  boundary: 'Boundary',
  error_handling: 'Error Handling',
  security: 'Security',
  performance: 'Performance',
};

export default function CoverageGapModal({ projectId, onClose, onGenerateTCs }: CoverageGapModalProps) {
  const { t } = useTranslation('common');
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GapResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tcCount, setTcCount] = useState<number>(0);
  const [moduleCount, setModuleCount] = useState<number>(0);
  const [isCached, setIsCached] = useState(false);

  const runAnalysis = async (forceReanalyze = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiFetch('generate-testcases', {
        action: 'coverage-gap',
        project_id: projectId,
        force_reanalyze: forceReanalyze,
        locale: normalizeLocale(i18n.language), // f021
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) setError(data.error || 'Professional plan required for Coverage Gap Analysis');
        else if (response.status === 422) setError(data.error || 'No test cases to analyze');
        else if (response.status === 429) setError(data.error || 'Monthly AI limit reached. Please try again next month.');
        else setError(data.error || 'Analysis failed. Please try again.');
        return;
      }

      if (!data?.success || !data?.result) {
        setError('Analysis failed. Please try again.');
        return;
      }

      const gapResult: GapResult = data.result;
      setResult(gapResult);
      setIsCached(!!data.cached);
      showAiCreditToast(showToast, t, data);

      // Auto-select all P1 suggestions
      const autoSelected = new Set<string>();
      gapResult.gaps.forEach((gap, gi) => {
        gap.suggestions.forEach((sug, si) => {
          if (sug.priority === 'P1') autoSelected.add(`${gi}-${si}`);
        });
      });
      setSelected(autoSelected);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase
      .from('test_cases')
      .select('folder')
      .eq('project_id', projectId)
      .then(({ data }) => {
        if (data) {
          setTcCount(data.length);
          setModuleCount(new Set(data.map(tc => tc.folder || 'General')).size);
        }
      });
    runAnalysis();
  }, []);

  const toggleSuggestion = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = (gapIndex: number, gap: Gap) => {
    const keys = gap.suggestions.map((_, si) => `${gapIndex}-${si}`);
    const allSelected = keys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const getSelectedTitles = (): string[] => {
    if (!result) return [];
    const titles: string[] = [];
    result.gaps.forEach((gap, gi) => {
      gap.suggestions.forEach((sug, si) => {
        if (selected.has(`${gi}-${si}`)) titles.push(sug.title);
      });
    });
    return titles;
  };

  const totalSuggestions = result?.gaps.reduce((s, g) => s + g.suggestions.length, 0) ?? 0;

  return (
    <ModalShell onClose={onClose} zClass="z-[1000]">
      <div
        style={{
          background: '#fff', borderRadius: '16px',
          width: '100%', maxWidth: '680px',
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ri-sparkling-2-fill" style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Coverage Gap Analysis</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {loading ? 'AI is analyzing gaps…' : result ? `Gaps found in ${result.gaps.length} module(s)` : ''}
                {!loading && result && isCached && (
                  <span style={{ fontSize: 10, fontWeight: 600, background: '#EEF2FF', color: '#6366F1', borderRadius: 4, padding: '1px 6px' }}>Cached</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!loading && result && (
              <button
                onClick={() => runAnalysis(true)}
                style={{ fontSize: 12, fontWeight: 600, color: '#6366F1', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <i className="ri-refresh-line" style={{ fontSize: 13 }} />
                Re-analyze
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20, padding: '4px', lineHeight: 1 }}>
              <i className="ri-close-line" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '52px 24px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, margin: '4px 0' }}>
              <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'cgSpin 0.8s linear infinite', margin: '0 auto 20px' }} />
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                Analyzing {tcCount > 0 ? tcCount : '…'} test cases across {moduleCount > 0 ? moduleCount : '…'} modules...
              </p>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Identifying coverage gaps and suggesting TCs</p>
              <style>{`@keyframes cgSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: '14px', color: '#EF4444', marginBottom: 12 }}>⚠️ {error}</p>
              <button onClick={runAnalysis} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#334155' }}>
                Try Again
              </button>
            </div>
          )}

          {/* Results */}
          {!loading && result && (
            <>
              {/* Gap Cards */}
              {result.gaps.map((gap, gi) => {
                const cfg = SEVERITY_CONFIG[gap.severity] ?? SEVERITY_CONFIG.MEDIUM;
                const allSelected = gap.suggestions.every((_, si) => selected.has(`${gi}-${si}`));
                return (
                  <div key={gi} style={{ border: `1px solid ${cfg.border}`, borderRadius: 10, marginBottom: 12, overflow: 'hidden', background: cfg.bg }}>
                    {/* Gap Header */}
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.textColor }}>{cfg.label}</span>
                          <span style={{ fontSize: 11, color: '#64748B', background: 'rgba(255,255,255,0.7)', padding: '1px 8px', borderRadius: 4 }}>
                            {gap.module}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748B' }}>{gap.currentCount} TCs</span>
                        </div>
                        {gap.missingTypes.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                            {gap.missingTypes.map(t => (
                              <span key={t} style={{ fontSize: 10, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 4, padding: '1px 6px', color: '#475569', fontWeight: 600 }}>
                                {TYPE_LABELS[t] || t}
                              </span>
                            ))}
                          </div>
                        )}
                        <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.5 }}>{gap.reason}</p>
                      </div>
                      <button
                        onClick={() => toggleAll(gi, gap)}
                        style={{ fontSize: 11, color: '#6366F1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {/* Suggestions */}
                    <div style={{ background: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(0,0,0,0.06)', padding: '8px 16px' }}>
                      {gap.suggestions.map((sug, si) => {
                        const key = `${gi}-${si}`;
                        const isSelected = selected.has(key);
                        return (
                          <label key={si} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', cursor: 'pointer', borderBottom: si < gap.suggestions.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSuggestion(key)}
                              style={{ marginTop: 2, width: 14, height: 14, accentColor: '#6366F1', cursor: 'pointer', flexShrink: 0 }}
                            />
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, color: isSelected ? '#0F172A' : '#64748B', fontWeight: isSelected ? 500 : 400, lineHeight: 1.4, display: 'block' }}>
                                {sug.title}
                              </span>
                              <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                                <span style={{ fontSize: 10, color: '#6366F1', fontWeight: 600, background: '#EEF2FF', padding: '1px 5px', borderRadius: 3 }}>
                                  {TYPE_LABELS[sug.type] || sug.type}
                                </span>
                                <span style={{ fontSize: 10, color: sug.priority === 'P1' ? '#DC2626' : sug.priority === 'P2' ? '#D97706' : '#16A34A', fontWeight: 700 }}>
                                  {sug.priority}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* TC Type Balance — 결과 맨 하단 */}
              {result.typeBalance && (() => {
                const tb = result.typeBalance;
                const types = [
                  { key: 'positive',      label: 'Positive',       icon: '✅', color: '#22C55E', count: tb.positive      ?? 0 },
                  { key: 'negative',      label: 'Negative',       icon: '❌', color: '#3B82F6', count: tb.negative      ?? 0 },
                  { key: 'boundary',      label: 'Boundary',       icon: '⚠️', color: '#8B5CF6', count: tb.boundary      ?? 0 },
                  { key: 'errorHandling', label: 'Error Handling',  icon: '🔴', color: '#EF4444', count: tb.errorHandling ?? 0 },
                  { key: 'security',      label: 'Security',       icon: '🔒', color: '#F59E0B', count: tb.security      ?? 0 },
                ];
                const total = types.reduce((s, t) => s + t.count, 0);
                const withPct = types.map(t => ({ ...t, pct: total > 0 ? Math.round((t.count / total) * 100) : 0 }));
                const LOW_THRESHOLD = 10;
                const weakTypes = withPct.filter(t => t.pct < LOW_THRESHOLD).map(t => t.label);
                return (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', marginTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                      TC Type Balance
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {withPct.map(t => (
                        <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, width: 18, flexShrink: 0 }}>{t.icon}</span>
                          <span style={{ fontSize: 12, color: '#475569', width: 110, flexShrink: 0 }}>{t.label}</span>
                          <div style={{ flex: 1, height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${t.pct}%`, height: '100%', background: t.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', width: 36, textAlign: 'right', flexShrink: 0 }}>{t.pct}%</span>
                          {t.pct < LOW_THRESHOLD && (
                            <span style={{ fontSize: 13, flexShrink: 0 }} title="Coverage is critically low">⚠️</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {weakTypes.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E2E8F0', fontSize: 12, color: '#DC2626', fontWeight: 500 }}>
                        → {weakTypes.join(', ')} tests are critically insufficient
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && result && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#F8FAFC' }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>
              Selected: <strong style={{ color: '#0F172A' }}>{selected.size}</strong> / {totalSuggestions}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onClose}
                style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#334155' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const titles = getSelectedTitles();
                  if (titles.length > 0) onGenerateTCs(titles);
                }}
                disabled={selected.size === 0}
                style={{
                  background: selected.size > 0 ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#E2E8F0',
                  color: selected.size > 0 ? '#fff' : '#94A3B8',
                  border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600,
                  cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.2s',
                }}
              >
                <i className="ri-sparkling-2-fill" />
                Generate Selected TCs ({selected.size}) →
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
