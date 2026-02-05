import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ProjectMembersPanel from './components/ProjectMembersPanel';
import InviteMemberModal from './components/InviteMemberModal';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [testRuns, setTestRuns] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberRefreshTrigger, setMemberRefreshTrigger] = useState(0);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', id)
        .order('end_date', { ascending: true });

      if (milestonesError) throw milestonesError;

      console.log('=== 마일스톤 데이터 ===');
      console.log('전체 마일스톤:', milestonesData);

      // Fetch all test runs for this project
      const { data: allRunsData, error: allRunsError } = await supabase
        .from('test_runs')
        .select('*')
        .eq('project_id', id);

      if (allRunsError) throw allRunsError;

      console.log('전체 Runs:', allRunsData);

      // Fetch all test results
      const { data: allTestResultsData, error: allTestResultsError } = await supabase
        .from('test_results')
        .select('run_id, test_case_id, status')
        .in('run_id', (allRunsData || []).map(r => r.id))
        .order('created_at', { ascending: false });

      if (allTestResultsError) throw allTestResultsError;

      // Calculate progress for each milestone based on its runs
      const milestonesWithProgress = (milestonesData || []).map((milestone) => {
        console.log(`\n--- 마일스톤: ${milestone.name} (ID: ${milestone.id}) ---`);
        
        // Get runs for this milestone
        const milestoneRuns = allRunsData?.filter(run => run.milestone_id === milestone.id) || [];
        
        console.log(`이 마일스톤의 Runs:`, milestoneRuns);
        console.log(`Runs 개수: ${milestoneRuns.length}`);

        if (milestoneRuns.length === 0) {
          console.log('Runs가 없어서 진행률 0%');
          return { ...milestone, progress: 0 };
        }

        // Calculate progress for each run
        const runProgresses = milestoneRuns.map(run => {
          const runResults = allTestResultsData?.filter(r => r.run_id === run.id) || [];
          const statusMap = new Map<string, string>();
          
          runResults.forEach(result => {
            if (!statusMap.has(result.test_case_id)) {
              statusMap.set(result.test_case_id, result.status);
            }
          });

          const totalTests = run.test_case_ids.length;
          if (totalTests === 0) return 0;

          let completedTests = 0;
          run.test_case_ids.forEach((tcId: string) => {
            const status = statusMap.get(tcId);
            if (status === 'passed' || status === 'failed') {
              completedTests++;
            }
          });

          const progress = Math.round((completedTests / totalTests) * 100);
          console.log(`Run "${run.name}": ${completedTests}/${totalTests} = ${progress}%`);
          return progress;
        });

        // Calculate average progress
        const totalProgress = runProgresses.reduce((sum, p) => sum + p, 0);
        const averageProgress = Math.round(totalProgress / runProgresses.length);

        console.log(`진행률 계산:`, {
          runProgresses,
          totalProgress,
          averageProgress: `${averageProgress}%`
        });

        return { ...milestone, progress: averageProgress };
      });

      console.log('\n=== 최종 마일스톤 데이터 (진행률 포함) ===');
      console.log(milestonesWithProgress);

      // Organize milestones into parent-child structure
      const parentMilestones = milestonesWithProgress.filter(m => !m.parent_milestone_id);
      const organizedMilestones = parentMilestones.map(parent => ({
        ...parent,
        subMilestones: milestonesWithProgress.filter(m => m.parent_milestone_id === parent.id)
      }));

      // Set all milestones with sub-milestones as expanded by default
      const initialExpanded = new Set<string>();
      organizedMilestones.forEach(milestone => {
        if (milestone.subMilestones && milestone.subMilestones.length > 0) {
          initialExpanded.add(milestone.id);
        }
      });
      setExpandedMilestones(initialExpanded);

      setMilestones(organizedMilestones);

      const { data: runsData, error: runsError } = await supabase
        .from('test_runs')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (runsError) throw runsError;

      // Calculate actual progress for each test run
      const runsWithProgress = await Promise.all(
        (runsData || []).map(async (run) => {
          // Get latest status for each test case in this run
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

          // Count statuses
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

      setTestRuns(runsWithProgress);

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (sessionsError) throw sessionsError;

      // Fetch session logs for activity data
      const sessionIds = (sessionsData || []).map(s => s.id);
      const { data: sessionLogsData, error: sessionLogsError } = await supabase
        .from('session_logs')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false });

      if (sessionLogsError) throw sessionLogsError;

      // Group logs by session
      const logsBySession = new Map<string, any[]>();
      (sessionLogsData || []).forEach(log => {
        if (!logsBySession.has(log.session_id)) {
          logsBySession.set(log.session_id, []);
        }
        logsBySession.get(log.session_id)!.push(log);
      });

      // Generate activity data for each session
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
        
        // Determine actual status based on logs
        let actualStatus = session.status;
        if (session.status === 'active') {
          // If no logs, status is 'new', otherwise 'in_progress'
          actualStatus = sessionLogs.length === 0 ? 'new' : 'in_progress';
        }
        
        return {
          ...session,
          actualStatus,
          activityData
        };
      });

      setSessions(sessionsWithActivity || []);

      const activities = [
        // Created events
        ...(organizedMilestones || []).map((m: any) => ({
          type: 'milestone',
          action: 'created',
          name: m.name,
          created_at: m.created_at,
        })),
        ...(runsWithProgress || []).map((r: any) => ({
          type: 'run',
          action: 'created',
          name: r.name,
          created_at: r.created_at,
        })),
        ...(sessionsWithActivity || []).map((s: any) => ({
          type: 'session',
          action: 'created',
          name: s.name,
          created_at: s.created_at,
        })),
        // Completed events
        ...(organizedMilestones || [])
          .filter((m: any) => m.status === 'completed' && m.updated_at)
          .map((m: any) => ({
            type: 'milestone',
            action: 'completed',
            name: m.name,
            created_at: m.updated_at,
          })),
        ...(runsWithProgress || [])
          .filter((r: any) => r.status === 'completed' && r.executed_at)
          .map((r: any) => ({
            type: 'run',
            action: 'completed',
            name: r.name,
            created_at: r.executed_at,
          })),
        ...(sessionsWithActivity || [])
          .filter((s: any) => s.status === 'completed' && s.ended_at)
          .map((s: any) => ({
            type: 'session',
            action: 'completed',
            name: s.name,
            created_at: s.ended_at,
          })),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setRecentActivity(activities);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId);
    } else {
      newExpanded.add(milestoneId);
    }
    setExpandedMilestones(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
      started: { label: 'Started', className: 'bg-green-100 text-green-700' },
      past_due: { label: 'Past due', className: 'bg-orange-100 text-orange-700' },
      completed: { label: 'Completed', className: 'bg-gray-100 text-gray-700' },
    };
    return badges[status as keyof typeof badges] || badges.upcoming;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'blocked':
        return 'bg-orange-500';
      case 'retest':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  const calculateRunProgress = (run: any) => {
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return 'Starts TBD';
    const start = formatDate(startDate);
    if (!endDate) return `Starts ${start}`;
    const end = formatDate(endDate);
    return `${start} - ${end}`;
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return formatDate(dateStr);
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
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer">
                  JK
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">프로젝트를 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!project) {
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
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer">
                  JK
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-error-warning-line text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">프로젝트를 찾을 수 없습니다</h3>
              <Link to="/projects" className="text-teal-600 hover:text-teal-700 font-medium cursor-pointer">
                프로젝트 목록으로 돌아가기
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const activeMilestones = milestones.filter(m => {
    // Filter out completed milestones and their sub-milestones
    if (m.status === 'completed') return false;
    
    // If it has sub-milestones, filter them too
    if (m.subMilestones && m.subMilestones.length > 0) {
      m.subMilestones = m.subMilestones.filter((sub: any) => sub.status !== 'completed');
    }
    
    return true;
  });

  const renderMilestone = (milestone: any, isSubMilestone: boolean = false) => {
    const badge = getStatusBadge(milestone.status);
    const hasSubMilestones = milestone.subMilestones && milestone.subMilestones.length > 0;
    const isExpanded = expandedMilestones.has(milestone.id);

    return (
      <div key={milestone.id}>
        <div className={`border border-gray-200 rounded-lg p-4 hover:border-teal-500 transition-all ${isSubMilestone ? 'ml-8 bg-gray-50/50' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {hasSubMilestones && !isSubMilestone && (
                <button
                  onClick={() => toggleExpanded(milestone.id)}
                  className="w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded cursor-pointer flex-shrink-0"
                >
                  <i className={`ri-arrow-${isExpanded ? 'down' : 'right'}-s-line text-base`}></i>
                </button>
              )}
              <i className={`${isSubMilestone ? 'ri-run-line' : 'ri-flag-line'} text-gray-400 text-lg w-5 h-5 flex items-center justify-center flex-shrink-0`}></i>
              <h3 className="font-semibold text-gray-900 truncate">{milestone.name}</h3>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              <span className="text-sm text-gray-500 whitespace-nowrap">{formatDateRange(milestone.start_date, milestone.end_date)}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className} whitespace-nowrap`}>
                {badge.label}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  milestone.status === 'past_due' ? 'bg-orange-500' : 
                  milestone.status === 'started' ? 'bg-green-500' : 
                  'bg-gray-400'
                }`}
                style={{ width: `${milestone.progress}%` }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-gray-700 min-w-[40px] text-right">{milestone.progress}%</span>
          </div>
        </div>

        {/* Sub Milestones */}
        {hasSubMilestones && isExpanded && (
          <div className="mt-3 space-y-3">
            {milestone.subMilestones.map((subMilestone: any) => (
              renderMilestone(subMilestone, true)
            ))}
          </div>
        )}
      </div>
    );
  };

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
                  to={`/projects/${id}`}
                  className="px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg cursor-pointer"
                >
                  Overview
                </Link>
                <Link 
                  to={`/projects/${id}/milestones`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Milestones
                </Link>
                <Link 
                  to={`/projects/${id}/documentation`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Documentation
                </Link>
                <Link 
                  to={`/projects/${id}/testcases`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Test Cases
                </Link>
                <Link 
                  to={`/projects/${id}/runs`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Runs & Results
                </Link>
                <Link 
                  to={`/projects/${id}/sessions`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
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
                        onClick={handleLogout}
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
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Project Overview</h1>
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 space-y-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">CURRENT MILESTONES</h2>
                    <Link 
                      to={`/projects/${id}/milestones`}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium cursor-pointer whitespace-nowrap"
                    >
                      See all {activeMilestones.length} active milestones →
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {activeMilestones.slice(0, 5).map((milestone) => renderMilestone(milestone))}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">TESTING ACTIVITY</h2>
                  </div>

                  {/* RUNS Section */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">RUNS (latest)</h3>
                    <div className="flex items-start gap-8">
                      <div className="flex-shrink-0">
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
                              strokeDashoffset={`${2 * Math.PI * 56 * (1 - (testRuns.filter(r => r.status !== 'completed').length / Math.max(testRuns.length, 1)))}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="text-sm font-medium text-gray-500 uppercase">ACTIVE</div>
                            <div className="text-3xl font-bold text-gray-900">
                              {testRuns.filter(r => r.status !== 'completed').length}
                            </div>
                            <div className="text-sm text-gray-500">Runs</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        {testRuns.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            No test runs yet
                          </div>
                        ) : (
                          testRuns.map((run) => {
                            const progress = calculateRunProgress(run);
                            const completionRate = 100 - progress.untested;
                            
                            return (
                              <Link
                                key={run.id}
                                to={`/projects/${id}/runs/${run.id}`}
                                className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-all cursor-pointer group"
                              >
                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                  <i className="ri-play-circle-line text-lg text-gray-600"></i>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                                    {run.name}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div className="h-full flex">
                                        {progress.passed > 0 && (
                                          <div 
                                            className="bg-green-500" 
                                            style={{ width: `${progress.passed}%` }}
                                          ></div>
                                        )}
                                        {progress.failed > 0 && (
                                          <div 
                                            className="bg-red-500" 
                                            style={{ width: `${progress.failed}%` }}
                                          ></div>
                                        )}
                                        {progress.blocked > 0 && (
                                          <div 
                                            className="bg-orange-500" 
                                            style={{ width: `${progress.blocked}%` }}
                                          ></div>
                                        )}
                                        {progress.retest > 0 && (
                                          <div 
                                            className="bg-yellow-500" 
                                            style={{ width: `${progress.retest}%` }}
                                          ></div>
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
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SESSIONS Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">SESSIONS (active)</h3>
                    <div className="flex items-start gap-8">
                      <div className="flex-shrink-0">
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
                              strokeDashoffset={`${2 * Math.PI * 56 * (1 - (sessions.filter(s => s.status === 'active').length / Math.max(sessions.length, 1)))}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="text-sm font-medium text-gray-500 uppercase">ACTIVE</div>
                            <div className="text-3xl font-bold text-gray-900">
                              {sessions.filter(s => s.status === 'active').length}
                            </div>
                            <div className="text-sm text-gray-500">Sessions</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        {sessions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            No sessions yet
                          </div>
                        ) : (
                          sessions.map((session) => (
                            <Link
                              key={session.id}
                              to={`/projects/${id}/sessions/${session.id}`}
                              className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-all cursor-pointer group"
                            >
                              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                <i className="ri-refresh-line text-lg text-gray-600"></i>
                              </div>
                              
                              <div className="flex-1 min-w-0">
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
                                        title={`Activity ${i + 1}`}
                                      ></div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <i className="ri-arrow-right-s-line text-xl text-gray-400 group-hover:text-teal-600 transition-colors"></i>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">ABOUT</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-checkbox-circle-fill text-green-600 text-lg"></i>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Active</div>
                        <div className="text-xs text-gray-500">Created {formatDate(project.created_at)}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {project.description || 'Our main visual editing product used by customers to build great experiences.'}
                    </p>
                  </div>
                </div>

                <ProjectMembersPanel
                  projectId={id!}
                  onInviteClick={() => setShowInviteModal(true)}
                  refreshTrigger={memberRefreshTrigger}
                />

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">TIMELINE</h2>
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="ri-time-line text-gray-400 text-xl"></i>
                      </div>
                      <p className="text-sm text-gray-500">No activity yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.reduce((acc: any[], event, index) => {
                        const relativeTime = getRelativeTime(event.created_at);
                        const lastGroup = acc[acc.length - 1];
                        
                        if (!lastGroup || lastGroup.time !== relativeTime) {
                          acc.push({
                            time: relativeTime,
                            events: [event]
                          });
                        } else {
                          lastGroup.events.push(event);
                        }
                        
                        return acc;
                      }, []).map((group, groupIndex) => (
                        <div key={groupIndex} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-gray-500 mb-1">{group.time}</div>
                            <div className="space-y-3">
                              {group.events.map((event: any, eventIndex: number) => (
                                <div key={eventIndex} className="flex items-start gap-2">
                                  <div className={`w-6 h-6 ${event.action === 'completed' ? 'bg-green-100' : 'bg-teal-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
                                    <i className={`${event.action === 'completed' ? 'ri-check-line text-green-600' : 'ri-add-line text-teal-600'} text-xs`}></i>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">
                                        {event.action === 'completed' 
                                          ? (event.type === 'milestone' ? 'Completed milestone' : event.type === 'run' ? 'Completed test run' : 'Completed session')
                                          : (event.type === 'milestone' ? 'Created milestone' : event.type === 'run' ? 'Created test run' : 'Created session')
                                        }
                                      </span>{' '}
                                      <span className={`${event.action === 'completed' ? 'text-green-600' : 'text-teal-600'} hover:underline cursor-pointer`}>{event.name}</span>
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        projectId={id!}
        onInvited={() => setMemberRefreshTrigger(prev => prev + 1)}
      />
    </div>
  );
}
