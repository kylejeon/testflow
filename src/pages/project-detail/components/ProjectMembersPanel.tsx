import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  profile: {
    email: string;
    full_name: string | null;
  };
}

interface ProjectMembersPanelProps {
  projectId: string;
  onInviteClick: () => void;
  refreshTrigger: number;
  /** compact=true: no outer wrapper/header, smaller avatars, read-only roles, for sidebar widgets */
  compact?: boolean;
  /** ownerId: project owner's user_id, used for self-heal if project_members is empty */
  ownerId?: string;
}

const AVATAR_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6'];

export default function ProjectMembersPanel({
  projectId,
  onInviteClick,
  refreshTrigger,
  compact = false,
  ownerId,
}: ProjectMembersPanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCurrentUser(), loadMembers()]).catch((e) => {
      console.error('Initial data loading failed:', e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refreshTrigger]);

  const getCurrentUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      setCurrentUserId(data.user?.id ?? null);
    } catch (e) {
      console.error('Failed to get current user:', e);
      setCurrentUserId(null);
    }
  };

  const loadMembers = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('id, user_id, role, created_at')
        .eq('project_id', projectId);

      if (membersError) {
        console.error('Members query error:', membersError);
        throw membersError;
      }

      if (!membersData || membersData.length === 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const healOwnerId = ownerId || (
          await supabase.from('projects').select('owner_id').eq('id', projectId).maybeSingle()
            .then(r => r.data?.owner_id)
        );
        if (user && healOwnerId && user.id === healOwnerId) {
          const { error: upsertErr } = await supabase.from('project_members').upsert({
            project_id: projectId,
            user_id: user.id,
            role: 'owner',
            invited_by: user.id,
          }, { onConflict: 'project_id,user_id' });
          if (!upsertErr) {
            const { data: reloaded } = await supabase
              .from('project_members').select('id, user_id, role, created_at').eq('project_id', projectId);
            if (reloaded && reloaded.length > 0) {
              membersData.push(...reloaded);
            }
          } else {
            console.error('Self-heal upsert failed:', upsertErr);
          }
        }
        if (!membersData || membersData.length === 0) {
          setMembers([]);
          return;
        }
      }

      const userIds = membersData.map((m) => m.user_id);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Profiles query error (non-fatal):', profilesError);
      }

      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.id, p])
      );

      const formattedMembers = membersData.map((m) => {
        const profile = profilesMap.get(m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          joined_at: m.created_at ?? null,
          profile: {
            email: profile?.email ?? '',
            full_name: profile?.full_name ?? null,
          },
        };
      });

      const ROLE_ORDER: Record<string, number> = { owner: 0, admin: 1, member: 2, viewer: 3 };
      formattedMembers.sort((a, b) => (ROLE_ORDER[a.role] ?? 4) - (ROLE_ORDER[b.role] ?? 4));

      setMembers(formattedMembers);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const currentMember = formattedMembers.find((m) => m.user_id === user.id);
        setCurrentUserRole(currentMember?.role ?? null);
      }
    } catch (e) {
      console.error('멤버 로딩 오류:', e);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    const isSelf = memberUserId === currentUserId;
    const confirmMsg = isSelf
      ? '정말 프로젝트에서 나가시겠습니까?'
      : '이 멤버를 프로젝트에서 제거하시겠습니까?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (e) {
      console.error('멤버 제거 오류:', e);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (e) {
      console.error('역할 변경 오류:', e);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const formatJoinedDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner': return { label: 'Owner', className: 'bg-[#F5F3FF] text-[#7C3AED]' };
      case 'admin': return { label: 'Admin', className: 'bg-[#FFF7ED] text-[#C2410C]' };
      case 'member': return { label: 'Member', className: 'bg-[#EEF2FF] text-[#4338CA]' };
      case 'viewer': return { label: 'Viewer', className: 'bg-[#F1F5F9] text-[#64748B]' };
      default: return { label: role, className: 'bg-[#F1F5F9] text-[#64748B]' };
    }
  };

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  // ── LOADING ─────────────────────────────────────────────────────
  if (loading) {
    if (compact) {
      return (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#6366F1]"></div>
        </div>
      );
    }
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#6366F1]"></div>
      </div>
    );
  }

  // ── COMPACT MODE (sidebar widget) ──────────────────────────────
  if (compact) {
    if (members.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-[0.75rem] text-[#94A3B8] mb-2">No members yet</p>
          <button onClick={onInviteClick} className="text-[0.75rem] font-semibold text-[#6366F1] hover:text-[#4F46E5] cursor-pointer">
            Invite first member →
          </button>
        </div>
      );
    }
    return (
      <div>
        {members.map((member, index) => {
          const badge = getRoleBadge(member.role);
          return (
            <div key={member.id} className="flex items-center gap-2.5 py-2 border-b border-[#F1F5F9] last:border-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length], fontSize: '0.5rem' }}
              >
                {getInitials(member.profile.full_name, member.profile.email)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.8125rem] font-semibold text-[#0F172A] truncate">
                  {member.profile.full_name || member.profile.email}
                </div>
                <div className="text-[0.6875rem] text-[#94A3B8] truncate">{member.profile.email}</div>
              </div>
              <span className={`text-[0.625rem] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${badge.className}`}>
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── FULL MODE (table) ───────────────────────────────────────────
  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-3">
          <i className="ri-team-line text-[#94A3B8]" style={{ fontSize: '1.5rem' }}></i>
        </div>
        <div className="text-[0.9375rem] font-semibold text-[#0F172A] mb-1">No members yet</div>
        <p className="text-[0.8125rem] text-[#94A3B8] mb-4">Invite your first team member to get started.</p>
        <button
          onClick={onInviteClick}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-[0.375rem] bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors cursor-pointer"
        >
          <i className="ri-user-add-line"></i> Invite Member
        </button>
      </div>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {[
            { label: 'Member', width: '38%' },
            { label: 'Role', width: '14%' },
            { label: 'Joined', width: '18%' },
            { label: 'Last Active', width: '16%' },
            { label: 'Actions', width: '14%', right: true },
          ].map(col => (
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
          const isOwner = member.role === 'owner';
          const isSelf = member.user_id === currentUserId;
          const canEdit = isAdminOrOwner && !isOwner;
          const isLast = index === members.length - 1;

          return (
            <tr
              key={member.id}
              style={{ background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFF')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Member */}
              <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', color: '#334155', borderBottom: isLast ? 'none' : '1px solid #F1F5F9', verticalAlign: 'middle' }}>
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
                      {isSelf && <span style={{ marginLeft: '0.375rem', fontSize: '0.6875rem', color: '#94A3B8' }}>(나)</span>}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>{member.profile.email}</div>
                  </div>
                </div>
              </td>

              {/* Role */}
              <td style={{ padding: '0.625rem 0.75rem', borderBottom: isLast ? 'none' : '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                {canEdit ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    style={{
                      fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem 0.5rem',
                      border: '1px solid #E2E8F0', borderRadius: '0.375rem',
                      background: '#fff', color: '#475569', cursor: 'pointer', outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                )}
              </td>

              {/* Joined */}
              <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#94A3B8', borderBottom: isLast ? 'none' : '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                {formatJoinedDate(member.joined_at)}
              </td>

              {/* Last Active */}
              <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#94A3B8', borderBottom: isLast ? 'none' : '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                —
              </td>

              {/* Actions */}
              <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', borderBottom: isLast ? 'none' : '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                {isOwner ? (
                  <span style={{ fontSize: '0.625rem', color: '#CBD5E1' }}>Owner</span>
                ) : canEdit || isSelf ? (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.user_id)}
                    title={isSelf ? 'Leave project' : 'Remove member'}
                    style={{
                      width: '1.5rem', height: '1.5rem', borderRadius: '0.25rem',
                      border: 'none', background: 'none', color: '#CBD5E1',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '0.875rem', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#CBD5E1'; }}
                  >
                    <i className="ri-delete-bin-line"></i>
                  </button>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
