import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface InvitationInfo {
  email: string;
  role: string;
  projectName: string;
  projectId: string;
}

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('초대 정보를 확인하는 중...');
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    verifyInvitation();
  }, []);

  const verifyInvitation = async () => {
    try {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('유효하지 않은 초대 링크입니다.');
        return;
      }

      // 먼저 초대 정보 확인 (인증 없이)
      const verifyResponse = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/accept-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, action: 'verify' }),
        }
      );

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyResult.error || '초대 정보를 확인할 수 없습니다.');
      }

      setInvitationInfo(verifyResult.invitation);

      // 로그인 상태 확인
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoggedIn(false);
        setStatus('ready');
        setMessage('로그인 후 프로젝트에 참여할 수 있습니다.');
        return;
      }

      setIsLoggedIn(true);

      // 이메일 확인
      if (user.email !== verifyResult.invitation.email) {
        setStatus('error');
        setMessage(`이 초대는 ${verifyResult.invitation.email}로 발송되었습니다. 해당 이메일로 로그인해주세요.`);
        return;
      }

      setStatus('ready');
      setMessage('프로젝트 초대를 수락하시겠습니까?');

    } catch (error: any) {
      console.error('초대 확인 오류:', error);
      setStatus('error');
      setMessage(error.message || '초대 정보를 확인하는 중 오류가 발생했습니다.');
    }
  };

  const acceptInvitation = async () => {
    try {
      setStatus('accepting');
      setMessage('프로젝트에 참여하는 중...');

      const token = searchParams.get('token');
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/accept-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ token, action: 'accept' }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '초대 수락에 실패했습니다.');
      }

      setStatus('success');
      setMessage(result.message || '프로젝트에 성공적으로 참여했습니다!');
      
      // 2초 후 프로젝트 상세 페이지로 이동
      setTimeout(() => {
        if (result.projectId) {
          navigate(`/projects/${result.projectId}`);
        } else {
          navigate('/projects');
        }
      }, 2000);

    } catch (error: any) {
      console.error('초대 수락 오류:', error);
      setStatus('error');
      setMessage(error.message || '초대 수락 중 오류가 발생했습니다.');
    }
  };

  const handleLogin = () => {
    const token = searchParams.get('token');
    sessionStorage.setItem('invitation_token', token || '');
    navigate('/auth?redirect=accept-invitation');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">초대 확인 중</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'ready' && invitationInfo && (
          <div>
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-mail-open-fill text-4xl text-teal-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">프로젝트 초대</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <div>
                <div className="text-sm text-gray-500 mb-1">프로젝트</div>
                <div className="font-semibold text-gray-900">{invitationInfo.projectName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">초대된 이메일</div>
                <div className="font-semibold text-gray-900">{invitationInfo.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">역할</div>
                <div className="font-semibold text-gray-900">
                  {invitationInfo.role === 'admin' ? '관리자' : 
                   invitationInfo.role === 'developer' ? '개발자' : '뷰어'}
                </div>
              </div>
            </div>

            {isLoggedIn ? (
              <>
                <p className="text-gray-600 mb-6 text-center">{message}</p>
                <button
                  onClick={acceptInvitation}
                  className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
                >
                  초대 수락하기
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-6 text-center">{message}</p>
                <button
                  onClick={handleLogin}
                  className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
                >
                  로그인하기
                </button>
              </>
            )}
          </div>
        )}

        {status === 'accepting' && (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">처리 중</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-checkbox-circle-fill text-4xl text-green-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">초대 수락 완료!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="text-sm text-gray-500">잠시 후 프로젝트 페이지로 이동합니다...</div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-error-warning-fill text-4xl text-red-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">오류 발생</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/projects')}
              className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
            >
              프로젝트 목록으로 이동
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
