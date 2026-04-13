import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { ModalShell } from '../../../components/ModalShell';
import { getAvailableRoles, getRoleLabel, ROLE_BADGE } from '../../../lib/rbac';

interface OrgMemberEntry {
  userId: string;
  email: string;
  fullName: string | null;
  orgRole: string;
  selectedRole: string; // project role override (defaults to orgRole)
  checked: boolean;
}

interface AddMembersToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  orgId: string;
  subscriptionTier: number;
  onAdded: () => void;
}

const AVATAR_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6'];

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

export default function AddMembersToProjectModal({
  isOpen,
  onClose,
  projectId,
  orgId,
  subscriptionTier,
  onAdded,
}: AddMembersToProjectModalProps) {
  const [candidates, setCandidates] = useState<OrgMemberEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const availableRoles = getAvailableRoles(subscriptionTier).filter((r) => r !== 'owner');

  useEffect(() => {
    if (isOpen) loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId, orgId]);

  const loadCandidates = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Fetch all org members
      const { data: orgMembers, error: orgErr } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', orgId);

      if (orgErr) throw orgErr;
      if (!orgMembers || orgMembers.length === 0) {
        setCandidates([]);
        return;
      }

      // Fetch existing project members (to exclude)
      const { data: projectMembers } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);

      const existingUserIds = new Set((projectMembers || []).map((m) => m.user_id));

      // Filter: org members NOT already in this project
      const eligible = orgMembers.filter((m) => !existingUserIds.has(m.user_id));
      if (eligible.length === 0) {
        setCandidates([]);
        return;
      }

      // Fetch profiles
      const userIds = eligible.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const entries: OrgMemberEntry[] = eligible.map((m) => {
        const profile = profileMap.get(m.user_id);
        return {
          userId: m.user_id,
          email: profile?.email ?? '',
          fullName: profile?.full_name ?? null,
          orgRole: m.role,
          selectedRole: m.role, // default: same as org role
          checked: false,
        };
      });

      // Sort by name
      entries.sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email));
      setCandidates(entries);
    } catch (e: any) {
      console.error('[AddMembersToProjectModal] load error:', e);
      setError('Failed to load organization members.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (userId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.userId === userId ? { ...c, checked: !c.checked } : c))
    );
  };

  const setProjectRole = (userId: string, role: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.userId === userId ? { ...c, selectedRole: role } : c))
    );
  };

  const toggleAll = () => {
    const allChecked = candidates.every((c) => c.checked);
    setCandidates((prev) => prev.map((c) => ({ ...c, checked: !allChecked })));
  };

  const selectedCount = candidates.filter((c) => c.checked).length;

  const handleAdd = async () => {
    const toAdd = candidates.filter((c) => c.checked);
    if (toAdd.length === 0) return;

    setSaving(true);
    setError('');
    try {
      const rows = toAdd.map((c) => ({
        project_id: projectId,
        user_id: c.userId,
        // legacy role field: same as selectedRole for compatibility
        role: c.selectedRole,
        // role_override: NULL if same as org role, set if different
        role_override: c.selectedRole !== c.orgRole ? c.selectedRole : null,
        invited_by: null,
      }));

      const { error: insertErr } = await supabase
        .from('project_members')
        .insert(rows);

      if (insertErr) throw insertErr;

      setSuccess(`${toAdd.length} member${toAdd.length > 1 ? 's' : ''} added to the project.`);
      setTimeout(() => {
        onAdded();
        onClose();
      }, 1200);
    } catch (e: any) {
      console.error('[AddMembersToProjectModal] add error:', e);
      setError(e.message || 'Failed to add members.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <i className="ri-user-add-line text-indigo-600 text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Members to Project</h2>
              <p className="text-sm text-gray-500">Select org members to add to this project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <i className="ri-error-warning-line" />{error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <i className="ri-check-line" />{success}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <i className="ri-loader-4-line animate-spin text-2xl text-indigo-500" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="ri-team-line text-slate-400 text-2xl" />
              </div>
              <div className="text-[0.9375rem] font-semibold text-slate-900 mb-1">All org members added</div>
              <p className="text-[0.8125rem] text-slate-500 mb-4">Every organization member is already in this project.</p>
            </div>
          ) : (
            <>
              {/* Select all row */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-[0.8125rem] text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={candidates.every((c) => c.checked)}
                    onChange={toggleAll}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  Select all ({candidates.length})
                </label>
                {selectedCount > 0 && (
                  <span className="text-[0.75rem] text-indigo-600 font-semibold">{selectedCount} selected</span>
                )}
              </div>

              {/* Member list */}
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {candidates.map((c, index) => {
                  const badge = ROLE_BADGE[c.orgRole];
                  const isOverride = c.selectedRole !== c.orgRole;
                  return (
                    <div
                      key={c.userId}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        c.checked ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={c.checked}
                        onChange={() => toggleCheck(c.userId)}
                        className="w-4 h-4 text-indigo-600 rounded flex-shrink-0 cursor-pointer"
                      />
                      {/* Avatar */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length], fontSize: '0.5rem' }}
                      >
                        {getInitials(c.fullName, c.email)}
                      </div>
                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.8125rem] font-semibold text-slate-900 truncate">
                          {c.fullName || c.email}
                        </div>
                        <div className="text-[0.6875rem] text-slate-400 truncate">{c.email}</div>
                      </div>
                      {/* Org role badge */}
                      <span className={`text-[0.5625rem] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${badge?.className ?? 'bg-slate-100 text-slate-500'}`}>
                        {getRoleLabel(c.orgRole, subscriptionTier)} <span className="opacity-60">(org)</span>
                      </span>
                      {/* Project role override dropdown */}
                      <select
                        value={c.selectedRole}
                        onChange={(e) => setProjectRole(c.userId, e.target.value)}
                        className={`text-[0.6875rem] font-medium px-1.5 py-1 rounded border focus:outline-none cursor-pointer flex-shrink-0 ${
                          isOverride
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                        style={{ fontFamily: 'inherit' }}
                        title="Project role (overrides org role for this project)"
                      >
                        {availableRoles.map((r) => (
                          <option key={r} value={r}>
                            {getRoleLabel(r, subscriptionTier)}{r === c.orgRole ? ' (org)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Hint: invite new people via org */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[0.75rem] text-slate-500">
                <i className="ri-information-line mr-1 text-slate-400" />
                Need to add someone new?{' '}
                <Link
                  to="/settings?tab=members"
                  className="text-indigo-500 font-semibold hover:underline"
                  onClick={onClose}
                >
                  Invite them to your organization first.
                </Link>
              </div>
            </>
          )}

          {!loading && !success && (
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || selectedCount === 0}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving
                  ? <><i className="ri-loader-4-line animate-spin" />Adding…</>
                  : <><i className="ri-user-add-line" />Add Selected ({selectedCount})</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
