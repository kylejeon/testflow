import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type AuthMode = 'login' | 'signup';

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
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [checkingInvitation, setCheckingInvitation] = useState(false);

  // -------------------------------------------------
  // 1️⃣  Check invitation token and existing session
  // -------------------------------------------------
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken) {
      checkInvitation(inviteToken);
    } else {
      checkUser();
    }
    
    // Load last logged in email from localStorage (only for login mode)
    const lastEmail = localStorage.getItem('testflow_last_email');
    if (lastEmail && mode === 'login') {
      setEmail(lastEmail);
    }

    // Handle OAuth callback - check for hash parameters
    const handleOAuthCallback = async () => {
      // Check if there's a hash with access_token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        // OAuth callback detected, wait for session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Ensure profile exists for OAuth users (auto signup)
          await ensureProfileExists(session.user);
          
          // Check if there's an invitation token
          const inviteToken = searchParams.get('invite');
          if (inviteToken) {
            await acceptInvitation(inviteToken);
          } else {
            // Clean up the hash and navigate to projects
            window.history.replaceState(null, '', window.location.pathname);
            navigate('/projects');
          }
        }
      }
    };

    handleOAuthCallback();

    // Listen for auth state changes (for OAuth redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Ensure profile exists for OAuth users
        await ensureProfileExists(session.user);
        
        const inviteToken = searchParams.get('invite');
        if (inviteToken) {
          await acceptInvitation(inviteToken);
        } else if (!window.location.hash) {
          navigate('/projects');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const ensureProfileExists = async (user: any) => {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile for OAuth user (auto signup)
        const { error } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || null,
          role: 'member',
          subscription_tier: 1, // Default to Free tier
        });
        
        if (error) {
          console.error('Failed to create profile:', error);
          // If insert fails due to conflict, it means profile already exists
          if (error.code !== '23505') {
            throw error;
          }
        }
        
        // Wait longer to ensure the profile is fully committed
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify profile was created
        const { data: verifyProfile, error: verifyError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
          
        if (verifyError || !verifyProfile) {
          console.error('Profile verification failed:', verifyError);
          throw new Error('프로필 생성에 실패했습니다. 다시 시도해주세요.');
        }
      }
    } catch (err) {
      console.error('Failed to ensure profile exists:', err);
      throw err; // Re-throw to handle in caller
    }
  };

  const checkInvitation = async (token: string) => {
    setCheckingInvitation(true);
    try {
      // Get invitation details
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

      setInvitation({
        token,
        projectName: invitationData.projects?.name,
        role: invitationData.role,
      });
      setEmail(invitationData.email);
      setMode('signup');

      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // User is logged in, try to accept invitation
        await acceptInvitation(token);
      }
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token }),
        }
      );

      const result = await response.json();

      if (response.ok && result.projectId) {
        setSuccess(result.message);
        setTimeout(() => {
          navigate(`/projects/${result.projectId}`);
        }, 1500);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message || '초대 수락에 실패했습니다.');
    }
  };

  const checkUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        navigate('/projects');
      }
    } catch (err) {
      console.error('Failed to check session:', err);
    }
  };

  // -------------------------------------------------
  // 2️⃣  Login handler
  // -------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 로그인 성공 시 이메일 저장
      localStorage.setItem('testflow_last_email', email);

      // 초대 토큰이 있는 경우 초대 수락 페이지로 리다이렉트
      const invitationToken = sessionStorage.getItem('invitation_token');
      if (invitationToken) {
        sessionStorage.removeItem('invitation_token');
        navigate(`/accept-invitation?token=${invitationToken}`);
        return;
      }

      navigate('/projects');
    } catch (error: any) {
      setError(error.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------
  // 3️⃣  Signup handler
  // -------------------------------------------------
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            invitation_token: invitation?.token,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create or update profile row
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          role: 'member',
        });

        // If there's an invitation and user is confirmed, accept it
        if (invitation?.token && data.session) {
          await acceptInvitation(invitation.token);
        } else if (invitation?.token) {
          setSuccess('회원가입이 완료되었습니다! 이메일을 확인 후 로그인하면 프로젝트에 자동으로 참여됩니다.');
          setMode('login');
          setPassword('');
        } else {
          setSuccess('회원가입이 완료되었습니다! 이메일을 확인해주세요.');
          setMode('login');
          setPassword('');
        }
      }
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------
  // 4️⃣  UI
  // -------------------------------------------------
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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
              <i className="ri-test-tube-line text-2xl text-white"></i>
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: '"Pacifico", serif' }}>
              TestFlow
            </span>
          </div>
          <p className="text-gray-600">
            {invitation
              ? '프로젝트 초대를 수락하려면 가입하세요'
              : mode === 'login'
              ? '계정에 로그인하세요'
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
          {/* Tab Switcher */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-6">
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setSuccess('');
                // Load last email when switching to login
                const lastEmail = localStorage.getItem('testflow_last_email');
                if (lastEmail) {
                  setEmail(lastEmail);
                }
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError('');
                setSuccess('');
                // Clear email when switching to signup (unless there's an invitation)
                if (!invitation) {
                  setEmail('');
                }
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                mode === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              회원가입
            </button>
          </div>

          {/* Error / Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <i className="ri-error-warning-line"></i>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <i className="ri-check-line"></i>
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
            {mode === 'signup' && (
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
                  required
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                이메일
              </label>
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
                <p className="text-xs text-gray-500 mt-1">
                  <i className="ri-lock-line mr-1"></i>
                  초대받은 이메일 주소입니다
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                required
                minLength={6}
              />
              {mode === 'signup' && (
                <p className="text-xs text-gray-500 mt-1">최소 6자 이상</p>
              )}
            </div>

            {mode === 'login' && (
              <div className="mb-6 flex items-center gap-2">
                <i className="ri-information-line text-gray-400"></i>
                <span className="text-sm text-gray-500">
                  마지막 로그인 이메일이 자동으로 저장됩니다
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  처리 중...
                </span>
              ) : mode === 'login' ? (
                invitation ? '로그인 후 프로젝트 참여' : '로그인'
              ) : (
                invitation ? '가입 후 프로젝트 참여' : '회원가입'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-500">또는</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Social Login */}
          <button
            onClick={async () => {
              try {
                const inviteToken = invitation?.token || searchParams.get('invite');
                const redirectUrl = inviteToken
                  ? `${window.location.origin}/auth?invite=${inviteToken}`
                  : `${window.location.origin}/projects`;
                  
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: redirectUrl,
                  },
                });
              } catch (err: any) {
                setError(err.message || '소셜 로그인에 실패했습니다.');
              }
            }}
            className="w-full py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 계속하기
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          계속 진행하면 서비스 약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
