import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import { useToast } from '../../components/Toast';
import { usePermission } from '../../hooks/usePermission';
import PageLoader from '../../components/PageLoader';
import AIPlanAssistantModal from './AIPlanAssistantModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestPlan {
  id: string;
  project_id: string;
  milestone_id: string | null;
  name: string;
  description: string | null;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  owner_id: string | null;
  target_date: string | null;
  entry_criteria: any[];
  exit_criteria: any[];
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  // computed
  tc_count?: number;
  run_count?: number;
  pass_rate?: number;
}

interface Milestone {
  id: string;
  name: string;
  status: string;
  end_date: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  planning:  { label: 'Planning',   bg: 'bg-slate-100',   text: 'text-slate-600',  dot: '#64748B' },
  active:    { label: 'Active',     bg: 'bg-blue-100',    text: 'text-blue-600',   dot: '#3B82F6' },
  completed: { label: 'Completed',  bg: 'bg-green-100',   text: 'text-green-600',  dot: '#16A34A' },
  cancelled: { label: 'Cancelled',  bg: 'bg-rose-100',    text: 'text-rose-600',   dot: '#EF4444' },
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', bg: 'bg-rose-50',   text: 'text-rose-600',   border: 'border-rose-200' },
  high:     { label: 'High',     bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  medium:   { label: 'Medium',   bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-200' },
  low:      { label: 'Low',      bg: 'bg-slate-50',  text: 'text-slate-500',  border: 'border-slate-200' },
};

// ─── Create/Edit Modal ────────────────────────────────────────────────────────

function PlanFormModal({
  plan,
  milestones,
  profiles,
  onClose,
  onSave,
}: {
  plan: TestPlan | null;
  milestones: Milestone[];
  profiles: UserProfile[];
  onClose: () => void;
  onSave: (data: Partial<TestPlan>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    status: plan?.status ?? 'planning' as TestPlan['status'],
    priority: plan?.priority ?? 'medium' as TestPlan['priority'],
    milestone_id: plan?.milestone_id ?? '',
    owner_id: plan?.owner_id ?? '',
    target_date: plan?.target_date ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setNameError('Name is required'); return; }
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        milestone_id: form.milestone_id || null,
        owner_id: form.owner_id || null,
        target_date: form.target_date || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '0.75rem', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ri-file-list-3-line" style={{ color: '#6366F1', fontSize: '1rem' }} />
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', margin: 0 }}>
              {plan ? 'Edit Test Plan' : 'New Test Plan'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '1.25rem' }}>
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Plan Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(''); }}
              placeholder="e.g. v2.1 Regression Plan"
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: `1px solid ${nameError ? '#EF4444' : '#D1D5DB'}`, borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              autoFocus
            />
            {nameError && <p style={{ color: '#EF4444', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>{nameError}</p>}
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the scope and goals of this test plan..."
              rows={3}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Status + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as TestPlan['status'] }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff', outline: 'none' }}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as TestPlan['priority'] }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff', outline: 'none' }}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Milestone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Milestone <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span></label>
            <select
              value={form.milestone_id}
              onChange={e => setForm(f => ({ ...f, milestone_id: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff', outline: 'none' }}
            >
              <option value="">— No Milestone (Ad-hoc) —</option>
              {milestones.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Owner + Target Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Owner</label>
              <select
                value={form.owner_id}
                onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff', outline: 'none' }}
              >
                <option value="">— Unassigned —</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Target Date</label>
              <input
                type="date"
                value={form.target_date}
                onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', background: '#fff', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '0.5rem', background: '#6366F1', color: '#fff', fontSize: '0.875rem', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {saving && <i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }} />}
              {plan ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  milestone,
  ownerProfile,
  projectId,
  onEdit,
  onDelete,
}: {
  plan: TestPlan;
  milestone: Milestone | undefined;
  ownerProfile: UserProfile | undefined;
  projectId: string;
  onEdit: (plan: TestPlan) => void;
  onDelete: (plan: TestPlan) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sc = STATUS_CONFIG[plan.status];
  const pc = PRIORITY_CONFIG[plan.priority];
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const daysUntil = plan.target_date
    ? Math.ceil((new Date(plan.target_date).getTime() - Date.now()) / 86400000)
    : null;

  const isOverdue = daysUntil !== null && daysUntil < 0 && plan.status !== 'completed';

  return (
    <div
      onClick={() => navigate(`/projects/${projectId}/plans/${plan.id}`)}
      style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s', position: 'relative' }}
      className="hover:shadow-md hover:border-indigo-200"
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.125rem' }}>
          {plan.is_locked
            ? <i className="ri-lock-2-line" style={{ color: '#6366F1', fontSize: '0.875rem' }} />
            : <i className="ri-file-list-3-line" style={{ color: '#6366F1', fontSize: '0.875rem' }} />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1E293B', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '16rem' }}>
              {plan.name}
            </h3>
            <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '9999px' }} className={`${sc.bg} ${sc.text}`}>
              <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: sc.dot, display: 'inline-block', marginRight: '0.3rem', verticalAlign: 'middle' }} />
              {sc.label}
            </span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '0.25rem', border: '1px solid' }} className={`${pc.bg} ${pc.text} ${pc.border}`}>
              {pc.label}
            </span>
          </div>
          {plan.description && (
            <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.25rem 0 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {plan.description}
            </p>
          )}
        </div>

        {/* Menu */}
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '0.25rem', borderRadius: '0.375rem' }}
            className="hover:bg-slate-100 hover:text-slate-600"
          >
            <i className="ri-more-2-fill" />
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: '1.75rem', zIndex: 50, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: '9rem', overflow: 'hidden' }}>
              <button onClick={() => { onEdit(plan); setMenuOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: '#374151' }}
                className="hover:bg-slate-50">
                <i className="ri-edit-line" style={{ color: '#6366F1' }} /> Edit
              </button>
              <button onClick={() => { onDelete(plan); setMenuOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: '#EF4444' }}
                className="hover:bg-rose-50">
                <i className="ri-delete-bin-line" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: '#64748B' }}>
          <i className="ri-test-tube-line" style={{ color: '#6366F1' }} />
          <span>{plan.tc_count ?? 0} TCs</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: '#64748B' }}>
          <i className="ri-play-circle-line" style={{ color: '#10B981' }} />
          <span>{plan.run_count ?? 0} Runs</span>
        </div>
        {(plan.pass_rate ?? 0) > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: '#10B981', fontWeight: 500 }}>
            <i className="ri-checkbox-circle-line" />
            <span>{plan.pass_rate}%</span>
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {milestone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#6366F1', background: '#EEF2FF', padding: '0.2rem 0.5rem', borderRadius: '0.375rem' }}>
            <i className="ri-flag-line" style={{ fontSize: '0.7rem' }} />
            <span>{milestone.name}</span>
          </div>
        )}
        {!milestone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#64748B', background: '#F1F5F9', padding: '0.2rem 0.5rem', borderRadius: '0.375rem' }}>
            <i className="ri-flashlight-line" style={{ fontSize: '0.7rem' }} />
            <span>Ad-hoc</span>
          </div>
        )}
        {plan.target_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: isOverdue ? '#EF4444' : '#64748B' }}>
            <i className={`ri-calendar-${isOverdue ? 'close' : 'event'}-line`} />
            <span>
              {isOverdue
                ? `Overdue by ${Math.abs(daysUntil!)}d`
                : daysUntil === 0
                  ? 'Due today'
                  : `Due in ${daysUntil}d`
              }
            </span>
          </div>
        )}
        {ownerProfile && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#64748B' }}>
            <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 600, color: '#6366F1', flexShrink: 0 }}>
              {(ownerProfile.full_name || ownerProfile.email).charAt(0).toUpperCase()}
            </div>
            <span>{ownerProfile.full_name || ownerProfile.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectPlansPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = usePermission();

  const [project, setProject] = useState<any>(null);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'planning' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<TestPlan | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [projectRes, plansRes, milestonesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('test_plans').select('*').eq('project_id', id).order('created_at', { ascending: false }),
        supabase.from('milestones').select('id, name, status, end_date').eq('project_id', id).order('end_date'),
      ]);

      if (projectRes.data) setProject(projectRes.data);
      const rawPlans = plansRes.data || [];

      // Fetch stats from the view (if available, fallback gracefully)
      let statsMap: Record<string, { tc_count: number; run_count: number; pass_rate: number }> = {};
      try {
        const { data: stats } = await supabase
          .from('vw_test_plan_stats')
          .select('plan_id, tc_count, run_count, pass_rate')
          .eq('project_id', id);
        (stats || []).forEach((s: any) => {
          statsMap[s.plan_id] = { tc_count: s.tc_count, run_count: s.run_count, pass_rate: s.pass_rate };
        });
      } catch {
        // View might not be created yet, skip gracefully
      }

      const enriched = rawPlans.map((p: any) => ({
        ...p,
        tc_count: statsMap[p.id]?.tc_count ?? 0,
        run_count: statsMap[p.id]?.run_count ?? 0,
        pass_rate: statsMap[p.id]?.pass_rate ?? 0,
      }));
      setPlans(enriched);
      setMilestones(milestonesRes.data || []);

      // Fetch owner profiles
      const ownerIds = [...new Set(rawPlans.map((p: any) => p.owner_id).filter(Boolean))] as string[];
      if (ownerIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', ownerIds);
        setProfiles(profileData || []);
      }
    } catch (err: any) {
      showToast('Failed to load test plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleCreate = async (data: Partial<TestPlan>) => {
    const { data: inserted, error } = await supabase
      .from('test_plans')
      .insert([{ ...data, project_id: id }])
      .select()
      .single();
    if (error) { showToast('Failed to create plan', 'error'); return; }
    setPlans(prev => [{ ...inserted, tc_count: 0, run_count: 0, pass_rate: 0 }, ...prev]);
    setShowCreateModal(false);
    showToast('Test plan created', 'success');
    navigate(`/projects/${id}/plans/${inserted.id}`);
  };

  const handleUpdate = async (data: Partial<TestPlan>) => {
    if (!editingPlan) return;
    const { error } = await supabase.from('test_plans').update(data).eq('id', editingPlan.id);
    if (error) { showToast('Failed to update plan', 'error'); return; }
    setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, ...data } : p));
    setEditingPlan(null);
    showToast('Plan updated', 'success');
  };

  const handleDelete = async () => {
    if (!deletingPlan) return;
    const { error } = await supabase.from('test_plans').delete().eq('id', deletingPlan.id);
    if (error) { showToast('Failed to delete plan', 'error'); return; }
    setPlans(prev => prev.filter(p => p.id !== deletingPlan.id));
    setDeletingPlan(null);
    showToast('Plan deleted', 'success');
  };

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredPlans = plans.filter(p => {
    const tabMatch = activeTab === 'all' ? true : p.status === activeTab;
    const searchMatch = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return tabMatch && searchMatch;
  });

  const counts = {
    all: plans.length,
    active: plans.filter(p => p.status === 'active').length,
    planning: plans.filter(p => p.status === 'planning').length,
    completed: plans.filter(p => p.status === 'completed').length,
  };

  // ── Profile lookup ─────────────────────────────────────────────────────────
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const milestoneMap = new Map(milestones.map(m => [m.id, m]));

  if (loading) return <PageLoader />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}>
      <ProjectHeader projectId={id!} projectName={project?.name ?? ''} />

      {/* Page header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '1.25rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '72rem', margin: '0 auto' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Link to={`/projects/${id}`} style={{ color: '#64748B', fontSize: '0.8125rem', textDecoration: 'none' }} className="hover:text-indigo-600">
                {project?.name}
              </Link>
              <i className="ri-arrow-right-s-line" style={{ color: '#CBD5E1', fontSize: '0.875rem' }} />
              <span style={{ color: '#1E293B', fontSize: '0.8125rem', fontWeight: 500 }}>Test Plans</span>
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test Plans</h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0' }}>
              Organize test cases into structured campaigns linked to milestones.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setShowAIAssistant(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: '1px solid #E0E7FF', borderRadius: '0.5rem', background: '#EEF2FF', color: '#6366F1', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}
              className="hover:bg-indigo-100"
            >
              <i className="ri-sparkling-2-line" />
              AI Assistant
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', border: 'none', borderRadius: '0.5rem', background: '#6366F1', color: '#fff', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
              className="hover:bg-indigo-700"
            >
              <i className="ri-add-line" />
              New Plan
            </button>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 2rem' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {(['all', 'active', 'planning', 'completed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab ? '#6366F1' : 'transparent'}`,
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? '#6366F1' : '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span style={{ background: activeTab === tab ? '#EEF2FF' : '#F1F5F9', color: activeTab === tab ? '#6366F1' : '#64748B', borderRadius: '9999px', padding: '0 0.4rem', fontSize: '0.6875rem', fontWeight: 600 }}>
                  {counts[tab]}
                </span>
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <i className="ri-search-line" style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '0.875rem' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search plans..."
              style={{ paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem', fontSize: '0.8125rem', outline: 'none', width: '14rem' }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          {filteredPlans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
              <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <i className="ri-file-list-3-line" style={{ fontSize: '1.75rem', color: '#6366F1' }} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1E293B', margin: '0 0 0.5rem' }}>
                {searchQuery ? 'No plans found' : 'No test plans yet'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 1.5rem' }}>
                {searchQuery
                  ? 'Try a different search term.'
                  : 'Create your first test plan to organize test cases into structured campaigns.'}
              </p>
              {!searchQuery && (
                <button onClick={() => setShowCreateModal(true)}
                  style={{ padding: '0.625rem 1.25rem', border: 'none', borderRadius: '0.5rem', background: '#6366F1', color: '#fff', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                  <i className="ri-add-line" style={{ marginRight: '0.375rem' }} />
                  Create First Plan
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '1rem' }}>
              {filteredPlans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  milestone={plan.milestone_id ? milestoneMap.get(plan.milestone_id) : undefined}
                  ownerProfile={plan.owner_id ? profileMap.get(plan.owner_id) : undefined}
                  projectId={id!}
                  onEdit={setEditingPlan}
                  onDelete={setDeletingPlan}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {(showCreateModal || editingPlan) && (
        <PlanFormModal
          plan={editingPlan}
          milestones={milestones}
          profiles={profiles}
          onClose={() => { setShowCreateModal(false); setEditingPlan(null); }}
          onSave={editingPlan ? handleUpdate : handleCreate}
        />
      )}

      {deletingPlan && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)' }}>
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.5rem', maxWidth: '28rem', width: '100%', margin: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ri-delete-bin-line" style={{ color: '#EF4444', fontSize: '1.125rem' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', margin: 0 }}>Delete Test Plan</h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.25rem 0 0' }}>This action cannot be undone.</p>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
              Are you sure you want to delete <strong>"{deletingPlan.name}"</strong>? All test case associations will be removed. Linked runs will become ad-hoc.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeletingPlan(null)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', background: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDelete}
                style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.5rem', background: '#EF4444', color: '#fff', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {showAIAssistant && (
        <AIPlanAssistantModal
          projectId={id!}
          milestones={milestones}
          onClose={() => setShowAIAssistant(false)}
          onApply={(suggestedTcIds, planName) => {
            setShowAIAssistant(false);
            setShowCreateModal(true);
          }}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
