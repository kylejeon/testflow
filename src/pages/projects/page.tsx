import { useState, useEffect } from 'react';
import ProjectsContent from './components/ProjectsContent';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface UserProfile {
  email: string;
  full_name: string;
  subscription_tier: number;
}

const TIER_INFO = {
  1: { name: 'Free', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: 'ri-user-line' },
  2: { name: 'Professional', color: 'bg-teal-50 text-teal-700 border-teal-300', icon: 'ri-vip-crown-line' },
  3: { name: 'Enterprise', color: 'bg-amber-50 text-amber-700 border-amber-300', icon: 'ri-vip-diamond-line' },
};

export default function ProjectsPage() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
    
    const handleOAuthCallback = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          try {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            // URL 정리 후 페이지 새로고침
            window.history.replaceState(null, '', window.location.pathname);
            window.location.reload();
          } catch (error) {
            console.error('Failed to set session:', error);
          }
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name, subscription_tier')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile({
          email: data.email || user.email || '',
          full_name: data.full_name || '',
          subscription_tier: data.subscription_tier || 1,
        });
      }
    } catch (error) {
      console.error('프로필 로딩 오류:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setShowProfileMenu(false);
      navigate('/auth');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const currentTier = userProfile?.subscription_tier || 1;
  const tierInfo = TIER_INFO[currentTier as keyof typeof TIER_INFO];

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                <i className="ri-test-tube-line text-xl text-white"></i>
              </div>
              <span className="text-xl font-bold" style={{ fontFamily: '"Pacifico", serif' }}>
                TestFlow
              </span>
            </div>
            <div className="flex items-center gap-3 relative">
              <div 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {userProfile?.full_name?.charAt(0) || 'U'}
                </div>
              </div>
              
              {showProfileMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowProfileMenu(false)}
                  ></div>
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{userProfile?.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500">{userProfile?.email}</p>
                      <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs font-semibold rounded-full border ${tierInfo.color}`}>
                        <i className={`${tierInfo.icon} text-sm`}></i>
                        {tierInfo.name}
                      </div>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100"
                    >
                      <i className="ri-settings-3-line text-lg w-5 h-5 flex items-center justify-center"></i>
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                    >
                      <i className="ri-logout-box-line text-lg"></i>
                      <span>Log out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50/30">
          <ProjectsContent />
        </main>
      </div>
    </div>
  );
}
