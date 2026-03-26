import { LogoMark } from '../../components/Logo';
import { useState, useEffect } from 'react';
import ProjectsContent from './components/ProjectsContent';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/SEOHead';
import NotificationBell from '../../components/feature/NotificationBell';
import { Avatar } from '../../components/Avatar';

interface UserProfile {
  email: string;
  full_name: string;
  subscription_tier: number;
  avatar_emoji: string;
  avatar_url?: string;
  user_id?: string;
}

const TIER_INFO = {
  1: { name: 'Free', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: 'ri-user-line' },
  2: { name: 'Starter', color: 'bg-indigo-50 text-indigo-700 border-indigo-300', icon: 'ri-vip-crown-line' },
  3: { name: 'Professional', color: 'bg-violet-50 text-violet-700 border-violet-300', icon: 'ri-vip-diamond-line' },
  4: { name: 'Enterprise', color: 'bg-amber-50 text-amber-700 border-amber-300', icon: 'ri-vip-diamond-line' },
};

export default function ProjectsPage() {
  const { t } = useTranslation(['common', 'settings']);
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
        .select('email, full_name, subscription_tier, avatar_emoji')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile({
          email: data.email || user.email || '',
          full_name: data.full_name || '',
          subscription_tier: data.subscription_tier || 1,
          avatar_emoji: data.avatar_emoji || '',
          user_id: user.id,
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
    <>
      <SEOHead
        title="My Projects | Testably"
        description="Manage your QA test projects in Testably. Test cases, runs, and sessions — all in one place."
        noindex={true}
      />
      <div className="flex h-screen bg-white">
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Link to="/projects" className="flex items-center cursor-pointer">
                  <LogoMark />
                </Link>
                <div className="w-px h-5 bg-gray-300" />
                <span className="text-sm text-gray-500">Projects</span>
              </div>
              <div className="flex items-center gap-3 relative">
                <NotificationBell />
                <div
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Avatar
                    userId={userProfile?.user_id}
                    name={userProfile?.full_name}
                    email={userProfile?.email}
                    photoUrl={userProfile?.avatar_url}
                    size="lg"
                  />
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
                        <span>{t('common:settings')}</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                      >
                        <i className="ri-logout-box-line text-lg"></i>
                        <span>{t('common:logout')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto bg-gray-50/30 h-full">
            <ProjectsContent />
          </main>
        </div>
      </div>
    </>
  );
}
