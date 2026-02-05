import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Member {
  id: string;
  user_id: string;
  role: string;
  invited_at: string;
  profile: {
    email: string;
    full_name: string | null;
  };
}

interface ProjectMembersPanelProps {
  projectId: string;
  onInviteClick: () => void;
  refreshTrigger: number;
}

/**
 * ProjectMembersPanel
 *
 * Displays the list of members for a given project and allows
 * inviting, role‑changing and removal of members.
 *
 * The component is defensive:
 *  - All async calls are wrapped in try/catch.
 *  - Errors are logged and a fallback UI is shown if data can’t be loaded.
 *  - Confirmation dialogs guard destructive actions.
 */
export default function ProjectMembersPanel({
  projectId,
  onInviteClick,
  refreshTrigger,
}: ProjectMembersPanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  /** Load current user and members whenever the projectId or a manual refresh occurs */
  useEffect(() => {
    // Fire both async calls in parallel to reduce waiting time
    Promise.all([getCurrentUser(), loadMembers()]).catch((e) => {
      console.error('Initial data loading failed:', e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refreshTrigger]);

  /** Retrieve the logged‑in user's id */
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
      // Get project members first
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('id, user_id, role, invited_at')
        .eq('project_id', projectId);

      if (membersError) {
        console.error('Members query error:', membersError);
        throw membersError;
      }

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Get user IDs
      const userIds = membersData.map((m) => m.user_id);

      // Get profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Profiles query error:', profilesError);
        throw profilesError;
      }

      // Create a map of profiles by user_id
      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.id, p])
      );

      // Format the data
      const formattedMembers = membersData.map((m) => {
        const profile = profilesMap.get(m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          invited_at: m.invited_at,
          profile: {
            email: profile?.email ?? '',
            full_name: profile?.full_name ?? null,
          },
        };
      });

      setMembers(formattedMembers);

      // Get current user's role in this project
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

  /** Remove a member (or let the current user leave) */
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

      // Optimistically update UI without re‑fetching all data
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (e) {
      console.error('멤버 제거 오류:', e);
    }
  };

  /** Change a member's role */
  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      // Update the role locally for snappy UI
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (e) {
      console.error('역할 변경 오류:', e);
    }
  };

  /** Helper to create initials for avatar */
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  /** Mapping role → badge appearance */
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: 'Owner', className: 'bg-purple-100 text-purple-700' };
      case 'admin':
        return { label: 'Admin', className: 'bg-orange-100 text-orange-700' };
      case 'member':
        return { label: 'Member', className: 'bg-teal-100 text-teal-700' };
      case 'viewer':
        return { label: 'Viewer', className: 'bg-gray-100 text-gray-700' };
      default:
        return { label: role, className: 'bg-gray-100 text-gray-700' };
    }
  };

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  /** Simple deterministic color picker for avatars */
  const getAvatarColor = (index: number) => {
    const colors = [
      'from-teal-400 to-teal-600',
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-orange-400 to-orange-600',
      'from-green-400 to-green-600',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Team Members</h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Team Members</h2>
        <button
          onClick={onInviteClick}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all text-sm font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1.5"
        >
          <i className="ri-user-add-line"></i>
          Invite
        </button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="ri-team-line text-gray-400 text-xl"></i>
          </div>
          <p className="text-sm text-gray-500 mb-3">아직 팀원이 없습니다</p>
          <button
            onClick={onInviteClick}
            className="text-teal-600 hover:text-teal-700 text-sm font-semibold cursor-pointer"
          >
            첫 번째 멤버 초대하기 →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member, index) => {
            const badge = getRoleBadge(member.role);
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div
                  className={`w-10 h-10 bg-gradient-to-br ${getAvatarColor(
                    index
                  )} rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}
                >
                  {getInitials(member.profile.full_name, member.profile.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">
                    {member.profile.full_name || member.profile.email}
                    {member.user_id === currentUserId && (
                      <span className="ml-2 text-xs text-gray-500">(나)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {member.profile.email}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdminOrOwner && member.role !== 'owner' ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.id, e.target.value)
                      }
                      className={`min-w-[80px] px-2 py-1 rounded-full text-xs font-semibold ${badge.className} border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500`}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span
                      className={`min-w-[80px] px-2 py-1 rounded-full text-xs font-semibold text-center ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  )}
                  {/* X 버튼 영역 - 항상 공간 확보 */}
                  <div className="w-8 h-8 flex items-center justify-center">
                    {isAdminOrOwner && member.user_id !== currentUserId && member.role !== 'owner' && (
                      <button
                        onClick={() =>
                          handleRemoveMember(member.id, member.user_id)
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="멤버 제거"
                      >
                        <i className="ri-close-line text-lg"></i>
                      </button>
                    )}
                    {member.user_id === currentUserId && (
                      <button
                        onClick={() =>
                          handleRemoveMember(member.id, member.user_id)
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="프로젝트 나가기"
                      >
                        <i className="ri-close-line text-lg"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
