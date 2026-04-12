import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ModalShell } from '../../../components/ModalShell';
import { notifyProjectMembers } from '../../../hooks/useNotifications';
import { triggerWebhook } from '../../../hooks/useWebhooks';
import { markOnboardingStep } from '../../../lib/onboardingMarker';
import UpgradeBanner from '../../../components/UpgradeBanner';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onInvited: () => void;
}

const TIER_LIMITS = {
  1: { maxProjects: 1,        maxMembers: 2        }, // Free
  2: { maxProjects: 3,        maxMembers: 5        }, // Hobby
  3: { maxProjects: 10,       maxMembers: 5        }, // Starter
  4: { maxProjects: Infinity, maxMembers: 20       }, // Professional
  5: { maxProjects: Infinity, maxMembers: Infinity }, // Enterprise
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

      // Count current project members (Viewer role excluded from seat limit)
      const { count } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .neq('role', 'viewer');

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
      setError('Please enter an email address.');
      return;
    }

    if (!canInvite) {
      setError(`You have reached the team member limit (${maxMembers}).`);
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
            throw new Error('This user is already a project member.');
          }
          throw memberError;
        }

        // Get project name for notification
        const { data: projectData } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .maybeSingle();

        // Notify project members (respects each user's notification preferences)
        // type: 'invitation_sent' — inviter is excluded, newly added member is included
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        await notifyProjectMembers({
          projectId,
          excludeUserId: currentUser?.id,
          type: 'invitation_sent',
          title: 'New member joined the project',
          message: `${email} has been added to ${projectData?.name || 'the project'} as ${role}.`,
          link: `/projects/${projectId}`,
        });

        // Fire webhook events for member notifications
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', currentUser?.id ?? '')
          .maybeSingle();

        triggerWebhook(projectId, 'invitation_received', {
          project_id: projectId,
          project_name: projectData?.name ?? '',
          invited_by: inviterProfile?.full_name || inviterProfile?.email || 'Someone',
          role,
        });
        triggerWebhook(projectId, 'member_joined', {
          project_id: projectId,
          project_name: projectData?.name ?? '',
          member_name: email,
          member_email: email,
          role,
        });

        // Email notification: project_invited → the invited user (transactional)
        void supabase.functions.invoke('send-notification', {
          body: {
            event_type: 'project_invited',
            payload: {
              project_name: projectData?.name ?? '',
              role,
              inviter_name: inviterProfile?.full_name || inviterProfile?.email || 'Someone',
              cta_url: `${window.location.origin}/projects/${projectId}`,
            },
            recipients: [{ user_id: existingUser.id, email }],
          },
        }).catch((err) => console.warn('project_invited email notification error:', err));

        setInvitationType('existing');
        setSuccess(`${email} has been added to the project and notified by email.`);
        
        setEmail('');
        setFullName('');
        setRole('member');

        void markOnboardingStep('inviteMember');
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
          throw new Error(result.error || 'Failed to create invitation.');
        }

        // Email notification: project_invited → new user (no account yet, user_id null)
        void supabase.functions.invoke('send-notification', {
          body: {
            event_type: 'project_invited',
            payload: {
              project_name: result.projectName ?? '',
              role,
              inviter_name: result.inviterName ?? 'Someone',
              cta_url: result.inviteUrl,
            },
            recipients: [{ user_id: null, email }],
          },
        }).catch((err) => console.warn('project_invited email notification error:', err));

        setInvitationType('new');
        setInviteLink(result.inviteUrl);
        setSuccess('Invitation sent! An email has been sent to your teammate. You can also copy the link below to share directly.');
      }
    } catch (err: any) {
      console.error('Invitation error:', err);
      setError(err.message || 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setSuccess('Invite link copied to clipboard! Share it with your teammate.');
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
    <ModalShell onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <i className="ri-user-add-line text-indigo-600 text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Invite Member</h2>
              <p className="text-sm text-gray-500">Invite teammates to this project</p>
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
            <i className="ri-loader-4-line animate-spin text-2xl text-indigo-500" />
          </div>
        ) : !canInvite ? (
          <div className="p-6">
            <UpgradeBanner
              message={`You've used ${currentMemberCount} of ${maxMembers} team members. Upgrade to add more teammates.`}
              ctaLabel="Upgrade Plan"
              hideDismiss
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {isFinite(maxMembers) && currentMemberCount >= maxMembers - 1 && currentMemberCount < maxMembers && (
              <UpgradeBanner
                message={`You're using ${currentMemberCount} of ${maxMembers} team members. You can invite 1 more on your current plan.`}
                inline
                className="mb-4"
              />
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <i className="ri-error-warning-line"></i>
                {error}
              </div>
            )}
            
            {success && inviteLink && (
              <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <i className="ri-checkbox-circle-fill text-indigo-600 text-xl"></i>
                  <div className="flex-1">
                    <p className="text-sm text-indigo-800 font-semibold mb-2">{success}</p>
                    <p className="text-xs text-indigo-700 mb-3">
                      <i className="ri-information-line mr-1"></i>
                      You can also copy the link below to share it directly.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white border border-indigo-200 rounded-lg">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 text-sm text-gray-700 bg-transparent border-none outline-none"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer"
                  >
                    <i className="ri-file-copy-line"></i>
                    Copy
                  </button>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      resetForm();
                      void markOnboardingStep('inviteMember');
                      onInvited();
                      onClose();
                    }}
                    className="px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Done
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
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    <i className="ri-information-line mr-1"></i>
                    For new users, this name will be saved to their profile upon signup
                  </p>
                </div>

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
                    <i className="ri-information-line mr-1"></i>
                    Existing users will be added directly; new users will receive an invite link
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Role
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={role === 'admin'}
                        onChange={() => setRole('admin')}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">Admin</div>
                        <div className="text-xs text-gray-500">
                          Full access (manage members, change settings)
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
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">Member</div>
                        <div className="text-xs text-gray-500">
                          Create and edit test cases and sessions
                        </div>
                      </div>
                      <i className="ri-user-line text-indigo-500"></i>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="role"
                        value="viewer"
                        checked={role === 'viewer'}
                        onChange={() => setRole('viewer')}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">Viewer</div>
                        <div className="text-xs text-gray-500">Read-only access</div>
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-line"></i>
                        Invite
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
