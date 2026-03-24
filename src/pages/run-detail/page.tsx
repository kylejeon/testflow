import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { FocusMode, type FocusTestCase, type TestStatus } from '../../components/FocusMode';
import { StatusBadge } from '../../components/StatusBadge';

interface TestCase {
  id: string;
  title: string;
  description?: string;
  folder?: string;
  priority: string;
  status: string;
  assignee?: string;
  is_automated: boolean;
  created_at: string;
  steps?: string;
  expected_result?: string;
  tags?: string;
  attachments?: { name: string; url: string; size: number }[];
}

interface TestCaseWithRunStatus extends TestCase {
  runStatus: 'passed' | 'failed' | 'blocked' | 'retest' | 'untested';
}

interface TestResult {
  id: string;
  status: 'passed' | 'failed' | 'blocked' | 'retest' | 'untested';
  author: string;
  timestamp: Date;
  note: string;
  elapsed: string;
  attachments: string[];
  stepStatuses?: Record<number, string>;
  issues?: string[];
  run?: {
    id: string;
    name: string;
    milestone_id?: string | null;
    milestone?: {
      id: string;
      name: string;
    } | null;
  };
  is_automated?: boolean; // CI/CD 자동화 여부
}

interface ProjectMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_emoji: string | null;
}

interface JiraSettings {
  domain: string;
  email: string;
  api_token: string;
  project_key: string;
  issue_type: string;
}

interface Folder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

const TIER_INFO = {
  1: { name: 'Free', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: 'ri-user-line' },
  2: { name: 'Starter', color: 'bg-indigo-50 text-indigo-700 border-indigo-300', icon: 'ri-vip-crown-line' },
  3: { name: 'Professional', color: 'bg-violet-50 text-violet-700 border-violet-300', icon: 'ri-vip-diamond-line' },
  4: { name: 'Enterprise', color: 'bg-amber-50 text-amber-700 border-amber-300', icon: 'ri-vip-diamond-line' },
};

