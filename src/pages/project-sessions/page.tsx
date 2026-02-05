import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface Session {
  id: string;
  project_id: string;
  name: string;
  charter: string;
  status: 'active' | 'closed';
  milestone_id: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  actualStatus?: 'new' | 'in_progress' | 'completed';
  activityData?: string[];
}

interface Milestone {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
}

export default function ProjectSessions() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [globalActivityData, setGlobalActivityData] = useState<string[]>([]);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    milestone_id: '',
    charter: '',
    tags: '',
  });
  const [submitting, setSubmitting] = useState(false);

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
        let actualStatus: 'new' | 'in_progress' | 'completed' = 'new';
        
        if (session.status === 'closed' || session.ended_at) {
          actualStatus = 'completed';
        } else if (logs.length > 0) {
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

  useEffect(() => {
    fetchData();
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        status: 'active',
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
      alert('세션 종료에 실패했습니다.');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('이 세션을 삭제하시겠습니까?')) return;

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
      alert('세션 삭제에 실패했습니다.');
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
    // Tab filter
    const matchesTab = activeTab === 'active' 
      ? session.status === 'active' 
      : session.status === 'closed';
    
    // Search filter
    const matchesSearch = session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.charter && session.charter.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Status filter
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(session.actualStatus || 'new');
    
    // Tags filter
    const matchesTags = selectedTags.length === 0 || 
      (session.tags && selectedTags.some(tag => session.tags.includes(tag)));
    
    return matchesTab && matchesSearch && matchesStatus && matchesTags;
  });

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
      return { label: 'Past due', className: 'bg-orange-100 text-orange-700' };
    }
    
    return { label: 'Started', className: 'bg-green-100 text-green-700' };
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
    const contributors = 3; // Mock data
    const closedSessions = sessions.filter(s => s.status === 'closed').length;

    return { activeSessions, unstarted, contributors, closedSessions };
  };

  const stats = calculateStats();

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
              
              <div className="text-gray-300 text-xl mx-2">/</div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <i className="ri-folder-line text-white text-sm"></i>
                </div>
                <span className="text-lg font-semibold text-gray-900">{project?.name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-1">
                <Link 
                  to={`/projects/${projectId}`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Overview
                </Link>
                <Link 
                  to={`/projects/${projectId}/milestones`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Milestones
                </Link>
                <Link 
                  to={`/projects/${projectId}/documentation`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Documentation
                </Link>
                <Link 
                  to={`/projects/${projectId}/testcases`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Test Cases
                </Link>
                <Link 
                  to={`/projects/${projectId}/runs`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Runs & Results
                </Link>
                <Link 
                  to={`/projects/${projectId}/sessions`}
                  className="px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg cursor-pointer"
                >
                  Sessions
                </Link>
              </nav>
              
              <div className="flex items-center gap-3">
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
                        onClick={() => {
                          setShowProfileMenu(false);
                          alert('로그아웃되었습니다.');
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                      >
                        <i className="ri-logout-box-line text-lg"></i>
                        <span>Log out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setEditingSessionId(null);
                      setFormData({
                        name: '',
                        milestone_id: '',
                        charter: '',
                        tags: '',
                      });
                      setShowAddSessionModal(true);
                    }}
                    className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 flex items-center gap-2 text-sm font-medium cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-add-line"></i>
                    Session
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                {/* Active Sessions */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">ACTIVE SESSIONS</div>
                      <div className="text-3xl font-bold text-gray-900">{stats.activeSessions}</div>
                      <div className="text-sm text-gray-500 mt-1">{stats.unstarted} unstarted</div>
                    </div>
                    <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-teal-500 rounded-full opacity-20 animate-ping"></div>
                      <span className="text-2xl font-bold text-white relative z-10">{stats.activeSessions}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">3w estimated workload</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{stats.contributors} contributors</span>
                    </div>
                  </div>
                </div>

                {/* Latest Results */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-sm text-gray-500 mb-3">LATEST RESULTS</div>
                  <div className="h-[120px] flex flex-col gap-1">
                    {[0, 1, 2].map((row) => (
                      <div key={row} className="flex gap-1 flex-1">
                        {globalActivityData.slice(row * 24, (row + 1) * 24).map((color, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm"
                            style={{ backgroundColor: color }}
                            title={`Activity ${row * 24 + i + 1}`}
                          ></div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-3">
                    Jun 3rd - Today (5 days)
                  </div>
                </div>

                {/* Recently Closed */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">RECENTLY CLOSED</div>
                      <div className="text-3xl font-bold text-gray-900">{stats.closedSessions}</div>
                    </div>
                    <div className="w-20 h-12">
                      <svg className="w-full h-full" viewBox="0 0 80 48">
                        <polyline
                          points="0,40 20,35 40,38 60,25 80,15"
                          fill="none"
                          stroke="#14b8a6"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polyline
                          points="0,40 20,35 40,38 60,25 80,15 80,48 0,48"
                          fill="url(#gradient2)"
                          opacity="0.2"
                        />
                        <defs>
                          <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#14b8a6" />
                            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                  <div className="text-sm text-teal-600 font-semibold">
                    +28 this month
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex space-x-8 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm cursor-pointer whitespace-nowrap ${
                    activeTab === 'active'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ACTIVE ({sessions.filter(s => s.status === 'active').length})
                </button>
                <button
                  onClick={() => setActiveTab('closed')}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm cursor-pointer whitespace-nowrap ${
                    activeTab === 'closed'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  CLOSED ({sessions.filter(s => s.status === 'closed').length})
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              
              {/* Filter Dropdown */}
              <div className="relative" ref={filterDropdownRef}>
                <button 
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-filter-3-line"></i>
                  {activeFilterCount > 0 && (
                    <span className="text-white bg-orange-500 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                      {activeFilterCount}
                    </span>
                  )}
                  Filter
                  {activeFilterCount > 0 && (
                    <i 
                      className="ri-close-line hover:bg-gray-200 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllFilters();
                      }}
                    ></i>
                  )}
                </button>

                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
                        {selectedTags.length > 0 && (
                          <button 
                            onClick={() => setSelectedTags([])}
                            className="text-sm text-teal-600 hover:text-teal-700 cursor-pointer whitespace-nowrap"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      
                      {allTags.length > 0 ? (
                        <div className="space-y-2">
                          {allTags.map((tag) => (
                            <div
                              key={tag}
                              onClick={() => handleTagFilterToggle(tag)}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 rounded-lg flex items-center justify-between ${
                                selectedTags.includes(tag) ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
                              }`}
                            >
                              <span>{tag}</span>
                              {selectedTags.includes(tag) && (
                                <i className="ri-check-line text-teal-600"></i>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic text-center py-4">
                          No tags available
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags Dropdown */}
              <div className="relative" ref={tagsDropdownRef}>
                <button 
                  onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-heart-line"></i>
                  {selectedTags.length > 0 ? `${selectedTags.length} tags` : 'All tags'}
                  <i className="ri-arrow-down-s-line"></i>
                </button>

                {showTagsDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Tags</h3>
                        {selectedTags.length > 0 && (
                          <button 
                            onClick={() => setSelectedTags([])}
                            className="text-sm text-teal-600 hover:text-teal-700 cursor-pointer whitespace-nowrap"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      
                      {allTags.length > 0 ? (
                        <div className="space-y-2">
                          {allTags.map((tag) => (
                            <div
                              key={tag}
                              onClick={() => handleTagFilterToggle(tag)}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 rounded-lg flex items-center justify-between ${
                                selectedTags.includes(tag) ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
                              }`}
                            >
                              <span>{tag}</span>
                              {selectedTags.includes(tag) && (
                                <i className="ri-check-line text-teal-600"></i>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic text-center py-4">
                          No tags available
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sessions List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-calendar-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-500 text-lg">
                  {searchQuery || activeFilterCount > 0 ? 'No sessions found' : 'No sessions yet'}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchQuery || activeFilterCount > 0 
                    ? 'Try adjusting your search or filters' 
                    : 'Create your first session to get started'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Milestone-based Sessions */}
                {milestones.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200">
                    {milestones.map((milestone, index) => {
                      const milestoneSessions = getSessionsByMilestone(milestone.id);
                      const milestoneStatusInfo = getMilestoneStatus(milestone);
                      
                      if (milestoneSessions.length === 0) {
                        return null;
                      }
                      
                      return (
                        <div key={milestone.id} className={index !== milestones.length - 1 ? 'border-b border-gray-200' : ''}>
                          <div className="flex items-center justify-between p-4 bg-gray-50">
                            <div className="flex items-center gap-3">
                              <i className="ri-flag-line text-gray-400"></i>
                              <span className="font-semibold text-gray-900">{milestone.name}</span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${milestoneStatusInfo.className}`}>
                                {milestoneStatusInfo.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500">{formatDateRange(milestone.start_date, milestone.end_date)}</span>
                            </div>
                          </div>

                          {/* Sessions Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-3 text-left">
                                    <input type="checkbox" className="w-4 h-4 text-teal-600 cursor-pointer" />
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Session</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">State</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tags</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contributors</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Activity</th>
                                  <th className="px-4 py-3"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {milestoneSessions.map((session) => {
                                  return (
                                    <tr key={session.id} className="hover:bg-gray-50">
                                      <td className="px-4 py-4">
                                        <input type="checkbox" className="w-4 h-4 text-teal-600 cursor-pointer" />
                                      </td>
                                      <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                          <i className="ri-refresh-line text-gray-400"></i>
                                          <Link 
                                            to={`/projects/${projectId}/sessions/${session.id}`}
                                            className="font-medium text-teal-600 hover:text-teal-700 cursor-pointer"
                                          >
                                            {session.name}
                                          </Link>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                          <i className={`${
                                            session.actualStatus === 'new' ? 'ri-file-line text-green-500' :
                                            session.actualStatus === 'in_progress' ? 'ri-loader-line text-blue-500' : 
                                            'ri-check-line text-purple-500'
                                          }`}></i>
                                          <span className="text-sm text-gray-700">
                                            {session.actualStatus === 'new' ? 'New' :
                                             session.actualStatus === 'in_progress' ? 'In progress' : 
                                             'Completed'}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                          {session.tags && session.tags.slice(0, 2).map((tag, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="px-4 py-4">
                                        <div className="flex -space-x-2">
                                          <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-white"></div>
                                          <div className="w-7 h-7 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full border-2 border-white"></div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4">
                                        <div className="flex gap-1">
                                          {session.activityData && session.activityData.map((color, i) => (
                                            <div
                                              key={i}
                                              className="w-2 h-6 rounded-sm"
                                              style={{ backgroundColor: color }}
                                              title={`Log ${i + 1}`}
                                            ></div>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="px-4 py-4">
                                        <div className="relative" ref={openMenuId === session.id ? menuRef : null}>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenMenuId(openMenuId === session.id ? null : session.id);
                                            }}
                                            className="text-gray-400 hover:text-gray-600 p-2 cursor-pointer"
                                          >
                                            <i className="ri-more-2-fill"></i>
                                          </button>
                                          {openMenuId === session.id && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleEditSession(session);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                              >
                                                <i className="ri-edit-line"></i>
                                                <span>Edit</span>
                                              </button>
                                              {session.status === 'active' && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCloseSession(session.id);
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                                >
                                                  <i className="ri-check-line"></i>
                                                  <span>Close Session</span>
                                                </button>
                                              )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteSession(session.id);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-gray-200"
                                              >
                                                <i className="ri-delete-bin-line"></i>
                                                <span>Delete</span>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                )}

                {/* Sessions without Milestone */}
                {getSessionsWithoutMilestone().length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between p-4 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <i className="ri-inbox-line text-gray-400"></i>
                        <span className="font-semibold text-gray-900">Unassigned Milestones</span>
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                          {getSessionsWithoutMilestone().length} sessions
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Session</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">State</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tags</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contributors</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Activity</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {getSessionsWithoutMilestone().map((session) => {
                            return (
                              <tr key={session.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <i className="ri-refresh-line text-gray-400"></i>
                                    <Link 
                                      to={`/projects/${projectId}/sessions/${session.id}`}
                                      className="font-medium text-teal-600 hover:text-teal-700 cursor-pointer"
                                    >
                                      {session.name}
                                    </Link>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    <i className={`${session.status === 'active' ? 'ri-loader-line text-blue-500' : 'ri-check-line text-purple-500'}`}></i>
                                    <span className="text-sm text-gray-700">{session.status === 'active' ? 'In progress' : 'Under review'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    {session.tags && session.tags.slice(0, 2).map((tag, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex -space-x-2">
                                    <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-white"></div>
                                    <div className="w-7 h-7 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full border-2 border-white"></div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex gap-1">
                                    {session.activityData && session.activityData.map((color, i) => (
                                      <div
                                        key={i}
                                        className="w-2 h-6 rounded-sm"
                                        style={{ backgroundColor: color }}
                                        title={`Log ${i + 1}`}
                                      ></div>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="relative" ref={openMenuId === session.id ? menuRef : null}>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(openMenuId === session.id ? null : session.id);
                                      }}
                                      className="text-gray-400 hover:text-gray-600 p-2 cursor-pointer"
                                    >
                                      <i className="ri-more-2-fill"></i>
                                    </button>
                                    {openMenuId === session.id && (
                                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditSession(session);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                        >
                                          <i className="ri-edit-line"></i>
                                          <span>Edit</span>
                                        </button>
                                        {session.status === 'active' && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCloseSession(session.id);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                          >
                                            <i className="ri-check-line"></i>
                                            <span>Close Session</span>
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSession(session.id);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-gray-200"
                                        >
                                          <i className="ri-delete-bin-line"></i>
                                          <span>Delete</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {milestones.filter(m => getSessionsByMilestone(m.id).length > 0).length === 0 && getSessionsWithoutMilestone().length === 0 && (
                  <div className="text-center py-12">
                    <i className="ri-chat-3-line text-6xl text-gray-300 mb-4"></i>
                    <p className="text-gray-500 text-lg">No {activeTab} sessions</p>
                    <p className="text-gray-400 text-sm mt-2">Create exploratory testing sessions to track your findings</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit Session Modal */}
      {showAddSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{editingSessionId ? 'Edit session' : 'Add session'}</h2>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Session name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>

                  {/* Milestone */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Milestone
                      </label>
                      <button className="text-teal-600 hover:text-teal-700 cursor-pointer">
                        <i className="ri-add-line"></i>
                      </button>
                    </div>
                    <select 
                      name="milestone_id"
                      value={formData.milestone_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
                    >
                      <option value="">Select milestone</option>
                      {milestones.map((milestone) => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mission */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mission
                    </label>
                    <textarea
                      name="charter"
                      value={formData.charter}
                      onChange={handleInputChange}
                      placeholder="Describe the testing mission and objectives..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      placeholder="Enter tags separated by commas"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
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
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSession}
                disabled={submitting}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
