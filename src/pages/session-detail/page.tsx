import { useState, useEffect, useRef } from 'react';
import PageLoader from '../../components/PageLoader';
import { useToast } from '../../components/Toast';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import QuillEditor from './components/QuillEditor';
import EditSessionModal from './components/EditSessionModal';
import CropOverlay from './components/CropOverlay';

interface Session {
  id: string;
  name: string;
  mission: string;
  status: string;
  milestone_id: string;
  assigned_to: string;
  assignees: string[];
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

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface ProjectMember {
  user_id: string;
  full_name: string;
  email: string;
}

interface JiraSettings {
  domain: string;
  email: string;
  api_token: string;
  project_key: string;
  issue_type: string;
}

export default function SessionDetail() {
  const { projectId, sessionId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [milestone, setMilestone] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assigneeProfiles, setAssigneeProfiles] = useState<Profile[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  // 실시간 타이머
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // pause된 시점의 누적 경과 ms
  const pausedElapsedRef = useRef<number>(0);

  // Form state
  const [logType, setLogType] = useState<'note' | 'passed' | 'failed' | 'blocked'>('passed');
  const [logContent, setLogContent] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showIssuesDropdown, setShowIssuesDropdown] = useState(false);
  const [showLinkIssueModal, setShowLinkIssueModal] = useState(false);
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [issueInput, setIssueInput] = useState('');
  const [linkedIssues, setLinkedIssues] = useState<string[]>([]);
  const [jiraSettings, setJiraSettings] = useState<JiraSettings | null>(null);
  const [jiraDomain, setJiraDomain] = useState<string>('');
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [issueFormData, setIssueFormData] = useState({
    summary: '',
    description: '',
    issueType: 'Bug',
    priority: 'Medium',
    labels: '',
    assignee: '',
    components: '',
  });

  // Attachment state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; type: string }>>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [cropState, setCropState] = useState<{
    imageDataUrl: string;
    onCrop: (blob: Blob) => void;
  } | null>(null);

  // Log menu state
  const [openLogMenuId, setOpenLogMenuId] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<{ id: string; content: string; type: 'note' | 'passed' | 'failed' | 'blocked' } | null>(null);
  const [editLogContent, setEditLogContent] = useState('');
  const [editLogType, setEditLogType] = useState<'note' | 'passed' | 'failed' | 'blocked'>('note');
  const [showEditLogTypeDropdown, setShowEditLogTypeDropdown] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [showReopenConfirmModal, setShowReopenConfirmModal] = useState(false);