export default function RunDetail() {
  const { projectId, runId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['common']);
  const [project, setProject] = useState<any>(null);
  const [run, setRun] = useState<any>(null);
  const [testCases, setTestCases] = useState<TestCaseWithRunStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTestCase, setSelectedTestCase] = useState<TestCaseWithRunStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'results' | 'issues'>('comments');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showAddResultModal, setShowAddResultModal] = useState(false);
  const [resultFormData, setResultFormData] = useState({
    status: 'passed' as 'passed' | 'failed' | 'blocked' | 'retest' | 'untested',
    note: '',
    assignTo: '',
    elapsed: '00:00',
    issues: '',
    issuesList: [] as string[],
    attachments: [] as { name: string; url: string; size: number }[],
  });
  const [stepStatuses, setStepStatuses] = useState<Record<number, string>>({});
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [jiraDomain, setJiraDomain] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [userProfile, setUserProfile] = useState<{ email: string; full_name: string; subscription_tier: number; avatar_emoji: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [jiraSettings, setJiraSettings] = useState<JiraSettings | null>(null);
  const [issueFormData, setIssueFormData] = useState({
    summary: '',
    description: '',
    issueType: 'Bug',
    priority: 'Medium',
    labels: '',
    assignee: '',
    components: '',
  });
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = All
  const [isFolderSidebarOpen, setIsFolderSidebarOpen] = useState(true);
  const [copiedRunId, setCopiedRunId] = useState(false);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [runAssignees, setRunAssignees] = useState<Map<string, string>>(new Map());
  const [openAssigneeDropdown, setOpenAssigneeDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (projectId && runId) {
      fetchData();
      fetchJiraSettings();
      fetchProjectMembers();
      fetchCurrentUser();
    }
  }, [projectId, runId]);

  useEffect(() => {
    if (selectedTestCase) {
      fetchTestResults();
      fetchComments();
    }
  }, [selectedTestCase]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name, subscription_tier, avatar_emoji')
          .eq('id', user.id)
          .maybeSingle();
        
        setCurrentUser({
          id: user.id,
          email: profile?.email || user.email || '',
          full_name: profile?.full_name || null,
        });

        setUserProfile({
          email: profile?.email || user.email || '',
          full_name: profile?.full_name || '',
          subscription_tier: profile?.subscription_tier || 1,
          avatar_emoji: profile?.avatar_emoji || '',
        });
      }
    } catch (error) {
      console.error('현재 사용자 정보 로딩 오류:', error);
    }
  };

  const fetchComments = async () => {
    if (!selectedTestCase) return;
    
    try {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('test_case_comments')
        .select(`
          id,
          comment,
          created_at,
          user_id,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .eq('test_case_id', selectedTestCase.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedComments = (data || []).map((item: any) => ({
        id: item.id,
        text: item.comment,
        author: item.profiles?.full_name || item.profiles?.email || 'Unknown',
        timestamp: new Date(item.created_at),
        user_id: item.user_id,
      }));

      setComments(formattedComments);
    } catch (error) {
      console.error('코멘트 로딩 오류:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchJiraSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('jira_settings')
        .select('domain, email, api_token, issue_type')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Jira 설정 로딩 오류:', error);
        return;
      }

      if (data && data.domain) {
        setJiraDomain(data.domain);
        setJiraSettings(prev => ({
          domain: data.domain,
          email: data.email || '',
          api_token: data.api_token || '',
          project_key: prev?.project_key || '',
          issue_type: data.issue_type || 'Bug',
        }));
      }
    } catch (error) {
      console.error('Jira 설정 로딩 오류:', error);
    }
  };

  const fetchProjectMembers = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (
            email,
            full_name,
            avatar_emoji
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      const members: ProjectMember[] = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        email: item.profiles?.email || '',
        full_name: item.profiles?.full_name || null,
        role: item.role,
        avatar_emoji: item.profiles?.avatar_emoji || null,
      }));

      setProjectMembers(members);
    } catch (error) {
      console.error('프로젝트 멤버 로딩 오류:', error);
    }
  };

  const fetchTestResults = async () => {
    if (!selectedTestCase || !runId) return;

    try {
      const { data, error } = await supabase
        .from('test_results')
        .select(`
          id,
          test_case_id,
          run_id,
          status,
          author,
          note,
          elapsed,
          created_at,
          issues,
          step_statuses,
          attachments,
          run:test_runs!test_results_run_id_fkey(
            id,
            name,
            milestone_id,
            milestone:milestones(
              id,
              name
            )
          )
        `)
        .eq('test_case_id', selectedTestCase.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const results: TestResult[] = (data || []).map((item: any) => ({
        id: item.id,
        status: item.status,
        note: item.note || '',
        elapsed: item.elapsed || '',
        attachments: item.attachments || [],
        author: item.author || '',
        timestamp: new Date(item.created_at),
        stepStatuses: item.step_statuses,
        issues: item.issues || [],
        run: item.run ? {
          id: item.run.id,
          name: item.run.name,
          milestone_id: item.run.milestone_id,
          milestone: item.run.milestone,
        } : undefined,
      }));

      setTestResults(results);
    } catch (error) {
      console.error('결과 로딩 오류:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      if (projectData?.jira_project_key) {
        setJiraSettings(prev => prev ? { ...prev, project_key: projectData.jira_project_key } : null);
      }

      const { data: runData, error: runError } = await supabase
        .from('test_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (runError) throw runError;
      setRun(runData);

      if (runData.test_case_ids && runData.test_case_ids.length > 0) {
        const { data: testCasesData, error: testCasesError } = await supabase
          .from('test_cases')
          .select('*')
          .in('id', runData.test_case_ids)
          .order('created_at', { ascending: false });

        if (testCasesError) throw testCasesError;

        const { data: testResultsData, error: testResultsError } = await supabase
          .from('test_results')
          .select('test_case_id, status')
          .eq('run_id', runId)
          .order('created_at', { ascending: false });

        if (testResultsError) throw testResultsError;

        const statusMap = new Map<string, string>();
        testResultsData?.forEach((result: any) => {
          if (!statusMap.has(result.test_case_id)) {
            statusMap.set(result.test_case_id, result.status);
          }
        });

        const testCasesWithStatus: TestCaseWithRunStatus[] = (testCasesData || []).map((tc: any) => ({
          ...tc,
          runStatus: statusMap.get(tc.id) || 'untested',
        }));

        setTestCases(testCasesWithStatus);

        // Run 상태 자동 업데이트: new 상태인데 이미 일부 결과가 있으면 in_progress로 변경
        const untestedCount = testCasesWithStatus.filter(tc => tc.runStatus === 'untested').length;
        const totalCount = testCasesWithStatus.length;
        const hasAnyResult = (testResultsData?.length || 0) > 0;

        if (runData.status === 'new' && (hasAnyResult || untestedCount < totalCount)) {
          const newStatus = untestedCount === 0 ? 'completed' : 'in_progress';
          await supabase
            .from('test_runs')
            .update({ status: newStatus })
            .eq('id', runId);
          // 로컬 상태는 setRun 이후에 반영되므로 runData를 직접 수정
          runData.status = newStatus;
        }

        // 이 Run에 포함된 테스트케이스의 folder 이름 목록 추출
        const folderNamesInRun = Array.from(
          new Set(
            (testCasesData || [])
              .map((tc: any) => tc.folder)
              .filter((f: any) => f && f.trim() !== '')
          )
        ) as string[];

        // folders 테이블에서 해당 프로젝트의 폴더 조회
        const { data: foldersData } = await supabase
          .from('folders')
          .select('*')
          .eq('project_id', projectId);

        // Run에 포함된 폴더 이름과 매칭되는 폴더만 필터링
        const matchedFolders: Folder[] = (foldersData || []).filter((f: any) =>
          folderNamesInRun.includes(f.name)
        );

        // folders 테이블에 없는 폴더 이름도 표시 (이름만 있는 경우)
        const matchedNames = matchedFolders.map((f) => f.name);
        const unmatchedFolders: Folder[] = folderNamesInRun
          .filter((name) => !matchedNames.includes(name))
          .map((name) => ({ id: name, name }));

        setFolders([...matchedFolders, ...unmatchedFolders]);

        // Run별 assignee 불러오기
        const { data: assigneesData } = await supabase
          .from('run_testcase_assignees')
          .select('test_case_id, assignee')
          .eq('run_id', runId);

        const assigneesMap = new Map<string, string>();
        (assigneesData || []).forEach((row: any) => {
          if (row.assignee) {
            assigneesMap.set(row.test_case_id, row.assignee);
          }
        });
        setRunAssignees(assigneesMap);
      }
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !selectedTestCase || !currentUser) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('test_case_comments')
        .insert({
          test_case_id: selectedTestCase.id,
          user_id: currentUser.id,
          comment: commentText.trim(),
        })
        .select(`
          id,
          comment,
          created_at,
          user_id,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .single();

      if (error) throw error;

      const newComment = {
        id: data.id,
        text: data.comment,
        author: data.profiles?.full_name || data.profiles?.email || 'Unknown',
        timestamp: new Date(data.created_at),
        user_id: data.user_id,
      };

      setComments([newComment, ...comments]);
      setCommentText('');
    } catch (error) {
      console.error('코멘트 저장 오류:', error);
      alert('코멘트 저장에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('test_case_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('코멘트 삭제 오류:', error);
      alert('코멘트 삭제에 실패했습니다.');
    }
  };

  const updateRunStatus = async (runId: string, stats: { untested: number }) => {
    try {
      let newStatus: 'new' | 'in_progress' | 'under_review' | 'completed';
      
      if (stats.untested === 0) {
        newStatus = 'completed';
      } else {
        newStatus = 'in_progress';
      }

      const { error } = await supabase
        .from('test_runs')
        .update({ status: newStatus })
        .eq('id', runId);

      if (error) throw error;

      // Update local state
      if (run) {
        setRun({ ...run, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating run status:', error);
    }
  };

  const handleStatusChange = async (testCaseId: string, newStatus: string) => {
    try {
      if (!currentUser) {
        alert('사용자 정보를 불러올 수 없습니다.');
        return;
      }

      // Update local state only (do NOT insert a new test result here)
      const updatedTestCases = testCases.map(tc => 
        tc.id === testCaseId ? { ...tc, runStatus: newStatus as any } : tc
      );
      setTestCases(updatedTestCases);

      if (selectedTestCase?.id === testCaseId) {
        setSelectedTestCase({ ...selectedTestCase, runStatus: newStatus as any });
      }
      
      // Calculate untested count
      const untestedCount = updatedTestCases.filter(tc => tc.runStatus === 'untested').length;
      
      // Update run status based on untested count
      await updateRunStatus(runId!, {
        untested: untestedCount
      });
      
      // Switch to Results tab
      setActiveTab('results');
    } catch (error) {
      console.error('상태 업데이트 오류:', error);
      alert('상태 업데이트에 실패했습니다.');
    }
  };

  const handlePreviousTestCase = () => {
    if (!selectedTestCase) return;
    const currentIndex = filteredTestCases.findIndex(tc => tc.id === selectedTestCase.id);
    if (currentIndex > 0) {
      setSelectedTestCase(filteredTestCases[currentIndex - 1]);
    }
  };

  const handleNextTestCase = () => {
    if (!selectedTestCase) return;
    const currentIndex = filteredTestCases.findIndex(tc => tc.id === selectedTestCase.id);
    if (currentIndex < filteredTestCases.length - 1) {
      setSelectedTestCase(filteredTestCases[currentIndex + 1]);
    }
  };

  const handlePassAndNext = async () => {
    if (!selectedTestCase || !currentUser) return;
    
    try {
      // Create a test result
      const { data: resultData, error: resultError } = await supabase
        .from('test_results')
        .insert({
          test_case_id: selectedTestCase.id,
          run_id: runId,
          status: 'passed',
          author: currentUser.full_name || currentUser.email,
          note: '',
          elapsed: '00:00',
          attachments: [],
          step_statuses: {},
        })
        .select()
        .single();

      if (resultError) throw resultError;

      // Create new result object
      const newResult: TestResult = {
        id: resultData.id,
        status: resultData.status,
        note: resultData.note,
        elapsed: resultData.elapsed,
        attachments: resultData.attachments || [],
        author: resultData.author,
        timestamp: new Date(resultData.created_at),
        stepStatuses: resultData.step_statuses,
      };

      // Update local states
      const updatedTestCases = testCases.map(tc => 
        tc.id === selectedTestCase.id ? { ...tc, runStatus: 'passed' } : tc
      );
      setTestCases(updatedTestCases);
      
      setSelectedTestCase({ ...selectedTestCase, runStatus: 'passed' });
      setTestResults([newResult, ...testResults]);
      
      // Calculate untested count
      const untestedCount = updatedTestCases.filter(tc => tc.runStatus === 'untested').length;
      
      // Update run status based on untested count
      await updateRunStatus(runId!, {
        untested: untestedCount
      });
      
      // Move to next test case after a short delay
      setTimeout(() => {
        const currentIndex = filteredTestCases.findIndex(tc => tc.id === selectedTestCase.id);
        if (currentIndex < filteredTestCases.length - 1) {
          setSelectedTestCase(filteredTestCases[currentIndex + 1]);
        }
      }, 500);
    } catch (error) {
      console.error('상태 업데이트 오류:', error);
      alert('상태 업데이트에 실패했습니다.');
    }
  };

  const handleAddResult = () => {
    setShowAddResultModal(true);
  };

  const handleStepStatusChange = (stepIndex: number, status: string) => {
    setStepStatuses({
      ...stepStatuses,
      [stepIndex]: status,
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTimerRunning && timerStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - timerStartTime) / 1000);
        setElapsedSeconds(elapsed);
        
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        setResultFormData(prev => ({ ...prev, elapsed: timeString }));
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning, timerStartTime]);

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      // 타이머 정지
      setIsTimerRunning(false);
    } else {
      // 타이머 시작
      const now = Date.now();
      if (timerStartTime === null) {
        // 처음 시작
        setTimerStartTime(now);
        setElapsedSeconds(0);
      } else {
        // 재개 - 이전 경과 시간을 고려
        setTimerStartTime(now - (elapsedSeconds * 1000));
      }
      setIsTimerRunning(true);
    }
  };

  const handleIssueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // IME 조합 중(한글 입력 등)에는 무시
    if (e.nativeEvent.isComposing) return;

    if ((e.key === 'Enter' || e.key === ',') && resultFormData.issues.trim()) {
      e.preventDefault();
      const issueKey = resultFormData.issues.trim().replace(/,$/, '').toUpperCase();
      if (!issueKey) return;

      // Check if already exists
      if (resultFormData.issuesList.includes(issueKey)) {
        setResultFormData({ ...resultFormData, issues: '' });
        return;
      }

      setResultFormData({
        ...resultFormData,
        issues: '',
        issuesList: [...resultFormData.issuesList, issueKey],
      });
    }
  };

  const handleRemoveIssue = (issueKey: string) => {
    setResultFormData({
      ...resultFormData,
      issuesList: resultFormData.issuesList.filter(key => key !== issueKey),
    });
  };

  const handleSubmitResult = async () => {
    try {
      if (!selectedTestCase || !runId || !currentUser) return;

      // 타이머 정지
      setIsTimerRunning(false);

      // 입력 중인 이슈가 있으면 자동으로 추가
      let finalIssuesList = [...resultFormData.issuesList];
      if (resultFormData.issues.trim()) {
        const pendingIssue = resultFormData.issues.trim().toUpperCase();
        if (!finalIssuesList.includes(pendingIssue)) {
          finalIssuesList = [...finalIssuesList, pendingIssue];
        }
      }

      // Save to Supabase
      const { data, error } = await supabase
        .from('test_results')
        .insert({
          test_case_id: selectedTestCase.id,
          run_id: runId,
          status: resultFormData.status,
          author: currentUser.full_name || currentUser.email,
          note: resultFormData.note,
          elapsed: resultFormData.elapsed,
          attachments: resultFormData.attachments.map(f => f.url),
          step_statuses: stepStatuses,
          issues: finalIssuesList,
        })
        .select()
        .single();

      if (error) throw error;

      const newResult: TestResult = {
        id: data.id,
        status: data.status,
        note: data.note,
        elapsed: data.elapsed,
        attachments: data.attachments || [],
        author: data.author,
        timestamp: new Date(data.created_at),
        stepStatuses: data.step_statuses,
        issues: data.issues || [],
      };

      setTestResults([newResult, ...testResults]);
      
      // Update test case status in local state only (without creating another result)
      const updatedTestCases = testCases.map(tc => 
        tc.id === selectedTestCase.id ? { ...tc, runStatus: resultFormData.status as any } : tc
      );
      setTestCases(updatedTestCases);
      
      if (selectedTestCase?.id === selectedTestCase.id) {
        setSelectedTestCase({ ...selectedTestCase, runStatus: resultFormData.status as any });
      }
      
      // Calculate untested count
      const untestedCount = updatedTestCases.filter(tc => tc.runStatus === 'untested').length;
      
      // Update run status based on untested count
      await updateRunStatus(runId!, {
        untested: untestedCount
      });
      
      // Reset form and timer
      setResultFormData({
        status: 'passed',
        note: '',
        assignTo: '',
        elapsed: '00:00',
        issues: '',
        issuesList: [],
        attachments: [],
      });
      setStepStatuses({});
      setTimerStartTime(null);
      setElapsedSeconds(0);
      setShowAddResultModal(false);
      
      // Switch to Results tab
      setActiveTab('results');
    } catch (error) {
      console.error('결과 저장 오류:', error);
      alert('결과 저장에 실패했습니다.');
    }
  };

  const filteredTestCases = testCases.filter(testCase => {
    const matchesSearch = testCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         testCase.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || testCase.runStatus === statusFilter;
    const matchesPriority = priorityFilter === 'all' || testCase.priority === priorityFilter;
    const matchesFolder = selectedFolder === null || testCase.folder === selectedFolder;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesFolder;
  }).sort((a, b) => {
    const aId = (a as any).custom_id || '';
    const bId = (b as any).custom_id || '';
    const aMatch = aId.match(/(\D+)(\d+)$/);
    const bMatch = bId.match(/(\D+)(\d+)$/);
    if (aMatch && bMatch && aMatch[1] === bMatch[1]) {
      return parseInt(aMatch[2], 10) - parseInt(bMatch[2], 10);
    }
    return aId.localeCompare(bId);
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'blocked':
        return 'bg-gray-100 text-gray-700';
      case 'retest':
        return 'bg-yellow-100 text-yellow-700';
      case 'untested':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return 'ri-checkbox-circle-fill';
      case 'failed':
        return 'ri-close-circle-fill';
      case 'blocked':
        return 'ri-forbid-fill';
      case 'retest':
        return 'ri-refresh-line';
      case 'untested':
        return 'ri-question-fill';
      default:
        return 'ri-question-fill';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'passed':
        return 'Passed';
      case 'failed':
        return 'Failed';
      case 'blocked':
        return 'Blocked';
      case 'retest':
        return 'Retest';
      case 'untested':
        return 'Untested';
      default:
        return 'Untested';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingFile(true);
      const uploadedFiles: { name: string; url: string; size: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${projectId}/test-results/${fileName}`;

        const { data, error } = await supabase.storage
          .from('test-case-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('파일 업로드 오류:', error);
          throw error;
        }

        const { data: urlData } = supabase.storage
          .from('test-case-attachments')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
        });
      }

      setResultFormData({
        ...resultFormData,
        attachments: [...resultFormData.attachments, ...uploadedFiles],
      });
    } catch (error: any) {
      console.error('파일 업로드 오류:', error);
      alert(`파일 업로드에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (index: number) => {
    try {
      const fileToRemove = resultFormData.attachments[index];
      
      if (fileToRemove.url) {
        const urlParts = fileToRemove.url.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'test-case-attachments');
        if (bucketIndex !== -1) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/');
          
          const { error } = await supabase.storage
            .from('test-case-attachments')
            .remove([filePath]);
          
          if (error) {
            console.error('파일 삭제 오류:', error);
          }
        }
      }

      const newAttachments = [...resultFormData.attachments];
      newAttachments.splice(index, 1);
      setResultFormData({
        ...resultFormData,
        attachments: newAttachments,
      });
    } catch (error) {
      console.error('첨부파일 삭제 오류:', error);
    }
  };

  const handleScreenshot = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('이 브라우저는 스크린샷 기능을 지원하지 않습니다.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' as any }
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      stream.getTracks().forEach(track => track.stop());

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const fileName = `screenshot_${Date.now()}.png`;
        const filePath = `${projectId}/test-results/${fileName}`;

        setUploadingFile(true);
        try {
          const { data, error } = await supabase.storage
            .from('test-case-attachments')
            .upload(filePath, blob, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;

          const { data: urlData } = supabase.storage
            .from('test-case-attachments')
            .getPublicUrl(filePath);

          setResultFormData({
            ...resultFormData,
            attachments: [...resultFormData.attachments, {
              name: fileName,
              url: urlData.publicUrl,
              size: blob.size,
            }],
          });
        } catch (error: any) {
          console.error('스크린샷 업로드 오류:', error);
          alert(`스크린샷 업로드에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
        } finally {
          setUploadingFile(false);
        }
      }, 'image/png');
    } catch (error) {
      console.error('스크린샷 캡처 오류:', error);
      alert('스크린샷 캡처에 실패했습니다.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getJiraIssueUrl = (issueKey: string) => {
    if (!jiraDomain) return '#';
    return `https://${jiraDomain}/browse/${issueKey}`;
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredTestCases.map(tc => tc.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const handleAddIssueClick = () => {
    const isProfessionalOrHigher = (userProfile?.subscription_tier || 1) >= 2;
    
    if (!isProfessionalOrHigher) {
      setShowUpgradeModal(true);
      return;
    }

    if (!jiraSettings || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.api_token) {
      if (confirm('Jira 설정이 필요합니다. Settings 페이지로 이동하시겠습니까?')) {
        navigate('/settings');
      }
      return;
    }

    setShowAddIssueModal(true);
  };

  const handleCreateJiraIssue = async (fromIssuesTab = false) => {
    if (!issueFormData.summary.trim()) {
      alert('Summary는 필수 항목입니다.');
      return;
    }

    if (!jiraSettings || !selectedTestCase) {
      return;
    }

    try {
      setCreatingIssue(true);

      const labelsArray = issueFormData.labels
        .split(',')
        .map(l => l.trim())
        .filter(l => l);

      const componentsArray = issueFormData.components
        .split(',')
        .map(c => c.trim())
        .filter(c => c);

      const { data, error } = await supabase.functions.invoke('create-jira-issue', {
        body: {
          domain: jiraSettings.domain,
          email: jiraSettings.email,
          apiToken: jiraSettings.api_token,
          projectKey: jiraSettings.project_key,
          summary: issueFormData.summary,
          description: issueFormData.description,
          issueType: issueFormData.issueType,
          priority: issueFormData.priority,
          labels: labelsArray,
          assignee: issueFormData.assignee || undefined,
          components: componentsArray.length > 0 ? componentsArray : undefined,
        },
      });

      if (error) throw error;

      if (data.success && data.issue && data.issue.key) {
        const newIssueKey = data.issue.key;

        if (testResults.length > 0) {
          // 최신 result에 이슈 추가
          const latestResult = testResults[0];
          const updatedIssues = [...(latestResult.issues || []), newIssueKey];

          const { error: updateError } = await supabase
            .from('test_results')
            .update({ issues: updatedIssues })
            .eq('id', latestResult.id);

          if (updateError) throw updateError;

          // Update local state
          setTestResults(testResults.map(r =>
            r.id === latestResult.id
              ? { ...r, issues: updatedIssues }
              : r
          ));
        } else {
          // testResults가 없을 경우 새 result 생성 (Issues 탭에서 Add Issue 시)
          const { data: newResultData, error: insertError } = await supabase
            .from('test_results')
            .insert({
              test_case_id: selectedTestCase.id,
              run_id: runId,
              status: 'failed',
              author: currentUser?.full_name || currentUser?.email || '',
              note: `Jira 이슈 생성: ${newIssueKey}`,
              elapsed: '00:00',
              attachments: [],
              step_statuses: {},
              issues: [newIssueKey],
            })
            .select()
            .single();

          if (insertError) throw insertError;

          const newResult: TestResult = {
            id: newResultData.id,
            status: newResultData.status,
            note: newResultData.note,
            elapsed: newResultData.elapsed,
            attachments: newResultData.attachments || [],
            author: newResultData.author,
            timestamp: new Date(newResultData.created_at),
            stepStatuses: newResultData.step_statuses,
            issues: newResultData.issues || [],
            run: { id: runId!, name: run?.name || '' },
          };

          setTestResults([newResult]);

          // 테스트케이스 상태도 업데이트
          const updatedTestCases = testCases.map(tc =>
            tc.id === selectedTestCase.id ? { ...tc, runStatus: 'failed' as any } : tc
          );
          setTestCases(updatedTestCases);
          setSelectedTestCase({ ...selectedTestCase, runStatus: 'failed' as any });

          const untestedCount = updatedTestCases.filter(tc => tc.runStatus === 'untested').length;
          await updateRunStatus(runId!, { untested: untestedCount });
        }

        alert(`Jira 이슈가 생성되었습니다: ${newIssueKey}`);
        setShowAddIssueModal(false);
        setIssueFormData({
          summary: '',
          description: '',
          issueType: 'Bug',
          priority: 'Medium',
          labels: '',
          assignee: '',
          components: '',
        });

        // Issues 탭으로 전환
        setActiveTab('issues');

        // 최신 결과 다시 로드
        await fetchTestResults();
      } else {
        throw new Error(data.error || data.message || 'Jira 이슈 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Jira 이슈 생성 오류:', error);
      alert(`Jira 이슈 생성에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setCreatingIssue(false);
    }
  };

  const handleCopyRunId = () => {
    if (!runId) return;
    navigator.clipboard.writeText(runId).then(() => {
      setCopiedRunId(true);
      setTimeout(() => setCopiedRunId(false), 2000);
    });
  };

  const handleAssigneeChange = async (testCaseId: string, assigneeName: string) => {
    try {
      const { error } = await supabase
        .from('run_testcase_assignees')
        .upsert(
          {
            run_id: runId,
            test_case_id: testCaseId,
            assignee: assigneeName || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'run_id,test_case_id' }
        );

      if (error) throw error;

      const updatedMap = new Map(runAssignees);
      if (assigneeName) {
        updatedMap.set(testCaseId, assigneeName);
      } else {
        updatedMap.delete(testCaseId);
      }
      setRunAssignees(updatedMap);
    } catch (error) {
      console.error('Assignee 업데이트 오류:', error);
    }
  };

  const handleBulkAssigneeChange = async (assigneeName: string) => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const rows = ids.map((testCaseId) => ({
        run_id: runId,
        test_case_id: testCaseId,
        assignee: assigneeName || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('run_testcase_assignees')
        .upsert(rows, { onConflict: 'run_id,test_case_id' });

      if (error) throw error;

      const updatedMap = new Map(runAssignees);
      ids.forEach((id) => {
        if (assigneeName) {
          updatedMap.set(id, assigneeName);
        } else {
          updatedMap.delete(id);
        }
      });
      setRunAssignees(updatedMap);
      setSelectedIds(new Set());
      setBulkAssignee('');
    } catch (error) {
      console.error('Bulk assignee 업데이트 오류:', error);
    }
  };

  const currentTier = userProfile?.subscription_tier || 1;
  const tierInfo = TIER_INFO[currentTier as keyof typeof TIER_INFO];
  const isProfessionalOrHigher = currentTier >= 2;

  // Focus Mode handler
  const handleFocusStatusChange = useCallback(
    async (testId: string, status: TestStatus, _note?: string) => {
      await handleStatusChange(testId, status);
    },
    [handleStatusChange]
  );

  const focusTests: FocusTestCase[] = testCases.map((tc) => ({
    id: tc.id,
    title: tc.title,
    description: tc.description,
    steps: tc.steps,
    expected_result: tc.expected_result,
    runStatus: tc.runStatus,
  }));

  return (
    <>
    {focusModeOpen && (
      <FocusMode
        tests={focusTests}
        runName={run?.name || 'Test Run'}
        onStatusChange={handleFocusStatusChange}
        onExit={() => setFocusModeOpen(false)}
      />
    )}
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Link to="/projects" className="flex items-center cursor-pointer">
                <LogoMark />
              </Link>

              <div className="w-px h-5 bg-gray-300" />

              <span className="text-sm text-gray-500">{project?.name}</span>
            </div>
            
            <div className="flex items-center gap-3 relative">
              <div 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {userProfile?.avatar_emoji ? (
                    <span className="text-base leading-none">{userProfile.avatar_emoji}</span>
                  ) : (
                    <span>{userProfile?.full_name?.charAt(0) || 'U'}</span>
                  )}
                </div>
              </div>
              
              {showProfileMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowProfileMenu(false)}
                  ></div>
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{userProfile?.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500">{userProfile?.email}</p>
                      <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs font-semibold rounded-full border ${tierInfo.color}`}>
                        <i className={`${tierInfo.icon} text-sm`}></i>
                        {tierInfo.name}
                      </div>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100"
                    >
                      <i className="ri-settings-3-line text-lg w-5 h-5 flex items-center justify-center"></i>
                      <span>{t('common:settings')}</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                    >
                      <i className="ri-logout-box-line text-lg w-5 h-5 flex items-center justify-center"></i>
                      <span>{t('common:logout')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden bg-gray-50/30 flex">
          {/* 폴더 사이드바 */}
          <div className={`flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto transition-all duration-200 ${isFolderSidebarOpen ? 'w-52' : 'w-12'}`}>
            <div className={`px-3 py-4 border-b border-gray-100 flex items-center ${isFolderSidebarOpen ? 'justify-between' : 'justify-center'}`}>
              {isFolderSidebarOpen && (
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Folders</h3>
              )}
              <button
                onClick={() => setIsFolderSidebarOpen(!isFolderSidebarOpen)}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all cursor-pointer flex-shrink-0"
                title={isFolderSidebarOpen ? '접기' : '펼치기'}
              >
                <i className={`ri-${isFolderSidebarOpen ? 'arrow-left-s' : 'arrow-right-s'}-line text-base`}></i>
              </button>
            </div>
            <div className="flex-1 py-2">
              {/* All */}
              <button
                onClick={() => { setSelectedFolder(null); setSelectedTestCase(null); }}
                className={`w-full flex items-center gap-2.5 py-2.5 text-sm font-medium transition-all cursor-pointer text-left ${isFolderSidebarOpen ? 'px-4' : 'px-0 justify-center'} ${
                  selectedFolder === null
                    ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-500'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={!isFolderSidebarOpen ? 'All Cases' : undefined}
              >
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                  <i className="ri-stack-line text-base"></i>
                </div>
                {isFolderSidebarOpen && (
                  <>
                    <span className="truncate">All Cases</span>
                    <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      selectedFolder === null ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {testCases.length}
                    </span>
                  </>
                )}
              </button>

              {/* 폴더 목록 */}
              {folders.length > 0 && (
                <div className="mt-1">
                  {folders.map((folder) => {
                    const count = testCases.filter(tc => tc.folder === folder.name).length;
                    const isSelected = selectedFolder === folder.name;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => { setSelectedFolder(folder.name); setSelectedTestCase(null); }}
                        className={`w-full flex items-center gap-2.5 py-2.5 text-sm font-medium transition-all cursor-pointer text-left ${isFolderSidebarOpen ? 'px-4' : 'px-0 justify-center'} ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-500'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        title={!isFolderSidebarOpen ? folder.name : undefined}
                      >
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <i className={`${folder.icon || 'ri-folder-3-line'} text-base`}
                            style={{ color: isSelected ? undefined : (folder.color || undefined) }}
                          ></i>
                        </div>
                        {isFolderSidebarOpen && (
                          <>
                            <span className="truncate">{folder.name}</span>
                            <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                              isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {count}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {folders.length === 0 && !loading && isFolderSidebarOpen && (
                <div className="px-4 py-6 text-center">
                  <i className="ri-folder-open-line text-2xl text-gray-300 mb-2"></i>
                  <p className="text-sm text-gray-500">폴더 없음</p>
                </div>
              )}
            </div>
          </div>

          <div className={`${selectedTestCase ? 'flex-1' : 'flex-1'} overflow-y-auto`}>
            <div className="p-8">
              <div className="mb-8">
                <Link 
                  to={`/projects/${projectId}/runs`}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 cursor-pointer"
                >
                  <i className="ri-arrow-left-line"></i>
                  Back to Runs
                </Link>
                
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900">{run?.name}</h1>
                      {run?.is_automated && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold border border-purple-200">
                          <i className="ri-robot-line"></i>
                          Automated
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 font-mono">{runId}</span>
                      <button
                        onClick={handleCopyRunId}
                        title="Run ID 복사"
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer whitespace-nowrap border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 text-gray-500 bg-white"
                      >
                        {copiedRunId ? (
                          <>
                            <i className="ri-check-line text-indigo-600"></i>
                            <span className="text-indigo-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <i className="ri-file-copy-line"></i>
                            Copy ID
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-gray-600">{run?.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Focus Mode button */}
                    {testCases.length > 0 && (
                      <button
                        onClick={() => setFocusModeOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold transition-colors"
                        title="Cmd+Shift+F"
                      >
                        <i className="ri-focus-3-line" />
                        Focus Mode
                      </button>
                    )}
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                      run?.status === 'completed' ? 'bg-green-100 text-green-700' :
                      run?.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      run?.status === 'under_review' ? 'bg-purple-100 text-purple-700' :
                      run?.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      <i className={`${
                      run?.status === 'completed' ? 'ri-checkbox-circle-fill' :
                      run?.status === 'in_progress' ? 'ri-loader-4-line animate-spin' :
                      run?.status === 'under_review' ? 'ri-eye-line' :
                      run?.status === 'paused' ? 'ri-pause-circle-fill' :
                      'ri-time-fill'
                    } text-lg`}></i>
                      {run?.status === 'completed' ? 'Completed' :
                       run?.status === 'in_progress' ? 'In Progress' :
                       run?.status === 'under_review' ? 'Under Review' :
                       run?.status === 'paused' ? 'Paused' :
                       'New'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="ri-file-list-3-line text-blue-600 text-xl"></i>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Tests</p>
                      <p className="text-2xl font-bold text-gray-900">{testCases.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="ri-checkbox-circle-fill text-green-600 text-xl"></i>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Passed</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {testCases.filter(tc => tc.runStatus === 'passed').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <i className="ri-close-circle-fill text-red-600 text-xl"></i>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Failed</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {testCases.filter(tc => tc.runStatus === 'failed').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <i className="ri-forbid-fill text-gray-600 text-xl"></i>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Blocked</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {testCases.filter(tc => tc.runStatus === 'blocked').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <i className="ri-time-fill text-yellow-600 text-xl"></i>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Untested</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {testCases.filter(tc => tc.runStatus === 'untested').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 진행률 바 */}
              {testCases.length > 0 && (() => {
                const total = testCases.length;
                const passed = testCases.filter(tc => tc.runStatus === 'passed').length;
                const failed = testCases.filter(tc => tc.runStatus === 'failed').length;
                const blocked = testCases.filter(tc => tc.runStatus === 'blocked').length;
                const retest = testCases.filter(tc => tc.runStatus === 'retest').length;
                const untested = testCases.filter(tc => tc.runStatus === 'untested').length;

                const passedPct = (passed / total) * 100;
                const failedPct = (failed / total) * 100;
                const blockedPct = (blocked / total) * 100;
                const retestPct = (retest / total) * 100;
                const untestedPct = (untested / total) * 100;

                return (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-semibold text-gray-700">Progress</span>
                      <span className="text-sm font-bold text-gray-900">
                        {total > 0 ? Math.round(((passed + failed + blocked + retest) / total) * 100) : 0}% Completed
                      </span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 gap-px">
                      {passed > 0 && (
                        <div
                          className="bg-green-500 transition-all duration-500"
                          style={{ width: `${passedPct}%` }}
                          title={`Passed: ${passed}`}
                        />
                      )}
                      {failed > 0 && (
                        <div
                          className="bg-red-500 transition-all duration-500"
                          style={{ width: `${failedPct}%` }}
                          title={`Failed: ${failed}`}
                        />
                      )}
                      {blocked > 0 && (
                        <div
                          className="bg-gray-400 transition-all duration-500"
                          style={{ width: `${blockedPct}%` }}
                          title={`Blocked: ${blocked}`}
                        />
                      )}
                      {retest > 0 && (
                        <div
                          className="bg-yellow-400 transition-all duration-500"
                          style={{ width: `${retestPct}%` }}
                          title={`Retest: ${retest}`}
                        />
                      )}
                      {untested > 0 && (
                        <div
                          className="bg-gray-200 transition-all duration-500"
                          style={{ width: `${untestedPct}%` }}
                          title={`Untested: ${untested}`}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      {passed > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                          <span className="text-xs text-gray-600">Passed <strong>{passed}</strong></span>
                        </div>
                      )}
                      {failed > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                          <span className="text-xs text-gray-600">Failed <strong>{failed}</strong></span>
                        </div>
                      )}
                      {blocked > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                          <span className="text-xs text-gray-600">Blocked <strong>{blocked}</strong></span>
                        </div>
                      )}
                      {retest > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                          <span className="text-xs text-gray-600">Retest <strong>{retest}</strong></span>
                        </div>
                      )}
                      {untested > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-200 border border-gray-300"></div>
                          <span className="text-xs text-gray-600">Untested <strong>{untested}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Test Cases</h2>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg w-5 h-5 flex items-center justify-center"></i>
                      <input
                        type="text"
                        placeholder="Search test cases..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                    </select>

                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                    >
                      <option value="all">All Priority</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  {/* Bulk Action Toolbar */}
                  {selectedIds.size > 0 && (
                    <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-200 flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <i className="ri-checkbox-multiple-line text-indigo-600"></i>
                      </div>
                      <span className="text-sm font-semibold text-indigo-700">
                        {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
                      </span>
                      <div className="w-px h-4 bg-indigo-300 mx-1"></div>
                      <span className="text-sm text-gray-600 whitespace-nowrap">Assign to:</span>
                      <select
                        value={bulkAssignee}
                        onChange={(e) => setBulkAssignee(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">Unassigned</option>
                        {projectMembers.map((member) => (
                          <option key={member.id} value={member.full_name || member.email}>
                            {member.avatar_emoji ? `${member.avatar_emoji} ` : ''}{member.full_name || member.email}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleBulkAssigneeChange(bulkAssignee)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all cursor-pointer whitespace-nowrap"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => { setSelectedIds(new Set()); setBulkAssignee(''); }}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap ml-auto"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 cursor-pointer"
                        checked={filteredTestCases.length > 0 && selectedIds.size === filteredTestCases.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </div>
                    <div className="col-span-1">
                      <span className="text-xs font-semibold text-gray-600 uppercase">ID</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-xs font-semibold text-gray-600 uppercase">Test Case</span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-xs font-semibold text-gray-600 uppercase">Priority</span>
                    </div>
                    <div className="col-span-3 flex items-center">
                      <span className="text-xs font-semibold text-gray-600 uppercase">Assignee</span>
                    </div>
                    <div className="col-span-3 flex items-center">
                      <span className="text-xs font-semibold text-gray-600 uppercase">Status</span>
                    </div>
                  </div>

                  {filteredTestCases.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-file-list-3-line text-3xl text-gray-400"></i>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">테스트 케이스가 없습니다</h3>
                      <p className="text-gray-600">이 Run에 테스트 케이스가 포함되어 있지 않습니다.</p>
                    </div>
                  ) : (
                    filteredTestCases.map((testCase) => (
                      <div 
                        key={testCase.id} 
                        className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-all cursor-pointer ${
                          selectedTestCase?.id === testCase.id ? 'bg-indigo-50' : ''
                        }`}
                        onClick={() => setSelectedTestCase(testCase)}
                      >
                        <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 cursor-pointer"
                            checked={selectedIds.has(testCase.id)}
                            onChange={(e) => handleSelectOne(testCase.id, e.target.checked)}
                          />
                        </div>
                        <div className="col-span-1 flex items-center">
                          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded truncate max-w-full" title={testCase.id}>
                            {(testCase as any).custom_id || testCase.id.substring(0, 8)}
                          </span>
                        </div>
                        <div className="col-span-3">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1 hover:text-indigo-600">
                            {testCase.title}
                          </h3>
                          {testCase.description && (
                            <p className="text-xs text-gray-600 truncate">{testCase.description}</p>
                          )}
                        </div>
                        <div className="col-span-1 flex items-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-normal ${
                            testCase.priority === 'high' ? 'text-red-600' :
                            testCase.priority === 'medium' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            <i className="ri-flag-fill"></i>
                            {testCase.priority.toUpperCase()}
                          </span>
                        </div>
                        <div className="col-span-3 flex items-center" onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            const assigneeName = runAssignees.get(testCase.id) || '';
                            const assignedMember = assigneeName
                              ? projectMembers.find(m => (m.full_name || m.email) === assigneeName)
                              : null;
                            const isOpen = openAssigneeDropdown === testCase.id;
                            return (
                              <div className="relative w-full">
                                <div
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenAssigneeDropdown(isOpen ? null : testCase.id);
                                  }}
                                >
                                  {assigneeName ? (
                                    <>
                                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {assignedMember?.avatar_emoji ? (
                                          <span className="text-base leading-none">{assignedMember.avatar_emoji}</span>
                                        ) : (
                                          <div className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                            {assigneeName.substring(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-sm font-medium text-gray-900 truncate">{assigneeName}</span>
                                    </>
                                  ) : (
                                    <span className="text-sm text-gray-400">—</span>
                                  )}
                                </div>
                                {isOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={(e) => { e.stopPropagation(); setOpenAssigneeDropdown(null); }}
                                    />
                                    <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg z-20 overflow-hidden py-1">
                                      <button
                                        className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); handleAssigneeChange(testCase.id, ''); setOpenAssigneeDropdown(null); }}
                                      >
                                        — Unassigned —
                                      </button>
                                      {projectMembers.map((member) => {
                                        const name = member.full_name || member.email;
                                        return (
                                          <button
                                            key={member.id}
                                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                                            onClick={(e) => { e.stopPropagation(); handleAssigneeChange(testCase.id, name); setOpenAssigneeDropdown(null); }}
                                          >
                                            {member.avatar_emoji ? (
                                              <span className="text-base leading-none">{member.avatar_emoji}</span>
                                            ) : (
                                              <div className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                                {name.substring(0, 2).toUpperCase()}
                                              </div>
                                            )}
                                            <span className="truncate">{name}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="col-span-3 flex items-center">
                          <StatusBadge status={testCase.runStatus as TestStatus} size="sm" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 우측 상세 패널 */}
          {selectedTestCase && (
            <div className="w-[576px] bg-white border-l border-gray-200 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 border-b border-gray-200">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Details</h2>
                    <div className="flex items-center gap-3">
                      <select
                        value={selectedTestCase.runStatus}
                        onChange={(e) => handleStatusChange(selectedTestCase.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${getStatusColor(selectedTestCase.runStatus)}`}
                      >
                        <option value="untested">Untested</option>
                        <option value="passed">Passed</option>
                        <option value="failed">Failed</option>
                        <option value="blocked">Blocked</option>
                        <option value="retest">Retest</option>
                      </select>
                      <button
                        onClick={() => setSelectedTestCase(null)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                      >
                        <i className="ri-close-line text-xl"></i>
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mb-6">
                    <button 
                      onClick={handleAddResult}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap"
                    >
                      Add result
                    </button>
                    <button 
                      onClick={handlePassAndNext}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap"
                    >
                      Pass & Next
                    </button>
                    <button
                      onClick={handlePreviousTestCase}
                      disabled={filteredTestCases.findIndex(tc => tc.id === selectedTestCase.id) === 0}
                      className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="ri-arrow-left-s-line text-xl w-5 h-5 flex items-center justify-center"></i>
                    </button>
                    <button
                      onClick={handleNextTestCase}
                      disabled={filteredTestCases.findIndex(tc => tc.id === selectedTestCase.id) === filteredTestCases.length - 1}
                      className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="ri-arrow-right-s-line text-xl w-5 h-5 flex items-center justify-center"></i>
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        {selectedTestCase.is_automated && (
                          <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                            <i className="ri-robot-line text-purple-600 text-lg"></i>
                          </div>
                        )}
                        <h3 className="text-lg font-bold text-gray-900">{selectedTestCase.title}</h3>
                      </div>
                      {selectedTestCase.description && (
                        <p className="text-sm text-gray-600">{selectedTestCase.description}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-500 uppercase mb-2">Priority</label>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                            selectedTestCase.priority
                          )}`}
                        >
                          {selectedTestCase.priority.toUpperCase()}
                        </span>
                      </div>

                      {selectedTestCase.folder && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-500 uppercase mb-2">Folder</label>
                          <p className="text-sm text-gray-900">{selectedTestCase.folder}</p>
                        </div>
                      )}

                      {selectedTestCase.tags && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-500 uppercase mb-2">Tags</label>
                          <div className="flex flex-wrap gap-2">
                            {selectedTestCase.tags.split(',').map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Assignee</label>
                        {(() => {
                          const assigneeName = runAssignees.get(selectedTestCase.id) || '';
                          const assignedMember = assigneeName
                            ? projectMembers.find(m => (m.full_name || m.email) === assigneeName)
                            : null;
                          return (
                            <div className="relative">
                              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white">
                                {assigneeName ? (
                                  <>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-100">
                                      {assignedMember?.avatar_emoji ? (
                                        <span className="text-base leading-none">{assignedMember.avatar_emoji}</span>
                                      ) : (
                                        <div className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                          {assigneeName.substring(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 flex-1">{assigneeName}</span>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-400 flex-1">— Unassigned —</span>
                                )}
                                <i className="ri-arrow-down-s-line text-gray-400 flex-shrink-0"></i>
                                <select
                                  value={assigneeName}
                                  onChange={(e) => handleAssigneeChange(selectedTestCase.id, e.target.value)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                  <option value="">— Unassigned —</option>
                                  {projectMembers.map((member) => (
                                    <option key={member.id} value={member.full_name || member.email}>
                                      {member.avatar_emoji ? `${member.avatar_emoji} ` : ''}{member.full_name || member.email}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Created</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedTestCase.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {selectedTestCase.steps && selectedTestCase.expected_result && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-500 uppercase mb-2">Test Steps</label>
                        <div className="space-y-2">
                          {selectedTestCase.steps.split('\n').filter(s => s.trim()).map((step, index) => {
                            const stepContent = step.replace(/^\d+\.\s*/, '');
                            const isHtml = /<[^>]+>/.test(stepContent);
                            const expectedResults = selectedTestCase.expected_result?.split('\n').filter(s => s.trim()) || [];
                            const expectedResult = expectedResults[index] || '';
                            const expectedContent = expectedResult.replace(/^\d+\.\s*/, '');
                            const expectedIsHtml = /<[^>]+>/.test(expectedContent);
                            return (
                              <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                                <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-indigo-700 text-xs font-bold">{index + 1}</span>
                                </div>
                                {isHtml ? (
                                  <div
                                    className="text-sm text-gray-700 mb-2 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-1 [&_img]:cursor-pointer [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                                    dangerouslySetInnerHTML={{ __html: stepContent }}
                                    onClick={(e) => {
                                      const target = e.target as HTMLElement;
                                      if (target.tagName === 'IMG') {
                                        const img = target as HTMLImageElement;
                                        setPreviewImage({ url: img.src, name: img.alt || 'image' });
                                      }
                                    }}
                                  />
                                ) : (
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{stepContent}</p>
                                )}
                                {expectedContent && (
                                  <div className="bg-gray-50 rounded p-2 mb-2">
                                    <p className="text-xs text-gray-600 mb-1 font-semibold">Expected Result:</p>
                                    {expectedIsHtml ? (
                                      <div
                                        className="text-xs text-gray-700 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-1 [&_img]:cursor-pointer [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                                        dangerouslySetInnerHTML={{ __html: expectedContent }}
                                      />
                                    ) : (
                                      <p className="text-xs text-gray-700 whitespace-pre-wrap">{expectedContent}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {selectedTestCase.expected_result && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-500 uppercase mb-2">Expected Result</label>
                        <div className="space-y-2">
                          {selectedTestCase.expected_result.split('\n').filter((s: string) => s.trim()).map((result, index) => {
                            const content = result.replace(/^\d+\.\s*/, '');
                            const isHtml = /<[^>]+>/.test(content);
                            return (
                              <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                                <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-green-700 text-xs font-bold">{index + 1}</span>
                                </div>
                                {isHtml ? (
                                  <div
                                    className="text-sm text-gray-700 flex-1 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-1 [&_img]:cursor-pointer [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                                    dangerouslySetInnerHTML={{ __html: content }}
                                    onClick={(e) => {
                                      const target = e.target as HTMLElement;
                                      if (target.tagName === 'IMG') {
                                        const img = target as HTMLImageElement;
                                        setPreviewImage({ url: img.src, name: img.alt || 'image' });
                                      }
                                    }}
                                  />
                                ) : (
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">{content}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {selectedTestCase.attachments && selectedTestCase.attachments.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-500 uppercase mb-2">Attachments</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                            <input
                              type="file"
                              multiple
                              onChange={handleFileUpload}
                              className="hidden"
                              id="result-file-upload"
                              disabled={uploadingFile}
                            />
                            <label
                              htmlFor="result-file-upload"
                              className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
                              uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            >
                              <i className="ri-file-line"></i>
                              Choose files
                            </label>
                            <span>or</span>
                            <button
                              onClick={handleScreenshot}
                              disabled={uploadingFile}
                              className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
                              uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            >
                              <i className="ri-screenshot-line"></i>
                              screenshot
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">or drag/paste here</p>
                        </div>
                        
                        {uploadingFile && (
                          <div className="mt-3 text-center">
                            <i className="ri-loader-4-line animate-spin text-indigo-500 text-xl"></i>
                            <p className="text-sm text-gray-600 mt-1">업로드 중...</p>
                          </div>
                        )}

                        {resultFormData.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {resultFormData.attachments.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <i className="ri-file-line text-gray-400"></i>
                                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                  <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(index)}
                                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 탭 메뉴 */}
                <div className="border-b border-gray-200">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('comments')}
                      className={`flex-1 px-4 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'comments'
                          ? 'text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Comments
                    </button>
                    <button
                      onClick={() => setActiveTab('results')}
                      className={`flex-1 px-4 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'results'
                          ? 'text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Results
                    </button>
                    <button
                      onClick={() => setActiveTab('issues')}
                      className={`flex-1 px-4 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'issues'
                          ? 'text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Issues
                    </button>
                  </div>
                </div>

                {/* 탭 콘텐츠 */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'comments' && (
                    <div className="space-y-4">
                      <div>
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                        ></textarea>
                        <button 
                          onClick={handlePostComment}
                          disabled={!commentText.trim() || !currentUser}
                          className="mt-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Post Comment
                        </button>
                      </div>
                      <div className="space-y-3">
                        {loadingComments ? (
                          <div className="text-center py-8">
                            <i className="ri-loader-4-line animate-spin text-2xl text-gray-400 mb-2"></i>
                            <p className="text-sm text-gray-500">Loading comments...</p>
                          </div>
                        ) : comments.length === 0 ? (
                          <div className="text-center py-8">
                            <i className="ri-chat-3-line text-3xl text-gray-300 mb-2"></i>
                            <p className="text-sm text-gray-500">No comments yet</p>
                          </div>
                        ) : (
                          comments.map((comment) => (
                            <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4 group relative">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                  <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                                    전용
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-gray-900">{comment.author}</span>
                                    <span className="text-xs text-gray-500">
                                      {comment.timestamp.toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{comment.text}</p>
                                </div>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'results' && (
                    <div className="space-y-3">
                      {testResults.length === 0 ? (
                        <div className="text-center py-8">
                          <i className="ri-file-list-line text-3xl text-gray-300 mb-2"></i>
                          <p className="text-sm text-gray-500">No test results yet</p>
                        </div>
                      ) : (
                        testResults.map((result) => {
                          // CI/CD 자동화 여부 판단 (author가 GitHub Actions, GitLab CI 등인 경우)
                          const isAutomated = result.author && (
                            result.author.includes('GitHub Actions') ||
                            result.author.includes('GitLab CI') ||
                            result.author.includes('Jenkins') ||
                            result.author.includes('CI/CD') ||
                            result.is_automated
                          );

                          return (
                            <div 
                              key={result.id}
                              className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all cursor-pointer"
                              onClick={() => setSelectedResult(result)}
                            >
                              <div className="flex items-center gap-3">
                                {isAutomated ? (
                                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <i className="ri-robot-line text-purple-600 text-xl"></i>
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                    {result.author ? result.author.substring(0, 2).toUpperCase() : 'NA'}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-sm font-semibold capitalize ${
                                      result.status === 'passed' ? 'text-green-700' :
                                      result.status === 'failed' ? 'text-red-700' :
                                      result.status === 'blocked' ? 'text-orange-700' :
                                      result.status === 'retest' ? 'text-yellow-700' :
                                      'text-gray-700'
                                    }`}>
                                      {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                                    </span>
                                    {isAutomated && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                        <i className="ri-robot-line"></i>
                                        CI/CD
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <i className="ri-time-line text-lg"></i>
                                    <span className="text-sm text-gray-700">{result.elapsed}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {activeTab === 'issues' && (
                    <div className="space-y-3">
                      {/* Add Issue Button */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Linked Issues</h3>
                        <button
                          onClick={() => {
                            if (!isProfessionalOrHigher) {
                              setShowUpgradeModal(true);
                              return;
                            }
                            if (!jiraSettings || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.api_token) {
                              if (confirm('Jira 설정이 필요합니다. Settings 페이지로 이동하시겠습니까?')) {
                                navigate('/settings');
                              }
                              return;
                            }
                            setShowAddIssueModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                        >
                          <i className="ri-add-line"></i>
                          Add Issue
                        </button>
                      </div>

                      {!isProfessionalOrHigher && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <i className="ri-lock-line text-indigo-600 text-xl"></i>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">Jira 이슈 생성은 Professional 이상 요금제에서 사용 가능합니다</h4>
                              <p className="text-sm text-gray-600 mb-3">
                                테스트 결과에서 바로 Jira 이슈를 생성하고 관리하세요.
                              </p>
                              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all cursor-pointer whitespace-nowrap">
                                <i className="ri-arrow-up-circle-line mr-2"></i>
                                업그레이드 문의
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {(() => {
                        // Collect all unique issues from test results
                        const allIssues = testResults
                          .filter(r => r.issues && r.issues.length > 0)
                          .flatMap(r => (r.issues || []).map(issueKey => ({
                            issueKey,
                            runName: r.run?.name || run?.name || 'Unknown Run',
                            runId: r.run?.id || runId,
                            status: r.status,
                            createdAt: r.timestamp,
                          })));
                        
                        // Remove duplicates by issue key
                        const uniqueIssuesMap = new Map();
                        allIssues.forEach(issue => {
                          if (!uniqueIssuesMap.has(issue.issueKey)) {
                            uniqueIssuesMap.set(issue.issueKey, issue);
                          }
                        });
                        const uniqueIssues = Array.from(uniqueIssuesMap.values());

                        if (uniqueIssues.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <i className="ri-bug-line text-3xl text-gray-300 mb-2"></i>
                              <p className="text-sm text-gray-500">No issues linked</p>
                            </div>
                          );
                        }

                        return uniqueIssues.map((issue, idx) => {
                          // Jira URL 생성
                          const issueUrl = jiraDomain && issue.issueKey
                            ? `https://${jiraDomain}/browse/${issue.issueKey}`
                            : '';

                          const CardContent = (
                            <>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <i className="ri-bug-line text-red-600"></i>
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {issue.issueKey}
                                  </div>
                                  <p className="text-sm text-gray-700 mt-1">{issue.summary}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    From run: <span className="font-medium text-gray-700">{issue.runName}</span>
                                  </p>
                                </div>
                              </div>
                            </>
                          );

                          if (issueUrl) {
                            return (
                              <a
                                key={idx}
                                href={issueUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-white border border-gray-200 rounded-lg p-4 transition-all hover:border-indigo-500 hover:shadow-md cursor-pointer"
                              >
                                {CardContent}
                              </a>
                            );
                          }

                          return (
                            <div
                              key={idx}
                              className="bg-white border border-gray-200 rounded-lg p-4"
                            >
                              {CardContent}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Modal */}
          {showUpgradeModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-vip-crown-line text-yellow-500 text-3xl"></i>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Starter 플랜 이상 필요</h2>
                  <p className="text-gray-600 text-sm mb-6">
                    Jira 이슈 생성 기능은 <strong>Starter 플랜</strong> 이상에서 사용할 수 있습니다.<br />
                    업그레이드하면 테스트 결과에서 바로 Jira 이슈를 생성하고 관리할 수 있습니다.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">Starter 플랜 혜택</p>
                    <ul className="space-y-1.5">
                      {['프로젝트 10개까지', '팀 멤버 8명까지', 'Jira Integration', '기본 리포팅', 'Testcase Export/Import'].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-yellow-700">
                          <i className="ri-check-line text-yellow-500"></i>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer whitespace-nowrap"
                    >
                      닫기
                    </button>
                    <button
                      onClick={() => {
                        setShowUpgradeModal(false);
                        navigate('/settings');
                      }}
                      className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
                    >
                      플랜 업그레이드
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Result Modal */}
          {showAddResultModal && selectedTestCase && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Add result</h2>
                  <button
                    onClick={() => {
                      setShowAddResultModal(false);
                      setIsTimerRunning(false);
                      setTimerStartTime(null);
                      setElapsedSeconds(0);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
                  <div className="space-y-6">
                    {/* Status */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { value: 'passed', label: 'Passed', icon: 'ri-checkbox-circle-fill', color: 'bg-green-100 text-green-700 border-green-300', iconColor: 'text-green-600' },
                          { value: 'failed', label: 'Failed', icon: 'ri-close-circle-fill', color: 'bg-red-100 text-red-700 border-red-300', iconColor: 'text-red-600' },
                          { value: 'blocked', label: 'Blocked', icon: 'ri-forbid-fill', color: 'bg-gray-100 text-gray-700 border-gray-300', iconColor: 'text-gray-600' },
                          { value: 'retest', label: 'Retest', icon: 'ri-refresh-line', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', iconColor: 'text-yellow-600' },
                          { value: 'untested', label: 'Untested', icon: 'ri-question-fill', color: 'bg-gray-100 text-gray-500 border-gray-300', iconColor: 'text-gray-500' },
                        ].map((status) => (
                          <button
                            key={status.value}
                            type="button"
                            onClick={() => setResultFormData({ ...resultFormData, status: status.value as 'passed' | 'failed' | 'blocked' | 'retest' | 'untested' })}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              resultFormData.status === status.value
                                ? `${status.color} border-current`
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <i className={`${status.icon} text-2xl ${resultFormData.status === status.value ? status.iconColor : 'text-gray-400'}`}></i>
                            <span className="text-xs font-semibold">{status.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Note</label>
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex items-center gap-2">
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-paragraph text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-bold text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-italic text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-underline text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-strikethrough text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-code-line text-sm"></i>
                          </button>
                          <div className="w-px h-5 bg-gray-300"></div>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-link text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-list-unordered text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-list-ordered text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer ml-auto">
                            <i className="ri-more-2-fill text-sm"></i>
                          </button>
                        </div>
                        <textarea
                          value={resultFormData.note}
                          onChange={(e) => setResultFormData({ ...resultFormData, note: e.target.value })}
                          placeholder=""
                          rows={4}
                          className="w-full px-3 py-2 focus:outline-none text-sm resize-none"
                        ></textarea>
                      </div>
                    </div>

                    {/* Steps */}
                    {selectedTestCase.steps && selectedTestCase.expected_result && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Steps</label>
                        <div className="space-y-3">
                          {selectedTestCase.steps.split('\n').filter(s => s.trim()).map((step, index) => {
                            const expectedResults = selectedTestCase.expected_result?.split('\n').filter(s => s.trim()) || [];
                            const expectedResult = expectedResults[index] || '';
                            const stepContent = step.replace(/^\d+\.\s*/, '');
                            const isHtml = /<[^>]+>/.test(stepContent);
                            const expectedContent = expectedResult.replace(/^\d+\.\s*/, '');
                            const expectedIsHtml = /<[^>]+>/.test(expectedContent);
                            return (
                              <div key={index} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-start gap-3 mb-2">
                                  <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-indigo-700 text-xs font-bold">{index + 1}</span>
                                  </div>
                                  {isHtml ? (
                                    <div
                                      className="text-sm text-gray-700 mb-2 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-1 [&_img]:cursor-pointer [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                                      dangerouslySetInnerHTML={{ __html: stepContent }}
                                    />
                                  ) : (
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{stepContent}</p>
                                  )}
                                  {expectedContent && (
                                    <div className="bg-gray-50 rounded p-2 mb-2">
                                      <p className="text-xs text-gray-600 mb-1 font-semibold">Expected Result:</p>
                                      {expectedIsHtml ? (
                                        <div
                                          className="text-xs text-gray-700 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-1 [&_img]:cursor-pointer [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                                          dangerouslySetInnerHTML={{ __html: expectedContent }}
                                        />
                                      ) : (
                                        <p className="text-xs text-gray-700 whitespace-pre-wrap">{expectedContent}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <select
                                  value={stepStatuses[index] || 'untested'}
                                  onChange={(e) => handleStepStatusChange(index, e.target.value)}
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="untested">Untested</option>
                                  <option value="passed">Passed</option>
                                  <option value="failed">Failed</option>
                                  <option value="blocked">Blocked</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Right Column Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Assign to */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Assign to</label>
                        <select
                          value={resultFormData.assignTo}
                          onChange={(e) => setResultFormData({ ...resultFormData, assignTo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value="">Select assignee</option>
                          {projectMembers.map((member) => (
                            <option key={member.id} value={member.user_id}>
                              {member.full_name || member.email}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Leave empty to keep current assignment.</p>
                      </div>

                      {/* Elapsed */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          Elapsed
                          <i className="ri-information-line text-gray-400 text-sm"></i>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={resultFormData.elapsed}
                            onChange={(e) => setResultFormData({ ...resultFormData, elapsed: e.target.value })}
                            placeholder="00:00"
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            readOnly={isTimerRunning}
                          />
                          <button 
                            onClick={handleToggleTimer}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all cursor-pointer"
                          >
                            <i className={`ri-${isTimerRunning ? 'pause' : 'play'}-circle-line text-lg`}></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Issues */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-700">Issues</label>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isProfessionalOrHigher) {
                              setShowUpgradeModal(true);
                              return;
                            }
                            if (!jiraSettings || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.api_token) {
                              if (confirm('Jira 설정이 필요합니다. Settings 페이지로 이동하시겠습니까?')) {
                                navigate('/settings');
                              }
                              return;
                            }
                            setShowAddIssueModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                        >
                          <i className="ri-add-line"></i>
                          Add Issue
                        </button>
                      </div>
                      <input
                        type="text"
                        value={resultFormData.issues}
                        onChange={(e) => setResultFormData({ ...resultFormData, issues: e.target.value })}
                        onKeyDown={handleIssueKeyDown}
                        placeholder="Enter issue keys (e.g., PROJ-123, PROJ-124)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Jira 이슈 키를 입력하고 Enter를 누르세요 (예: PROJ-123)</p>
                      
                      {resultFormData.issuesList.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {resultFormData.issuesList.map((issueKey) => (
                            <div
                              key={issueKey}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <i className="ri-link text-gray-400"></i>
                                <span className="text-sm text-gray-700 truncate">{issueKey}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveIssue(issueKey)}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Attachments */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Attachments</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                            id="result-file-upload"
                            disabled={uploadingFile}
                          />
                          <label
                            htmlFor="result-file-upload"
                            className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
                              uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <i className="ri-file-line"></i>
                            Choose files
                          </label>
                          <span>or</span>
                          <button
                            onClick={handleScreenshot}
                            disabled={uploadingFile}
                            className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
                              uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <i className="ri-screenshot-line"></i>
                            screenshot
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">or drag/paste here</p>
                      </div>
                      
                      {uploadingFile && (
                        <div className="mt-3 text-center">
                          <i className="ri-loader-4-line animate-spin text-indigo-500 text-xl"></i>
                          <p className="text-sm text-gray-600 mt-1">업로드 중...</p>
                        </div>
                      )}

                      {resultFormData.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {resultFormData.attachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <i className="ri-file-line text-gray-400"></i>
                                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(index)}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      setShowAddResultModal(false);
                      setIsTimerRunning(false);
                      setTimerStartTime(null);
                      setElapsedSeconds(0);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitResult}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer whitespace-nowrap"
                  >
                    Add result
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Issue Modal */}
          {showAddIssueModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Create Jira Issue</h2>
                  <button
                    onClick={() => setShowAddIssueModal(false)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
                  <div className="space-y-6">
                    {/* Summary */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Summary <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={issueFormData.summary}
                        onChange={(e) => setIssueFormData({ ...issueFormData, summary: e.target.value })}
                        placeholder="Brief description of the issue"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={issueFormData.description}
                        onChange={(e) => setIssueFormData({ ...issueFormData, description: e.target.value })}
                        placeholder="Detailed description of the issue"
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                      ></textarea>
                    </div>

                    {/* Issue Type and Priority */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Type</label>
                        <select
                          value={issueFormData.issueType}
                          onChange={(e) => setIssueFormData({ ...issueFormData, issueType: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                        >
                          <option value="Bug">Bug</option>
                          <option value="Task">Task</option>
                          <option value="Story">Story</option>
                          <option value="Epic">Epic</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                        <select
                          value={issueFormData.priority}
                          onChange={(e) => setIssueFormData({ ...issueFormData, priority: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                        >
                          <option value="Highest">Highest</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                          <option value="Lowest">Lowest</option>
                        </select>
                      </div>
                    </div>

                    {/* Labels */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Labels</label>
                      <input
                        type="text"
                        value={issueFormData.labels}
                        onChange={(e) => setIssueFormData({ ...issueFormData, labels: e.target.value })}
                        placeholder="Enter labels separated by commas (e.g., bug, ui, critical)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">쉼표로 구분하여 여러 라벨을 입력하세요</p>
                    </div>

                    {/* Assignee */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Assignee</label>
                      <input
                        type="text"
                        value={issueFormData.assignee}
                        onChange={(e) => setIssueFormData({ ...issueFormData, assignee: e.target.value })}
                        placeholder="Jira 계정 ID 또는 이메일 (예: user@example.com)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">비워두면 자동 할당됩니다</p>
                    </div>

                    {/* Components */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Components</label>
                      <input
                        type="text"
                        value={issueFormData.components}
                        onChange={(e) => setIssueFormData({ ...issueFormData, components: e.target.value })}
                        placeholder="컴포넌트 이름을 쉼표로 구분 (예: Frontend, API, Database)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Jira 프로젝트에 등록된 컴포넌트 이름을 입력하세요</p>
                    </div>

                    {/* Test Case Info */}
                    {selectedTestCase && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Related Test Case</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-900 font-normal">{selectedTestCase.title}</p>
                          {selectedTestCase.description && (
                            <p className="text-xs text-gray-600 mt-1">{selectedTestCase.description}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowAddIssueModal(false)}
                    disabled={creatingIssue}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateJiraIssue(activeTab === 'issues')}
                    disabled={creatingIssue || !issueFormData.summary.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creatingIssue ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="ri-add-line"></i>
                        Create Issue
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedResult && (
            <ResultDetailModal
              result={selectedResult}
              testCase={selectedTestCase}
              jiraDomain={jiraDomain}
              onClose={() => setSelectedResult(null)}
            />
          )}

          {/* Image Preview Modal */}
          {previewImage && (
            <div 
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setPreviewImage(null)}
            >
              <div className="relative max-w-4xl max-h-[90vh] w-full">
                <button
                  onClick={() => setPreviewImage(null)}
                  className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-all cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="w-full h-full object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <p className="text-white text-center mt-4 text-sm">{previewImage.name}</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
    </>
  );
}

interface ResultDetailModalProps {
  result: TestResult;
  testCase: TestCase | null;
  jiraDomain: string;
  onClose: () => void;
}

function ResultDetailModal({ result, testCase, jiraDomain, onClose }: ResultDetailModalProps) {
  const getJiraIssueUrl = (issueKey: string) => {
    if (!jiraDomain) return '#';
    return `https://${jiraDomain}/browse/${issueKey}`;
  };

  // CI/CD 자동화 여부 판단
  const isAutomated = result.author && (
    result.author.includes('GitHub Actions') ||
    result.author.includes('GitLab CI') ||
    result.author.includes('Jenkins') ||
    result.author.includes('CI/CD') ||
    result.is_automated
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Test Result Details</h2>
            {isAutomated && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold border border-purple-200">
                <i className="ri-robot-line"></i>
                CI/CD
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            {isAutomated ? (
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <i className="ri-robot-line text-purple-600 text-xl"></i>
              </div>
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {result.author ? result.author.substring(0, 2).toUpperCase() : 'NA'}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900">{result.author || 'Unknown'}</div>
              <div className="text-sm text-gray-500">
                {result.timestamp.toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <StatusBadge status={result.status as TestStatus} />
          </div>

          {result.elapsed && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Elapsed Time</label>
              <div className="flex items-center gap-2 text-gray-900">
                <i className="ri-time-line text-lg"></i>
                <span>{result.elapsed}</span>
              </div>
            </div>
          )}

          {result.note && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Note</label>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {result.note}
              </div>
            </div>
          )}

          {result.stepStatuses && Object.keys(result.stepStatuses).length > 0 && testCase?.steps && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Step Results</label>
              <div className="space-y-2">
                {(() => {
                  const stepsArray = testCase.steps.split('\n').filter((s: string) => s.trim());
                  return stepsArray.map((step: string, index: number) => {
                    const status = result.stepStatuses?.[index] || 'untested';
                    const statusInfo = getStepStatusInfo(status);
                    
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-semibold text-xs flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm text-gray-700">Step {index + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className={`${statusInfo.icon} ${statusInfo.color}`}></i>
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.bgColor}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {result.attachments.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Attachments ({result.attachments.length})
              </label>
              <div className="grid grid-cols-3 gap-3">
                {result.attachments.map((attachment, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img 
                      src={attachment} 
                      alt={`Attachment ${idx + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.issues && result.issues.length > 0 && (
            <div className="px-6 pb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Linked Issues</h4>
              <div className="flex flex-wrap gap-2">
                {result.issues.map((issueKey, idx) => (
                  <a
                    key={idx}
                    href={getJiraIssueUrl(issueKey)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all text-sm font-medium"
                  >
                    <i className="ri-link text-sm"></i>
                    {issueKey}
                    <i className="ri-external-link-line text-xs"></i>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg transition-all cursor-pointer whitespace-nowrap"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function getStepStatusInfo(status: string) {
  switch (status) {
    case 'passed':
      return {
        icon: 'ri-checkbox-circle-line',
        color: 'text-green-600',
        bgColor: 'bg-green-100 text-green-700',
        label: 'Passed'
      };
    case 'failed':
      return {
        icon: 'ri-close-circle-line',
        color: 'text-red-600',
        bgColor: 'bg-red-100 text-red-700',
        label: 'Failed'
      };
    case 'blocked':
      return {
        icon: 'ri-forbid-line',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100 text-gray-700',
        label: 'Blocked'
      };
    case 'untested':
      return {
        icon: 'ri-question-line',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100 text-gray-500',
        label: 'Untested'
      };
    default:
      return {
        icon: 'ri-question-line',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100 text-gray-500',
        label: 'Unknown'
      };
  }
}
