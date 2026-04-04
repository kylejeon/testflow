import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import { LogoMark } from './Logo';
import NotificationBell from './feature/NotificationBell';
import { Avatar } from './Avatar';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: number;
}

interface Project {
  id: string;
  name: string;
}

const TIER_INFO = {
  1: { name: 'Free', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: 'ri-user-line' },
  2: { name: 'Starter', color: 'bg-indigo-50 text-indigo-700 border-indigo-300', icon: 'ri-vip-crown-line' },
  3: { name: 'Professional', color: 'bg-violet-50 text-violet-700 border-violet-300', icon: 'ri-vip-diamond-line' },
  4: { name: 'Enterprise', color: 'bg-amber-50 text-amber-700 border-amber-300', icon: 'ri-vip-diamond-line' },
};

interface Props {
  projectId: string;
  projectName: string;
}

// Module-level cache — persists across tab navigations
const projectNameCache = new Map<string, string>();

export default function ProjectHeader({ projectId, projectName }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [resolvedName, setResolvedName] = useState<string>(
    projectName || projectNameCache.get(projectId) || ''
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const projectDropRef = useRef<HTMLDivElement>(null);

  // Sync prop → cache → state
  useEffect(() => {
    if (projectName) {
      projectNameCache.set(projectId, projectName);
      setResolvedName(projectName);
    } else if (projectNameCache.has(projectId)) {
      setResolvedName(projectNameCache.get(projectId)!);
    } else if (projectId) {
      // Fetch directly if not cached and prop is empty
      supabase.from('projects').select('name').eq('id', projectId).maybeSingle().then(({ data }) => {
        if (data?.name) {
          projectNameCache.set(projectId, data.name);
          setResolvedName(data.name);
        }
      });
    }
  }, [projectId, projectName]);

  useEffect(() => {
    fetchUserProfile();
    fetchProjects();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (projectDropRef.current && !projectDropRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('email, full_name, subscription_tier')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setUserProfile({
          id: user.id,
          email: data.email || user.email || '',
          full_name: data.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
          subscription_tier: data.subscription_tier || 1,
        });
      } else {
        // profiles 행 없을 경우 auth 데이터로 폴백
        setUserProfile({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          subscription_tier: 1,
        });
      }
    } catch {}
  };

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      if (!memberRows?.length) return;
      const ids = memberRows.map((m) => m.project_id);
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', ids)
        .order('name');
      setProjects(projectsData || []);
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      queryClient.clear();
      navigate('/auth');
    } catch {}
  };

  const currentTier = userProfile?.subscription_tier || 1;
  const tierInfo = TIER_INFO[currentTier as keyof typeof TIER_INFO];

  const path = location.pathname;

  const navItems = [
    {
      label: 'Dashboard',
      to: `/projects/${projectId}`,
      active: path === `/projects/${projectId}`,
    },
    {
      label: 'Test Cases',
      to: `/projects/${projectId}/testcases`,
      active: path.includes('/testcases'),
    },
    {
      label: 'Runs & Results',
      to: `/projects/${projectId}/runs`,
      active: path.includes('/runs'),
    },
    {
      label: 'Requirements',
      to: `/projects/${projectId}/requirements`,
      active: path.includes('/requirements'),
    },
    {
      label: 'Traceability',
      to: `/projects/${projectId}/traceability`,
      active: path.includes('/traceability'),
    },
    {
      label: 'Milestones',
      to: `/projects/${projectId}/milestones`,
      active: path.includes('/milestones'),
    },
    {
      label: 'Discovery Logs',
      to: `/projects/${projectId}/discovery-logs`,
      active: path.includes('/discovery-logs') || path.includes('/sessions'),
    },
    {
      label: 'Documents',
      to: `/projects/${projectId}/documentation`,
      active: path.includes('/documentation'),
    },
  ];

  return (
    <header
      style={{
        background: '#fff',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        height: '3.5rem',
        flexShrink: 0,
        gap: 0,
      }}
    >
      {/* Logo */}
      <Link
        to="/projects"
        className="flex items-center cursor-pointer flex-shrink-0"
        style={{ marginRight: '0.75rem' }}
      >
        <LogoMark />
      </Link>

      {/* Divider */}
      <div style={{ width: '1px', height: '1.25rem', background: '#CBD5E1', marginRight: '0.75rem', flexShrink: 0 }} />

      {/* Project Name Dropdown */}
      <div ref={projectDropRef} style={{ position: 'relative', marginRight: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={() => setShowProjectDropdown(!showProjectDropdown)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.3rem 0.5rem',
            borderRadius: '0.5rem',
            background: showProjectDropdown ? '#F1F5F9' : 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#1E293B',
          }}
          className="hover:bg-slate-100 transition-colors"
        >
          <span style={{ maxWidth: '20rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {resolvedName}
          </span>
          <i className="ri-arrow-down-s-line" style={{ fontSize: '1rem', color: '#94A3B8' }}></i>
        </button>

        {showProjectDropdown && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 0.25rem)',
              left: 0,
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: '0.625rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              minWidth: '15rem',
              zIndex: 50,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '0.5rem 0.875rem', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>
              Switch project
            </div>
            {projects.length === 0 ? (
              <div style={{ padding: '0.75rem 0.875rem', fontSize: '0.8125rem', color: '#94A3B8' }}>No projects found</div>
            ) : (
              projects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  onClick={() => setShowProjectDropdown(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 0.875rem',
                    fontSize: '0.8125rem',
                    color: p.id === projectId ? '#6366F1' : '#1E293B',
                    fontWeight: p.id === projectId ? 600 : 400,
                    textDecoration: 'none',
                  }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {p.id === projectId ? (
                    <i className="ri-check-line" style={{ fontSize: '0.875rem', color: '#6366F1', flexShrink: 0 }}></i>
                  ) : (
                    <span style={{ width: '0.875rem', flexShrink: 0 }}></span>
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Nav tabs — border-bottom active indicator, full header height */}
      <nav style={{ display: 'flex', alignItems: 'stretch', height: '100%', flex: 1, minWidth: 0 }}>
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 0.875rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              color: item.active ? '#6366F1' : '#64748B',
              borderBottom: item.active ? '2px solid #6366F1' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'color 0.15s',
              cursor: 'pointer',
            }}
            className="hover:text-slate-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right: Notification + Keyboard shortcuts + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <NotificationBell />

        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-shortcuts'))}
          title="Keyboard Shortcuts (?)"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
        >
          <i className="ri-keyboard-line text-base" />
        </button>

        <div ref={profileMenuRef} style={{ position: 'relative' }}>
          <div onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ cursor: 'pointer' }}>
            <Avatar
              userId={userProfile?.id}
              name={userProfile?.full_name}
              email={userProfile?.email}
              size="md"
            />
          </div>

          {showProfileMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowProfileMenu(false)} />
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 0.5rem)',
                  width: '14rem',
                  background: '#fff',
                  borderRadius: '0.625rem',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  border: '1px solid #E2E8F0',
                  zIndex: 20,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>{userProfile?.full_name || userProfile?.email || 'User'}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{userProfile?.email}</p>
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border ${tierInfo.color}`}
                    style={{ marginTop: '0.375rem' }}
                  >
                    <i className={`${tierInfo.icon} text-sm`}></i>
                    {tierInfo.name}
                  </div>
                </div>
                <Link
                  to="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    color: '#374151',
                    textDecoration: 'none',
                    borderBottom: '1px solid #F1F5F9',
                  }}
                  className="hover:bg-gray-50"
                >
                  <i className="ri-settings-3-line text-lg"></i>
                  <span>Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    color: '#374151',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  className="hover:bg-gray-50"
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
  );
}
