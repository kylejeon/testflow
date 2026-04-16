import React, { useState } from 'react';

interface MilestoneOption {
  id: string;
  name: string;
}

interface Props {
  runId: string;
  runName: string;
  milestoneOptions: MilestoneOption[];
  onClose: () => void;
  onSubmit: (data: { runId: string; milestoneId: string | null; planName: string }) => Promise<void>;
}

export default function PromoteToPlansModal({ runId, runName, milestoneOptions, onClose, onSubmit }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [milestoneId, setMilestoneId] = useState('');
  const [planName, setPlanName] = useState(`Plan from "${runName}"`);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        runId,
        milestoneId: milestoneId || null,
        planName: planName.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 12, padding: 24,
          width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--orange-50)', color: 'var(--orange)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>⚡</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Promote to Plan</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Run: <span style={{ fontWeight: 500, color: 'var(--text)' }}>{runName}</span>
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 12, color: 'var(--text-subtle)' }}>
          <span style={{ fontWeight: step === 1 ? 600 : 400, color: step === 1 ? 'var(--primary)' : undefined }}>
            1. Select milestone
          </span>
          <span>→</span>
          <span style={{ fontWeight: step === 2 ? 600 : 400, color: step === 2 ? 'var(--primary)' : undefined }}>
            2. Plan name
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 ? (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                Link to Milestone (optional)
              </label>
              <select
                className="input"
                value={milestoneId}
                onChange={e => setMilestoneId(e.target.value)}
                style={{ background: '#fff', marginBottom: 20 }}
              >
                <option value="">No milestone — standalone plan</option>
                {milestoneOptions.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setStep(2)}
                >
                  Next →
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                Plan Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="input"
                type="text"
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                required
                autoFocus
                placeholder="e.g. Hotfix Verification Plan"
                style={{ marginBottom: 20 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setStep(1)}
                  disabled={saving}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={saving || !planName.trim()}
                >
                  {saving ? 'Promoting…' : 'Promote'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
