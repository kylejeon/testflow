import { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    fetchCurrentUser();
    fetchSessionData();
    fetchMilestones();
    fetchProjectMembers();
    fetchJiraSettings();
  }, [sessionId]);

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
    }
  };

  const handleAddLog = async () => {
    if (!logContent.trim()) return;

    try {
      const { error } = await supabase
        .from('session_logs')
        .insert({
          session_id: sessionId,
          content: logContent,
          type: logType,
          issues: linkedIssues.length > 0 ? linkedIssues : null,
          attachments: attachments.length > 0 ? attachments.map(a => a.url) : null,
        });

      if (error) throw error;

      setLogContent('');
      setLinkedIssues([]);
      setAttachments([]);
      fetchSessionData();
    } catch (error) {
      console.error('Error adding log:', error);
    }
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
      alert('파일 업로드에 실패했습니다.');
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
        alert('이 브라우저는 스크린샷 기능을 지원하지 않습니다.');
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
            alert(`스크린샷 업로드에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
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
      alert('스크린샷 캡처에 실패했습니다.');
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
      alert('Summary는 필수 항목입니다.');
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
      alert('세션 시작에 실패했습니다.');
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
      alert('세션 일시정지에 실패했습니다.');
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
      alert('세션 재개에 실패했습니다.');
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
          setJiraSettings(prev => prev ? { ...prev, project_key: projectData.jira_project_key } : null);
        }
      }
    } catch (error) {
      console.error('Jira 설정 로딩 오류:', error);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('이 로그를 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase
        .from('session_logs')
        .delete()
        .eq('id', logId);
      if (error) throw error;
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (error) {
      console.error('로그 삭제 오류:', error);
      alert('로그 삭제에 실패했습니다.');
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
      alert('로그 수정에 실패했습니다.');
    } finally {
      setSavingLog(false);
    }
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
                  onClick={() => navigate(`/projects/${projectId}/discovery-logs`)}
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
                {!session?.started_at ? (
                  /* Start 버튼: 세션 시작 전 */
                  <button
                    onClick={handleStartSession}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 border border-indigo-500 rounded-lg hover:bg-indigo-600 cursor-pointer whitespace-nowrap flex items-center gap-2"
                  >
                    <i className="ri-play-fill"></i>
                    Start
                  </button>
                ) : session?.status === 'closed' ? (
                  /* closed 상태 */
                  <button
                    disabled
                    className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed whitespace-nowrap flex items-center gap-2"
                  >
                    <i className="ri-check-line"></i>
                    Closed
                  </button>
                ) : session?.paused_at ? (
                  /* 일시정지 상태: Resume + Close */
                  <>
                    <button
                      onClick={handleResumeSession}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 border border-indigo-500 rounded-lg hover:bg-indigo-600 cursor-pointer whitespace-nowrap flex items-center gap-2"
                    >
                      <i className="ri-play-fill"></i>
                      Resume
                    </button>
                    <button
                      onClick={() => setShowCloseConfirmModal(true)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap flex items-center gap-2"
                    >
                      <i className="ri-save-line"></i>
                      Close
                    </button>
                  </>
                ) : (
                  /* 활성 상태: Pause + Close */
                  <>
                    <button
                      onClick={handlePauseSession}
                      className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 cursor-pointer whitespace-nowrap flex items-center gap-2"
                    >
                      <i className="ri-pause-fill"></i>
                      Pause
                    </button>
                    <button
                      onClick={() => setShowCloseConfirmModal(true)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap flex items-center gap-2"
                    >
                      <i className="ri-save-line"></i>
                      Close
                    </button>
                  </>
                )}
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

        <div className="max-w-7xl mx-auto px-6 py-6 w-full overflow-y-auto">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column */}
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

                {/* Linked Issues Display */}
                {linkedIssues.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {linkedIssues.map((issueKey) => (
                      <div
                        key={issueKey}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 text-xs font-medium"
                      >
                        <i className="ri-link text-sm"></i>
                        <a
                          href={getJiraIssueUrl(issueKey)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {issueKey}
                        </a>
                        <button
                          onClick={() => handleRemoveLinkedIssue(issueKey)}
                          className="ml-1 hover:text-blue-900 cursor-pointer"
                        >
                          <i className="ri-close-line text-sm"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Attachments Display */}
                {attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded border border-gray-200 text-xs font-medium"
                      >
                        {isImageFile(file.type) ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-8 h-8 object-cover rounded cursor-pointer"
                            onClick={() => handleImagePreview(file.url)}
                          />
                        ) : (
                          <i className="ri-file-line text-base"></i>
                        )}
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <button
                          onClick={() => handleRemoveAttachment(index)}
                          className="ml-1 hover:text-gray-900 cursor-pointer"
                        >
                          <i className="ri-close-line text-sm"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    {/* Issues Button with Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowIssuesDropdown(!showIssuesDropdown)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <i className="ri-link text-base"></i>
                        Issues
                        <i className="ri-arrow-down-s-line"></i>
                      </button>

                      {showIssuesDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowIssuesDropdown(false)}
                          ></div>
                          <div className="absolute left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                            <button
                              onClick={() => {
                                setShowIssuesDropdown(false);
                                setShowLinkIssueModal(true);
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            >
                              <i className="ri-link text-base"></i>
                              Link Issue
                            </button>
                            <button
                              onClick={() => {
                                setShowIssuesDropdown(false);
                                if (!jiraSettings || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.api_token) {
                                  if (confirm('Jira 설정이 필요합니다. Settings 페이지로 이동하시겠습니까?')) {
                                    navigate('/settings');
                                  }
                                  return;
                                }
                                setShowAddIssueModal(true);
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-gray-100"
                            >
                              <i className="ri-add-line text-base"></i>
                              Add Issue
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <button 
                      onClick={handleAttachClick}
                      disabled={uploadingFiles}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingFiles ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-base"></i>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <i className="ri-attachment-2 text-base"></i>
                          Attach
                        </>
                      )}
                    </button>
                    <button 
                      onClick={handleScreenshot}
                      disabled={uploadingFiles}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
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
                      className="px-6 py-2 bg-indigo-500 text-white text-sm font-medium rounded hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-4">
                {logs.map((log) => (
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
                          <div className="relative">
                            <button
                              onClick={() => setOpenLogMenuId(openLogMenuId === log.id ? null : log.id)}
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
                            >
                              <i className="ri-more-2-fill"></i>
                            </button>
                            {openLogMenuId === log.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenLogMenuId(null)}
                                ></div>
                                <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                                  <button
                                    onClick={() => handleEditLog(log)}
                                    className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap rounded-t-lg"
                                  >
                                    <i className="ri-edit-line text-base"></i>
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenLogMenuId(null);
                                      handleDeleteLog(log.id);
                                    }}
                                    className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer whitespace-nowrap rounded-b-lg border-t border-gray-100"
                                  >
                                    <i className="ri-delete-bin-line text-base"></i>
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div 
                          className="text-sm text-gray-700 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: log.content }}
                        />
                        {log.issues && log.issues.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {parseIssues(log.issues).map((issueKey: string, idx: number) => (
                              <a
                                key={idx}
                                href={getJiraIssueUrl(issueKey)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 text-xs font-medium hover:bg-blue-100 transition-all"
                              >
                                <i className="ri-link text-sm"></i>
                                {issueKey}
                                <i className="ri-external-link-line text-xs"></i>
                              </a>
                            ))}
                          </div>
                        )}
                        {log.attachments && log.attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {log.attachments.map((url: string, idx: number) => {
                              const fileName = url.split('/').pop() || 'file';
                              const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                              
                              return (
                                <div
                                  key={idx}
                                  className="inline-flex items-center gap-2 px-2 py-1 bg-gray-50 text-gray-700 rounded border border-gray-200 text-xs font-medium hover:bg-gray-100 transition-all"
                                >
                                  {isImage ? (
                                    <img
                                      src={url}
                                      alt={fileName}
                                      className="w-8 h-8 object-cover rounded cursor-pointer"
                                      onClick={() => handleImagePreview(url)}
                                    />
                                  ) : (
                                    <i className="ri-file-line text-base"></i>
                                  )}
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="max-w-[150px] truncate hover:underline"
                                  >
                                    {fileName}
                                  </a>
                                  <i className="ri-external-link-line text-xs"></i>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column */}
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
                        !session.started_at
                          ? 'bg-gray-100 text-gray-500'
                          : session.status === 'closed'
                          ? 'bg-gray-100 text-gray-700'
                          : session.paused_at
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {!session.started_at
                          ? 'Not started'
                          : session.status === 'closed'
                          ? 'Completed'
                          : session.paused_at
                          ? 'Paused'
                          : 'In progress'}
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
                        {session.tags.map((tag: string, idx: number) => (
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
                      <span className="text-sm font-medium text-gray-700">Assignees</span>
                    </div>
                    <div className="ml-6">
                      {assigneeProfiles.length > 0 ? (
                        <div className="space-y-2">
                          {assigneeProfiles.map((profile) => (
                            <div key={profile.id} className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarColor(profile.id)} flex items-center justify-center`}>
                                <span className="text-xs font-medium text-white">{getProfileInitial(profile)}</span>
                              </div>
                              <span className="text-sm text-gray-700">{getProfileDisplayName(profile)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
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
                              bgColor = 'bg-indigo-500';
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

        {/* Close Session Confirm Modal */}
        {showCloseConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mx-auto mb-4">
                  <i className="ri-close-circle-line text-2xl text-red-500"></i>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">세션 종료</h2>
                <p className="text-sm text-gray-500 text-center">
                  이 세션을 종료하시겠습니까?<br />종료 후에는 다시 시작할 수 없습니다.
                </p>
              </div>
              <div className="flex items-center gap-3 px-6 pb-6">
                <button
                  onClick={() => setShowCloseConfirmModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap"
                >
                  취소
                </button>
                <button
                  onClick={handleCloseSession}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 cursor-pointer whitespace-nowrap"
                >
                  종료하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
