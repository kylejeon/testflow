import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import QuillEditor from './components/QuillEditor';
import EditSessionModal from './components/EditSessionModal';

interface Session {
  id: string;
  name: string;
  mission: string;
  status: string;
  milestone_id: string;
  assigned_to: string;
  tags: string[];
  estimate: string;
  created_at: string;
  updated_at: string;
}

interface SessionLog {
  id: string;
  session_id: string;
  type: 'note' | 'passed' | 'failed' | 'blocked';
  content: string;
  issues?: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

interface Milestone {
  id: string;
  name: string;
}

export default function SessionDetail() {
  const { projectId, sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Form state
  const [logType, setLogType] = useState<'note' | 'passed' | 'failed' | 'blocked'>('passed');
  const [content, setContent] = useState('');
  const [issues, setIssues] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [logContent, setLogContent] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchSessionData();
    fetchMilestones();
  }, [sessionId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select('id, name')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      setMilestones(data || []);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      
      // Map charter to mission for display
      const mappedSession = {
        ...sessionData,
        mission: sessionData.charter || sessionData.mission
      };
      
      setSession(mappedSession);

      // Fetch milestone
      if (sessionData.milestone_id) {
        const { data: milestoneData } = await supabase
          .from('milestones')
          .select('id, name')
          .eq('id', sessionData.milestone_id)
          .single();
        
        if (milestoneData) setMilestone(milestoneData);
      }

      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from('session_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (logsError) throw logsError;
      setLogs(logsData || []);
    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async () => {
    if (!logContent.trim()) return;

    try {
      const userData = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('session_logs')
        .insert({
          session_id: sessionId,
          user_id: userData.user?.id,
          content: logContent,
          type: logType,
        });

      if (error) throw error;

      setLogContent('');
      fetchSessionData();
    } catch (error) {
      console.error('Error adding log:', error);
    }
  };

  const handleCloseSession = async () => {
    if (!confirm('이 세션을 종료하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'closed',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      alert('세션이 종료되었습니다.');
      navigate(`/projects/${projectId}/sessions`);
    } catch (error) {
      console.error('세션 종료 오류:', error);
      alert('세션 종료에 실패했습니다.');
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'passed':
        return 'bg-emerald-500';
      case 'failed':
        return 'bg-red-500';
      case 'blocked':
        return 'bg-amber-500';
      case 'note':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getLogTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const calculateElapsedTime = () => {
    if (!session) return '00:00:00';
    
    const start = new Date(session.created_at);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getUserDisplayName = () => {
    if (!currentUser) return 'User';
    return currentUser.user_metadata?.full_name || 
           currentUser.user_metadata?.name || 
           currentUser.email?.split('@')[0] || 
           'User';
  };

  const getUserInitial = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Session not found</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(`/projects/${projectId}/sessions`)}
                  className="text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <i className="ri-arrow-left-line text-xl"></i>
                </button>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{session.name}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500">
                      Exploratory session
                    </span>
                    {milestone && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{milestone.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleCloseSession}
                  disabled={session?.status === 'closed'}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-save-line mr-2"></i>
                  Close
                </button>
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Session Info */}
            <div className="col-span-2 space-y-6">
              {/* Mission */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Mission</h2>
                {session.mission ? (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{session.mission}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No mission description provided</p>
                )}
              </div>

              {/* Session Log */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">SESSION LOG</h2>
                
                {/* Quill Editor */}
                <QuillEditor
                  value={logContent}
                  onChange={setLogContent}
                  placeholder="Write your session log here..."
                />

                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1 whitespace-nowrap cursor-pointer">
                      <i className="ri-link text-base"></i>
                      Issues
                    </button>
                    <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1 whitespace-nowrap cursor-pointer">
                      <i className="ri-attachment-2 text-base"></i>
                      Attach
                    </button>
                    <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1 whitespace-nowrap cursor-pointer">
                      <i className="ri-screenshot-2-line text-base"></i>
                      Screenshot
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Type Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                        className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          logType === 'passed' ? 'bg-green-500' :
                          logType === 'failed' ? 'bg-red-500' :
                          logType === 'blocked' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }`}></span>
                        {getLogTypeLabel(logType)}
                        <i className="ri-arrow-down-s-line"></i>
                      </button>

                      {showTypeDropdown && (
                        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          {(['note', 'passed', 'failed', 'blocked'] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => {
                                setLogType(type);
                                setShowTypeDropdown(false);
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            >
                              <span className={`w-2 h-2 rounded-full ${
                                type === 'passed' ? 'bg-green-500' :
                                type === 'failed' ? 'bg-red-500' :
                                type === 'blocked' ? 'bg-orange-500' :
                                'bg-blue-500'
                              }`}></span>
                              {getLogTypeLabel(type)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAddLog}
                      disabled={!logContent.trim()}
                      className="px-6 py-2 bg-teal-500 text-white text-sm font-medium rounded hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-4">
                {logs.map((log, index) => (
                  <div key={log.id} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">{getUserInitial()}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{getUserDisplayName()}</span>
                          <span className="text-sm text-gray-500">{formatTime(log.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-medium text-white rounded-full ${getLogTypeColor(log.type)}`}>
                            {getLogTypeLabel(log.type)}
                          </span>
                          <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
                            <i className="ri-more-2-fill"></i>
                          </button>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div 
                          className="text-sm text-gray-700 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: log.content }}
                        />
                        <style>{`
                          .prose ul {
                            list-style-type: disc;
                            padding-left: 1.5rem;
                            margin: 0.5rem 0;
                          }
                          .prose ol {
                            list-style-type: decimal;
                            padding-left: 1.5rem;
                            margin: 0.5rem 0;
                          }
                          .prose li {
                            margin: 0.25rem 0;
                          }
                          .prose blockquote {
                            border-left: 4px solid #d1d5db;
                            padding-left: 1rem;
                            font-style: italic;
                            margin: 0.5rem 0;
                            color: #4b5563;
                          }
                          .prose pre {
                            background-color: #f3f4f6;
                            padding: 0.75rem;
                            border-radius: 0.375rem;
                            overflow-x: auto;
                            margin: 0.5rem 0;
                          }
                          .prose code {
                            background-color: #f3f4f6;
                            padding: 0.125rem 0.25rem;
                            border-radius: 0.25rem;
                            font-family: monospace;
                            font-size: 0.875rem;
                          }
                          .prose pre code {
                            background-color: transparent;
                            padding: 0;
                          }
                          .prose h2 {
                            font-size: 1.5rem;
                            font-weight: bold;
                            margin: 0.5rem 0;
                          }
                          .prose p {
                            margin: 0.5rem 0;
                          }
                        `}</style>
                        {log.issues && (
                          <div className="mt-2 text-sm text-blue-600">
                            <i className="ri-link mr-1"></i>
                            {log.issues}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - About & Activity */}
            <div className="space-y-6">
              {/* About */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">ABOUT</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <i className="ri-refresh-line text-gray-400"></i>
                      <span className="text-sm font-medium text-gray-700">Active:</span>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                        session.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {session.status === 'active' ? 'In progress' : 'Completed'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 ml-6">
                      Created {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  {milestone && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <i className="ri-flag-line text-gray-400"></i>
                        <span className="text-sm font-medium text-gray-700">Milestone</span>
                      </div>
                      <div className="ml-6">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                          {milestone.name}
                        </span>
                      </div>
                    </div>
                  )}

                  {session.tags && session.tags.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <i className="ri-price-tag-3-line text-gray-400"></i>
                        <span className="text-sm font-medium text-gray-700">Tags</span>
                      </div>
                      <div className="ml-6 flex flex-wrap gap-2">
                        {session.tags.map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <i className="ri-user-line text-gray-400"></i>
                      <span className="text-sm font-medium text-gray-700">Contributors</span>
                    </div>
                    <div className="ml-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                          <span className="text-xs font-medium text-white">{getUserInitial()}</span>
                        </div>
                        <span className="text-sm text-gray-700">{getUserDisplayName()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">ACTIVITY</h3>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="ri-time-line text-gray-400"></i>
                    <span className="text-2xl font-semibold text-gray-900">{calculateElapsedTime()}</span>
                  </div>
                  <div className="text-xs text-gray-500">TOTAL ELAPSED</div>
                </div>

                {/* Activity Grid */}
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, rowIndex) => (
                    <div key={rowIndex} className="flex gap-2">
                      {Array.from({ length: 9 }).map((_, colIndex) => {
                        const logIndex = rowIndex * 9 + colIndex;
                        // 로그 배열을 역순으로 참조 (최신 로그가 왼쪽에 표시)
                        const reversedIndex = logs.length - 1 - logIndex;
                        const log = reversedIndex >= 0 ? logs[reversedIndex] : null;
                        
                        let bgColor = 'bg-gray-200'; // 로그가 없는 경우 회색
                        
                        if (log) {
                          switch (log.type) {
                            case 'note':
                              bgColor = 'bg-blue-500';
                              break;
                            case 'passed':
                              bgColor = 'bg-green-500';
                              break;
                            case 'failed':
                              bgColor = 'bg-red-500';
                              break;
                            case 'blocked':
                              bgColor = 'bg-orange-500';
                              break;
                            default:
                              bgColor = 'bg-teal-500';
                          }
                        }
                        
                        return (
                          <div
                            key={colIndex}
                            className={`w-4 h-10 ${bgColor} rounded-sm`}
                            title={log ? `${log.type} - ${new Date(log.created_at).toLocaleString()}` : 'No activity'}
                          ></div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {session && (
          <EditSessionModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            session={session}
            projectId={projectId!}
            milestones={milestones}
            onSuccess={fetchSessionData}
          />
        )}
      </div>
    </div>
  );
}
