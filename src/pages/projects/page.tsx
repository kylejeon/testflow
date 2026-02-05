import { useState } from 'react';
import ProjectsContent from './components/ProjectsContent';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function ProjectsPage() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setShowProfileMenu(false);
      navigate('/auth');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

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
                className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
              >
                JK
              </div>
              
              {showProfileMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowProfileMenu(false)}
                  ></div>
                  <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
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
