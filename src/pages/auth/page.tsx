import Logo from '../../components/Logo';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { sendLoopsEvent } from '../../lib/loops';
import SEOHead from '../../components/SEOHead';

type AuthMode = 'login' | 'signup' | 'reset' | 'new_password';

interface InvitationInfo {
  token: string;
  projectName?: string;
  role?: string;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [checkingInvitation, setCheckingInvitation] = useState(false);
  const [isOAuthRedirect, setIsOAuthRedirect] = useState(false);

  const navigateToDefaultOrProjects = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_project_id')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.default_project_id) {
        navigate(`/projects/${profile.default_project_id}`);
        return;
      }
    } catch {
      // fallback to /projects
    }
    navigate('/projects');
  };

  useEffect(() => {
    const inviteToken = searchParams.get('invite');

    // ── 해시 파라미터 미리 체크 ──
    const rawHash = window.location.hash;
    const hashParams = rawHash ? new URLSearchParams(rawHash.substring(1)) : null;
    const hashType = hashParams?.get('type');
    const hashError = hashParams?.get('error');
    const isRecoveryHash = hashType === 'recovery' || !!hashError;

    if (inviteToken) {
      checkInvitation(inviteToken);
    } else if (!isRecoveryHash) {
      // recovery / error 해시가 있으면 checkUser 건너뜀 (레이스 컨디션 방지)
      checkUser();
    }

    const lastEmail = localStorage.getItem('testably_last_email');
    if (lastEmail) setEmail(lastEmail);

    const handleOAuthCallback = async () => {
      const hash = window.location.hash;
      if (!hash || hash.length <= 1) return;

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const type = params.get('type');
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');

      // ── 에러 콜백 처리 (만료된 링크 등) ──
      if (params.get('error')) {
        window.history.replaceState(null, '', window.location.pathname);
        if (errorCode === 'otp_expired') {
          setMode('reset');
          setError('Your password reset link has expired. Please enter your email to request a new one.');
        } else {
          setMode('reset');
          setError(
            errorDescription
              ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
              : '링크가 유효하지 않습니다. 다시 시도해주세요.'
          );
        }
        return;
      }

      // ── 비밀번호 재설정 성공 콜백 ──
      if (type === 'recovery' && accessToken) {
        setMode('new_password');
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

      // ── OAuth 콜백 ──
      if (accessToken) {
        setIsOAuthRedirect(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await ensureProfileExists(session.user);
          const invite = searchParams.get('invite');
          if (invite) {
            await acceptInvitation(invite);
          } else {
            window.history.replaceState(null, '', window.location.pathname);
            navigate('/projects');
          }
        }
      }
    };

    handleOAuthCallback();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // ── PASSWORD_RECOVERY 이벤트: 새 비밀번호 입력 화면으로 전환 ──
      if (event === 'PASSWORD_RECOVERY') {
        setMode('new_password');
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

      if (event === 'SIGNED_IN' && session && isOAuthRedirect) {
        await ensureProfileExists(session.user);
        const invite = searchParams.get('invite');
        if (invite) {
          await acceptInvitation(invite);
        } else if (!window.location.hash) {
          await navigateToDefaultOrProjects(session.user.id);
        }
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [searchParams]);

  const ensureProfileExists = async (user: any) => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles').select('id').eq('id', user.id).maybeSingle();

      if (!existingProfile) {
        const now = new Date();
        const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const { error } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || null,
          role: 'member',
          subscription_tier: 3,
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEnds.toISOString(),
          is_trial: true,
        });
        if (error && error.code !== '23505') throw error;
        await new Promise(resolve => setTimeout(resolve, 1500));
        const { data: verifyProfile, error: verifyError } = await supabase
          .from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (verifyError || !verifyProfile) throw new Error('Failed to create profile. Please try again.');
      }
    } catch (err) {
      console.error('Failed to ensure profile exists:', err);
      throw err;
    }
  };

  const checkInvitation = async (token: string) => {
    setCheckingInvitation(true);
    try {
      const { data: invitationData, error: invError } = await supabase
        .from('project_invitations')
        .select('*, projects(name)')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (invError || !invitationData) {
        setError('유효하지 않거나 만료된 초대 링크입니다.');
        return;
      }
      setInvitation({ token, projectName: invitationData.projects?.name, role: invitationData.role });
      setEmail(invitationData.email);
      setMode('signup');

      const { data: { session } } = await supabase.auth.getSession();
      if (session) await acceptInvitation(token);
    } catch (err) {
      console.error('Failed to check invitation:', err);
    } finally {
      setCheckingInvitation(false);
    }
  };

  const acceptInvitation = async (token: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/accept-invitation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ token }),
        }
      );
      const result = await response.json();
      if (response.ok && result.projectId) {
        setSuccess(result.message);
        setTimeout(() => navigate(`/projects/${result.projectId}`), 1500);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation.');
    }
  };

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/projects');
    } catch (err) {
      console.error('Failed to check session:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      localStorage.setItem('testably_last_email', email);

      // Returning user: permanently dismiss onboarding modal (CEO req)
      if (data.user) {
        supabase
          .from('user_onboarding')
          .upsert(
            { user_id: data.user.id, welcome_completed: true },
            { onConflict: 'user_id' },
          )
          .then(() => {/* fire-and-forget */});

        // Loops.so: track login event
        sendLoopsEvent(email, 'user_login', {
          plan: 'unknown',
          loginDate: new Date().toISOString().split('T')[0],
        });
      }

      const invitationToken = sessionStorage.getItem('invitation_token');
      if (invitationToken) {
        sessionStorage.removeItem('invitation_token');
        navigate(`/accept-invitation?token=${invitationToken}`);
        return;
      }
      if (data.user) {
        await navigateToDefaultOrProjects(data.user.id);
      } else {
        navigate('/projects');
      }
    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: fullName, invitation_token: invitation?.token },
          emailRedirectTo: `${window.location.origin}/projects`,
        },
      });
      if (error) throw error;
      if (data.user) {
        const now = new Date();
        const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id, email, full_name: fullName, role: 'member',
          subscription_tier: 3, trial_started_at: now.toISOString(),
          trial_ends_at: trialEnds.toISOString(), is_trial: true,
        });
        if (profileError && profileError.code !== '23505') console.error('Profile creation error:', profileError);
        sendLoopsEvent(email, 'user_signup', {
          firstName: fullName?.split(' ')[0] || 'there',
          plan: 'free',
          signupDate: new Date().toISOString().split('T')[0],
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (invitation?.token && data.session) {
          await acceptInvitation(invitation.token);
        } else if (invitation?.token) {
          setSuccess('Account created! Log in to join the project automatically.');
          setMode('login'); setPassword('');
        } else if (data.session) {
          setSuccess('Account created! Your 14-day free trial has started 🎉');
          setTimeout(() => navigate('/projects'), 1000);
        } else {
          setSuccess('Account created! Please check your email to confirm. Your 14-day free trial starts after verification.');
          setMode('login'); setPassword('');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('rate limit') || err.message?.includes('Email rate limit exceeded')) {
        setError('Email sending limit reached. Please wait a moment or use Continue with Google.');
      } else {
        setError(err.message || 'Sign up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setSuccess('Password reset link sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        supabase.auth.signOut();
        setMode('login');
        setNewPassword('');
        setNewPasswordConfirm('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkInvitationFixed = async (token: string) => {
    setCheckingInvitation(true);
    try {
      const { data: invitationData, error: invError } = await supabase
        .from('project_invitations')
        .select('*, projects(name)')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (invError || !invitationData) {
        setError('This invitation link is invalid or has expired.');
        return;
      }
      setInvitation({ token, projectName: invitationData.projects?.name, role: invitationData.role });
      setEmail(invitationData.email);
      setMode('signup');

      const { data: { session } } = await supabase.auth.getSession();
      if (session) await acceptInvitation(token);
    } catch (err) {
      console.error('Failed to check invitation:', err);
    } finally {
      setCheckingInvitation(false);
    }
  };

  const getHashError = () => {
    const rawHash = window.location.hash;
    const hashParams = rawHash ? new URLSearchParams(rawHash.substring(1)) : null;
    const errorCode = hashParams?.get('error_code');
    const errorDescription = hashParams?.get('error_description');
    if (errorCode === 'otp_expired') return 'Your password reset link has expired. Please enter your email again to receive a new link.';
    if (errorDescription) return decodeURIComponent(errorDescription.replace(/\+/g, ' '));
    return 'This link is invalid. Please try again.';
  };

  if (checkingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="text-center">
          <i className="ri-loader-4-line animate-spin text-4xl text-indigo-600 mb-4"></i>
          <p className="text-gray-600">Checking invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Log in / Sign up | Testably"
        description="Log in or create a new Testably account. Start managing your QA tests today."
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-6 md:mb-10">
            <div className="flex flex-col items-center gap-3 mb-3">
              {/* Squircle icon — brand squircle shape (22% radius) */}
              <div
                className="w-14 h-14 bg-indigo-500 flex items-center justify-center"
                style={{ borderRadius: '22%' }}
              >
                <span
                  className="text-white"
                  style={{
                    fontFamily: 'Pacifico, cursive',
                    fontSize: '30px',
                    lineHeight: 1,
                    display: 'block',
                    transform: 'translateY(-1.5px) translateX(0.5px)',
                  }}
                >
                  T
                </span>
              </div>
              {/* Wordmark: font-normal only — Pacifico has no 700 weight */}
              <span
                className="text-3xl text-gray-900"
                style={{ fontFamily: 'Pacifico, cursive', letterSpacing: '0.5px' }}
              >
                Testably
              </span>
            </div>
            <p className="text-gray-500 text-base">
              {mode === 'reset' ? 'Reset your password'
                : mode === 'new_password' ? 'Set a new password'
                : invitation ? 'Sign up to accept your project invitation'
                : mode === 'login' ? 'Welcome back'
                : 'Create your account'}
            </p>
          </div>

          {/* Invitation Banner */}
          {invitation && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i className="ri-mail-open-line text-indigo-600 text-xl"></i>
                </div>
                <div>
                  <p className="font-semibold text-indigo-900">Project Invitation</p>
                  <p className="text-sm text-indigo-700">
                    You have been invited to <span className="font-medium">{invitation.projectName}</span> as
                    <span className="ml-1 px-1.5 py-0.5 bg-indigo-200 rounded text-xs font-medium">
                      {invitation.role === 'admin' ? 'Admin' : invitation.role === 'member' ? 'Member' : 'Viewer'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Auth Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">

            {/* Reset Password */}
            {mode === 'reset' && (
              <div>
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer transition-colors"
                >
                  <i className="ri-arrow-left-line"></i>
                  Back to log in
                </button>
                <div className="mb-6">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                    <i className="ri-lock-password-line text-indigo-600 text-2xl"></i>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h2>
                  <p className="text-sm text-gray-500">Enter the email you used to sign up and we'll send you a reset link.</p>
                </div>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <i className="ri-error-warning-line"></i>{error}
                  </div>
                )}
                {success ? (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex items-start gap-3 text-indigo-700">
                      <i className="ri-mail-check-line text-2xl flex-shrink-0"></i>
                      <div>
                        <p className="font-semibold mb-1">Check your inbox</p>
                        <p className="text-sm">{success}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword}>
                    <div className="mb-5">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? <span className="flex items-center justify-center gap-2"><i className="ri-loader-4-line animate-spin"></i>Sending...</span>
                        : 'Send reset link'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Set New Password */}
            {mode === 'new_password' && (
              <div>
                <div className="mb-6">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                    <i className="ri-shield-keyhole-line text-indigo-600 text-2xl"></i>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Set new password</h2>
                  <p className="text-sm text-gray-500">Choose a new password for your account.</p>
                </div>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <i className="ri-error-warning-line"></i>{error}
                  </div>
                )}
                {success ? (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex items-start gap-3 text-indigo-700">
                      <i className="ri-checkbox-circle-line text-2xl flex-shrink-0"></i>
                      <p className="text-sm">{success}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSetNewPassword}>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">New password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        required
                        minLength={6}
                      />
                      <p className="text-xs text-gray-400 mt-1">At least 6 characters</p>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm new password</label>
                      <input
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                          newPasswordConfirm && newPassword !== newPasswordConfirm ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        required
                        minLength={6}
                      />
                      {newPasswordConfirm && newPassword !== newPasswordConfirm && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <i className="ri-error-warning-line"></i>Passwords do not match
                        </p>
                      )}
                      {newPasswordConfirm && newPassword === newPasswordConfirm && (
                        <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                          <i className="ri-check-line"></i>Passwords match
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={loading || (!!newPasswordConfirm && newPassword !== newPasswordConfirm)}
                      className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? <span className="flex items-center justify-center gap-2"><i className="ri-loader-4-line animate-spin"></i>Updating...</span>
                        : 'Update password'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Login / Sign Up */}
            {(mode === 'login' || mode === 'signup') && (
              <div>
                {/* Tab Switcher */}
                <div className="flex bg-gray-100 rounded-full p-1 mb-6">
                  <button
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setSuccess('');
                      const lastEmail = localStorage.getItem('testably_last_email');
                      if (lastEmail) setEmail(lastEmail);
                    }}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                      mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => {
                      setMode('signup');
                      setError('');
                      setSuccess('');
                      if (!invitation) setEmail('');
                    }}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                      mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Sign up
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <i className="ri-error-warning-line"></i>{error}
                  </div>
                )}
                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                    <i className="ri-check-line"></i>{success}
                  </div>
                )}

                <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
                  {/* Full Name (sign up only) */}
                  {mode === 'signup' && (
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Smith"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>
                  )}

                  {/* Email */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      required
                      readOnly={!!invitation}
                    />
                    {invitation && (
                      <p className="text-xs text-gray-500 mt-1"><i className="ri-lock-line mr-1"></i>This is the email address you were invited with</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="mb-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      required
                      minLength={6}
                    />
                    {mode === 'signup' && <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>}
                  </div>

                  {/* Forgot password (login only) */}
                  {mode === 'login' && (
                    <div className="flex justify-end mb-5">
                      <button
                        type="button"
                        onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {/* Confirm password (sign up only) */}
                  {mode === 'signup' && (
                    <div className="mb-6 mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm ${
                          confirmPassword && password !== confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        required
                        minLength={6}
                      />
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <i className="ri-error-warning-line"></i>Passwords do not match
                        </p>
                      )}
                      {confirmPassword && password === confirmPassword && (
                        <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                          <i className="ri-check-line"></i>Passwords match
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? <span className="flex items-center justify-center gap-2"><i className="ri-loader-4-line animate-spin"></i>Processing...</span>
                      : mode === 'login'
                        ? (invitation ? 'Log in and join project' : 'Log in')
                        : (invitation ? 'Sign up and join project' : 'Create account')}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-xs text-gray-500">or</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Google login */}
                <button
                  onClick={async () => {
                    try {
                      const inviteToken = invitation?.token || searchParams.get('invite');
                      const redirectUrl = inviteToken
                        ? `${window.location.origin}/auth?invite=${inviteToken}`
                        : `${window.location.origin}/auth`;
                      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } });
                    } catch (err: any) {
                      setError(err.message || 'Social login failed. Please try again.');
                    }
                  }}
                  className="w-full py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            By continuing, you agree to our <button onClick={() => navigate('/terms')} className="underline hover:text-gray-700 cursor-pointer">Terms of Service</button> and <button onClick={() => navigate('/privacy')} className="underline hover:text-gray-700 cursor-pointer">Privacy Policy</button>.
          </p>
        </div>
      </div>
    </>
  );
}
