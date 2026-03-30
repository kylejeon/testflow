import PageLoader from '../../components/PageLoader';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import { Avatar } from '../../components/Avatar';

interface Session {
  id: string;
  project_id: string;
  name: string;
  charter: string;
  status: 'active' | 'closed';
  milestone_id: string;
  tags: string[];
  assignees: string[];
  created_at: string;
  updated_at: string;
  actualStatus?: 'new' | 'in_progress' | 'paused' | 'completed';
  activityData?: string[];
}

interface Milestone {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
}

interface ProjectMember {
  user_id: string;
  full_name: string;
  email: string;
}

export default function ProjectSessions() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'closed'>('all');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [globalActivityData, setGlobalActivityData] = useState<string[]>([]);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string; subscription_tier: number; avatar_emoji: string } | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    milestone_id: string;
    charter: string;
    tags: string;
    assignees: string[];
    estimated_hours: number;
  }>({
    name: '',
    milestone_id: '',
    charter: '',
    tags: '',
    assignees: [],
    estimated_hours: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [sidebarMilestoneFilter, setSidebarMilestoneFilter] = useState<string | null>(null);
  const [sidebarTagFilter, setSidebarTagFilter] = useState<string | null>(null);

  const handleMenuOpen = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (openMenuId === sessionId) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
    setOpenMenuId(sessionId);
  };

  const fetchData = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch project member count
      const { count: membersCount, error: membersError } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (!membersError) {
        setMemberCount(membersCount || 0);
      }

      // Fetch project members with profiles
      const { data: membersData, error: membersDataError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);

      if (!membersDataError && membersData && membersData.length > 0) {
        const userIds = membersData.map((m) => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const members: ProjectMember[] = (profilesData || []).map((p) => ({
          user_id: p.id,
          full_name: p.full_name || p.email?.split('@')[0] || 'Unknown',
          email: p.email || '',
        }));
        setProjectMembers(members);
      }

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData || []);

      // Fetch all session logs for global activity (including closed sessions)
      const { data: allLogsData, error: allLogsError } = await supabase
        .from('session_logs')
        .select(`
          id,
          type,
          created_at,
          session_id,
          sessions!inner (
            project_id
          )
        `)
        .eq('sessions.project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(72);

      if (allLogsError) throw allLogsError;

      // Process global activity data from all sessions (newest first)
      const globalActivity = (allLogsData || []).map(log => {
        switch (log.type) {
          case 'passed':
            return '#10b981'; // green
          case 'failed':
            return '#ef4444'; // red
          case 'blocked':
            return '#f59e0b'; // orange
          case 'note':
            return '#3b82f6'; // blue
          default:
            return '#e5e7eb'; // gray
        }
      });

      // Fill remaining slots with gray if less than 72 logs
      while (globalActivity.length < 72) {
        globalActivity.push('#e5e7eb');
      }

      setGlobalActivityData(globalActivity);

      // Fetch sessions with their logs
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          session_logs (
            id,
            type,
            created_at
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Process sessions with activity data from logs
      const processedSessions = sessionsData?.map(session => {
        const logs = session.session_logs || [];
        
        // Sort logs by created_at descending (newest first)
        const sortedLogs = [...logs].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Take last 24 logs and map to colors
        const activityData = sortedLogs.slice(0, 24).map(log => {
          switch (log.type) {
            case 'passed':
              return '#10b981'; // green
            case 'failed':
              return '#ef4444'; // red
            case 'blocked':
              return '#f59e0b'; // orange
            case 'note':
              return '#3b82f6'; // blue
            default:
              return '#e5e7eb'; // gray
          }
        });

        // Fill remaining slots with gray if less than 24 logs
        while (activityData.length < 24) {
          activityData.push('#e5e7eb');
        }

        // Determine actual status based on ended_at and logs
        let actualStatus: 'new' | 'in_progress' | 'paused' | 'completed' = 'new';
        
        if (session.status === 'closed' || session.ended_at) {
          actualStatus = 'completed';
        } else if (session.paused_at) {
          actualStatus = 'paused';
        } else if (session.started_at) {
          actualStatus = 'in_progress';
        }

        return {
          ...session,
          activityData,
          actualStatus
        };
      }) || [];

      setSessions(processedSessions);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, subscription_tier, avatar_emoji')
          .eq('id', user.id)
          .maybeSingle();
        
        setUserProfile({
          full_name: profile?.full_name || user.email?.split('@')[0] || 'User',
          email: profile?.email || user.email || '',
          subscription_tier: profile?.subscription_tier || 1,
          avatar_emoji: profile?.avatar_emoji || '',
        });
      }
    } catch (error) {
      console.error('프로필 로딩 오류:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getTierInfo = (tier: number) => {
    switch (tier) {
      case 2:
        return { name: 'Starter', icon: 'ri-vip-crown-line', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' };
      case 3:
        return { name: 'Professional', icon: 'ri-vip-diamond-line', color: 'bg-violet-50 text-violet-700 border-violet-300' };
      case 4:
        return { name: 'Enterprise', icon: 'ri-vip-diamond-line', color: 'bg-amber-50 text-amber-700 border-amber-300' };
      default:
        return { name: 'Free', icon: 'ri-user-line', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const tierInfo = getTierInfo(userProfile?.subscription_tier || 1);

  useEffect(() => {
    fetchData();
    fetchUserProfile();
  }, [projectId, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setShowTagsDropdown(false);
      }
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
      const target = event.target as Node;
      const menuContainers = document.querySelectorAll('[data-session-menu]');
      let clickedInsideMenu = false;
      menuContainers.forEach(container => {
        if (container.contains(target)) {
          clickedInsideMenu = true;
        }
      });
      if (!clickedInsideMenu) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssigneeToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(userId)
        ? prev.assignees.filter(id => id !== userId)
        : [...prev.assignees, userId],
    }));
  };

  const handleAddSession = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a session name');
      return;
    }

    try {
      setSubmitting(true);

      const sessionData = {
        project_id: projectId,
        name: formData.name,
        milestone_id: formData.milestone_id || null,
        charter: formData.charter,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        assignees: formData.assignees,
        status: 'active',
        duration_minutes: formData.estimated_hours > 0 ? Math.round(formData.estimated_hours * 60) : null,
      };

      if (editingSessionId) {
        // Update existing session
        const { error } = await supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', editingSessionId);

        if (error) throw error;
      } else {
        // Create new session
        const { error } = await supabase
          .from('sessions')
          .insert([sessionData]);

        if (error) throw error;
      }

      // Refresh data
      await fetchData();
      
      // Reset form and close modal
      setFormData({
        name: '',
        milestone_id: '',
        charter: '',
        tags: '',
        assignees: [],
      });
      setEditingSessionId(null);
      setShowAddSessionModal(false);
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSession = (session: Session) => {
    setEditingSessionId(session.id);
    setFormData({
      name: session.name,
      milestone_id: session.milestone_id || '',
      charter: session.charter || '',
      tags: session.tags ? session.tags.join(', ') : '',
      assignees: (session as any).assignees || [],
    });
    setShowAddSessionModal(true);
    setOpenMenuId(null);
  };

  const handleCloseSession = async (sessionId: string) => {
    if (!confirm('이 세션을 종료하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      await fetchData();
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error closing session:', error);
      alert('Failed to end session.');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      await fetchData();
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session.');
    }
  };

  const handleStatusFilterToggle = (status: string) => {
    setStatusFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleTagFilterToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setStatusFilters([]);
    setSelectedTags([]);
    setSearchQuery('');
  };

  const getAllTags = () => {
    const tagsSet = new Set<string>();
    sessions.forEach(session => {
      if (session.tags && Array.isArray(session.tags)) {
        session.tags.forEach(tag => {
          const trimmedTag = tag.trim();
          if (trimmedTag) {
            tagsSet.add(trimmedTag);
          }
        });
      }
    });
    return Array.from(tagsSet).sort();
  };

  const allTags = getAllTags();

  const filteredSessions = sessions.filter(session => {
    const matchesTab = activeTab === 'all' ? true : activeTab === 'active' ? session.status === 'active' : session.status === 'closed';
    const matchesSearch = session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.charter && session.charter.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(session.actualStatus || 'new');
    const matchesTags = selectedTags.length === 0 || (session.tags && selectedTags.some(tag => session.tags.includes(tag)));
    const matchesSidebarMilestone = !sidebarMilestoneFilter || session.milestone_id === sidebarMilestoneFilter;
    const matchesSidebarTag = !sidebarTagFilter || (session.tags && session.tags.includes(sidebarTagFilter));
    return matchesTab && matchesSearch && matchesStatus && matchesTags && matchesSidebarMilestone && matchesSidebarTag;
  });

  const formatSessionDuration = (session: any) => {
    if (session.started_at) {
      const start = new Date(session.started_at).getTime();
      const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
      const paused = session.paused_duration || 0;
      const ms = Math.max(0, end - start - paused);
      const totalMin = Math.floor(ms / 60000);
      if (totalMin === 0) return '-';
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    if (session.duration_minutes) {
      const h = Math.floor(session.duration_minutes / 60);
      const m = session.duration_minutes % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    return '-';
  };

  const formatRelativeTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const activeFilterCount = statusFilters.length + selectedTags.length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getMilestoneStatus = (milestone: Milestone) => {
    const now = new Date();
    const endDate = new Date(milestone.end_date);
    
    if (milestone.status === 'completed') {
      return { label: 'Completed', className: 'bg-gray-100 text-gray-700' };
    }
    
    if (endDate < now) {
      return { label: 'Overdue', className: 'bg-orange-100 text-orange-700' };
    }

    return { label: 'In Progress', className: 'bg-blue-100 text-blue-700' };
  };

  const getSessionsByMilestone = (milestoneId: string) => {
    return filteredSessions.filter(session => session.milestone_id === milestoneId);
  };

  const getSessionsWithoutMilestone = () => {
    return filteredSessions.filter(session => !session.milestone_id);
  };

  const calculateStats = () => {
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const unstarted = sessions.filter(s => s.status === 'active' && s.actualStatus === 'new').length;
    const contributors = memberCount;
    const closedSessions = sessions.filter(s => s.status === 'closed').length;

    return { activeSessions, unstarted, contributors, closedSessions };
  };

  const stats = calculateStats();

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader projectId={projectId || ''} projectName={project?.name || ''} />

        {/* Subtab Row */}
        <div className="flex items-center border-b border-[#E2E8F0] bg-white flex-shrink-0 h-[2.625rem] px-5">
          {[
            { key: 'all',    label: 'All',       icon: 'ri-list-check-3',         count: sessions.length },
            { key: 'active', label: 'Active',    icon: 'ri-radar-fill',           count: sessions.filter(s => s.status === 'active').length },
            { key: 'closed', label: 'Completed', icon: 'ri-checkbox-circle-fill', count: sessions.filter(s => s.status === 'closed').length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-[0.3125rem] h-full px-[0.875rem] text-[0.8125rem] font-medium relative border-b-[2.5px] transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.key ? 'text-[#6366F1] border-[#6366F1]' : 'text-[#64748B] border-transparent hover:text-[#1E293B]'
              }`}
            >
              <i className={`${tab.icon} text-[0.875rem]`} />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded text-[0.6875rem] font-semibold ${
                activeTab === tab.key ? 'bg-[#EEF2FF] text-[#6366F1]' : 'bg-[#F1F5F9] text-[#64748B]'
              }`}>{tab.count}</span>
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[0.8125rem] text-[#64748B] px-3">{filteredSessions.length} entries</span>
          <button
            onClick={() => { setEditingSessionId(null); setFormData({ name: '', milestone_id: '', charter: '', tags: '', assignees: [], estimated_hours: 1 }); setTagInput(''); setShowAddSessionModal(true); }}
            className="flex items-center gap-1.5 px-[0.875rem] py-[0.375rem] bg-[#6366F1] text-white rounded-[0.375rem] text-[0.8125rem] font-medium hover:bg-[#4F46E5] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line text-sm" />
            New Session
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-[220px] bg-white border-r border-[#E2E8F0] overflow-y-auto flex-shrink-0 py-3">
            <div className="px-3 mb-3">
              <div
                onClick={() => { setSidebarMilestoneFilter(null); setSidebarTagFilter(null); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[6px] cursor-pointer text-[0.8125rem] transition-colors ${
                  !sidebarMilestoneFilter && !sidebarTagFilter ? 'bg-[#EEF2FF] text-[#4338CA] font-semibold' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                <i className="ri-folder-line text-sm" />
                All Sessions
                <span className={`ml-auto text-[0.75rem] font-semibold ${!sidebarMilestoneFilter && !sidebarTagFilter ? 'text-[#6366F1]' : 'text-[#94A3B8]'}`}>
                  ({sessions.length})
                </span>
              </div>
            </div>

            {milestones.length > 0 && (
              <div className="px-3 mb-3">
                <div className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wide px-3 py-2 mb-1">Milestones</div>
                {milestones.map(m => {
                  const cnt = sessions.filter(s => s.milestone_id === m.id).length;
                  if (cnt === 0) return null;
                  return (
                    <div
                      key={m.id}
                      onClick={() => { setSidebarMilestoneFilter(sidebarMilestoneFilter === m.id ? null : m.id); setSidebarTagFilter(null); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-[6px] cursor-pointer text-[0.8125rem] transition-colors overflow-hidden ${
                        sidebarMilestoneFilter === m.id ? 'bg-[#EEF2FF] text-[#4338CA] font-semibold' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <i className="ri-flag-line text-sm flex-shrink-0" />
                      <span className="truncate">{m.name}</span>
                      <span className={`ml-auto text-[0.75rem] font-semibold flex-shrink-0 ${sidebarMilestoneFilter === m.id ? 'text-[#6366F1]' : 'text-[#94A3B8]'}`}>({cnt})</span>
                    </div>
                  );
                })}
              </div>
            )}

            {allTags.length > 0 && (
              <div className="px-3">
                <div className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wide px-3 py-2 mb-1">Tags</div>
                {allTags.map(tag => {
                  const cnt = sessions.filter(s => s.tags && s.tags.includes(tag)).length;
                  return (
                    <div
                      key={tag}
                      onClick={() => { setSidebarTagFilter(sidebarTagFilter === tag ? null : tag); setSidebarMilestoneFilter(null); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-[6px] cursor-pointer text-[0.8125rem] transition-colors ${
                        sidebarTagFilter === tag ? 'bg-[#EEF2FF] text-[#4338CA] font-semibold' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <span className="truncate">{tag}</span>
                      <span className={`ml-auto text-[0.75rem] font-semibold ${sidebarTagFilter === tag ? 'text-[#6366F1]' : 'text-[#94A3B8]'}`}>({cnt})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
            {/* Stats Bar */}
            <div className="flex items-center gap-4 px-5 py-3 bg-white border-b border-[#E2E8F0] flex-shrink-0">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-[6px]">
                <i className="ri-radar-fill text-[1.125rem] text-[#6366F1]" />
                <div>
                  <div className="text-[0.6875rem] text-[#94A3B8] font-medium uppercase tracking-wide">Active Discoveries</div>
                  <div className="text-[0.875rem] font-bold text-[#0F172A]">{stats.activeSessions}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-[6px]">
                <i className="ri-bug-line text-[1.125rem] text-[#EF4444]" />
                <div>
                  <div className="text-[0.6875rem] text-[#94A3B8] font-medium uppercase tracking-wide">Bugs Found</div>
                  <div className="text-[0.875rem] font-bold text-[#0F172A]">
                    {sessions.reduce((sum, s) => sum + ((s as any).session_logs?.filter((l: any) => l.type === 'failed').length || 0), 0)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-[6px]">
                <i className="ri-time-line text-[1.125rem] text-[#8B5CF6]" />
                <div>
                  <div className="text-[0.6875rem] text-[#94A3B8] font-medium uppercase tracking-wide">Contributors</div>
                  <div className="text-[0.875rem] font-bold text-[#0F172A]">{stats.contributors}</div>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 px-5 py-[0.625rem] bg-white border-b border-[#E2E8F0] flex-shrink-0">
              <div className="relative flex-1">
                <i className="ri-search-line absolute left-[0.625rem] top-1/2 -translate-y-1/2 text-[#94A3B8] text-[0.875rem]" />
                <input
                  type="text"
                  placeholder="Search discoveries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-[0.375rem] border border-[#E2E8F0] rounded-[6px] bg-[#F8FAFC] text-[0.8125rem] text-[#64748B] placeholder-[#94A3B8] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div className="relative" ref={filterDropdownRef}>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-1.5 px-3 py-[0.375rem] border border-[#E2E8F0] rounded-[6px] bg-white text-[0.8125rem] font-semibold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer whitespace-nowrap transition-colors"
                >
                  <i className="ri-filter-3-line" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 bg-orange-500 text-white rounded-full text-[0.625rem] flex items-center justify-center font-bold">{activeFilterCount}</span>
                  )}
                </button>
                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-[#E2E8F0] z-50">
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[0.8125rem] font-semibold text-[#475569]">Status</span>
                        {statusFilters.length > 0 && (
                          <button onClick={() => setStatusFilters([])} className="text-[0.75rem] text-[#6366F1] cursor-pointer">Clear</button>
                        )}
                      </div>
                      {(['new', 'in_progress', 'paused', 'completed'] as const).map(s => (
                        <div key={s} onClick={() => handleStatusFilterToggle(s)} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-[0.8125rem] transition-colors ${statusFilters.includes(s) ? 'bg-[#EEF2FF] text-[#4338CA]' : 'text-[#475569] hover:bg-[#F1F5F9]'}`}>
                          <i className={`${statusFilters.includes(s) ? 'ri-checkbox-fill text-[#6366F1]' : 'ri-checkbox-blank-line text-[#CBD5E1]'}`} />
                          {s === 'new' ? 'Not Started' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <PageLoader />
            ) : filteredSessions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <i className="ri-search-line text-5xl text-[#CBD5E1] mb-3" />
                  <p className="text-[#64748B] font-medium">No discovery logs found</p>
                  <p className="text-[0.8125rem] text-[#94A3B8] mt-1">
                    {searchQuery || activeFilterCount > 0 || sidebarMilestoneFilter || sidebarTagFilter
                      ? 'Try adjusting your search or filters'
                      : 'Create your first discovery log to get started'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-white">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] z-10">
                    <tr>
                      <th className="w-[42px] px-4 py-3 text-left border-r border-[#E2E8F0]">
                        <input type="checkbox" className="w-[1.125rem] h-[1.125rem] cursor-pointer accent-[#6366F1]" />
                      </th>
                      <th className="w-[130px] px-4 py-3 text-left text-[0.6875rem] font-semibold text-[#64748B] uppercase tracking-wide border-r border-[#E2E8F0]">Status</th>
                      <th className="w-[220px] px-4 py-3 text-left text-[0.6875rem] font-semibold text-[#64748B] uppercase tracking-wide border-r border-[#E2E8F0]">Discovery Name</th>
                      <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold text-[#64748B] uppercase tracking-wide border-r border-[#E2E8F0]">Description</th>
                      <th className="w-[60px] px-4 py-3 text-left text-[0.6875rem] font-semibold text-[#64748B] uppercase tracking-wide border-r border-[#E2E8F0]">Bugs</th>
                      <th className="w-[140px] px-4 py-3 text-left text-[0.6875rem] font-semibold text-[#64748B] uppercase tracking-wide border-r border-[#E2E8F0]">Tags</th>
                      <th className="w-[80px] px-4 py-3 text-left text-[0.6875rem] font-semibold text-[#64748B] uppercase tracking-wide border-r border-[#E2E8F0]">Assignee</th>
                      <th className="w-[80px] px-4 py-3 text-left text-[0.6875rem] font-semibold text-[#64748B] uppercase tracking-wide border-r border-[#E2E8F0]">Duration</th>
                      <th className="w-[100px] px-4 py-3 text-left text-[0.6875rem] font-semibold text-[#64748B] uppercase tracking-wide">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => {
                      const bugCount = (session as any).session_logs?.filter((l: any) => l.type === 'failed').length || 0;
                      const statusMap: Record<string, { label: string; pill: string; dot: string }> = {
                        new:         { label: 'Not Started', pill: 'bg-[#F1F5F9] text-[#64748B]',   dot: 'bg-[#94A3B8]' },
                        in_progress: { label: 'In Progress', pill: 'bg-[#EFF6FF] text-[#1D4ED8]',   dot: 'bg-[#3B82F6]' },
                        paused:      { label: 'Paused',      pill: 'bg-[#FEF3C7] text-[#92400E]',   dot: 'bg-[#F59E0B]' },
                        completed:   { label: 'Completed',   pill: 'bg-[#DCFCE7] text-[#15803D]',   dot: 'bg-[#22C55E]' },
                      };
                      const sc = statusMap[session.actualStatus || 'new'];
                      return (
                        <tr
                          key={session.id}
                          onClick={() => navigate(`/projects/${projectId}/discovery-logs/${session.id}`)}
                          className="border-b border-[#E2E8F0] cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="px-4 py-3 border-r border-[#E2E8F0]" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" className="w-[1.125rem] h-[1.125rem] cursor-pointer accent-[#6366F1]" />
                          </td>
                          <td className="px-4 py-3 border-r border-[#E2E8F0]">
                            <span className={`inline-flex items-center gap-[5px] px-[10px] py-1 rounded-[4px] text-[0.75rem] font-semibold whitespace-nowrap ${sc.pill}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-r border-[#E2E8F0]">
                            <span className="text-[0.8125rem] font-semibold text-[#0F172A]">{session.name}</span>
                          </td>
                          <td className="px-4 py-3 border-r border-[#E2E8F0]">
                            <span className="text-[0.8125rem] text-[#64748B] block max-w-[280px] truncate">{session.charter || ''}</span>
                          </td>
                          <td className="px-4 py-3 border-r border-[#E2E8F0]">
                            {bugCount > 0 ? (
                              <span className="px-2 py-1 rounded-[4px] text-[0.75rem] font-semibold bg-[#FEF2F2] text-[#991B1B]">{bugCount}</span>
                            ) : (
                              <span className="text-[#94A3B8] text-[0.8125rem]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-[#E2E8F0]">
                            <div className="flex items-center gap-1 flex-wrap">
                              {session.tags?.slice(0, 2).map((tag, idx) => (
                                <span key={idx} className="bg-[#EEF2FF] text-[#4338CA] px-1.5 py-0.5 rounded-[3px] text-[0.6875rem] font-medium">{tag}</span>
                              ))}
                              {(session.tags?.length || 0) > 2 && (
                                <span className="text-[#94A3B8] text-[0.6875rem]">+{session.tags!.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-[#E2E8F0]">
                            {session.assignees && session.assignees.length > 0 ? (
                              <div className="flex -space-x-1.5">
                                {session.assignees.slice(0, 3).map((userId) => {
                                  const member = projectMembers.find(m => m.user_id === userId);
                                  return (
                                    <Avatar key={userId} userId={userId} name={member?.full_name} size="xs" style={{ border: '1.5px solid #fff' }} title={member?.full_name || userId} />
                                  );
                                })}
                                {session.assignees.length > 3 && (
                                  <div className="w-5 h-5 bg-[#E2E8F0] rounded-full border-[1.5px] border-white flex items-center justify-center text-[#64748B] text-[0.625rem] font-semibold">
                                    +{session.assignees.length - 3}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#94A3B8] text-[0.8125rem]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-[#E2E8F0]">
                            <span className="text-[0.75rem] text-[#64748B] font-mono">{formatSessionDuration(session as any)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[0.75rem] text-[#94A3B8]">{formatRelativeTime(session.updated_at)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Context Menu */}
      {openMenuId && menuPosition && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => { setOpenMenuId(null); setMenuPosition(null); }}></div>
          <div className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[999]"
            style={{ top: menuPosition.top, right: menuPosition.right }}>
            {(() => {
              const s = sessions.find(s => s.id === openMenuId);
              if (!s) return null;
              return (
                <>
                  <button onClick={(e) => { e.stopPropagation(); handleEditSession(s); }} className="w-full text-left px-[0.875rem] py-[0.4375rem] text-[0.8125rem] text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <i className="ri-edit-line" /><span>Edit</span>
                  </button>
                  {s.status === 'active' && (
                    <button onClick={(e) => { e.stopPropagation(); handleCloseSession(s.id); }} className="w-full text-left px-[0.875rem] py-[0.4375rem] text-[0.8125rem] text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap">
                      <i className="ri-check-line" /><span>Close Session</span>
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} className="w-full text-left px-[0.875rem] py-[0.4375rem] text-[0.8125rem] text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-gray-200">
                    <i className="ri-delete-bin-line" /><span>Delete</span>
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}


      {/* Add/Edit Session Modal */}
      {showAddSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{editingSessionId ? 'Edit Discovery Log' : 'New Discovery Log'}</h2>
              <button 
                onClick={() => {
                  setShowAddSessionModal(false);
                  setEditingSessionId(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6">
                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-[0.8125rem] font-medium text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Log name"
                      className="w-full px-[0.875rem] py-[0.4375rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[0.8125rem]"
                    />
                  </div>

                  {/* Milestone */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[0.8125rem] font-medium text-gray-700">
                        Milestone
                      </label>
                      <button className="text-indigo-600 hover:text-indigo-700 cursor-pointer">
                        <i className="ri-add-line"></i>
                      </button>
                    </div>
                    <select
                      name="milestone_id"
                      value={formData.milestone_id}
                      onChange={handleInputChange}
                      className="w-full px-[0.875rem] py-[0.4375rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[0.8125rem] cursor-pointer"
                    >
                      <option value="">Select milestone</option>
                      {milestones.map((milestone) => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assignees */}
                  <div>
                    <label className="block text-[0.8125rem] font-medium text-gray-700 mb-2">
                      Assignees
                    </label>

                    {/* Selected chips */}
                    {formData.assignees.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.assignees.map((userId) => {
                          const member = projectMembers.find(m => m.user_id === userId);
                          if (!member) return null;
                          return (
                            <div
                              key={userId}
                              className="flex items-center gap-1.5 pl-1 pr-2 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-sm text-indigo-700"
                            >
                              <Avatar
                                userId={userId}
                                name={member.full_name}
                                size="xs"
                              />
                              <span className="text-xs font-medium">{member.full_name}</span>
                              <button
                                type="button"
                                onClick={() => handleAssigneeToggle(userId)}
                                className="w-4 h-4 flex items-center justify-center text-indigo-400 hover:text-indigo-700 cursor-pointer ml-0.5"
                              >
                                <i className="ri-close-line text-xs"></i>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Dropdown trigger */}
                    <div className="relative" ref={assigneeDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAssigneeDropdown(prev => !prev);
                          setAssigneeSearch('');
                        }}
                        className="w-full flex items-center justify-between px-[0.875rem] py-[0.4375rem] border border-gray-300 rounded-lg text-[0.8125rem] text-gray-500 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-white"
                      >
                        <span>{formData.assignees.length > 0 ? `${formData.assignees.length}명 선택됨` : '멤버 선택...'}</span>
                        <i className={`ri-arrow-${showAssigneeDropdown ? 'up' : 'down'}-s-line text-gray-400`}></i>
                      </button>

                      {showAssigneeDropdown && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                          {/* Search */}
                          <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                              <input
                                type="text"
                                value={assigneeSearch}
                                onChange={e => setAssigneeSearch(e.target.value)}
                                placeholder="멤버 검색..."
                                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                              />
                            </div>
                          </div>

                          {/* Member list */}
                          <div className="max-h-48 overflow-y-auto">
                            {projectMembers.length === 0 ? (
                              <p className="text-xs text-gray-400 italic text-center py-4">프로젝트 멤버가 없습니다.</p>
                            ) : (
                              projectMembers
                                .filter(m =>
                                  m.full_name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                                  m.email.toLowerCase().includes(assigneeSearch.toLowerCase())
                                )
                                .map((member, idx) => {
                                  const isSelected = formData.assignees.includes(member.user_id);
                                  return (
                                    <div
                                      key={member.user_id}
                                      onClick={() => handleAssigneeToggle(member.user_id)}
                                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                        isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                                      }`}
                                    >
                                      <Avatar
                                        userId={member.user_id}
                                        name={member.full_name}
                                        size="sm"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{member.full_name}</p>
                                        <p className="text-xs text-gray-400 truncate">{member.email}</p>
                                      </div>
                                      {isSelected && (
                                        <i className="ri-check-line text-indigo-500 text-sm flex-shrink-0"></i>
                                      )}
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mission */}
                  <div>
                    <label className="block text-[0.8125rem] font-medium text-gray-700 mb-2">
                      Mission
                    </label>
                    <textarea
                      name="charter"
                      value={formData.charter}
                      onChange={handleInputChange}
                      placeholder="Describe the testing mission and objectives..."
                      rows={4}
                      className="w-full px-[0.875rem] py-[0.4375rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[0.8125rem] resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-[0.8125rem] font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    {formData.tags && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {formData.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-medium">
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                const list = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
                                list.splice(i, 1);
                                setFormData(prev => ({ ...prev, tags: list.join(', ') }));
                              }}
                              className="cursor-pointer text-indigo-400 hover:text-indigo-700 ml-0.5"
                            >
                              <i className="ri-close-line text-xs" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const trimmed = tagInput.trim().replace(/,$/, '');
                          if (!trimmed) return;
                          const existing = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                          if (!existing.includes(trimmed)) {
                            setFormData(prev => ({ ...prev, tags: [...existing, trimmed].join(', ') }));
                          }
                          setTagInput('');
                        }
                      }}
                      placeholder="Type a tag and press Enter"
                      className="w-full px-[0.875rem] py-[0.4375rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[0.8125rem]"
                    />
                    <p className="text-xs text-gray-500 mt-1">Press Enter or comma to add a tag</p>
                  </div>

                  {/* Estimated Duration */}
                  <div>
                    <label className="block text-[0.8125rem] font-medium text-gray-700 mb-2">
                      Estimated Duration
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.estimated_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) || 0 }))}
                        min="0"
                        step="0.5"
                        className="w-full px-[0.875rem] py-[0.4375rem] pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[0.8125rem]"
                        placeholder="2"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.8125rem] text-gray-400 font-medium pointer-events-none">h</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Enter duration in hours (e.g. 2 = 2h, 1.5 = 1h 30m)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowAddSessionModal(false);
                  setEditingSessionId(null);
                }}
                disabled={submitting}
                className="px-[0.875rem] py-[0.4375rem] text-[0.8125rem] font-medium text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSession}
                disabled={submitting}
                className="px-[0.875rem] py-[0.4375rem] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-[0.8125rem] font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (editingSessionId ? 'Updating...' : 'Adding...') : (editingSessionId ? 'Update session' : 'Add session')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
