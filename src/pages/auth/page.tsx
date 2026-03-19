import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
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

  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken) {
      checkInvitation(inviteToken);
    } else {
      checkUser();
    }

    const lastEmail = localStorage.getItem('testably_last_email');
    if (lastEmail) setEmail(lastEmail);

    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      // 비밀번호 재설정 콜백 처리
      if (type === 'recovery' && accessToken) {
        setMode('new_password');
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

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
      if (event === 'SIGNED_IN' && session && isOAuthRedirect) {
        await ensureProfileExists(session.user);
        const invite = searchParams.get('invite');
        if (invite) {
          await acceptInvitation(invite);
        } else if (!window.location.hash) {
          navigate('/projects');
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
        if (verifyError || !verifyProfile) throw new Error('프로필 생성에 실패했습니다. 다시 시도해주세요.');
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
      setError(err.message || '초대 수락에 실패했습니다.');
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      localStorage.setItem('testably_last_email', email);
      const invitationToken = sessionStorage.getItem('invitation_token');
      if (invitationToken) {
        sessionStorage.removeItem('invitation_token');
        navigate(`/accept-invitation?token=${invitationToken}`);
        return;
      }
      navigate('/projects');
    } catch (error: any) {
      setError(error.message || '로그인에 실패했습니다.');
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (invitation?.token && data.session) {
          await acceptInvitation(invitation.token);
        } else if (invitation?.token) {
          setSuccess('회원가입이 완료되었습니다! 로그인하면 프로젝트에 자동으로 참여됩니다.');
          setMode('login'); setPassword('');
        } else if (data.session) {
          setSuccess('회원가입이 완료되었습니다! 14일 무료 체험이 시작됩니다 🎉');
          setTimeout(() => navigate('/projects'), 1000);
        } else {
          setSuccess('회원가입이 완료되었습니다! 이메일을 확인해주세요. 확인 후 14일 무료 체험이 시작됩니다.');
          setMode('login'); setPassword('');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('rate limit') || err.message?.includes('Email rate limit exceeded')) {
        setError('이메일 발송 제한에 도달했습니다. 잠시 후 다시 시도하거나, Google로 계속하기를 이용해주세요.');
      } else {
        setError(err.message || '회원가입에 실패했습니다.');
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
      setSuccess('비밀번호 재설정 링크를 이메일로 발송했습니다. 받은 편지함을 확인해주세요.');
    } catch (err: any) {
      setError(err.message || '이메일 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess('비밀번호가 성공적으로 변경되었습니다! 로그인 페이지로 이동합니다.');
      setTimeout(() => {
        supabase.auth.signOut();
        setMode('login');
        setNewPassword('');
        setNewPasswordConfirm('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="text-center">
          <i className="ri-loader-4-line animate-spin text-4xl text-teal-600 mb-4"></i>
          <p className="text-gray-600">초대 정보를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="로그인 / 회원가입 | Testably"
        description="Testably에 로그인하거나 새 계정을 만드세요. QA 테스트 관리를 시작하세요."
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
                <i className="ri-test-tube-line text-2xl text-white"></i>
              </div>
              <span className="text-2xl font-bold" style={{ fontFamily: '"Pacifico", serif' }}>Testably</span>
            </div>
            <p className="text-gray-600">
              {mode === 'reset' ? '비밀번호 재설정'
                : mode === 'new_password' ? '새 비밀번호 설정'
                : invitation ? '프로젝트 초대를 수락하려면 가입하세요'
                : mode === 'login' ? '계정에 로그인하세요'
                : '새 계정을 만드세요'}
            </p>
          </div>

          {/* Invitation Banner */}
          {invitation && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <i className="ri-mail-open-line text-teal-600 text-xl"></i>
                </div>
                <div>
                  <p className="font-semibold text-teal-900">프로젝트 초대</p>
                  <p className="text-sm text-teal-700">
                    <span className="font-medium">{invitation.projectName}</span> 프로젝트에
                    <span className="ml-1 px-1.5 py-0.5 bg-teal-200 rounded text-xs font-medium">
                      {invitation.role === 'admin' ? 'Admin' : invitation.role === 'member' ? 'Member' : 'Viewer'}
                    </span>
                    로 초대되었습니다
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Auth Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">

            {/* ══ 비밀번호 재설정 요청 화면 ══ */}
            {mode === 'reset' && (
              <div>
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer transition-colors"
                >
                  <i className="ri-arrow-left-line"></i>
                  로그인으로 돌아가기
                </button>
                <div className="mb-6">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                    <i className="ri-lock-password-line text-teal-600 text-2xl"></i>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">비밀번호 재설정</h2>
                  <p className="text-sm text-gray-500">가입한 이메일을 입력하시면 재설정 링크를 보내드립니다.</p>
                </div>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <i className="ri-error-warning-line"></i>{error}
                  </div>
                )}
                {success ? (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                    <div className="flex items-start gap-3 text-teal-700">
                      <i className="ri-mail-check-line text-2xl flex-shrink-0"></i>
                      <div>
                        <p className="font-semibold mb-1">이메일을 확인해주세요</p>
                        <p className="text-sm">{success}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword}>
                    <div className="mb-5">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">이메일</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? <span className="flex items-center justify-center gap-2"><i className="ri-loader-4-line animate-spin"></i>발송 중...</span>
                        : '재설정 링크 발송'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ══ 새 비밀번호 설정 화면 (이메일 링크 클릭 후) ══ */}
            {mode === 'new_password' && (
              <div>
                <div className="mb-6">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                    <i className="ri-shield-keyhole-line text-teal-600 text-2xl"></i>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">새 비밀번호 설정</h2>
                  <p className="text-sm text-gray-500">사용할 새 비밀번호를 입력해주세요.</p>
                </div>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <i className="ri-error-warning-line"></i>{error}
                  </div>
                )}
                {success ? (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                    <div className="flex items-start gap-3 text-teal-700">
                      <i className="ri-checkbox-circle-line text-2xl flex-shrink-0"></i>
                      <p className="text-sm">{success}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSetNewPassword}>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">새 비밀번호</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                        required
                        minLength={6}
                      />
                      <p className="text-xs text-gray-400 mt-1">최소 6자 이상</p>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">새 비밀번호 확인</label>
                      <input
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                          newPasswordConfirm && newPassword !== newPasswordConfirm ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        required
                        minLength={6}
                      />
                      {newPasswordConfirm && newPassword !== newPasswordConfirm && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <i className="ri-error-warning-line"></i>비밀번호가 일치하지 않습니다
                        </p>
                      )}
                      {newPasswordConfirm && newPassword === newPasswordConfirm && (
                        <p className="text-xs text-teal-600 mt-1 flex items-center gap-1">
                          <i className="ri-check-line"></i>비밀번호가 일치합니다
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={loading || (!!newPasswordConfirm && newPassword !== newPasswordConfirm)}
                      className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? <span className="flex items-center justify-center gap-2"><i className="ri-loader-4-line animate-spin"></i>변경 중...</span>
                        : '비밀번호 변경하기'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ══ 로그인 / 회원가입 화면 ══ */}
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
                    로그인
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
                    회원가입
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
                  {/* 이름 (회원가입만) */}
                  {mode === 'signup' && (
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">이름</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="홍길동"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>
                  )}

                  {/* 이메일 */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">이메일</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      required
                      readOnly={!!invitation}
                    />
                    {invitation && (
                      <p className="text-xs text-gray-500 mt-1"><i className="ri-lock-line mr-1"></i>초대받은 이메일 주소입니다</p>
                    )}
                  </div>

                  {/* 비밀번호 */}
                  <div className="mb-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">비밀번호</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      required
                      minLength={6}
                    />
                    {mode === 'signup' && <p className="text-xs text-gray-500 mt-1">최소 6자 이상</p>}
                  </div>

                  {/* 비밀번호를 잊으셨나요? (로그인 모드 전용) */}
                  {mode === 'login' && (
                    <div className="flex justify-end mb-5">
                      <button
                        type="button"
                        onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}
                        className="text-xs text-teal-600 hover:text-teal-700 hover:underline cursor-pointer transition-colors"
                      >
                        비밀번호를 잊으셨나요?
                      </button>
                    </div>
                  )}

                  {/* 비밀번호 확인 (회원가입만) */}
                  {mode === 'signup' && (
                    <div className="mb-6 mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">비밀번호 확인</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm ${
                          confirmPassword && password !== confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        required
                        minLength={6}
                      />
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <i className="ri-error-warning-line"></i>비밀번호가 일치하지 않습니다
                        </p>
                      )}
                      {confirmPassword && password === confirmPassword && (
                        <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                          <i className="ri-check-line"></i>비밀번호가 일치합니다
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? <span className="flex items-center justify-center gap-2"><i className="ri-loader-4-line animate-spin"></i>처리 중...</span>
                      : mode === 'login'
                        ? (invitation ? '로그인 후 프로젝트 참여' : '로그인')
                        : (invitation ? '가입 후 프로젝트 참여' : '회원가입')}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-xs text-gray-500">또는</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Google 로그인 */}
                <button
                  onClick={async () => {
                    try {
                      const inviteToken = invitation?.token || searchParams.get('invite');
                      const redirectUrl = inviteToken
                        ? `${window.location.origin}/auth?invite=${inviteToken}`
                        : `${window.location.origin}/projects`;
                      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } });
                    } catch (err: any) {
                      setError(err.message || '소셜 로그인에 실패했습니다.');
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
                  Google로 계속하기
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            계속 진행하면 서비스 약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </>
  );
}
