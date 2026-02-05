import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TestCaseList from './components/TestCaseList';

export default function TestCases() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/projects" className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <i className="ri-test-tube-line text-xl text-white"></i>
                </div>
                <span className="text-xl font-bold" style={{ fontFamily: '"Pacifico", serif' }}>
                  TestFlow
                </span>
              </Link>
              
              <div className="relative ml-8">
                <input
                  type="text"
                  placeholder="프로젝트, 테스트 케이스 검색..."
                  className="w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer relative">
                <i className="ri-notification-3-line text-xl"></i>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <button className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer">
                <i className="ri-question-line text-xl"></i>
              </button>

              <div className="flex items-center gap-3 pl-3 ml-3 border-l border-gray-200">
                <div className="relative" ref={profileMenuRef}>
                  <div 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
                  >
                    JK
                  </div>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <Link
                        to="/settings"
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100"
                      >
                        <i className="ri-settings-3-line text-lg"></i>
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
                  )}
                </div>
                <div className="cursor-pointer">
                  <div className="text-sm font-semibold text-gray-900">김지훈</div>
                  <div className="text-xs text-gray-500">QA Manager</div>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50/30">
          <TestCaseList />
        </main>
      </div>
    </div>
  );
}
