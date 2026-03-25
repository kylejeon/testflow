import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../Logo';
import { supabase } from '../../lib/supabase';

export default function MarketingHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `text-sm transition-colors cursor-pointer ${
      isActive(path)
        ? 'text-gray-900 font-semibold'
        : 'text-gray-500 hover:text-gray-900'
    }`;

  return (
    <nav
      className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100"
      aria-label="Main navigation"
    >
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-indigo-600 text-white px-3 py-1.5 rounded text-sm z-50"
      >
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="cursor-pointer flex-shrink-0">
          <Logo variant="light" className="h-9" />
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate('/features')} className={navLinkClass('/features')}>
            Features
          </button>
          <button onClick={() => navigate('/pricing')} className={navLinkClass('/pricing')}>
            Pricing
          </button>

          {isAuthenticated ? (
            <button
              onClick={() => navigate('/projects')}
              className="text-sm font-semibold px-5 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all cursor-pointer"
            >
              Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/auth')}
                className="text-sm font-semibold px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
              >
                Log in
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="text-sm font-semibold px-5 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all cursor-pointer"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile slide-down panel */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3">
          <button
            onClick={() => { navigate('/features'); setMobileOpen(false); }}
            className={`text-left text-sm py-2 ${navLinkClass('/features')}`}
          >
            Features
          </button>
          <button
            onClick={() => { navigate('/pricing'); setMobileOpen(false); }}
            className={`text-left text-sm py-2 ${navLinkClass('/pricing')}`}
          >
            Pricing
          </button>
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
            {isAuthenticated ? (
              <button
                onClick={() => { navigate('/projects'); setMobileOpen(false); }}
                className="w-full py-2.5 bg-indigo-500 text-white rounded-lg font-semibold text-sm"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => { navigate('/auth'); setMobileOpen(false); }}
                  className="w-full py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700"
                >
                  Log in
                </button>
                <button
                  onClick={() => { navigate('/auth'); setMobileOpen(false); }}
                  className="w-full py-2.5 bg-indigo-500 text-white rounded-lg font-semibold text-sm"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
