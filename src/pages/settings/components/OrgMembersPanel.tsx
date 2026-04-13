import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ROLE_LEVEL, ROLE_BADGE, ROLE_DESCRIPTIONS, getRoleLabel, getAvailableRoles } from '../../../lib/rbac';

interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: {
    email: string;
    full_name: string | null;
  };
}

interface OrgMembersPanelProps {
  orgId: string;
  currentUserRole: string;
  subscriptionTier: number;
  refreshTrigger: number;
  onInvited: () => void;
}

const AVATAR_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6'];

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OrgMembersPanel({
  orgId,
  currentUserRole,
  subscriptionTier,
  refreshTrigger,
  onInvited,
}: OrgMembersPanelProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; userId: string; name: string; isSelf: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const currentLevel = ROLE_LEVEL[currentUserRole] ?? 0;
  const isAdminOrOwner = currentLevel >= 5; // admin+

  const availableRoles = getAvailableRoles(subscriptionTier);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, refreshTrigger]);

  const loadMembers = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data: membersData, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, joined_at')
        .eq('organization_id', orgId);

      if (error) throw error;
      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      const userIds = membersData.map((m) => m.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

      const formatted: OrgMember[] = membersData.map((m) => {
        const profile = profileMap.get(m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at,
          profile: {
            email: profile?.email ?? '',
            full_name: profile?.full_name ?? null,
          },
        };
      });

      const ROLE_ORDER: Record<string, number> = { owner: 0, admin: 1, manager: 2, tester: 3, viewer: 4, guest: 5 };
      formatted.sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
      setMembers(formatted);
    } catch (e) {
      console.error('[OrgMembersPanel] loadMembers error:', e);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, membUserUserId: string, newRole: string) => {
    // owner 강등 방지: 마지막 owner는 강등 불가
    if (newRole !== 'owner') {
      const ownerCount = members.filter((m) => m.role === 'owner').length;
      const target = members.find((m) => m.id === memberId);
      if (target?.role === 'owner' && ownerCount <= 1) {
        alert('Organization must have at least one owner.');
        return;
      }
    }
    // 자신보다 높은 역할로 변경 불가
    if ((ROLE_LEVEL[newRole] ?? 0) >= currentLevel) {
      return;
    }
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);
      if (error) throw error;
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    } catch (e) {
      console.error('[OrgMembersPanel] role change error:', e);
    }
  };

  const confirmRemove = (member: OrgMember) => {
    const isSelf = member.user_id === currentUserId;
    // owner 제거 방지
    if (member.role === 'owner') {
      const ownerCount = members.filter((m) => m.role === 'owner').length;
      if (ownerCount <= 1) {
        alert('Cannot remove the last owner of the organization.');
        return;
      }
    }
    setDeleteTarget({
      id: member.id,
      userId: member.user_id,
      name: member.profile.full_name || member.profile.email,
      isSelf,
    });
  };

  const handleRemoveMember = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error('[OrgMembersPanel] remove error:', e);
    } finally {
      setDeleting(false);
    }
  };

  /** 이 멤버에 대해 Remove 버튼을 보여줄 수 있는지 */
  const canRemove = (member: OrgMember): boolean => {
    if (!isAdminOrOwner && member.user_id !== currentUserId) return false;
    if (currentUserRole === 'admin') {
      // admin은 자신보다 낮은 역할만 제거 가능
      return (ROLE_LEVEL[member.role] ?? 0) < currentLevel;
    }
    return true; // owner는 모두 제거 가능 (자기 자신 포함)
  };

  /** 이 멤버의 역할 드롭다운을 보여줄 수 있는지 */
  const canEditRole = (member: OrgMember): boolean => {
    if (!isAdminOrOwner) return false;
    if (member.user_id === currentUserId) return false; // 자기 자신은 변경 불가
    return (ROLE_LEVEL[member.role] ?? 0) < currentLevel;
  };

  if (loading) {
    return <div className="flex justify-center py-8"><i className="ri-loader-4-line animate-spin text-xl text-indigo-500" /></div>;
  }

  return (
    <>
      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.45)' }}>
          <div className="bg-white rounded-[0.75rem] shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="ri-delete-bin-line text-rose-500" style={{ fontSize: '1.25rem' }}></i>
            </div>
            <h3 className="text-[0.9375rem] font-bold text-slate-900 text-center mb-1">
              {deleteTarget.isSelf ? 'Leave Organization?' : 'Remove Member?'}
            </h3>
            <p className="text-[0.8125rem] text-slate-500 text-center mb-5">
              {deleteTarget.isSelf
                ? 'Are you sure you want to leave this organization?'
                : <>Remove <span className="font-semibold text-slate-900">{deleteTarget.name}</span> from the organization?</>}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-[0.4375rem] border border-slate-200 bg-white text-slate-600 text-[0.8125rem] font-medium rounded-[0.375rem] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={deleting}
                className="flex-1 px-4 py-[0.4375rem] bg-rose-500 text-white text-[0.8125rem] font-semibold rounded-[0.375rem] hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? <><i className="ri-loader-4-line animate-spin mr-1" />Removing…</> : (deleteTarget.isSelf ? 'Leave' : 'Remove')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <OrgInviteModal
          orgId={orgId}
          subscriptionTier={subscriptionTier}
          availableRoles={availableRoles}
          currentLevel={currentLevel}
          onClose={() => setShowInviteModal(false)}
          onInvited={() => { setShowInviteModal(false); loadMembers(); onInvited(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[0.9375rem] font-bold text-slate-900 mb-0.5">Organization Members</h3>
          <p className="text-[0.8125rem] text-slate-500">Manage team members and their roles across all projects.</p>
        </div>
        {isAdminOrOwner && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-4 py-[0.4375rem] bg-indigo-500 text-white text-[0.8125rem] font-semibold rounded-lg hover:bg-indigo-600 transition-colors cursor-pointer flex-shrink-0 ml-4"
          >
            <i className="ri-user-add-line" />
            Invite Member
          </button>
        )}
      </div>

      {/* Table */}
      {members.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="ri-team-line text-slate-400" style={{ fontSize: '1.5rem' }}></i>
          </div>
          <div className="text-[0.9375rem] font-semibold text-slate-900 mb-1">No members yet</div>
          <p className="text-[0.8125rem] text-slate-400 mb-4">Invite your first team member to get started.</p>
          {isAdminOrOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-[0.375rem] bg-indigo-500 text-white hover:bg-indigo-600 transition-colors cursor-pointer"
            >
              <i className="ri-user-add-line" /> Invite Member
            </button>
          )}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                { label: 'Member', width: '40%' },
                { label: 'Role', width: '20%' },
                { label: 'Joined', width: '24%' },
                { label: 'Actions', width: '16%', right: true },
              ].map((col) => (
                <th
                  key={col.label}
                  style={{
                    width: col.width,
                    background: '#F8FAFC',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.04em',
                    color: '#94A3B8',
                    padding: '0.625rem 0.75rem',
                    textAlign: col.right ? 'right' as const : 'left' as const,
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => {
              const isSelf = member.user_id === currentUserId;
              const isLast = index === members.length - 1;
              const badge = ROLE_BADGE[member.role] ?? { label: member.role, className: 'bg-slate-100 text-slate-500' };
              const roleLabel = getRoleLabel(member.role, subscriptionTier);

              return (
                <tr
                  key={member.id}
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFF')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                >
                  {/* Member */}
                  <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', borderBottom: isLast ? 'none' : '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div
                        style={{
                          width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                          background: AVATAR_COLORS[index % AVATAR_COLORS.length],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.5rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}
                      >
                        {getInitials(member.profile.full_name, member.profile.email)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>
                          {member.profile.full_name || member.profile.email}
                          {isSelf && <span style={{ marginLeft: '0.375rem', fontSize: '0.6875rem', color: '#94A3B8' }}>(me)</span>}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>{member.profile.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: '0.625rem 0.75rem', borderBottom: isLast ? 'none' : '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                    {canEditRole(member) ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, member.user_id, e.target.value)}
                        style={{
                          fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem 0.5rem',
                          border: '1px solid #E2E8F0', borderRadius: '0.375rem',
                          background: '#fff', color: '#475569', cursor: 'pointer', outline: 'none',
                          fontFamily: 'inherit',
                        }}
                      >
                        {availableRoles
                          .filter((r) => r !== 'owner' && (ROLE_LEVEL[r] ?? 0) < currentLevel)
                          .map((r) => (
                            <option key={r} value={r}>{getRoleLabel(r, subscriptionTier)}</option>
                          ))}
                      </select>
                    ) : (
                      <span className={`text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                        {roleLabel}
                      </span>
                    )}
                  </td>

                  {/* Joined */}
                  <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#94A3B8', borderBottom: isLast ? 'none' : '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                    {formatDate(member.joined_at)}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', borderBottom: isLast ? 'none' : '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                    {canRemove(member) ? (
                      <button
                        onClick={() => confirmRemove(member)}
                        title={isSelf ? 'Leave organization' : 'Remove member'}
                        style={{
                          width: '1.5rem', height: '1.5rem', borderRadius: '0.25rem',
                          border: 'none', background: 'none', color: '#CBD5E1',
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '0.875rem', transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#CBD5E1'; }}
                      >
                        <i className="ri-delete-bin-line" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

// ── OrgInviteModal (inline, 기존 사용자 직접 추가) ─────────────

interface OrgInviteModalProps {
  orgId: string;
  subscriptionTier: number;
  availableRoles: string[];
  currentLevel: number;
  onClose: () => void;
  onInvited: () => void;
}

function OrgInviteModal({ orgId, subscriptionTier, availableRoles, currentLevel, onClose, onInvited }: OrgInviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('tester');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 초대 가능한 역할만 표시 (자신보다 낮은 역할 + owner 제외)
  const invitableRoles = availableRoles.filter(
    (r) => r !== 'owner' && (ROLE_LEVEL[r] ?? 0) < currentLevel
  );

  const handleInvite = async () => {
    if (!email.trim()) { setError('Please enter an email address.'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // 기존 사용자 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();

      if (!profile) {
        setError('User not found. Ask them to sign up first, then invite them.');
        return;
      }

      // 이미 멤버인지 확인
      const { data: existing } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existing) {
        setError('This user is already an organization member.');
        return;
      }

      const { error: insertError } = await supabase
        .from('organization_members')
        .insert({ organization_id: orgId, user_id: profile.id, role });

      if (insertError) throw insertError;

      setSuccess(`${email} has been added to the organization as ${getRoleLabel(role, subscriptionTier)}.`);
      setTimeout(() => { onInvited(); }, 1500);
    } catch (e: any) {
      console.error('[OrgInviteModal] invite error:', e);
      setError(e.message || 'Failed to invite member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.45)' }}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <i className="ri-user-add-line text-indigo-600 text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Invite to Organization</h2>
              <p className="text-sm text-gray-500">Add an existing Testably user to your org</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <i className="ri-close-line text-xl text-gray-500" />
          </button>
        </div>

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

          {!success && (
            <form onSubmit={(e) => { e.preventDefault(); handleInvite(); }}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  <i className="ri-information-line mr-1" />
                  Only existing Testably accounts can be added directly
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                <div className="space-y-2">
                  {invitableRoles.map((r) => {
                    const desc = ROLE_DESCRIPTIONS[r] ?? '';
                    const badge = ROLE_BADGE[r];
                    return (
                      <label key={r} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="org-role"
                          value={r}
                          checked={role === r}
                          onChange={() => setRole(r)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">{getRoleLabel(r, subscriptionTier)}</div>
                          <div className="text-xs text-gray-500">{desc}</div>
                        </div>
                        <span className={`text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full ${badge?.className ?? ''}`}>
                          {getRoleLabel(r, subscriptionTier)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <><i className="ri-loader-4-line animate-spin" />Adding…</> : <><i className="ri-user-add-line" />Add Member</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
