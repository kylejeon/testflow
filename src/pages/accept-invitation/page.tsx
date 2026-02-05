import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('초대를 처리하는 중...');

  useEffect(() => {
    acceptInvitation();
  }, []);

  const acceptInvitation = async () => {
    try {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('유효하지 않은 초대 링크입니다.');
        return;
      }

      // 현재 로그인 상태 확인
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // 로그인되어 있지 않으면 로그인 페이지로 리다이렉트
        sessionStorage.setItem('invitation_token', token);
        navigate('/auth?redirect=accept-invitation');
        return;
      }

      // Edge Function 호출하여 초대 수락
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/accept-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ token }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '초대 수락에 실패했습니다.');
      }

      setStatus('success');
      setMessage(result.message || '프로젝트에 성공적으로 참여했습니다!');
      
      // 3초 후 프로젝트 상세 페이지로 이동
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">초대 처리 중</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-checkbox-circle-fill text-4xl text-green-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">초대 수락 완료!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="text-sm text-gray-500">잠시 후 프로젝트 페이지로 이동합니다...</div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-error-warning-fill text-4xl text-red-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">초대 수락 실패</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/projects')}
              className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
            >
              프로젝트 목록으로 이동
            </button>
          </>
        )}
      </div>
    </div>
  );
}
