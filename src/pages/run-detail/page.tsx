import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

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
  };
}

interface ProjectMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export default function RunDetail() {
  const { projectId, runId } = useParams();
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
          .select('email, full_name')
          .eq('id', user.id)
          .maybeSingle();
        
        setCurrentUser({
          id: user.id,
          email: profile?.email || user.email || '',
          full_name: profile?.full_name || null,
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
        .select('domain')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Jira 설정 로딩 오류:', error);
        return;
      }

      if (data && data.domain) {
        setJiraDomain(data.domain);
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
            full_name
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
            name
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
        run: item.run,
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
          .in('id', runData.test_case_ids);

        if (testCasesError) throw testCasesError;

        // Fetch test results for this run
        const { data: testResultsData, error: testResultsError } = await supabase
          .from('test_results')
          .select('test_case_id, status')
          .eq('run_id', runId)
          .order('created_at', { ascending: false });

        if (testResultsError) throw testResultsError;

        // Create a map of test case ID to latest status
        const statusMap = new Map<string, string>();
        testResultsData?.forEach((result: any) => {
          if (!statusMap.has(result.test_case_id)) {
            statusMap.set(result.test_case_id, result.status);
          }
        });

        // Combine test cases with their run-specific status
        const testCasesWithStatus: TestCaseWithRunStatus[] = (testCasesData || []).map((tc: any) => ({
          ...tc,
          runStatus: statusMap.get(tc.id) || 'untested',
        }));

        setTestCases(testCasesWithStatus);
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

      // Create a new test result for this run
      const { data, error } = await supabase
        .from('test_results')
        .insert({
          test_case_id: testCaseId,
          run_id: runId,
          status: newStatus,
          author: currentUser.full_name || currentUser.email,
          note: `Status changed to ${newStatus}`,
          elapsed: '00:00',
          attachments: [],
          step_statuses: {},
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const updatedTestCases = testCases.map(tc => 
        tc.id === testCaseId ? { ...tc, runStatus: newStatus as any } : tc
      );
      setTestCases(updatedTestCases);
      
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
          note: 'Passed via Pass & Next button',
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
    if (e.key === 'Enter' && resultFormData.issues.trim()) {
      e.preventDefault();
      const issueKey = resultFormData.issues.trim().toUpperCase();
      
      // Validate issue key format (e.g., PROJ-123)
      const issueKeyPattern = /^[A-Z]+-\d+$/;
      if (!issueKeyPattern.test(issueKey)) {
        alert('올바른 Jira 이슈 키 형식이 아닙니다 (예: PROJ-123)');
        return;
      }
      
      // Check if already exists
      if (resultFormData.issuesList.includes(issueKey)) {
        alert('이미 추가된 이슈 키입니다');
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
          issues: resultFormData.issuesList,
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
    
    return matchesSearch && matchesStatus && matchesPriority;
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
              <p className="text-gray-600">로딩 중...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
                        // Log out 로직 추가 가능
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
        
        <main className="flex-1 overflow-hidden bg-gray-50/30 flex">
          <div className={`${selectedTestCase ? 'flex-1' : 'w-full'} overflow-y-auto`}>
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{run?.name}</h1>
                    <p className="text-gray-600">{run?.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                      run?.status === 'completed' ? 'bg-green-100 text-green-700' :
                      run?.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      run?.status === 'under_review' ? 'bg-purple-100 text-purple-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      <i className={`${
                      run?.status === 'completed' ? 'ri-checkbox-circle-fill' :
                      run?.status === 'in_progress' ? 'ri-loader-4-line animate-spin' :
                      run?.status === 'under_review' ? 'ri-eye-line' :
                      'ri-time-fill'
                    } text-lg`}></i>
                      {run?.status === 'completed' ? 'Completed' :
                       run?.status === 'in_progress' ? 'In Progress' :
                       run?.status === 'under_review' ? 'Under Review' :
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      />
                    </div>
                    
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                    </select>

                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer"
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
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="w-4 h-4 text-teal-600 cursor-pointer" />
                    </div>
                    <div className="col-span-6">
                      <span className="text-xs font-semibold text-gray-600 uppercase">Test Case</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-semibold text-gray-600 uppercase">Priority</span>
                    </div>
                    <div className="col-span-3">
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
                          selectedTestCase?.id === testCase.id ? 'bg-teal-50' : ''
                        }`}
                        onClick={() => setSelectedTestCase(testCase)}
                      >
                        <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="w-4 h-4 text-teal-600 cursor-pointer" />
                        </div>
                        <div className="col-span-6">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1 hover:text-teal-600">
                            {testCase.title}
                          </h3>
                          {testCase.description && (
                            <p className="text-xs text-gray-600">{testCase.description}</p>
                          )}
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            testCase.priority === 'high' ? 'text-red-600' :
                            testCase.priority === 'medium' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            <i className="ri-flag-fill"></i>
                            {testCase.priority.toUpperCase()}
                          </span>
                        </div>
                        <div className="col-span-3 flex items-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${getStatusColor(testCase.runStatus)}`}>
                            <i className={`${getStatusIcon(testCase.runStatus)}`}></i>
                            {getStatusText(testCase.runStatus)}
                          </span>
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
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Details</h2>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedTestCase.runStatus}
                      onChange={(e) => handleStatusChange(selectedTestCase.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${getStatusColor(selectedTestCase.runStatus)}`}
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
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Priority</label>
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
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Folder</label>
                        <p className="text-sm text-gray-900">{selectedTestCase.folder}</p>
                      </div>
                    )}

                    {selectedTestCase.tags && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Tags</label>
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

                    {selectedTestCase.assignee && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Assignee</label>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {selectedTestCase.assignee.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-900">{selectedTestCase.assignee}</span>
                        </div>
                      </div>
                    )}

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

                  {selectedTestCase.steps && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Test Steps</label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTestCase.steps}</p>
                      </div>
                    </div>
                  )}

                  {selectedTestCase.expected_result && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Expected Result</label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTestCase.expected_result}</p>
                      </div>
                    </div>
                  )}

                  {selectedTestCase.attachments && selectedTestCase.attachments.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Attachments</label>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedTestCase.attachments.map((file, index) => (
                          <div
                            key={index}
                            className="aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-teal-500 hover:shadow-md transition-all"
                            onClick={() => setPreviewImage({ url: file.url, name: file.name })}
                          >
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
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
                        ? 'text-teal-600 border-b-2 border-teal-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Comments
                  </button>
                  <button
                    onClick={() => setActiveTab('results')}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'results'
                        ? 'text-teal-600 border-b-2 border-teal-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Results
                  </button>
                  <button
                    onClick={() => setActiveTab('issues')}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'issues'
                        ? 'text-teal-600 border-b-2 border-teal-600'
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                      ></textarea>
                      <button 
                        onClick={handlePostComment}
                        disabled={!commentText.trim() || !currentUser}
                        className="mt-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
                                <span className="inline-flex items-center px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-semibold">
                                  전용
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
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
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex-shrink-0"
                              >
                                <i className="ri-delete-bin-line text-sm"></i>
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
                      testResults.map((result) => (
                        <div 
                          key={result.id}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all cursor-pointer"
                          onClick={() => setSelectedResult(result)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                result.status === 'passed' ? 'bg-green-100' :
                                result.status === 'failed' ? 'bg-red-100' :
                                result.status === 'blocked' ? 'bg-orange-100' :
                                result.status === 'retest' ? 'bg-yellow-100' :
                                'bg-gray-100'
                              }`}>
                                <i className={`text-sm ${
                                  result.status === 'passed' ? 'ri-checkbox-circle-fill text-green-600' :
                                  result.status === 'failed' ? 'ri-close-circle-fill text-red-600' :
                                  result.status === 'blocked' ? 'ri-forbid-fill text-orange-600' :
                                  result.status === 'retest' ? 'ri-refresh-line text-yellow-600' :
                                  'ri-question-fill text-gray-600'
                                }`}></i>
                              </div>
                              <span className={`text-sm font-semibold capitalize ${
                                result.status === 'passed' ? 'text-green-700' :
                                result.status === 'failed' ? 'text-red-700' :
                                result.status === 'blocked' ? 'text-orange-700' :
                                result.status === 'retest' ? 'text-yellow-700' :
                                'text-gray-700'
                              }`}>
                                {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                              </span>
                            </div>
                            {result.elapsed && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <i className="ri-time-line"></i>
                                {result.elapsed}
                              </span>
                            )}
                          </div>
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">Run</p>
                            <p className="text-sm text-gray-900 font-medium">{result.run?.name || run?.name || 'Unknown Run'}</p>
                          </div>
                          {result.author && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-500 mb-1">Executed by</p>
                              <p className="text-sm text-gray-700">{result.author}</p>
                            </div>
                          )}
                          {result.note && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-500 mb-1">Note</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.note}</p>
                            </div>
                          )}
                          {result.issues && result.issues.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-500 mb-1">Linked Issues</p>
                              <div className="flex flex-wrap gap-1">
                                {result.issues.map((issueKey, idx) => (
                                  <a
                                    key={idx}
                                    href={getJiraIssueUrl(issueKey)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-all"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <i className="ri-bug-line mr-1"></i>
                                    {issueKey}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {result.timestamp.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'issues' && (
                  <div className="space-y-3">
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
                            <div className="flex items-start gap-3">
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
                              className="block bg-white border rounded-lg p-4 transition-all hover:border-teal-500 hover:shadow-md cursor-pointer"
                            >
                              {CardContent}
                            </a>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className="bg-white border rounded-lg p-4"
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
                            
                            return (
                              <div key={index} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-start gap-3 mb-2">
                                  <div className="w-6 h-6 bg-teal-100 rounded-lg flex items-center justify-center">
                                    <i className="ri-flag-fill text-teal-700"></i>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-700 mb-2">{step.replace(/^\d+\.\s*/, '')}</p>
                                    {expectedResult && (
                                      <div className="bg-gray-50 rounded p-2 mb-2">
                                        <p className="text-xs text-gray-600 mb-1 font-semibold">Expected Result:</p>
                                        <p className="text-xs text-gray-700">{expectedResult.replace(/^\d+\.\s*/, '')}</p>
                                      </div>
                                    )}
                                    <select
                                      value={stepStatuses[index] || 'untested'}
                                      onChange={(e) => handleStepStatusChange(index, e.target.value)}
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                      <option value="untested">Untested</option>
                                      <option value="passed">Passed</option>
                                      <option value="failed">Failed</option>
                                      <option value="blocked">Blocked</option>
                                    </select>
                                  </div>
                                </div>
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
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
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                            readOnly={isTimerRunning}
                          />
                          <button 
                            onClick={handleToggleTimer}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all cursor-pointer"
                          >
                            <i className={`${isTimerRunning ? 'ri-pause-circle-line' : 'ri-play-circle-line'} text-lg`}></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Issues */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Issues</label>
                      <input
                        type="text"
                        value={resultFormData.issues}
                        onChange={(e) => setResultFormData({ ...resultFormData, issues: e.target.value })}
                        onKeyDown={handleIssueKeyDown}
                        placeholder="Enter issue keys (e.g., PROJ-123, PROJ-124)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
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
                          <i className="ri-loader-4-line animate-spin text-teal-500 text-xl"></i>
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
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium cursor-pointer whitespace-nowrap"
                  >
                    Add result
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Test Result Details</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {result.author ? result.author.substring(0, 2).toUpperCase() : 'NA'}
            </div>
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
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              result.status === 'passed' ? 'bg-green-100 text-green-700' :
              result.status === 'failed' ? 'bg-red-100 text-red-700' :
              result.status === 'blocked' ? 'bg-gray-100 text-gray-700' :
              result.status === 'retest' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              <i className={`text-lg ${
                result.status === 'passed' ? 'ri-checkbox-circle-line text-green-600' :
                result.status === 'failed' ? 'ri-close-circle-line text-red-600' :
                result.status === 'blocked' ? 'ri-forbid-line text-orange-600' :
                result.status === 'retest' ? 'ri-refresh-line text-yellow-600' :
                'ri-question-line text-gray-500'
              }`}></i>
              {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
            </div>
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
                        <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-semibold text-xs flex-shrink-0">
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
            className="px-4 py-2 bg-teal-500 text-white hover:bg-teal-600 rounded-lg transition-all cursor-pointer whitespace-nowrap"
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
