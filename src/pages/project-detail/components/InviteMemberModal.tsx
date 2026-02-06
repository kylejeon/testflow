
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onInvited: () => void;
}

const TIER_LIMITS = {
  1: { maxProjects: 3, maxMembers: 5 },
  2: { maxProjects: Infinity, maxMembers: 50 },
  3: { maxProjects: Infinity, maxMembers: Infinity },
};

export default function InviteMemberModal({
  isOpen,
  onClose,
  projectId,
  onInvited,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [loading, setLoading] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitationType, setInvitationType] = useState<'existing' | 'new' | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  
  // Tier limit states
  const [canInvite, setCanInvite] = useState(true);
  const [currentMemberCount, setCurrentMemberCount] = useState(0);
  const [maxMembers, setMaxMembers] = useState(5);
  const [subscriptionTier, setSubscriptionTier] = useState(1);

  useEffect(() => {
    if (isOpen) {
      checkMemberLimit();
    }
  }, [isOpen, projectId]);

  const checkMemberLimit = async () => {
    try {
      setCheckingLimit(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's subscription tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle();

      const tier = profile?.subscription_tier || 1;
      setSubscriptionTier(tier);
      const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
      setMaxMembers(limits.maxMembers);

      // Count current project members
      const { count } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      const memberCount = count || 0;
      setCurrentMemberCount(memberCount);
      setCanInvite(memberCount < limits.maxMembers);
    } catch (error) {
      console.error('Error checking member limit:', error);
    } finally {
      setCheckingLimit(false);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    if (!canInvite) {
      setError(`팀 멤버 한도(${maxMembers}명)에 도달했습니다.`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        // Existing user - add directly to project
        const { error: memberError } = await supabase
          .from('project_members')
          .insert({
            project_id: projectId,
            user_id: existingUser.id,
            role,
          });

        if (memberError) {
          if (memberError.code === '23505') {
            throw new Error('이미 프로젝트 멤버입니다.');
          }
          throw memberError;
        }

        setInvitationType('existing');
        setSuccess(`${email} 사용자를 프로젝트에 추가했습니다.`);
        
        setEmail('');
        setFullName('');
        setRole('member');

        setTimeout(() => {
          onInvited();
          onClose();
        }, 2000);
      } else {
        // New user - create invitation
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/send-invitation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              email,
              fullName: fullName.trim() || undefined,
              projectId,
              role,
              baseUrl: window.location.origin,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || '초대 생성에 실패했습니다.');
        }

        setInvitationType('new');
        setInviteLink(result.inviteUrl);
        setSuccess('초대 링크가 생성되었습니다! 아래 링크를 복사해서 팀원에게 전달해주세요.');
        
        // Don't clear form or close modal - let user copy the link
      }
    } catch (err: any) {
      console.error('Invitation error:', err);
      setError(err.message || '초대에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setSuccess('초대 링크가 클립보드에 복사되었습니다! 팀원에게 전달해주세요.');
    }
  };

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setRole('member');
    setError('');
    setSuccess('');
    setInviteLink(null);
    setInvitationType(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <i className="ri-user-add-line text-teal-600 text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">멤버 초대</h2>
              <p className="text-sm text-gray-500">프로젝트에 팀원을 초대하세요</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl text-gray-500"></i>
          </button>
        </div>

        {/* Content */}
        {checkingLimit ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        ) : !canInvite ? (
          <div className="p-6">
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-team-line text-3xl text-amber-600"></i>
              </div>
              <h3 className="text-lg font-bold text-amber-800 mb-2">팀 멤버 한도 초과</h3>
              <p className="text-amber-700 mb-4">
                {subscriptionTier === 1 ? 'Free' : subscriptionTier === 2 ? 'Professional' : 'Enterprise'} 요금제에서는 
                프로젝트당 최대 {maxMembers}명의 멤버만 초대할 수 있습니다.
                <br />
                현재 {currentMemberCount}명의 멤버가 있습니다.
              </p>
              <p className="text-sm text-amber-600 mb-4">
                더 많은 팀원이 필요하시면 요금제를 업그레이드해 주세요.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap"
                >
                  닫기
                </button>
                <a
                  href="/settings"
                  className="px-5 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
                >
                  <i className="ri-vip-crown-line"></i>
                  요금제 확인
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {subscriptionTier === 1 && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                <i className="ri-information-line text-gray-500"></i>
                <span className="text-sm text-gray-600">
                  Free 요금제: {currentMemberCount}/{maxMembers}명 멤버 사용 중
                </span>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <i className="ri-error-warning-line"></i>
                {error}
              </div>
            )}
            
            {success && inviteLink && (
              <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <i className="ri-checkbox-circle-fill text-teal-600 text-xl"></i>
                  <div className="flex-1">
                    <p className="text-sm text-teal-800 font-semibold mb-2">{success}</p>
                    <p className="text-xs text-teal-700 mb-3">
                      <i className="ri-information-line mr-1"></i>
                      이메일 자동 발송이 비활성화되어 있습니다. 아래 링크를 복사해서 직접 전달해주세요.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white border border-teal-200 rounded-lg">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 text-sm text-gray-700 bg-transparent border-none outline-none"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="px-3 py-1.5 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer"
                  >
                    <i className="ri-file-copy-line"></i>
                    복사
                  </button>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      resetForm();
                      onInvited();
                      onClose();
                    }}
                    className="px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    완료
                  </button>
                </div>
              </div>
            )}
            
            {success && !inviteLink && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <i className="ri-check-line"></i>
                {success}
              </div>
            )}

            {!inviteLink && (
              <form onSubmit={(e) => { e.preventDefault(); handleInvite(); }}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    이름
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    <i className="ri-information-line mr-1"></i>
                    미가입 사용자의 경우 가입 시 이 이름이 프로필에 저장됩니다
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    이메일 주소 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teammate@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    <i className="ri-information-line mr-1"></i>
                    가입된 사용자는 바로 추가되고, 미가입 사용자에게는 초대 링크가 생성됩니다
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    역할
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={role === 'admin'}
                        onChange={() => setRole('admin')}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">Admin</div>
                        <div className="text-xs text-gray-500">
                          모든 권한 (멤버 관리, 설정 변경)
                        </div>
                      </div>
                      <i className="ri-shield-star-line text-orange-500"></i>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="role"
                        value="member"
                        checked={role === 'member'}
                        onChange={() => setRole('member')}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">Member</div>
                        <div className="text-xs text-gray-500">
                          테스트 케이스, 세션 생성 및 편집
                        </div>
                      </div>
                      <i className="ri-user-line text-teal-500"></i>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="role"
                        value="viewer"
                        checked={role === 'viewer'}
                        onChange={() => setRole('viewer')}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">Viewer</div>
                        <div className="text-xs text-gray-500">읽기 전용 접근</div>
                      </div>
                      <i className="ri-eye-line text-gray-500"></i>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      onClose();
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="flex-1 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        처리 중...
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-line"></i>
                        초대하기
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
