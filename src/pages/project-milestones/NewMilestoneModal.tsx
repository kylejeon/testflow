import React, { useState } from 'react';

interface ParentOption {
  id: string;
  name: string;
}

interface Props {
  parentOptions: ParentOption[];
  defaultParentId?: string | null;
  onClose: () => void;
  onSubmit: (data: { name: string; start_date: string; end_date: string; parent_milestone_id: string | null }) => Promise<void>;
}

export default function NewMilestoneModal({ parentOptions, defaultParentId, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [parentId, setParentId] = useState<string>(defaultParentId ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        start_date: startDate || '',
        end_date: endDate || '',
        parent_milestone_id: parentId || null,
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
          width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--primary-50)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🚩</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              {defaultParentId ? 'Create Sub Milestone' : 'New Milestone'}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                placeholder="e.g. v2.0 Release"
              />
            </div>

            {parentOptions.length > 0 && !defaultParentId && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  Parent Milestone (optional)
                </label>
                <select
                  className="input"
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  style={{ background: '#fff' }}
                >
                  <option value="">None (top-level milestone)</option>
                  {parentOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  Start Date
                </label>
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  End Date
                </label>
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
              {saving ? 'Creating…' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
