import React, { useState } from 'react';

interface MilestoneOption {
  id: string;
  name: string;
}

interface Props {
  milestoneOptions: MilestoneOption[];
  defaultMilestoneId?: string | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    status: string;
    priority: string;
    milestone_id: string | null;
    start_date: string;
    end_date: string;
  }) => Promise<void>;
}

export default function NewPlanModal({ milestoneOptions, defaultMilestoneId, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('planning');
  const [priority, setPriority] = useState('medium');
  const [milestoneId, setMilestoneId] = useState<string>(defaultMilestoneId ?? '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        status,
        priority,
        milestone_id: milestoneId || null,
        start_date: startDate,
        end_date: endDate,
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
          width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--primary-50)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ri-file-list-3-line" style={{ fontSize: 17 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>New Test Plan</h2>
            {defaultMilestoneId && milestoneOptions.find(m => m.id === defaultMilestoneId) && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Under: <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                  {milestoneOptions.find(m => m.id === defaultMilestoneId)?.name}
                </span>
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                Plan Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                placeholder="e.g. Login Flow Regression"
              />
            </div>

            {/* Status + Priority in a row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Status</label>
                <select
                  className="input"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  style={{ background: '#fff' }}
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Priority</label>
                <select
                  className="input"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  style={{ background: '#fff' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Milestone */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                Milestone
              </label>
              <select
                className="input"
                value={milestoneId}
                onChange={e => setMilestoneId(e.target.value)}
                style={{ background: '#fff' }}
              >
                <option value="">No milestone</option>
                {milestoneOptions.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Start Date</label>
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>End Date</label>
                <input
                  className="input"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button
              type="button"
              className="btn w-full"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary w-full"
              style={{ flex: 1, justifyContent: 'center' }}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Creating…' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
