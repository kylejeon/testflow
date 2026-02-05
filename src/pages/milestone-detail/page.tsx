import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  status: 'upcoming' | 'started' | 'past_due' | 'completed';
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
  parent_milestone_id: string | null;
}

interface Run {
  id: string;
  name: string;
  status: string;
  milestone_id: string;
  test_case_ids: string[];
  created_at: string;
  passed_count?: number;
  failed_count?: number;
  blocked_count?: number;
  retest_count?: number;
  untested_count?: number;
}

interface Session {
  id: string;
  name: string;
  status: string;
  milestone_id: string;
  created_at: string;
  actualStatus?: string;
  activityData?: string[];
}

export default function MilestoneDetail() {
  const { projectId, milestoneId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [subMilestones, setSubMilestones] = useState<Milestone[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'status' | 'activity' | 'issues'>('results');

  useEffect(() => {
    if (projectId && milestoneId) {
      fetchData();
    }
  }, [projectId, milestoneId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch milestone
      const { data: milestoneData, error: milestoneError } = await supabase
        .from('milestones')
        .select('*')
        .eq('id', milestoneId)
        .single();

      if (milestoneError) throw milestoneError;
      setMilestone(milestoneData);

      // Fetch sub milestones
      const { data: subMilestonesData, error: subMilestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('parent_milestone_id', milestoneId)
        .order('start_date', { ascending: true });

      if (subMilestonesError) throw subMilestonesError;
      setSubMilestones(subMilestonesData || []);

      // Fetch runs for this milestone
      const { data: runsData, error: runsError } = await supabase
        .from('test_runs')
        .select('*')
        .eq('milestone_id', milestoneId)
        .order('created_at', { ascending: false });

      if (runsError) throw runsError;

      // Calculate actual progress for each test run
      const runsWithProgress = await Promise.all(
        (runsData || []).map(async (run) => {
          const { data: testResultsData } = await supabase
            .from('test_results')
            .select('test_case_id, status')
            .eq('run_id', run.id)
            .order('created_at', { ascending: false });

          const statusMap = new Map<string, string>();
          
          testResultsData?.forEach(result => {
            if (!statusMap.has(result.test_case_id)) {
              statusMap.set(result.test_case_id, result.status);
            }
          });

          let passed_count = 0;
          let failed_count = 0;
          let blocked_count = 0;
          let retest_count = 0;
          let untested_count = 0;

          run.test_case_ids.forEach((tcId: string) => {
            const status = statusMap.get(tcId) || 'untested';
            switch (status) {
              case 'passed':
                passed_count++;
                break;
              case 'failed':
                failed_count++;
                break;
              case 'blocked':
                blocked_count++;
                break;
              case 'retest':
                retest_count++;
                break;
              default:
                untested_count++;
            }
          });

          return {
            ...run,
            passed_count,
            failed_count,
            blocked_count,
            retest_count,
            untested_count,
          };
        })
      );

      setRuns(runsWithProgress);

      // Fetch sessions for this milestone
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('milestone_id', milestoneId)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch session logs
      const sessionIds = (sessionsData || []).map(s => s.id);
      const { data: sessionLogsData } = await supabase
        .from('session_logs')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false });

      const logsBySession = new Map<string, any[]>();
      (sessionLogsData || []).forEach(log => {
        if (!logsBySession.has(log.session_id)) {
          logsBySession.set(log.session_id, []);
        }
        logsBySession.get(log.session_id)!.push(log);
      });

      const generateActivityData = (logs: any[]) => {
        const blockCount = 24;
        const activityData: string[] = new Array(blockCount).fill('#e5e7eb');

        if (!logs || logs.length === 0) return activityData;

        const recentLogs = logs.slice(0, blockCount);

        recentLogs.forEach((log, index) => {
          switch (log.type) {
            case 'note':
              activityData[index] = '#3b82f6';
              break;
            case 'passed':
              activityData[index] = '#10b981';
              break;
            case 'failed':
              activityData[index] = '#ef4444';
              break;
            case 'blocked':
              activityData[index] = '#f59e0b';
              break;
            default:
              activityData[index] = '#14b8a6';
          }
        });

        return activityData;
      };

      const sessionsWithActivity = (sessionsData || []).map(session => {
        const sessionLogs = logsBySession.get(session.id) || [];
        const activityData = generateActivityData(sessionLogs);
        
        let actualStatus = session.status;
        if (session.status === 'active') {
          actualStatus = sessionLogs.length === 0 ? 'new' : 'in_progress';
        }
        
        return {
          ...session,
          actualStatus,
          activityData
        };
      });

      setSessions(sessionsWithActivity);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
      started: { label: 'Started', className: 'bg-green-100 text-green-700' },
      past_due: { label: 'Past due', className: 'bg-orange-500 text-white' },
      completed: { label: 'Complete', className: 'bg-gray-100 text-gray-700' },
    };
    return badges[status as keyof typeof badges] || badges.upcoming;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('T')[0].split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return 'Starts TBD';
    const start = formatDate(startDate);
    if (!endDate) return `Starts ${start}`;
    const end = formatDate(endDate);
    return `${start} - ${end}`;
  };

  const calculateRunProgress = (run: Run) => {
    const total = (run.passed_count || 0) + (run.failed_count || 0) + (run.blocked_count || 0) + (run.retest_count || 0) + (run.untested_count || 0);
    if (total === 0) return { passed: 0, failed: 0, blocked: 0, retest: 0, untested: 100 };
    
    return {
      passed: Math.round(((run.passed_count || 0) / total) * 100),
      failed: Math.round(((run.failed_count || 0) / total) * 100),
      blocked: Math.round(((run.blocked_count || 0) / total) * 100),
      retest: Math.round(((run.retest_count || 0) / total) * 100),
      untested: Math.round(((run.untested_count || 0) / total) * 100),
    };
  };

  const calculateMilestoneProgress = () => {
    if (runs.length === 0) return 0;
    
    let totalTests = 0;
    let completedTests = 0;

    runs.forEach(run => {
      const total = run.test_case_ids.length;
      totalTests += total;
      completedTests += (run.passed_count || 0) + (run.failed_count || 0);
    });

    return totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;
  };

  if (loading) {
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
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">마일스톤을 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!milestone) {
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
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-error-warning-line text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">마일스톤을 찾을 수 없습니다</h3>
              <Link to={`/projects/${projectId}/milestones`} className="text-teal-600 hover:text-teal-700 font-medium cursor-pointer">
                마일스톤 목록으로 돌아가기
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const badge = getStatusBadge(milestone.status);
  const progress = calculateMilestoneProgress();

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
                <Link to={`/projects/${projectId}`} className="text-lg font-semibold text-gray-900 hover:text-teal-600 cursor-pointer">
                  {project?.name}
                </Link>
              </div>

              <div className="text-gray-300 text-xl mx-2">/</div>

              <div className="flex items-center gap-2">
                <i className="ri-flag-line text-gray-600"></i>
                <span className="text-lg font-semibold text-gray-900">{milestone.name}</span>
              </div>
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
                      onClick={() => {
                        setShowProfileMenu(false);
                        alert('Log out 기능이 실행됩니다.');
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                    >
                      <i className="ri-logout-box-line text-lg w-5 h-5 flex items-center justify-center"></i>
                      <span>Log out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="p-8">
            {/* Milestone Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <i className="ri-flag-line text-gray-600 text-2xl"></i>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{milestone.name}</h1>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg text-gray-600">
                    {formatDateRange(milestone.start_date, milestone.end_date)}
                  </span>
                  <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                  <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap">
                    Edit
                  </button>
                  <button className="px-4 py-2 text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-all cursor-pointer whitespace-nowrap">
                    Complete
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      milestone.status === 'past_due' ? 'bg-orange-500' : 
                      milestone.status === 'started' ? 'bg-green-500' : 
                      'bg-gray-400'
                    }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-900 min-w-[50px] text-right">
                  {progress}%
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6">
              <div className="flex items-center gap-1 px-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`px-4 py-3 text-sm font-medium transition-all cursor-pointer whitespace-nowrap relative ${
                    activeTab === 'results'
                      ? 'text-teal-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  RESULTS
                  {activeTab === 'results' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('status')}
                  className={`px-4 py-3 text-sm font-medium transition-all cursor-pointer whitespace-nowrap relative ${
                    activeTab === 'status'
                      ? 'text-teal-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  STATUS
                  {activeTab === 'status' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-4 py-3 text-sm font-medium transition-all cursor-pointer whitespace-nowrap relative ${
                    activeTab === 'activity'
                      ? 'text-teal-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ACTIVITY
                  {activeTab === 'activity' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('issues')}
                  className={`px-4 py-3 text-sm font-medium transition-all cursor-pointer whitespace-nowrap relative ${
                    activeTab === 'issues'
                      ? 'text-teal-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ISSUES
                  {activeTab === 'issues' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                  )}
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'results' && (
                  <div className="space-y-6">
                    {/* Runs & Sessions Chart */}
                    <div className="grid grid-cols-2 gap-6">
                      {/* Runs & Sessions */}
                      <div className="bg-gray-50/50 border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-600 uppercase">RUNS & SESSIONS</h3>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="relative w-32 h-32">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="#e5e7eb"
                                strokeWidth="16"
                                fill="none"
                              />
                              <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="#14b8a6"
                                strokeWidth="16"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 56}`}
                                strokeDashoffset={`${2 * Math.PI * 56 * (1 - (progress / 100))}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <div className="text-3xl font-bold text-gray-900">{progress}%</div>
                              <div className="text-sm text-gray-500">Completed</div>
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                                <span className="text-sm text-gray-700">Runs</span>
                              </div>
                              <span className="text-sm font-semibold text-gray-900">{runs.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span className="text-sm text-gray-700">Sessions</span>
                              </div>
                              <span className="text-sm font-semibold text-gray-900">{sessions.length}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Milestone Activity */}
                      <div className="bg-blue-50/30 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">MILESTONE ACTIVITY</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 font-medium">Runs</span>
                            <div className="flex items-center gap-3">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div className="bg-teal-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-900 min-w-[30px] text-right">{runs.length}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 font-medium">Sessions</span>
                            <div className="flex items-center gap-3">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-900 min-w-[30px] text-right">{sessions.length}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 font-medium">Automation</span>
                            <div className="flex items-center gap-3">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-900 min-w-[30px] text-right">0</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sub Milestones */}
                    {subMilestones.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">SUB MILESTONES</h3>
                        <div className="space-y-3">
                          {subMilestones.map(sub => {
                            const subBadge = getStatusBadge(sub.status);
                            return (
                              <Link
                                key={sub.id}
                                to={`/projects/${projectId}/milestones/${sub.id}`}
                                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-teal-500 transition-all cursor-pointer"
                              >
                                <div className="w-8 h-8 bg-gray-50 rounded flex items-center justify-center">
                                  <i className="ri-run-line text-gray-600"></i>
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 mb-1">{sub.name}</div>
                                  <div className="text-sm text-gray-500">{formatDateRange(sub.start_date, sub.end_date)}</div>
                                </div>
                                <span className={`px-3 py-1 rounded text-xs font-semibold ${subBadge.className}`}>
                                  {subBadge.label}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Runs List */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">RUNS</h3>
                      {runs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No runs yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {runs.map(run => {
                            const runProgress = calculateRunProgress(run);
                            const completionRate = 100 - runProgress.untested;
                            
                            return (
                              <Link
                                key={run.id}
                                to={`/projects/${projectId}/runs/${run.id}`}
                                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-teal-500 transition-all cursor-pointer group"
                              >
                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                  <i className="ri-play-circle-line text-lg text-gray-600"></i>
                                </div>
                                
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                                    {run.name}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div className="h-full flex">
                                        {runProgress.passed > 0 && (
                                          <div className="bg-green-500" style={{ width: `${runProgress.passed}%` }}></div>
                                        )}
                                        {runProgress.failed > 0 && (
                                          <div className="bg-red-500" style={{ width: `${runProgress.failed}%` }}></div>
                                        )}
                                        {runProgress.blocked > 0 && (
                                          <div className="bg-orange-500" style={{ width: `${runProgress.blocked}%` }}></div>
                                        )}
                                        {runProgress.retest > 0 && (
                                          <div className="bg-yellow-500" style={{ width: `${runProgress.retest}%` }}></div>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700 min-w-[45px] text-right">
                                      {completionRate}%
                                    </span>
                                  </div>
                                </div>

                                <i className="ri-arrow-right-s-line text-xl text-gray-400 group-hover:text-teal-600 transition-colors"></i>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Sessions List */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">SESSIONS</h3>
                      {sessions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No sessions yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sessions.map(session => (
                            <Link
                              key={session.id}
                              to={`/projects/${projectId}/sessions/${session.id}`}
                              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-teal-500 transition-all cursor-pointer group"
                            >
                              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                <i className="ri-refresh-line text-lg text-gray-600"></i>
                              </div>
                              
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                                  {session.name}
                                </div>
                                
                                <div className="flex items-center justify-between gap-4">
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
                                  
                                  <div className="flex gap-1">
                                    {session.activityData && session.activityData.map((color: string, i: number) => (
                                      <div
                                        key={i}
                                        className="w-2 h-6 rounded-sm"
                                        style={{ backgroundColor: color }}
                                      ></div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <i className="ri-arrow-right-s-line text-xl text-gray-400 group-hover:text-teal-600 transition-colors"></i>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'status' && (
                  <div className="text-center py-12 text-gray-500">
                    Status view coming soon
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="text-center py-12 text-gray-500">
                    Activity view coming soon
                  </div>
                )}

                {activeTab === 'issues' && (
                  <div className="text-center py-12 text-gray-500">
                    Issues view coming soon
                  </div>
                )}
              </div>
            </div>

            {/* About Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">ABOUT</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-calendar-line text-gray-600 text-lg"></i>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Timeline</div>
                    <div className="text-xs text-gray-500">{formatDateRange(milestone.start_date, milestone.end_date)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-team-line text-gray-600 text-lg"></i>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Contributors</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        JD
                      </div>
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        SK
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}