  // Entry form redesign state
  const [activeForm, setActiveForm] = useState<'note' | 'passed' | 'failed' | 'blocked' | null>(null);
  const [noteFormContent, setNoteFormContent] = useState('');
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugSeverity, setBugSeverity] = useState<'critical' | 'major' | 'minor' | 'trivial'>('major');
  const [stepAction, setStepAction] = useState('');
  const [stepExpected, setStepExpected] = useState('');
  const [stepActual, setStepActual] = useState('');
  // Timeline tooltip
  const [tooltipInfo, setTooltipInfo] = useState<{ label: string; time: string; x: number; y: number } | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchSessionData();
    fetchMilestones();
    fetchProjectMembers();
    fetchJiraSettings();
  }, [sessionId]);

  // N/B/O/T keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      switch (e.key.toLowerCase()) {
        case 'n': setActiveForm('note'); break;
        case 'b': setActiveForm('failed'); break;
        case 'o': setActiveForm('blocked'); break;
        case 't': setActiveForm('passed'); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 세션 데이터가 로드된 후 타이머 시작
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const formatMs = (ms: number) => {
      const totalSec = Math.max(0, Math.floor(ms / 1000));
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    if (!session?.started_at) {
      setElapsedTime('00:00:00');
      pausedElapsedRef.current = 0;
      return;
    }

    if (session.status === 'closed') {
      // 종료된 세션: ended_at - started_at 고정값 (paused_duration 차감)
      const start = new Date(session.started_at).getTime();
      const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
      const paused = session.paused_duration || 0;
      setElapsedTime(formatMs(end - start - paused));
      return;
    }

    // paused_at이 있으면 일시정지 상태
    if (session.paused_at) {
      const start = new Date(session.started_at).getTime();
      const pausedAt = new Date(session.paused_at).getTime();
      const paused = session.paused_duration || 0;
      const elapsed = pausedAt - start - paused;
      pausedElapsedRef.current = elapsed;
      setElapsedTime(formatMs(elapsed));
      return;
    }

    // active 상태: 실시간 증가
    const tick = () => {
      const start = new Date(session.started_at).getTime();
      const paused = session.paused_duration || 0;
      const elapsed = Date.now() - start - paused;
      setElapsedTime(formatMs(elapsed));
    };
    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [session?.started_at, session?.status, session?.ended_at, session?.paused_at, session?.paused_duration]);

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

  const fetchProjectMembers = async () => {
    try {
      const { data: membersData, error } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);
      if (error) throw error;
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map((m: any) => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        const members: ProjectMember[] = (profilesData || []).map((p: any) => ({
          user_id: p.id,
          full_name: p.full_name || p.email?.split('@')[0] || 'Unknown',
          email: p.email || '',
        }));
        setProjectMembers(members);
      }
    } catch (error) {
      console.error('Error fetching project members:', error);
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

      // Fetch assignee profiles
      const assignees: string[] = sessionData.assignees || [];
      if (assignees.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', assignees);
        if (profilesError) console.error('Error fetching assignee profiles:', profilesError);
        setAssigneeProfiles(profilesData || []);
      } else {
        setAssigneeProfiles([]);
      }

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

  const handleSaveSession = async (data: {
    name: string;
    mission: string;
    milestone_id: string | null;
    tags: string[];
    estimated_duration: number;
    assignees: string[];
  }) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          name: data.name,
          charter: data.mission,
          milestone_id: data.milestone_id,
          tags: data.tags,
          duration_minutes: data.estimated_duration,
          assignees: data.assignees,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
      if (error) throw error;
      setShowEditModal(false);
      await fetchSessionData();
    } catch (error) {
      console.error('Error saving session:', error);
      showToast('Failed to save session.', 'error');
    }
  };

  const handleAddLog = async () => {
    // Guard: block input when session is completed
    if (session.status === 'closed') return;

    let content = '';
    let type: 'note' | 'passed' | 'failed' | 'blocked';

    if (!activeForm) {
      if (!noteFormContent.trim()) return;
      type = 'note';
      content = noteFormContent;
    } else if (activeForm === 'note' || activeForm === 'blocked') {
      if (!noteFormContent.trim()) return;
      type = activeForm;
      content = noteFormContent;
    } else if (activeForm === 'failed') {
      if (!bugTitle.trim()) return;
      const descHtml = bugDesc.trim() ? `<p>${bugDesc}</p>` : '';
      content = `<div data-priority="${bugSeverity}"><strong>${bugTitle}</strong>${descHtml}</div>`;
      type = 'failed';
    } else {
      if (!stepAction.trim()) return;
      const parts: string[] = [`<strong>Step:</strong> ${stepAction}`];
      if (stepExpected.trim()) parts.push(`<strong>Expected:</strong> ${stepExpected}`);
      if (stepActual.trim()) parts.push(`<strong>Actual:</strong> ${stepActual}`);
      content = parts.join('<br/>');
      type = 'passed';
    }

    try {
      const { error } = await supabase
        .from('session_logs')
        .insert({
          session_id: sessionId,
          content,
          type,
          issues: linkedIssues.length > 0 ? linkedIssues : null,
          attachments: attachments.length > 0 ? attachments.map(a => a.url) : null,
        });

      if (error) throw error;

      setNoteFormContent('');
      setBugTitle('');
      setBugDesc('');
      setBugSeverity('major');
      setStepAction('');
      setStepExpected('');
      setStepActual('');
      setActiveForm(null);
      setLinkedIssues([]);
      setAttachments([]);
      fetchSessionData();
    } catch (error) {
      console.error('Error adding log:', error);
      showToast('Failed to add log entry.', 'error');
    }
  };

  const parseBugPriority = (content: string): string => {
    const match = content.match(/data-priority="([^"]+)"/);
    return match?.[1] || 'none';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingFiles(true);

      const uploadedFiles: Array<{ name: string; url: string; type: string }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${sessionId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('test-case-attachments')
          .upload(filePath, file);

        if (error) {
          console.error('파일 업로드 오류:', error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('test-case-attachments')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.name,
          url: publicUrl,
          type: file.type,
        });
      }

      setAttachments([...attachments, ...uploadedFiles]);
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      showToast('Failed to upload file.', 'error');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleImagePreview = (url: string) => {
    setPreviewImageUrl(url);
    setShowImagePreview(true);
  };

  const isImageFile = (type: string) => {
    return type.startsWith('image/');
  };

  const handleScreenshot = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        showToast('Screenshot capture is not supported in this browser.', 'warning');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(reject);
        };
        video.onerror = reject;
      });

      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;

      const imageDataUrl = canvas.toDataURL('image/png');

      // 영역 선택 오버레이 표시
      setCropState({
        imageDataUrl,
        onCrop: async (blob: Blob) => {
          setCropState(null);
          const fileName = `screenshot_${Date.now()}.png`;
          const filePath = `${sessionId}/${fileName}`;

          setUploadingFiles(true);
          try {
            const { error } = await supabase.storage
              .from('test-case-attachments')
              .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: false,
              });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
              .from('test-case-attachments')
              .getPublicUrl(filePath);

            setAttachments(prev => [...prev, {
              name: fileName,
              url: publicUrl,
              type: 'image/png',
            }]);
          } catch (error: any) {
            console.error('스크린샷 업로드 오류:', error);
            showToast('Failed to upload screenshot.', 'error');
          } finally {
            setUploadingFiles(false);
          }
        },
      });
    } catch (error: any) {
      if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
        return;
      }
      console.error('스크린샷 캡처 오류:', error);
      showToast('Failed to capture screenshot.', 'error');
    }
  };

  const handleIssueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;

    if ((e.key === 'Enter' || e.key === ',') && issueInput.trim()) {
      e.preventDefault();
      const issueKey = issueInput.trim().replace(/,$/, '').toUpperCase();
      if (!issueKey) return;

      if (linkedIssues.includes(issueKey)) {
        setIssueInput('');
        return;
      }

      setLinkedIssues([...linkedIssues, issueKey]);
      setIssueInput('');
    }
  };

  const handleRemoveLinkedIssue = (issueKey: string) => {
    setLinkedIssues(linkedIssues.filter(key => key !== issueKey));
  };

  const handleCreateJiraIssue = async () => {
    if (!issueFormData.summary.trim()) {
      showToast('Summary is required.', 'warning');
      return;
    }

    if (!jiraSettings) {
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
        setLinkedIssues([...linkedIssues, newIssueKey]);
        showToast(`Jira issue created: ${newIssueKey}`, 'success');
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
      } else {
        throw new Error(data.error || data.message || 'Failed to create Jira issue.');
      }
    } catch (error: any) {
      console.error('Jira 이슈 생성 오류:', error);
      showToast('Failed to create Jira issue.', 'error');
    } finally {
      setCreatingIssue(false);
    }
  };

  const getJiraIssueUrl = (issueKey: string) => {
    if (!jiraDomain) return '#';
    return `https://${jiraDomain}/browse/${issueKey}`;
  };

  const parseIssues = (issues: any): string[] => {
    if (!issues) return [];
    if (Array.isArray(issues)) return issues;
    if (typeof issues === 'string') {
      try {
        const parsed = JSON.parse(issues);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // 쉼표로 구분된 문자열인 경우
        return issues.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const handleStartSession = async () => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('sessions')
        .update({
          started_at: now,
          status: 'active',
          paused_duration: 0,
          updated_at: now,
        })
        .eq('id', sessionId);
      if (error) throw error;
      setSession((prev: any) => ({ ...prev, started_at: now, status: 'active', paused_duration: 0 }));
    } catch (error) {
      console.error('세션 시작 오류:', error);
      showToast('Failed to start session.', 'error');
    }
  };

  const handlePauseSession = async () => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('sessions')
        .update({
          paused_at: now,
          updated_at: now,
        })
        .eq('id', sessionId);
      if (error) throw error;
      setSession((prev: any) => ({ ...prev, paused_at: now }));
    } catch (error) {
      console.error('세션 일시정지 오류:', error);
      showToast('Failed to pause session.', 'error');
    }
  };

  const handleResumeSession = async () => {
    try {
      const now = new Date().toISOString();
      // paused_at ~ now 사이의 시간을 paused_duration에 누적
      const pausedAt = session.paused_at ? new Date(session.paused_at).getTime() : Date.now();
      const additionalPause = Date.now() - pausedAt;
      const newPausedDuration = (session.paused_duration || 0) + additionalPause;

      const { error } = await supabase
        .from('sessions')
        .update({
          paused_at: null,
          paused_duration: newPausedDuration,
          updated_at: now,
        })
        .eq('id', sessionId);
      if (error) throw error;
      setSession((prev: any) => ({
        ...prev,
        paused_at: null,
        paused_duration: newPausedDuration,
      }));
    } catch (error) {
      console.error('세션 재개 오류:', error);
      showToast('Failed to resume session.', 'error');
    }
  };

  const handleCloseSession = async () => {
    try {
      const now = new Date().toISOString();
      let finalPausedDuration = session.paused_duration || 0;

      // paused 상태에서 close하는 경우 pause 시간도 누적
      if (session.paused_at) {
        const pausedAt = new Date(session.paused_at).getTime();
        finalPausedDuration += Date.now() - pausedAt;
      }

      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'closed',
          ended_at: now,
          paused_at: null,
          paused_duration: finalPausedDuration,
          updated_at: now,
        })
        .eq('id', sessionId);

      if (error) throw error;

      setShowCloseConfirmModal(false);
      navigate(`/projects/${projectId}/discovery-logs`);
    } catch (error) {
      console.error('세션 종료 오류:', error);
      showToast('Failed to close session.', 'error');
    }
  };

  const handleReopenSession = async () => {
    try {
      const nowMs = Date.now();
      const now = new Date(nowMs).toISOString();

      // Accumulate dead time (completed → reopen) into paused_duration
      // so the timer resumes from where it left off at close time.
      const closedAt = session.ended_at ? new Date(session.ended_at).getTime() : nowMs;
      const deadTimeMs = nowMs - closedAt;
      const newPausedDuration = (session.paused_duration || 0) + deadTimeMs;

      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'active',
          ended_at: null,
          paused_at: null,
          paused_duration: newPausedDuration,
          updated_at: now,
        })
        .eq('id', sessionId);

      if (error) throw error;

      setSession((prev: any) => ({
        ...prev,
        status: 'active',
        ended_at: null,
        paused_at: null,
        paused_duration: newPausedDuration,
        updated_at: now,
      }));
      setShowReopenConfirmModal(false);
    } catch (error) {
      console.error('세션 재개 오류:', error);
      showToast('Failed to reopen session.', 'error');
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'passed': return 'bg-emerald-500';
      case 'failed': return 'bg-red-500';
      case 'blocked': return 'bg-amber-500';
      case 'note': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getLogTypeLabel = (type: string) =>
    type.charAt(0).toUpperCase() + type.slice(1);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const calculateElapsedTime = () => {
    return elapsedTime;
  };

  const getUserDisplayName = () => {
    if (!currentUser) return 'User';
    return currentUser.user_metadata?.full_name || 
           currentUser.user_metadata?.name || 
           currentUser.email?.split('@')[0] || 
           'User';
  };

  const getUserInitial = () => getUserDisplayName().charAt(0).toUpperCase();

  const getProfileInitial = (profile: Profile) => {
    const name = profile.full_name || profile.email || '?';
    return name.charAt(0).toUpperCase();
  };

  const getProfileDisplayName = (profile: Profile) =>
    profile.full_name || profile.email?.split('@')[0] || 'Unknown';

  const getAvatarColor = (id: string) => {
    const colors = [
      'from-violet-400 to-violet-600',
      'from-indigo-400 to-indigo-600',
      'from-green-400 to-green-600',
      'from-violet-500 to-indigo-600',
      'from-indigo-400 to-violet-600',
      'from-green-400 to-indigo-600',
    ];
    return colors[id.charCodeAt(0) % colors.length];
  };

  const fetchJiraSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('jira_settings')
        .select('domain, email, api_token, issue_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Jira 설정 로딩 오류:', error);
        return;
      }

      if (data && data.domain) {
        setJiraDomain(data.domain);
        setJiraSettings({
          domain: data.domain,
          email: data.email || '',
          api_token: data.api_token || '',
          project_key: '',
          issue_type: data.issue_type || 'Bug',
        });
      }

      // Fetch project's jira_project_key
      if (projectId) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('jira_project_key')
          .eq('id', projectId)
          .maybeSingle();

        if (projectData?.jira_project_key) {
          setJiraSettings(prev => ({
            domain: prev?.domain || '',
            email: prev?.email || '',
            api_token: prev?.api_token || '',
            project_key: projectData.jira_project_key,
            issue_type: prev?.issue_type || 'Bug',
            auto_create_on_failure: prev?.auto_create_on_failure || 'disabled',
            auto_issue_summary_template: prev?.auto_issue_summary_template,
            auto_issue_description_template: prev?.auto_issue_description_template,
          }));
        }
      }
    } catch (error) {
      console.error('Jira 설정 로딩 오류:', error);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this log?')) return;
    try {
      const { error } = await supabase
        .from('session_logs')
        .delete()
        .eq('id', logId);
      if (error) throw error;
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (error) {
      console.error('로그 삭제 오류:', error);
      showToast('Failed to delete log.', 'error');
    }
  };

  const handleEditLog = (log: any) => {
    setEditingLog({ id: log.id, content: log.content, type: log.type });
    setEditLogContent(log.content);
    setEditLogType(log.type);
    setOpenLogMenuId(null);
  };

  const handleSaveEditLog = async () => {
    if (!editingLog || !editLogContent.trim()) return;
    try {
      setSavingLog(true);
      const { error } = await supabase
        .from('session_logs')
        .update({
          content: editLogContent,
          type: editLogType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingLog.id);
      if (error) throw error;
      setLogs(prev => prev.map(l =>
        l.id === editingLog.id ? { ...l, content: editLogContent, type: editLogType } : l
      ));
      setEditingLog(null);
    } catch (error) {
      console.error('로그 수정 오류:', error);
      showToast('Failed to update log.', 'error');
    } finally {
      setSavingLog(false);
    }
  };

  if (loading) return <PageLoader fullScreen />;

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Session not found</div>
      </div>
    );
  }

  const logTypeConfig: Record<string, { label: string; icon: string; color: string; border: string; bg: string }> = {
    note:    { label: 'Note',        icon: 'ri-sticky-note-line',  color: '#6366F1', border: '#6366F1', bg: '#EEF2FF' },
    failed:  { label: 'Bug',         icon: 'ri-bug-line',          color: '#DC2626', border: '#EF4444', bg: '#FEF2F2' },
    blocked: { label: 'Observation', icon: 'ri-eye-line',          color: '#D97706', border: '#F59E0B', bg: '#FFFBEB' },
    passed:  { label: 'Step',        icon: 'ri-test-tube-line',    color: '#7C3AED', border: '#7C3AED', bg: '#F5F3FF' },
  };

  const entryTypeButtons: Array<{ type: 'note' | 'passed' | 'failed' | 'blocked'; label: string; icon: string; hoverColor: string }> = [
    { type: 'note',    label: 'Note', icon: 'ri-sticky-note-line', hoverColor: '#6366F1' },
    { type: 'failed',  label: 'Bug',  icon: 'ri-bug-line',         hoverColor: '#DC2626' },
    { type: 'blocked', label: 'Obs',  icon: 'ri-eye-line',         hoverColor: '#D97706' },
    { type: 'passed',  label: 'Step', icon: 'ri-test-tube-line',   hoverColor: '#7C3AED' },
  ];

  const statusInfo = !session.started_at
    ? { label: 'Not Started', pill: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' }
    : session.status === 'closed'
    ? { label: 'Completed', pill: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
    : session.paused_at
    ? { label: 'Paused', pill: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' }
    : { label: 'In Progress', pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' };

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb Row */}
        <div className="h-[2.625rem] bg-white border-b border-slate-200 flex items-center px-5 gap-3 flex-shrink-0 text-[0.8125rem]">
          <button
            onClick={() => navigate(`/projects/${projectId}/discovery-logs`)}
            className="flex items-center gap-1 text-indigo-500 font-semibold cursor-pointer hover:text-indigo-600 transition-colors"
          >
            <i className="ri-arrow-left-s-line" />
            Back
          </button>
          <span className="text-slate-300">/</span>
          <button
            onClick={() => navigate(`/projects/${projectId}/discovery-logs`)}
            className="text-indigo-500 font-medium cursor-pointer hover:underline"
          >
            Discovery Log
          </button>
          {milestone && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500">{milestone.name}</span>
            </>
          )}
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-medium truncate max-w-[240px]">{session.name}</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-[0.3125rem] border border-slate-200 rounded-[6px] text-[0.8125rem] text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <i className="ri-edit-line text-[0.875rem]" />
              Edit
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Detail Main */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {/* Name + Mission */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex-shrink-0">
              <div className="text-[1.5rem] font-extrabold text-slate-900 leading-tight">{session.name}</div>
              {session.mission && (
                <div className="mt-3 p-3 border border-slate-200 rounded-[6px] bg-slate-50 text-[0.8125rem] text-slate-500 leading-[1.5]">
                  {session.mission}
                </div>
              )}
            </div>

            {/* Entries */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {logs.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-slate-400 py-12">
                    <i className="ri-sticky-note-2-line text-4xl mb-3 block" />
                    <p className="text-[0.8125rem]">No entries yet. Add your first note, bug, or observation.</p>
                  </div>
                </div>
              )}
              {logs.map((log) => {
                const cfg = logTypeConfig[log.type] || logTypeConfig.note;
                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-[6px] border border-slate-200"
                    style={{ borderLeft: `3px solid ${cfg.border}` }}
                  >
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <i className={`${cfg.icon} text-[0.875rem]`} style={{ color: cfg.color }} />
                        <span className="text-[0.8125rem] font-semibold text-slate-900">{cfg.label}</span>
                        <span className="text-[0.75rem] text-slate-400 ml-auto">{formatTime(log.created_at)}</span>
                        <div className="relative">
                          <button
                            onClick={() => setOpenLogMenuId(openLogMenuId === log.id ? null : log.id)}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <i className="ri-more-2-fill text-[0.8125rem]" />
                          </button>
                          {openLogMenuId === log.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenLogMenuId(null)} />
                              <div className="absolute right-0 mt-1 w-28 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                                <button onClick={() => handleEditLog(log)} className="w-full px-3 py-2 text-[0.8125rem] text-left text-slate-600 hover:bg-slate-50 flex items-center gap-2 cursor-pointer rounded-t-lg">
                                  <i className="ri-edit-line" />Edit
                                </button>
                                <button onClick={() => { setOpenLogMenuId(null); handleDeleteLog(log.id); }} className="w-full px-3 py-2 text-[0.8125rem] text-left text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer rounded-b-lg border-t border-slate-100">
                                  <i className="ri-delete-bin-line" />Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-[0.8125rem] text-slate-900 leading-[1.5] prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.content }} />
                      {log.issues && log.issues.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {parseIssues(log.issues).map((issueKey: string, idx: number) => (
                            <a key={idx} href={getJiraIssueUrl(issueKey)} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 text-[0.6875rem] font-medium hover:bg-blue-100">
                              <i className="ri-link text-xs" />{issueKey}
                            </a>
                          ))}
                        </div>
                      )}
                      {log.attachments && log.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {log.attachments.map((url: string, idx: number) => {
                            const fileName = url.split('/').pop() || 'file';
                            const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            return (
                              <div key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-200 text-[0.6875rem] font-medium">
                                {isImage ? <img src={url} alt={fileName} className="w-6 h-6 object-cover rounded cursor-pointer" onClick={() => handleImagePreview(url)} /> : <i className="ri-file-line" />}
                                <a href={url} target="_blank" rel="noopener noreferrer" className="max-w-[120px] truncate hover:underline">{fileName}</a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Entry Bottom Bar */}
            {session.status !== 'closed' ? (
            <div className="flex-shrink-0">
              <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

              {/* Type-specific expanded form */}
              {activeForm && (
                <div className="bg-white border-t border-slate-200 px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[0.6875rem] font-bold uppercase tracking-wide flex items-center gap-1.5"
                      style={{ color: logTypeConfig[activeForm]?.color }}
                    >
                      <i className={logTypeConfig[activeForm]?.icon} />
                      {logTypeConfig[activeForm]?.label}
                    </span>
                    <button
                      onClick={() => { setActiveForm(null); setNoteFormContent(''); }}
                      className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-[4px] flex items-center justify-center text-slate-500 cursor-pointer"
                    >
                      <i className="ri-close-line text-sm" />
                    </button>
                  </div>

                  {/* Note / Observation: single-line input */}
                  {(activeForm === 'note' || activeForm === 'blocked') && (
                    <input
                      value={noteFormContent}
                      onChange={(e) => setNoteFormContent(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && noteFormContent.trim()) handleAddLog(); }}
                      placeholder={activeForm === 'note' ? 'Add a note...' : 'Add an observation...'}
                      autoFocus
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-[6px] bg-slate-50 text-[0.8125rem] text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white placeholder:text-slate-400"
                    />
                  )}

                  {/* Bug: expanded form */}
                  {activeForm === 'failed' && (
                    <div className="flex flex-col gap-2">
                      <input
                        value={bugTitle}
                        onChange={(e) => setBugTitle(e.target.value)}
                        placeholder="Bug title..."
                        autoFocus
                        className="w-full px-2.5 py-2 border border-rose-200 rounded-[6px] bg-rose-50 text-[0.8125rem] text-slate-900 font-semibold focus:outline-none focus:border-rose-500 focus:bg-white placeholder:text-red-400"
                      />
                      <textarea
                        value={bugDesc}
                        onChange={(e) => setBugDesc(e.target.value)}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-[6px] bg-slate-50 text-[0.8125rem] text-slate-900 resize-none focus:outline-none focus:border-rose-500 focus:bg-white placeholder:text-slate-400"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {(['critical', 'major', 'minor', 'trivial'] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => setBugSeverity(s)}
                              className={`px-2.5 py-[3px] text-[0.6875rem] font-semibold rounded-[4px] border transition-all cursor-pointer ${
                                bugSeverity === s
                                  ? s === 'critical' ? 'bg-rose-600 border-rose-600 text-white'
                                  : s === 'major' ? 'bg-amber-500 border-amber-500 text-white'
                                  : s === 'minor' ? 'bg-blue-500 border-blue-500 text-white'
                                  : 'bg-slate-400 border-slate-400 text-white'
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                              }`}
                            >
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1 ml-auto">
                          <button onClick={handleAttachClick} disabled={uploadingFiles} className="flex items-center gap-1 px-2 py-[3px] border border-slate-200 rounded-[4px] text-[0.75rem] text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-50">
                            {uploadingFiles ? <><i className="ri-loader-4-line animate-spin text-xs" />Uploading</> : <><i className="ri-attachment-2 text-xs" />Attach</>}
                          </button>
                          <button onClick={handleScreenshot} disabled={uploadingFiles} className="flex items-center gap-1 px-2 py-[3px] border border-slate-200 rounded-[4px] text-[0.75rem] text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-50">
                            <i className="ri-screenshot-2-line text-xs" />Screenshot
                          </button>
                        </div>
                      </div>
                      {(linkedIssues.length > 0 || attachments.length > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                          {linkedIssues.map((k) => (
                            <div key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 text-[0.6875rem] font-medium">
                              <i className="ri-link text-xs" />{k}
                              <button onClick={() => handleRemoveLinkedIssue(k)} className="ml-0.5 cursor-pointer hover:text-blue-900"><i className="ri-close-line text-xs" /></button>
                            </div>
                          ))}
                          {attachments.map((f, i) => (
                            <div key={i} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 text-slate-600 rounded border border-slate-200 text-[0.6875rem] font-medium">
                              {isImageFile(f.type) ? <img src={f.url} alt={f.name} className="w-5 h-5 object-cover rounded cursor-pointer" onClick={() => handleImagePreview(f.url)} /> : <i className="ri-file-line text-xs" />}
                              <span className="max-w-[100px] truncate">{f.name}</span>
                              <button onClick={() => handleRemoveAttachment(i)} className="cursor-pointer hover:text-gray-700"><i className="ri-close-line text-xs" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test Step: 3-field form */}
                  {activeForm === 'passed' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <span className="w-16 flex-shrink-0 text-[0.6875rem] font-bold text-violet-600 uppercase tracking-wide pt-[9px]">Step</span>
                        <input autoFocus value={stepAction} onChange={(e) => setStepAction(e.target.value)} placeholder="What was done..." className="flex-1 px-2.5 py-2 border border-slate-200 rounded-[6px] bg-slate-50 text-[0.8125rem] text-slate-900 focus:outline-none focus:border-violet-600 focus:bg-white placeholder:text-slate-400" />
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-16 flex-shrink-0 text-[0.6875rem] font-bold text-violet-600 uppercase tracking-wide pt-[9px]">Expected</span>
                        <input value={stepExpected} onChange={(e) => setStepExpected(e.target.value)} placeholder="Expected result..." className="flex-1 px-2.5 py-2 border border-slate-200 rounded-[6px] bg-slate-50 text-[0.8125rem] text-slate-900 focus:outline-none focus:border-violet-600 focus:bg-white placeholder:text-slate-400" />
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-16 flex-shrink-0 text-[0.6875rem] font-bold text-violet-600 uppercase tracking-wide pt-[9px]">Actual</span>
                        <input value={stepActual} onChange={(e) => setStepActual(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && stepAction.trim()) handleAddLog(); }} placeholder="Actual result..." className="flex-1 px-2.5 py-2 border border-slate-200 rounded-[6px] bg-slate-50 text-[0.8125rem] text-slate-900 focus:outline-none focus:border-violet-600 focus:bg-white placeholder:text-slate-400" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Main bar */}
              <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center gap-2">
                {!activeForm && (
                  <input
                    value={noteFormContent}
                    onChange={(e) => setNoteFormContent(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && noteFormContent.trim()) handleAddLog(); }}
                    placeholder="Select a type or press N / B / O / T"
                    className="flex-1 px-2.5 py-2 border border-slate-200 rounded-[6px] bg-slate-50 text-[0.8125rem] text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white placeholder:text-slate-400"
                  />
                )}
                {activeForm && <div className="flex-1" />}
                <div className="flex gap-1">
                  {entryTypeButtons.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => { setActiveForm(activeForm === type ? null : type); setNoteFormContent(''); }}
                      className={`flex items-center gap-1 px-2.5 py-[5px] border rounded-[6px] text-[0.75rem] font-semibold cursor-pointer transition-colors ${
                        activeForm === type
                          ? type === 'note'    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : type === 'failed'  ? 'bg-rose-50 border-rose-500 text-rose-600'
                          : type === 'blocked' ? 'bg-amber-50 border-amber-500 text-amber-600'
                          :                      'bg-violet-50 border-violet-600 text-violet-600'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <i className={`${icon} text-[0.75rem]`} />{label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAddLog}
                  disabled={
                    activeForm === 'failed' ? !bugTitle.trim() :
                    activeForm === 'passed' ? !stepAction.trim() :
                    !noteFormContent.trim()
                  }
                  className="px-4 py-[6px] bg-indigo-500 text-white text-[0.8125rem] font-semibold rounded-[6px] hover:bg-indigo-600 disabled:bg-indigo-200 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
) : (
            <div className="flex-shrink-0 border-t border-slate-200 px-5 py-4">
              <div className="flex items-center justify-center gap-2 text-slate-400 text-[0.8125rem]">
                <i className="ri-lock-line" />
                <span>This session is completed. Reopen to add entries.</span>
              </div>
            </div>
)}
          </div>

          {/* Detail Sidebar */}
          <div className="w-[300px] flex-shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
            {/* About Panel */}
            <div className="p-4 border-b border-slate-200">
              <div className="text-[0.9375rem] font-semibold text-slate-900 mb-3">About</div>
              <div className="space-y-3 text-[0.8125rem]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[0.75rem] font-semibold ${statusInfo.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />{statusInfo.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Created</span>
                  <span className="text-slate-900">{new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {milestone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Milestone</span>
                    <span className="inline-flex items-center px-2 py-0.5 text-[0.75rem] font-medium bg-orange-100 text-orange-700 rounded">{milestone.name}</span>
                  </div>
                )}
                {session.tags && session.tags.length > 0 && (
                  <div>
                    <div className="text-slate-400 font-medium mb-1.5">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {session.tags.map((tag: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-[3px] text-[0.6875rem] font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                {assigneeProfiles.length > 0 && (
                  <div>
                    <div className="text-slate-400 font-medium mb-1.5">Assignees</div>
                    <div className="space-y-1.5">
                      {assigneeProfiles.map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${getAvatarColor(p.id)} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-[0.5625rem] font-semibold text-white">{getProfileInitial(p)}</span>
                          </div>
                          <span className="text-slate-900">{getProfileDisplayName(p)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {session.duration_minutes > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Time Box</span>
                    <span className="text-slate-900">{Math.floor(session.duration_minutes / 60) > 0 ? `${Math.floor(session.duration_minutes / 60)}h` : ''}{session.duration_minutes % 60 > 0 ? ` ${session.duration_minutes % 60}m` : ''} (goal)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Panel */}
            <div className="p-4">
              <div className="text-[0.9375rem] font-semibold text-slate-900 mb-3">Activity</div>

              {/* Timer */}
              <div className="mb-3 text-center py-3 bg-slate-50 rounded-[6px] border border-slate-200">
                <div className="text-[1.75rem] font-bold text-slate-900 font-mono tracking-tight">{elapsedTime}</div>
                <div className="text-[0.6875rem] text-slate-400 font-medium uppercase tracking-wide mt-1">Total Elapsed</div>
                <div className="mt-2 mx-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: session.duration_minutes > 0 ? `${Math.min(100, (parseInt(elapsedTime.split(':')[0]) * 60 + parseInt(elapsedTime.split(':')[1])) / session.duration_minutes * 100)}%` : '0%' }}
                  />
                </div>
              </div>


              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-2 mb-4">
                <div className="bg-slate-50 rounded-[6px] border border-slate-200 p-2.5">
                  <div className="text-[0.6875rem] text-slate-400 font-semibold uppercase">Entries</div>
                  <div className="text-[0.875rem] font-bold text-slate-900 mt-0.5">{logs.length}</div>
                  <div className="text-[0.6875rem] text-slate-500 mt-0.5">
                    {logs.filter(l => l.type === 'note').length} Note · {logs.filter(l => l.type === 'failed').length} Bug · {logs.filter(l => l.type === 'blocked').length} Obs · {logs.filter(l => l.type === 'passed').length} Step
                  </div>
                </div>
                <div className="bg-slate-50 rounded-[6px] border border-slate-200 p-2.5">
                  <div className="text-[0.6875rem] text-slate-400 font-semibold uppercase">Bugs</div>
                  <div className="text-[0.875rem] font-bold text-slate-900 mt-0.5">{logs.filter(l => l.type === 'failed').length}</div>
                  <div className="text-[0.6875rem] text-slate-500 mt-0.5">
                    {(() => {
                      const bugLogs = logs.filter(l => l.type === 'failed');
                      const counts = { critical: 0, major: 0, minor: 0, trivial: 0 };
                      bugLogs.forEach(l => {
                        const p = parseBugPriority(l.content) as keyof typeof counts;
                        if (p in counts) counts[p]++;
                      });
                      const parts = (['critical', 'major', 'minor'] as const)
                        .filter(k => counts[k] > 0)
                        .map(k => `${counts[k]} ${k.charAt(0).toUpperCase() + k.slice(1)}`);
                      return parts.length > 0 ? parts.join(' · ') : 'Total reported';
                    })()}
                  </div>
                </div>
              </div>

              {/* Timeline dots */}
              {logs.length > 0 && (
                <div className="mb-4">
                  {(() => {
                    const tsStart = session.started_at ? new Date(session.started_at).getTime() : new Date(logs[0].created_at).getTime();
                    const tsEnd = session.status === 'closed' && session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
                    const duration = tsEnd - tsStart;
                    return (
                      <>
                        <div className="h-9 bg-gradient-to-r from-slate-50 to-slate-100 rounded-[4px] border border-slate-200 relative overflow-hidden">
                          {logs.map((log) => {
                            const dotColor = log.type === 'note' ? '#6366F1' : log.type === 'failed' ? '#EF4444' : log.type === 'blocked' ? '#F59E0B' : '#7C3AED';
                            const logTs = new Date(log.created_at).getTime();
                            const pos = duration > 0 ? Math.min(96, Math.max(4, ((logTs - tsStart) / duration) * 92 + 4)) : 50;
                            return (
                              <div
                                key={log.id}
                                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[1.5px] border-white cursor-pointer"
                                style={{ left: `${pos}%`, background: dotColor, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                                onMouseEnter={(e) => setTooltipInfo({ label: logTypeConfig[log.type]?.label || log.type, time: formatTime(log.created_at), x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setTooltipInfo(null)}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[0.625rem] text-slate-400 mt-1 px-1">
                          <span>{formatTime(new Date(tsStart).toISOString())}</span>
                          <span>{session.status === 'closed' && session.ended_at ? formatTime(session.ended_at) : 'Now'}</span>
                        </div>
                      </>
                    );
                  })()}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {[
                      { label: 'Note', color: '#6366F1' },
                      { label: 'Bug', color: '#EF4444' },
                      { label: 'Observation', color: '#F59E0B' },
                      { label: 'Step', color: '#7C3AED' },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1 text-[0.6875rem] text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-2 mt-2">
                {!session.started_at ? (
                  <button onClick={handleStartSession} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white text-[0.75rem] font-semibold rounded-[6px] hover:bg-green-600 cursor-pointer transition-colors">
                    <i className="ri-play-fill" />Start
                  </button>
                ) : session.status === 'closed' ? (
                  <button
                    onClick={() => setShowReopenConfirmModal(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-500 text-white text-[0.75rem] font-semibold rounded-[6px] hover:bg-indigo-600 cursor-pointer transition-colors"
                  >
                    <i className="ri-refresh-line" />Reopen Session
                  </button>
                ) : session.paused_at ? (
                  <>
                    <button onClick={handleResumeSession} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-500 text-white text-[0.75rem] font-semibold rounded-[6px] hover:bg-blue-600 cursor-pointer transition-colors">
                      <i className="ri-play-fill" />Resume
                    </button>
                    <button onClick={() => setShowCloseConfirmModal(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-500 text-white text-[0.75rem] font-semibold rounded-[6px] hover:bg-rose-600 cursor-pointer transition-colors">
                      <i className="ri-stop-fill" />Close
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handlePauseSession} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500 text-white text-[0.75rem] font-semibold rounded-[6px] hover:bg-amber-600 cursor-pointer transition-colors">
                      <i className="ri-pause-fill" />Pause
                    </button>
                    <button onClick={() => setShowCloseConfirmModal(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-500 text-white text-[0.75rem] font-semibold rounded-[6px] hover:bg-rose-600 cursor-pointer transition-colors">
                      <i className="ri-stop-fill" />Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Tooltip */}
        {tooltipInfo && (
          <div
            className="fixed z-50 px-2 py-1 bg-slate-800 text-white text-[0.75rem] font-medium rounded-[4px] pointer-events-none shadow-lg"
            style={{ left: Math.min(tooltipInfo.x + 10, window.innerWidth - 140), top: Math.max(tooltipInfo.y - 34, 8) }}
          >
            {tooltipInfo.label} · {tooltipInfo.time}
          </div>
        )}

        {/* Edit Modal */}
        {session && (
          <EditSessionModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSave={handleSaveSession}
            session={{
              name: session.name,
              charter: session.charter || session.mission || '',
              milestone_id: session.milestone_id || null,
              tags: session.tags || [],
              duration_minutes: session.duration_minutes || 60,
              assignees: session.assignees || [],
            }}
            milestones={milestones}
            projectMembers={projectMembers}
          />
        )}

        {/* Link Issue Modal */}
        {showLinkIssueModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Link Jira Issue</h2>
                <button
                  onClick={() => {
                    setShowLinkIssueModal(false);
                    setIssueInput('');
                  }}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Issue Key
                  </label>
                  <input
                    type="text"
                    value={issueInput}
                    onChange={(e) => setIssueInput(e.target.value)}
                    onKeyDown={handleIssueKeyDown}
                    placeholder="Enter issue key (e.g., PROJ-123)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">Press Enter or comma to add</p>
                </div>

                {linkedIssues.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Linked Issues
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {linkedIssues.map((issueKey) => (
                        <div
                          key={issueKey}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 text-xs font-medium"
                        >
                          <i className="ri-link text-sm"></i>
                          {issueKey}
                          <button
                            onClick={() => handleRemoveLinkedIssue(issueKey)}
                            className="ml-1 hover:text-blue-900 cursor-pointer"
                          >
                            <i className="ri-close-line text-sm"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setShowLinkIssueModal(false);
                    setIssueInput('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  Done
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
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowAddIssueModal(false)}
                  disabled={creatingIssue}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateJiraIssue}
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

        {/* Edit Log Modal */}
        {editingLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Edit Log</h2>
                <button
                  onClick={() => setEditingLog(null)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                  <div className="relative inline-block">
                    <button
                      onClick={() => setShowEditLogTypeDropdown(!showEditLogTypeDropdown)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        editLogType === 'passed' ? 'bg-green-500' :
                        editLogType === 'failed' ? 'bg-red-500' :
                        editLogType === 'blocked' ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`}></span>
                      {getLogTypeLabel(editLogType)}
                      <i className="ri-arrow-down-s-line"></i>
                    </button>

                    {showEditLogTypeDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowEditLogTypeDropdown(false)}></div>
                        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                          {(['note', 'passed', 'failed', 'blocked'] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => {
                                setEditLogType(type);
                                setShowEditLogTypeDropdown(false);
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
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
                  <QuillEditor
                    value={editLogContent}
                    onChange={setEditLogContent}
                    placeholder="Edit your log content..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setEditingLog(null)}
                  disabled={savingLog}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditLog}
                  disabled={savingLog || !editLogContent.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingLog ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line"></i>
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {showImagePreview && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setShowImagePreview(false)}
          >
            <div className="relative max-w-5xl max-h-[90vh] p-4">
              <button
                onClick={() => setShowImagePreview(false)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full cursor-pointer transition-all"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
              <img
                src={previewImageUrl}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Crop Overlay */}
        {cropState && (
          <CropOverlay
            imageDataUrl={cropState.imageDataUrl}
            onCrop={cropState.onCrop}
            onCancel={() => setCropState(null)}
          />
        )}

        {/* Reopen Confirm Modal */}
        {showReopenConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 w-[400px] max-w-[90vw]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <i className="ri-refresh-line text-indigo-500 text-lg" />
                </div>
                <div>
                  <h3 className="text-[0.9375rem] font-semibold text-slate-900">Reopen Session</h3>
                  <p className="text-[0.8125rem] text-slate-500">This will change the status back to In Progress.</p>
                </div>
              </div>
              <p className="text-[0.8125rem] text-slate-600 mb-5">
                The session timer will resume from where it left off. You can add new entries and close the session again when finished.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowReopenConfirmModal(false)}
                  className="px-4 py-2 text-[0.8125rem] font-medium text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReopenSession}
                  className="px-4 py-2 text-[0.8125rem] font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 cursor-pointer transition-colors"
                >
                  Reopen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Close Session Confirm Modal */}
        {showCloseConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mx-auto mb-4">
                  <i className="ri-close-circle-line text-2xl text-red-500"></i>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">Close Session</h2>
                <p className="text-sm text-gray-500 text-center">
                  Are you sure you want to close this session?<br />This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center gap-3 px-6 pb-6">
                <button
                  onClick={() => setShowCloseConfirmModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseSession}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 cursor-pointer whitespace-nowrap"
                >
                  Close Session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
