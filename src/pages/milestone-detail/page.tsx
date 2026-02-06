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

interface Issue {
  id: string;
  title: string;
  url: string;
  status?: string;
  runId: string;
  runName: string;
  testCaseId: string;
  testCaseName?: string;
  createdAt: string;
}

interface ActivityLog {
  id: string;
  type: 'note' | 'passed' | 'failed' | 'retest' | 'blocked';
  testCaseName: string;
  runName: string;
  timestamp: Date;
  author: string;
}

export default function MilestoneDetail() {
  const { projectId, milestoneId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [subMilestones, setSubMilestones] = useState<Milestone[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'status' | 'activity' | 'issues'>('results');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', start_date: '', end_date: '' });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityStats, setActivityStats] = useState({ notes: 0, passed: 0, failed: 0, retest: 0 });
  const [activityStatusFilter, setActivityStatusFilter] = useState<string>('all');
  const [activityPage, setActivityPage] = useState(1);
  const activityPerPage = 10;

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

      // Get jira_project_key from project and jira domain from jira_settings
      const jiraProjectKey = projectData?.jira_project_key || '';
      
      // Fetch Jira settings for domain (global settings, not project-specific)
      const { data: jiraSettings } = await supabase
        .from('jira_settings')
        .select('*')
        .maybeSingle();

      // Add https:// prefix if domain exists and doesn't already have it
      let jiraDomain = '';
      if (jiraSettings?.domain) {
        jiraDomain = jiraSettings.domain.startsWith('http') 
          ? jiraSettings.domain 
          : `https://${jiraSettings.domain}`;
      }

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

      // Create a map of run names for issue display
      const runNameMap = new Map<string, string>();
      (runsData || []).forEach(run => {
        runNameMap.set(run.id, run.name);
      });

      // Fetch all test case ids from runs
      const allTestCaseIds = new Set<string>();
      (runsData || []).forEach(run => {
        run.test_case_ids.forEach((id: string) => allTestCaseIds.add(id));
      });

      // Fetch test case names
      const testCaseNameMap = new Map<string, string>();
      if (allTestCaseIds.size > 0) {
        const { data: testCasesData } = await supabase
          .from('test_cases')
          .select('id, title')
          .in('id', Array.from(allTestCaseIds));
        
        (testCasesData || []).forEach(tc => {
          testCaseNameMap.set(tc.id, tc.title);
        });
      }

      // Calculate actual progress for each test run and collect issues
      const allIssues: Issue[] = [];
      const issueIdSet = new Set<string>();
      const allActivityLogs: ActivityLog[] = [];
      let notesCount = 0;
      let passedCount = 0;
      let failedCount = 0;
      let retestCount = 0;

      const runsWithProgress = await Promise.all(
        (runsData || []).map(async (run) => {
          const { data: testResultsData } = await supabase
            .from('test_results')
            .select('test_case_id, status, issues, created_at, note, author')
            .eq('run_id', run.id)
            .order('created_at', { ascending: false });

          const statusMap = new Map<string, string>();
          
          testResultsData?.forEach(result => {
            if (!statusMap.has(result.test_case_id)) {
              statusMap.set(result.test_case_id, result.status);
            }

            // Collect activity logs
            const activityType = result.note && result.note.trim() ? 'note' : result.status;
            allActivityLogs.push({
              id: `${run.id}-${result.test_case_id}-${result.created_at}`,
              type: activityType as ActivityLog['type'],
              testCaseName: testCaseNameMap.get(result.test_case_id) || 'Unknown Test Case',
              runName: run.name,
              timestamp: new Date(result.created_at),
              author: result.author || 'Unknown',
            });

            // Count stats
            if (result.note && result.note.trim()) notesCount++;
            if (result.status === 'passed') passedCount++;
            if (result.status === 'failed') failedCount++;
            if (result.status === 'retest') retestCount++;

            // Collect issues from test results
            if (result.issues && Array.isArray(result.issues)) {
              result.issues.forEach((issue: any) => {
                let issueId: string;
                let issueTitle: string;
                let issueUrl: string;
                let issueStatus: string | undefined;

                if (typeof issue === 'string') {
                  // If issue is just a string (issue number like "151" or "GW-151")
                  issueId = issue;
                  issueTitle = issue.includes('-') ? issue : `${jiraProjectKey}-${issue}`;
                  // Build URL: domain + /browse/ + full issue key
                  const fullIssueKey = issue.includes('-') ? issue : `${jiraProjectKey}-${issue}`;
                  issueUrl = jiraDomain ? `${jiraDomain}/browse/${fullIssueKey}` : '';
                  issueStatus = undefined;
                } else {
                  // If issue is an object
                  issueId = issue.id || issue.key || issue.title || '';
                  issueTitle = issue.title || issue.key || issue.id || '';
                  
                  // Construct URL: use provided URL or build from domain + issue key
                  if (issue.url) {
                    issueUrl = issue.url;
                  } else if (jiraDomain) {
                    // Extract issue key - if it already has project prefix, use as is
                    const issueKey = issue.key || issue.id || '';
                    const fullIssueKey = issueKey.includes('-') ? issueKey : `${jiraProjectKey}-${issueKey}`;
                    issueUrl = `${jiraDomain}/browse/${fullIssueKey}`;
                  } else {
                    issueUrl = '';
                  }
                  
                  issueStatus = issue.status;
                }

                if (issueId && !issueIdSet.has(issueId)) {
                  issueIdSet.add(issueId);
                  allIssues.push({
                    id: issueId,
                    title: issueTitle,
                    url: issueUrl,
                    status: issueStatus,
                    runId: run.id,
                    runName: run.name,
                    testCaseId: result.test_case_id,
                    testCaseName: testCaseNameMap.get(result.test_case_id),
                    createdAt: result.created_at,
                  });
                }
              });
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
      setIssues(allIssues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setActivityLogs(allActivityLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      setActivityStats({ notes: notesCount, passed: passedCount, failed: failedCount, retest: retestCount });

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

  const generateChartPoints = (logs: ActivityLog[], type: string) => {
    const days = 14;
    const width = 100;
    const height = 100;
    const now = new Date();
    
    // Count activities per day for the last 14 days
    const dailyCounts: number[] = new Array(days).fill(0);
    
    logs.forEach(log => {
      if (log.type === type || (type === 'note' && log.type === 'note')) {
        const daysDiff = Math.floor((now.getTime() - log.timestamp.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff < days) {
          dailyCounts[days - 1 - daysDiff]++;
        }
      }
    });
    
    const maxCount = Math.max(...dailyCounts, 1);
    
    return dailyCounts.map((count, idx) => {
      const x = (idx / (days - 1)) * width;
      const y = height - (count / maxCount) * height;
      return `${x},${y}`;
    }).join(' ');
  };

  const generateDateLabels = () => {
    const labels: string[] = [];
    const now = new Date();
    
    for (let i = 13; i >= 0; i -= 2) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }));
    }
    
    return labels;
  };

  const handleUpdateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestone) return;

    try {
      const { error } = await supabase
        .from('milestones')
        .update({
          name: editFormData.name,
          start_date: editFormData.start_date,
          end_date: editFormData.end_date
        })
        .eq('id', milestone.id);

      if (error) throw error;
      
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      console.error('마일스톤 수정 오류:', error);
      alert('마일스톤 수정에 실패했습니다.');
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
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditFormData({
                        name: milestone.name,
                        start_date: milestone.start_date ? milestone.start_date.split('T')[0] : '',
                        end_date: milestone.end_date ? milestone.end_date.split('T')[0] : ''
                      });
                      setShowEditModal(true);
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                  >
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
                  <div className="space-y-6">
                    {/* RUN ACTIVITY Chart */}
                    <div className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <h3 className="text-sm font-semibold text-gray-600 uppercase">RUN ACTIVITY</h3>
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-information-line text-gray-400 text-sm"></i>
                        </div>
                      </div>
                      
                      <div className="flex gap-8">
                        {/* Chart Area */}
                        <div className="flex-1">
                          <div className="h-48 relative">
                            {/* Y-axis labels */}
                            <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-gray-400">
                              <span>100</span>
                              <span>50</span>
                              <span>0</span>
                            </div>
                            
                            {/* Chart grid and lines */}
                            <div className="ml-10 h-40 relative border-b border-l border-gray-200">
                              {/* Grid lines */}
                              <div className="absolute inset-0">
                                <div className="absolute top-0 left-0 right-0 border-t border-gray-100"></div>
                                <div className="absolute top-1/2 left-0 right-0 border-t border-gray-100"></div>
                              </div>
                              
                              {/* Activity lines visualization */}
                              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                {/* Notes line (blue) */}
                                <polyline
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="2"
                                  points={generateChartPoints(activityLogs, 'note')}
                                />
                                {/* Passed line (green) */}
                                <polyline
                                  fill="none"
                                  stroke="#22c55e"
                                  strokeWidth="2"
                                  points={generateChartPoints(activityLogs, 'passed')}
                                />
                                {/* Failed line (red) */}
                                <polyline
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth="2"
                                  points={generateChartPoints(activityLogs, 'failed')}
                                />
                                {/* Retest line (orange) */}
                                <polyline
                                  fill="none"
                                  stroke="#f97316"
                                  strokeWidth="2"
                                  points={generateChartPoints(activityLogs, 'retest')}
                                />
                              </svg>
                            </div>
                            
                            {/* X-axis labels */}
                            <div className="ml-10 flex justify-between text-xs text-gray-400 mt-2">
                              {generateDateLabels().map((label, idx) => (
                                <span key={idx}>{label}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="w-48 space-y-4">
                          <div>
                            <div className="text-lg font-bold text-gray-900">Last 14 days</div>
                            <div className="text-sm text-gray-500">{activityStats.notes + activityStats.passed + activityStats.failed + activityStats.retest} recent changes</div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Notes</div>
                                <div className="text-xs text-gray-500">{activityStats.notes} notes added</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Passed</div>
                                <div className="text-xs text-gray-500">{activityStats.passed} set to Passed</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Failed</div>
                                <div className="text-xs text-gray-500">{activityStats.failed} set to Failed</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-orange-500 rounded-sm"></div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Retest</div>
                                <div className="text-xs text-gray-500">{activityStats.retest} set to Retest</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ACTIVITY List */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-600 uppercase">ACTIVITY</h3>
                        <div className="relative">
                          <select
                            value={activityStatusFilter}
                            onChange={(e) => {
                              setActivityStatusFilter(e.target.value);
                              setActivityPage(1);
                            }}
                            className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="all">Statuses</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                            <option value="retest">Retest</option>
                            <option value="blocked">Blocked</option>
                            <option value="note">Notes</option>
                          </select>
                          <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                        </div>
                      </div>

                      {/* Activity Timeline */}
                      <div className="space-y-6">
                        {(() => {
                          const filteredLogs = activityStatusFilter === 'all' 
                            ? activityLogs 
                            : activityLogs.filter(log => log.type === activityStatusFilter);
                          
                          // Group by date
                          const groupedByDate = filteredLogs.reduce((acc, log) => {
                            const dateKey = log.timestamp.toDateString();
                            const today = new Date().toDateString();
                            const yesterday = new Date(Date.now() - 86400000).toDateString();
                            
                            let displayDate = dateKey;
                            if (dateKey === today) displayDate = 'Today';
                            else if (dateKey === yesterday) displayDate = 'Yesterday';
                            else displayDate = log.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            
                            if (!acc[displayDate]) acc[displayDate] = [];
                            acc[displayDate].push(log);
                            return acc;
                          }, {} as Record<string, ActivityLog[]>);

                          const dateGroups = Object.entries(groupedByDate);
                          const totalPages = Math.ceil(filteredLogs.length / activityPerPage);
                          const startIdx = (activityPage - 1) * activityPerPage;
                          const paginatedLogs = filteredLogs.slice(startIdx, startIdx + activityPerPage);

                          // Re-group paginated logs
                          const paginatedGrouped = paginatedLogs.reduce((acc, log) => {
                            const dateKey = log.timestamp.toDateString();
                            const today = new Date().toDateString();
                            const yesterday = new Date(Date.now() - 86400000).toDateString();
                            
                            let displayDate = dateKey;
                            if (dateKey === today) displayDate = 'Today';
                            else if (dateKey === yesterday) displayDate = 'Yesterday';
                            else displayDate = log.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            
                            if (!acc[displayDate]) acc[displayDate] = [];
                            acc[displayDate].push(log);
                            return acc;
                          }, {} as Record<string, ActivityLog[]>);

                          if (filteredLogs.length === 0) {
                            return (
                              <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <i className="ri-history-line text-3xl text-gray-400"></i>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity yet</h3>
                                <p className="text-gray-500">Activity will appear here when test results are recorded.</p>
                              </div>
                            );
                          }

                          return (
                            <>
                              {Object.entries(paginatedGrouped).map(([date, logs]) => (
                                <div key={date}>
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                                    <span className="text-sm font-semibold text-gray-700">{date}</span>
                                  </div>
                                  
                                  <div className="ml-4 border-l-2 border-gray-200 pl-6 space-y-3">
                                    {logs.map((log) => (
                                      <div key={log.id} className="flex items-center gap-4 py-2">
                                        <span className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                                          log.type === 'passed' ? 'bg-green-100 text-green-700' :
                                          log.type === 'failed' ? 'bg-red-100 text-red-700' :
                                          log.type === 'retest' ? 'bg-orange-100 text-orange-700' :
                                          log.type === 'blocked' ? 'bg-gray-200 text-gray-700' :
                                          'bg-blue-100 text-blue-700'
                                        }`}>
                                          {log.type === 'note' ? 'Note' : log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                                        </span>
                                        
                                        <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                          <i className="ri-file-text-line text-gray-500 text-sm"></i>
                                        </div>
                                        
                                        <span className="text-sm text-teal-600 hover:text-teal-700 cursor-pointer truncate max-w-[300px]">
                                          {log.testCaseName}
                                        </span>
                                        
                                        <span className="text-sm text-gray-500 ml-auto whitespace-nowrap">
                                          {log.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </span>
                                        
                                        <div className="w-7 h-7 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                          {log.author.substring(0, 2).toUpperCase()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}

                              {/* Pagination */}
                              {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-6">
                                  <button
                                    onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                                    disabled={activityPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    <i className="ri-arrow-left-s-line"></i>
                                  </button>
                                  
                                  <div className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg">
                                    <span className="text-sm font-semibold text-teal-700">{activityPage}/{totalPages}</span>
                                  </div>
                                  
                                  <button
                                    onClick={() => setActivityPage(p => Math.min(totalPages, p + 1))}
                                    disabled={activityPage === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    <i className="ri-arrow-right-s-line"></i>
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'issues' && (
                  <div className="space-y-4">
                    {issues.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i className="ri-bug-line text-3xl text-gray-400"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No issues found</h3>
                        <p className="text-gray-500">이 마일스톤에 등록된 이슈가 없습니다.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-600 uppercase">
                            REGISTERED ISSUES ({issues.length})
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {issues.map((issue, index) => {
                            const hasValidUrl = issue.url && issue.url.length > 0;
                            
                            return hasValidUrl ? (
                              <a
                                key={`${issue.id}-${index}`}
                                href={issue.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg transition-all bg-white hover:border-teal-500 hover:shadow-md cursor-pointer block"
                              >
                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <i className="ri-bug-line text-red-600 text-lg"></i>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-900 truncate">
                                      {issue.title}
                                    </span>
                                    <i className="ri-external-link-line text-sm text-gray-400 flex-shrink-0"></i>
                                    {issue.status && (
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                                        issue.status.toLowerCase() === 'open' || issue.status.toLowerCase() === 'to do'
                                          ? 'bg-red-100 text-red-700'
                                          : issue.status.toLowerCase() === 'in progress'
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : issue.status.toLowerCase() === 'done' || issue.status.toLowerCase() === 'closed'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-gray-100 text-gray-700'
                                      }`}>
                                        {issue.status}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <i className="ri-play-circle-line text-xs"></i>
                                      <span className="truncate max-w-[150px]">{issue.runName}</span>
                                    </div>
                                    {issue.testCaseName && (
                                      <div className="flex items-center gap-1">
                                        <i className="ri-file-list-line text-xs"></i>
                                        <span className="truncate max-w-[200px]">{issue.testCaseName}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <i className="ri-time-line text-xs"></i>
                                      <span>{new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                  </div>
                                </div>
                              </a>
                            ) : (
                              <div
                                key={`${issue.id}-${index}`}
                                className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg bg-white"
                              >
                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <i className="ri-bug-line text-red-600 text-lg"></i>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-900 truncate">
                                      {issue.title}
                                    </span>
                                    {issue.status && (
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                                        issue.status.toLowerCase() === 'open' || issue.status.toLowerCase() === 'to do'
                                          ? 'bg-red-100 text-red-700'
                                          : issue.status.toLowerCase() === 'in progress'
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : issue.status.toLowerCase() === 'done' || issue.status.toLowerCase() === 'closed'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-gray-100 text-gray-700'
                                      }`}>
                                        {issue.status}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <i className="ri-play-circle-line text-xs"></i>
                                      <span className="truncate max-w-[150px]">{issue.runName}</span>
                                    </div>
                                    {issue.testCaseName && (
                                      <div className="flex items-center gap-1">
                                        <i className="ri-file-list-line text-xs"></i>
                                        <span className="truncate max-w-[200px]">{issue.testCaseName}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <i className="ri-time-line text-xs"></i>
                                      <span>{new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
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

      {/* Edit Milestone Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Milestone</h2>
            <form onSubmit={handleUpdateMilestone}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editFormData.end_date}
                    onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}