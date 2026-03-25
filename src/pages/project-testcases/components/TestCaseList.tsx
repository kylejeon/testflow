import { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { supabase } from '../../../lib/supabase';
import ExportImportModal from './ExportImportModal';
import { BulkActionBar } from '../../../components/BulkActionBar';
import { StepEditor, type Step } from '../../../components/StepEditor';
import { LifecycleBadge, type LifecycleStatus } from '../../../components/LifecycleBadge';

interface TestCase {
  id: string;
  custom_id?: string;
  title: string;
  description: string;
  precondition: string;
  folder: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  is_automated: boolean;
  steps: string;
  expected_result: string;
  tags: string;
  attachments: { name: string; url: string; size: number }[];
  created_at: string;
  updated_at: string;
  project_id: string;
  lifecycle_status?: LifecycleStatus;
}

interface TestCaseListProps {
  testCases: TestCase[];
  onAdd: (testCase: any) => void;
  onUpdate: (testCase: any) => void;
  onDelete: (id: string) => void;
  onRefresh: () => Promise<void>;
  projectId: string;
  projectName?: string;
}

interface Folder {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  user_id: string;
}

interface TestStep {
  id: string;
  step: string;
  expectedResult: string;
}

interface TestCaseSnapshot {
  title: string;
  description: string;
  precondition: string;
  priority: string;
  folder: string;
  tags: string;
  steps: string;
  expected_result: string;
  assignee: string;
  is_automated: boolean;
}

interface TestCaseHistory {
  id: string;
  test_case_id: string;
  user_id: string;
  action_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
  snapshot?: TestCaseSnapshot;
}

interface TestResult {
  id: string;
  test_case_id: string;
  run_id: string;
  status: string;
  author: string;
  note?: string;
  elapsed?: string;
  created_at: string;
  issues?: string[];
  run?: {
    id: string;
    name: string;
  };
}

interface TestIssue {
  id: string;
  issue_key: string;
  run_name: string;
  run_id: string;
  status: string;
  created_at: string;
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  profile: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
}

export default function TestCaseList({ testCases, onAdd, onUpdate, onDelete, onRefresh, projectId, projectName: propProjectName }: TestCaseListProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  // Removed duplicate editingTestCase declaration that caused a conflict.
  const [isFolderPanelOpen, setIsFolderPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'comments' | 'results' | 'issues' | 'history'>('comments');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [testSteps, setTestSteps] = useState<TestStep[]>([{ id: '1', step: '', expectedResult: '' }]);
  const [historyData, setHistoryData] = useState<TestCaseHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; full_name: string; email: string } | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<TestCaseHistory | null>(null);
  const [restoringHistory, setRestoringHistory] = useState(false);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [testIssues, setTestIssues] = useState<TestIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'ui', name: 'UI Tests', icon: 'ri-layout-line', color: 'blue' },
    { id: 'api', name: 'API Tests', icon: 'ri-code-box-line', color: 'purple' },
    { id: 'integration', name: 'Integration Tests', icon: 'ri-links-line', color: 'green' },
    { id: 'security', name: 'Security Tests', icon: 'ri-shield-check-line', color: 'red' },
  ]);

  const [newFolder, setNewFolder] = useState({
    name: '',
    icon: 'ri-folder-line',
    color: 'gray',
  });

  const [newTestCase, setNewTestCase] = useState({
    title: '',
    description: '',
    precondition: '',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    folder: '',
    tags: '' as string,
    steps: [{ step: '', expectedResult: '' }],
    attachments: [] as { name: string; url: string; size: number }[],
  });

  const [editingTestCase, setEditingTestCase] = useState<{
    id: string;
    title: string;
    description: string;
    precondition: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    folder: string;
    tags: string;
    steps: { step: string; expectedResult: string }[];
    attachments: { name: string; url: string; size: number }[];
  } | null>(null);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(new Set());
  const [showBulkFolderModal, setShowBulkFolderModal] = useState(false);
  
  const detailPanelRef = useRef<HTMLDivElement>(null);

  // Toast 상태 추가
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // 폴더 삭제 확인 모달 상태 추가
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  const [showCopyToProjectModal, setShowCopyToProjectModal] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [copyingToProject, setCopyingToProject] = useState(false);
  const [copyTargetProjectId, setCopyTargetProjectId] = useState<string | null>(null);

  // 일괄 삭제 상태
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // 히스토리 모달 상태
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [showExportImportModal, setShowExportImportModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userTier, setUserTier] = useState<number>(1);

  // ─── Lifecycle Status ───────────────────────────────────────────
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tcId: string; tcTitle: string } | null>(null);
  const [contextMenuStatusOpen, setContextMenuStatusOpen] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Deprecate confirm dialog state
  const [deprecateDialog, setDeprecateDialog] = useState<{ tcId: string; tcTitle: string; bulk: boolean; bulkIds?: string[] } | null>(null);
  const [deprecating, setDeprecating] = useState(false);

  // Close context menu on outside click / scroll
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => { setContextMenu(null); setContextMenuStatusOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('scroll', close, true); };
  }, [contextMenu]);

  // projectName 상태 제거 (propProjectName을 직접 사용)

  // propProjectName 동기화 useEffect 제거
  // DB 조회 useEffect 제거

  // 유저 티어 조회
  useEffect(() => {
    const fetchUserTier = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .maybeSingle();
        setUserTier(data?.subscription_tier || 1);
      }
    };
    fetchUserTier();
  }, []);

  // ─── Lifecycle Status Helpers ────────────────────────────────────
  const updateLifecycleStatus = async (tcId: string, newStatus: LifecycleStatus, oldStatus: LifecycleStatus) => {
    const { data: { user } } = await supabase.auth.getUser();
    // Optimistic update
    const tc = testCases.find(t => t.id === tcId);
    if (tc) onUpdate({ ...tc, lifecycle_status: newStatus });

    const { error } = await supabase
      .from('test_cases')
      .update({ lifecycle_status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', tcId);

    if (error) {
      // Rollback
      if (tc) onUpdate({ ...tc, lifecycle_status: oldStatus });
      return;
    }
    // History
    if (user) {
      await supabase.from('test_case_history').insert({
        test_case_id: tcId,
        user_id: user.id,
        action_type: 'status_changed',
        field_name: 'lifecycle_status',
        old_value: oldStatus,
        new_value: newStatus,
      });
    }
  };

  const bulkUpdateLifecycleStatus = async (tcIds: string[], newStatus: LifecycleStatus) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('test_cases')
      .update({ lifecycle_status: newStatus, updated_at: new Date().toISOString() })
      .in('id', tcIds);
    if (error) return;
    tcIds.forEach(tcId => {
      const tc = testCases.find(t => t.id === tcId);
      if (tc) onUpdate({ ...tc, lifecycle_status: newStatus });
    });
    if (user) {
      await supabase.from('test_case_history').insert(
        tcIds.map(tcId => ({
          test_case_id: tcId,
          user_id: user.id,
          action_type: 'status_changed',
          field_name: 'lifecycle_status',
          new_value: newStatus,
        }))
      );
    }
    setSelectedTestCaseIds(new Set());
  };

  const handleLifecycleChange = (tc: TestCase, newStatus: LifecycleStatus) => {
    const oldStatus = tc.lifecycle_status || 'active';
    if (newStatus === 'deprecated') {
      setDeprecateDialog({ tcId: tc.id, tcTitle: tc.title, bulk: false });
    } else {
      updateLifecycleStatus(tc.id, newStatus, oldStatus);
    }
  };

  const handleContextMenuLifecycleChange = (newStatus: LifecycleStatus) => {
    if (!contextMenu) return;
    const tc = testCases.find(t => t.id === contextMenu.tcId);
    setContextMenu(null);
    setContextMenuStatusOpen(false);
    if (!tc) return;
    handleLifecycleChange(tc, newStatus);
  };

  const handleConfirmDeprecate = async () => {
    if (!deprecateDialog) return;
    setDeprecating(true);
    if (deprecateDialog.bulk && deprecateDialog.bulkIds) {
      await bulkUpdateLifecycleStatus(deprecateDialog.bulkIds, 'deprecated');
    } else {
      const tc = testCases.find(t => t.id === deprecateDialog.tcId);
      await updateLifecycleStatus(deprecateDialog.tcId, 'deprecated', tc?.lifecycle_status || 'active');
    }
    setDeprecating(false);
    setDeprecateDialog(null);
  };

  const handleBulkLifecycleChange = (newStatus: LifecycleStatus) => {
    const ids = Array.from(selectedTestCaseIds);
    if (newStatus === 'deprecated') {
      const firstTitle = testCases.find(tc => tc.id === ids[0])?.title || '';
      setDeprecateDialog({ tcId: ids[0], tcTitle: firstTitle, bulk: true, bulkIds: ids });
    } else {
      bulkUpdateLifecycleStatus(ids, newStatus);
    }
  };

  const handleOpenExportImport = () => {
    if (userTier < 2) {
      setShowUpgradeModal(true);
    } else {
      setShowExportImportModal(true);
    }
  };

  // Import 핸들러
  const handleImportTestCases = async (importedCases: Partial<TestCase>[]) => {
    const { data: { user } } = await supabase.auth.getUser();

    // 프로젝트 prefix 조회
    const { data: projectData } = await supabase
      .from('projects')
      .select('prefix')
      .eq('id', projectId)
      .maybeSingle();
    const prefix = projectData?.prefix;

    // 현재 최대 번호 조회
    let maxNum = 0;
    if (prefix) {
      const { data: existingCases } = await supabase
        .from('test_cases')
        .select('custom_id')
        .eq('project_id', projectId)
        .not('custom_id', 'is', null);

      if (existingCases) {
        existingCases.forEach((tc: any) => {
          if (tc.custom_id) {
            const match = tc.custom_id.match(/-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        });
      }
    }

    // 폴더 자동 생성
    const requiredFolderNames = [...new Set(
      importedCases.map(tc => tc.folder).filter((f): f is string => !!f && f.trim() !== '')
    )];

    if (requiredFolderNames.length > 0) {
      const { data: existingFolders } = await supabase
        .from('folders')
        .select('name')
        .eq('project_id', projectId);

      const existingNames = new Set((existingFolders || []).map((f: any) => f.name));
      const toCreate = requiredFolderNames.filter(name => !existingNames.has(name));

      if (toCreate.length > 0) {
        await supabase.from('folders').insert(
          toCreate.map(name => ({
            project_id: projectId,
            name,
            icon: 'ri-folder-line',
            color: 'gray',
          }))
        );
      }
    }

    // 테스트 케이스 일괄 삽입
    const insertData = importedCases.map((tc, idx) => ({
      project_id: projectId,
      title: tc.title || 'Untitled',
      description: tc.description || null,
      precondition: tc.precondition || null,
      priority: tc.priority || 'medium',
      status: 'untested',
      is_automated: tc.is_automated || false,
      folder: tc.folder || null,
      tags: tc.tags || null,
      steps: tc.steps || null,
      expected_result: tc.expected_result || null,
      assignee: null,
      created_by: user?.id || null,
      ...(prefix ? { custom_id: `${prefix}-${maxNum + idx + 1}` } : {}),
    }));

    const { data: inserted, error } = await supabase
      .from('test_cases')
      .insert(insertData)
      .select('id');

    if (error) throw error;

    // 히스토리 기록
    if (inserted && user) {
      await supabase.from('test_case_history').insert(
        inserted.map((tc: { id: string }) => ({
          test_case_id: tc.id,
          user_id: user.id,
          action_type: 'created',
        }))
      );
    }

    await onRefresh();

    setToastMessage(`${importedCases.length}개의 테스트 케이스를 성공적으로 가져왔습니다.`);
    setToastType('success');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const iconOptions = [
    'ri-folder-line',
    'ri-layout-line',
    'ri-code-box-line',
    'ri-links-line',
    'ri-shield-check-line',
    'ri-bug-line',
    'ri-smartphone-line',
    'ri-database-line',
  ];

  const colorOptions = [
    { name: 'gray', class: 'bg-gray-100 text-gray-700' },
    { name: 'blue', class: 'bg-blue-100 text-blue-700' },
    { name: 'purple', class: 'bg-purple-100 text-purple-700' },
    { name: 'green', class: 'bg-green-100 text-green-700' },
    { name: 'red', class: 'bg-red-100 text-red-700' },
    { name: 'yellow', class: 'bg-yellow-100 text-yellow-700' },
    { name: 'pink', class: 'bg-pink-100 text-pink-700' },
    { name: 'indigo', class: 'bg-indigo-100 text-indigo-700' },
  ];

  // 컴포넌트 마운트 시 데이터베이스에서 폴더 불러오기
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const { data, error } = await supabase
          .from('folders')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const loadedFolders = data.map(f => ({
            id: f.id,
            name: f.name,
            icon: f.icon || 'ri-folder-line',
            color: f.color || 'gray',
          }));
          setFolders(loadedFolders);
        }
      } catch (error) {
        console.error('폴더 로딩 오류:', error);
      }
    };

    fetchFolders();
  }, [projectId]);

  const handleAddFolder = async () => {
    if (newFolder.name.trim()) {
      try {
        const { data, error } = await supabase
          .from('folders')
          .insert({
            project_id: projectId,
            name: newFolder.name,
            icon: newFolder.icon,
            color: newFolder.color,
          })
          .select()
          .single();

        if (error) throw error;

        const folder: Folder = {
          id: data.id,
          name: data.name,
          icon: data.icon,
          color: data.color,
        };
        setFolders([...folders, folder]);
        setNewFolder({ name: '', icon: 'ri-folder-line', color: 'gray' });
        setShowNewFolderModal(false);

        // 토스트 메시지 표시
        setToastMessage(`"${folder.name}" 폴더가 생성되었습니다.`);
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (error) {
        console.error('폴더 생성 오류:', error);
        setToastMessage('폴더 생성에 실패했습니다.');
        setToastType('error');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 3000);
      }
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    // 모달 표시
    setFolderToDelete(folder);
    setShowDeleteFolderModal(true);
  };

  // 실제 폴더 삭제 처리 함수
  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    
    try {
      setDeletingFolder(true);
      
      // 해당 폴더에 속한 테스트 케이스들의 folder를 null로 업데이트
      const testCasesInFolder = testCases.filter(tc => tc.folder === folderToDelete.name);
      
      for (const tc of testCasesInFolder) {
        const { error } = await supabase
          .from('test_cases')
          .update({ folder: null, updated_at: new Date().toISOString() })
          .eq('id', tc.id);

        if (error) throw error;

        // UI 업데이트
        onUpdate({ ...tc, folder: null });
      }

      // 데이터베이스에서 폴더 삭제
      const { error: deleteFolderError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderToDelete.id);

      if (deleteFolderError) throw deleteFolderError;

      // 로컬 상태 업데이트
      setFolders(folders.filter(f => f.id !== folderToDelete.id));
      
      if (selectedFolder === folderToDelete.id) {
        setSelectedFolder('all');
      }

      // 전체 데이터 새로고침
      await onRefresh();

      // 토스트 메시지 표시
      setToastMessage(`"${folderToDelete.name}" 폴더가 삭제되었습니다. ${testCasesInFolder.length}개의 테스트 케이스가 폴더 미지정 상태로 변경되었습니다.`);
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('폴더 삭제 오류:', error);
      setToastMessage('폴더 삭제에 실패했습니다.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } finally {
      setDeletingFolder(false);
      setShowDeleteFolderModal(false);
      setFolderToDelete(null);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !selectedTestCase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요합니다.');
        return;
      }

      const { data, error } = await supabase
        .from('test_case_comments')
        .insert({
          test_case_id: selectedTestCase.id,
          user_id: user.id,
          comment: commentText.trim(),
        })
        .select(`
          id,
          comment,
          created_at,
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      const newCommentObj: Comment = {
        id: data.id,
        text: data.comment,
        author: data.profiles?.full_name || data.profiles?.email || 'Unknown User',
        timestamp: new Date(data.created_at),
        user_id: data.user_id,
      };

      setComments([...comments, newCommentObj]);
      setCommentText('');
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      alert('코멘트 추가에 실패했습니다.');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTestCase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요합니다.');
        return;
      }

      const { data, error } = await supabase
        .from('test_case_comments')
        .insert({
          test_case_id: selectedTestCase.id,
          user_id: user.id,
          comment: newComment.trim(),
        })
        .select(`
          id,
          comment,
          created_at,
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      const newCommentObj: Comment = {
        id: data.id,
        text: data.comment,
        author: data.profiles?.full_name || data.profiles?.email || 'Unknown User',
        timestamp: new Date(data.created_at),
        user_id: data.user_id,
      };

      setComments([...comments, newCommentObj]);
      setNewComment('');
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      alert('코멘트 추가에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('이 코멘트를 삭제하시겠습니까?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const comment = comments.find(c => c.id === commentId);
      if (comment && comment.user_id !== user.id) {
        alert('본인의 코멘트만 삭제할 수 있습니다.');
        return;
      }

      const { error } = await supabase
        .from('test_case_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('코멘트 삭제에 실패했습니다.');
    }
  };

  const getFolderColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700',
      blue: 'bg-blue-100 text-blue-700',
      purple: 'bg-purple-100 text-purple-700',
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      pink: 'bg-pink-100 text-pink-700',
      indigo: 'bg-indigo-100 text-indigo-700',
    };
    return colorMap[color] || 'bg-gray-100 text-gray-700';
  };

  const allFolders = [
    { 
      id: 'all', 
      name: 'All Test Cases', 
      count: testCases.length, 
      icon: 'ri-folder-line',
      color: 'gray'
    },
    ...folders.map(folder => ({
      ...folder,
      count: testCases.filter(tc => tc.folder === folder.name).length,
    })),
  ];

  const filteredTestCases = (selectedFolder === 'all' 
    ? testCases 
    : testCases.filter(tc => {
        const folder = folders.find(f => f.id === selectedFolder);
        return folder && tc.folder === folder.name;
      })
  ).slice().sort((a, b) => {
    const idA = a.custom_id || '';
    const idB = b.custom_id || '';
    // 숫자 부분 추출하여 숫자 정렬, 없으면 문자열 정렬
    const numA = parseInt(idA.replace(/\D/g, ''), 10);
    const numB = parseInt(idB.replace(/\D/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return idA.localeCompare(idB);
  });

  // 전체 선택 여부 확인
  const isAllSelected = filteredTestCases.length > 0 && filteredTestCases.every(tc => selectedTestCaseIds.has(tc.id));
  const isSomeSelected = filteredTestCases.some(tc => selectedTestCaseIds.has(tc.id)) && !isAllSelected;

  // Virtual scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredTestCases.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;

  // 전체 선택/해제 핸들러
  const handleSelectAll = () => {
    if (isAllSelected) {
      // 전체 해제
      const newSelected = new Set(selectedTestCaseIds);
      filteredTestCases.forEach(tc => newSelected.delete(tc.id));
      setSelectedTestCaseIds(newSelected);
    } else {
      // 전체 선택
      const newSelected = new Set(selectedTestCaseIds);
      filteredTestCases.forEach(tc => newSelected.add(tc.id));
      setSelectedTestCaseIds(newSelected);
    }
  };

  // 개별 선택 핸들러
  const handleSelectTestCase = (testCaseId: string) => {
    const newSelected = new Set(selectedTestCaseIds);
    if (newSelected.has(testCaseId)) {
      newSelected.delete(testCaseId);
    } else {
      newSelected.add(testCaseId);
    }
    setSelectedTestCaseIds(newSelected);
  };

  const handleAddStep = () => {
    const newStep: TestStep = {
      id: Date.now().toString(),
      step: '',
      expectedResult: '',
    };
    setTestSteps([...testSteps, newStep]);
  };

  const handleDeleteStep = (stepId: string) => {
    if (testSteps.length > 1) {
      setTestSteps(testSteps.filter(s => s.id !== stepId));
    }
  };

  const handleStepChange = (stepId: string, field: 'step' | 'expectedResult', value: string) => {
    setTestSteps(testSteps.map(s => 
      s.id === stepId ? { ...s, [field]: value } : s
    ));
  };

  const handleSubmit = async () => {
    if (!newTestCase.title.trim()) {
      alert('테스트 케이스 제목을 입력해주세요.');
      return;
    }

    // Convert steps array to string format for storage
    const stepsString = testSteps
      .map((step, index) => `${index + 1}. ${step.step}`)
      .join('\n');
    
    const expectedResultString = testSteps
      .map((step, index) => `${index + 1}. ${step.expectedResult}`)
      .join('\n');

    const updatedTestCaseData = {
      ...newTestCase,
      steps: stepsString,
      expected_result: expectedResultString,
    };

    if (editingTestCase) {
      // 변경된 필드 추적 및 히스토리 기록
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // editingTestCase.steps가 배열인지 문자열인지 확인
        const oldStepsString = Array.isArray(editingTestCase.steps)
          ? editingTestCase.steps.map(s => s.step).join('\n')
          : (editingTestCase.steps || '');
        
        const oldExpectedResultString = Array.isArray(editingTestCase.steps)
          ? editingTestCase.steps.map(s => s.expectedResult).join('\n')
          : (editingTestCase.expected_result || '');

        // 이전 스냅샷 저장 (old_value에 JSON으로 저장)
        const oldSnapshot: TestCaseSnapshot = {
          title: editingTestCase.title || '',
          description: editingTestCase.description || '',
          precondition: editingTestCase.precondition || '',
          priority: editingTestCase.priority || 'medium',
          folder: editingTestCase.folder || '',
          tags: editingTestCase.tags || '',
          steps: oldStepsString,
          expected_result: oldExpectedResultString,
          assignee: editingTestCase.assignee || '',
          is_automated: editingTestCase.is_automated || false,
        };

        // 새 스냅샷 (new_value에 JSON으로 저장)
        const newSnapshot: TestCaseSnapshot = {
          title: newTestCase.title,
          description: newTestCase.description,
          precondition: newTestCase.precondition,
          priority: newTestCase.priority,
          folder: newTestCase.folder,
          tags: newTestCase.tags,
          steps: stepsString,
          expected_result: expectedResultString,
          assignee: newTestCase.assignee || '',
          is_automated: newTestCase.is_automated || false,
        };

        // 변경된 필드 목록 생성
        const changedFields: string[] = [];
        if (oldSnapshot.title !== newSnapshot.title) changedFields.push('title');
        if (oldSnapshot.description !== newSnapshot.description) changedFields.push('description');
        if (oldSnapshot.precondition !== newSnapshot.precondition) changedFields.push('precondition');
        if (oldSnapshot.priority !== newSnapshot.priority) changedFields.push('priority');
        if (oldSnapshot.folder !== newSnapshot.folder) changedFields.push('folder');
        if (oldSnapshot.tags !== newSnapshot.tags) changedFields.push('tags');
        if (oldSnapshot.steps !== newSnapshot.steps) changedFields.push('steps');
        if (oldSnapshot.expected_result !== newSnapshot.expected_result) changedFields.push('expected_result');
        if (oldSnapshot.assignee !== newSnapshot.assignee) changedFields.push('assignee');
        if (oldSnapshot.is_automated !== newSnapshot.is_automated) changedFields.push('is_automated');

        // 히스토리 기록 (전체 스냅샷 저장)
        await supabase.from('test_case_history').insert({
          test_case_id: editingTestCase.id,
          user_id: user.id,
          action_type: 'updated',
          field_name: changedFields.join(', ') || 'no changes',
          old_value: JSON.stringify(oldSnapshot),
          new_value: JSON.stringify(newSnapshot),
        });
      }

      const finalTestCase = { 
        ...editingTestCase, 
        ...updatedTestCaseData,
      };
      onUpdate(finalTestCase);

      // Update the selected test case in the details panel
      if (selectedTestCase?.id === editingTestCase.id) {
        setSelectedTestCase(finalTestCase);
        // 히스토리 새로고침
        if (activeTab === 'history') {
          fetchHistory(editingTestCase.id);
        }
      }
      setEditingTestCase(null);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      onAdd({
        ...updatedTestCaseData,
        status: 'untested',
        created_by: user?.id,
      });
    }
    setNewTestCase({
      title: '',
      description: '',
      precondition: '',
      folder: '',
      priority: 'medium',
      assignee: '',
      is_automated: false,
      steps: '',
      expected_result: '',
      tags: '',
      attachments: [],
    });
    setTestSteps([{ id: '1', step: '', expectedResult: '' }]);
    setShowNewCaseModal(false);
  };

  const handleEdit = (testCase: TestCase) => {
    setEditingTestCase(testCase);
    setNewTestCase({
      title: testCase.title,
      description: testCase.description || '',
      precondition: testCase.precondition || '',
      folder: testCase.folder || '',
      priority: testCase.priority,
      assignee: testCase.assignee || '',
      is_automated: testCase.is_automated,
      steps: testCase.steps || '',
      expected_result: testCase.expected_result || '',
      tags: testCase.tags || '',
      attachments: testCase.attachments || [],
    });
    setTagInput('');

    // Parse steps back to array format
    if (testCase.steps) {
      const stepsArray = testCase.steps.split('\n').filter(s => s.trim());
      const expectedResults = testCase.expected_result?.split('\n').filter(s => s.trim()) || [];
      
      const parsedSteps: TestStep[] = stepsArray.map((step, index) => ({
        id: (index + 1).toString(),
        step: step.replace(/^\d+\.\s*/, ''),
        expectedResult: expectedResults[index]?.replace(/^\d+\.\s*/, '') || '',
      }));

      setTestSteps(parsedSteps.length > 0 ? parsedSteps : [{ id: '1', step: '', expectedResult: '' }]);
    } else {
      setTestSteps([{ id: '1', step: '', expectedResult: '' }]);
    }

    setShowNewCaseModal(true);
  };

  const handleStatusChange = async (testCase: TestCase, newStatus: string) => {
    const oldStatus = testCase.status;
    onUpdate({ ...testCase, status: newStatus });
    
    // 상태 변경 히스토리 기록 (스냅샷 포함)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('test_case_history').insert({
        test_case_id: testCase.id,
        user_id: user.id,
        action_type: 'updated',
        field_name: 'status',
        old_value: oldStatus,
        new_value: newStatus,
      });
    }
    
    if (selectedTestCase?.id === testCase.id) {
      setSelectedTestCase({ ...testCase, status: newStatus });
      if (activeTab === 'history') {
        fetchHistory(testCase.id);
      }
    }
  };

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
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'untested':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return 'ri-checkbox-circle-fill';
      case 'failed':
        return 'ri-close-circle-fill';
      case 'pending':
        return 'ri-time-fill';
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
      case 'pending':
        return 'Pending';
      case 'untested':
        return 'Untested';
      default:
        return 'Unknown';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingFile(true);
      const uploadedFiles: { name: string; url: string; size: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${projectId}/testcases/${fileName}`;

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

      if (isEdit && editingTestCase) {
        setEditingTestCase({
          ...editingTestCase,
          attachments: [...(editingTestCase.attachments || []), ...uploadedFiles],
        });
        setNewTestCase({
          ...newTestCase,
          attachments: [...(editingTestCase.attachments || []), ...uploadedFiles],
        });
      } else {
        setNewTestCase({
          ...newTestCase,
          attachments: [...newTestCase.attachments, ...uploadedFiles],
        });
      }
    } catch (error: any) {
      console.error('파일 업로드 오류:', error);
      alert(`파일 업로드에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (index: number, isEdit: boolean = false) => {
    try {
      const attachments = isEdit && editingTestCase ? editingTestCase.attachments : newTestCase.attachments;
      const fileToRemove = attachments[index];
      
      // Extract file path from URL
      if (fileToRemove.url) {
        const urlParts = fileToRemove.url.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'test-case-attachments');
        if (bucketIndex !== -1) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/');
          
          // Delete from storage
          const { error } = await supabase.storage
            .from('test-case-attachments')
            .remove([filePath]);
          
          if (error) {
            console.error('파일 삭제 오류:', error);
          }
        }
      }

      // Remove from state
      if (isEdit && editingTestCase) {
        const newAttachments = [...editingTestCase.attachments];
        newAttachments.splice(index, 1);
        setEditingTestCase({
          ...editingTestCase,
          attachments: newAttachments,
        });
        setNewTestCase({
          ...newTestCase,
          attachments: newAttachments,
        });
      } else {
        const newAttachments = [...newTestCase.attachments];
        newAttachments.splice(index, 1);
        setNewTestCase({
          ...newTestCase,
          attachments: newAttachments,
        });
      }
    } catch (error) {
      console.error('첨부파일 삭제 오류:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUpdateTestCase = async (testCaseId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('test_cases')
        .update(updates)
        .eq('id', testCaseId);

      if (error) throw error;

      // Fetch updated test case with creator info
      const { data: updatedTestCase, error: fetchError } = await supabase
        .from('test_cases')
        .select(`
          *,
          creator:profiles!test_cases_created_by_fkey(id, full_name, email)
        `)
        .eq('id', testCaseId)
        .single();

      if (fetchError) throw fetchError;

      // Update via parent component's onUpdate callback
      onUpdate(updatedTestCase);
    } catch (error) {
      console.error('Error updating test case:', error);
      throw error;
    }
  };

  const uploadFiles = async (files: FileList) => {
    const uploadedFiles: Array<{ name: string; url: string; size: number }> = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${i}.${fileExt}`;
      
      try {
        const { data, error } = await supabase.storage
          .from('test-case-attachments')
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('test-case-attachments')
          .getPublicUrl(fileName);

        uploadedFiles.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
        });
      } catch (error) {
        console.error('File upload error:', error);
      }
    }

    return uploadedFiles;
  };

  const deleteFile = async (fileUrl: string) => {
    try {
      const fileName = fileUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('test-case-attachments')
          .remove([fileName]);
      }
    } catch (error) {
      console.error('File delete error:', error);
    }
  };

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile) {
          setCurrentUser(profile);
        }
      }
    };
    fetchCurrentUser();
  }, []);

  // 프로젝트 멤버 목록 가져오기
  useEffect(() => {
    const fetchProjectMembers = async () => {
      try {
        setLoadingMembers(true);
        const { data, error } = await supabase
          .from('project_members')
          .select(`
            id,
            user_id,
            role,
            profile:profiles!project_members_user_id_profiles_fkey(id, full_name, email)
          `)
          .eq('project_id', projectId);

        if (error) throw error;
        setProjectMembers(data || []);
      } catch (error) {
        console.error('프로젝트 멤버 조회 오류:', error);
        setProjectMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    };
    
    fetchProjectMembers();
  }, [projectId]);

  // 테스트 케이스 선택 시 히스토리 가져오기
  useEffect(() => {
    if (selectedTestCase && activeTab === 'history') {
      fetchHistory(selectedTestCase.id);
    }
  }, [selectedTestCase, activeTab]);

  // Load comments when detail panel opens
  useEffect(() => {
    if (selectedTestCase) {
      loadComments(selectedTestCase.id);
    }
  }, [selectedTestCase]);

  const loadComments = async (testCaseId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('test_case_comments')
        .select(`
          id,
          comment,
          created_at,
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('test_case_id', testCaseId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedComments: Comment[] = (data || []).map((item: any) => ({
        id: item.id,
        text: item.comment,
        author: item.profiles?.full_name || item.profiles?.email || 'Unknown User',
        timestamp: new Date(item.created_at),
        user_id: item.user_id,
      }));

      setComments(formattedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleHistoryClick = (history: TestCaseHistory) => {
    if (history.action_type !== 'updated') return; // 'updated'만 클릭 가능
    setSelectedHistory(history);
    setShowHistoryModal(true);
  };

  const handleRestoreVersion = async () => {
    if (!selectedHistory || !selectedTestCase) return;
    
    try {
      setRestoringHistory(true);
      
      // old_value에서 이전 스냅샷 파싱
      const oldSnapshot: TestCaseSnapshot = JSON.parse(selectedHistory.old_value || '{}');
      
      // 테스트 케이스 업데이트
      const { data, error } = await supabase
        .from('test_cases')
        .update({
          title: oldSnapshot.title,
          description: oldSnapshot.description || null,
          priority: oldSnapshot.priority,
          folder: oldSnapshot.folder || null,
          tags: oldSnapshot.tags || null,
          steps: oldSnapshot.steps || null,
          expected_result: oldSnapshot.expected_result || null,
          assignee: oldSnapshot.assignee || null,
          is_automated: oldSnapshot.is_automated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTestCase.id)
        .select()
        .single();

      if (error) throw error;

      // 복원 히스토리 기록
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const currentSnapshot: TestCaseSnapshot = {
          title: selectedTestCase.title,
          description: selectedTestCase.description || '',
          precondition: selectedTestCase.precondition || '',
          priority: selectedTestCase.priority,
          folder: selectedTestCase.folder || '',
          tags: selectedTestCase.tags || '',
          steps: selectedTestCase.steps || '',
          expected_result: selectedTestCase.expected_result || '',
          assignee: selectedTestCase.assignee || '',
          is_automated: selectedTestCase.is_automated,
        };

        await supabase.from('test_case_history').insert({
          test_case_id: selectedTestCase.id,
          user_id: user.id,
          action_type: 'restored',
          field_name: 'restored from previous version',
          old_value: JSON.stringify(currentSnapshot),
          new_value: JSON.stringify(oldSnapshot),
        });
      }

      // UI 업데이트
      onUpdate(data);
      setSelectedTestCase(data);
      setShowHistoryModal(false);
      setSelectedHistory(null);
      fetchHistory(selectedTestCase.id);
      
      alert('이전 버전으로 복원되었습니다.');
    } catch (error) {
      console.error('복원 오류:', error);
      alert('복원에 실패했습니다.');
    } finally {
      setRestoringHistory(false);
    }
  };

  const parseSnapshot = (value: string | undefined): TestCaseSnapshot | null => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  // HTML 태그를 제거하고 텍스트만 추출하는 함수
  const stripHtml = (html: string): string => {
    if (!html) return '';
    // HTML 태그 제거
    const withoutTags = html.replace(/<[^>]*>/g, ' ');
    // HTML 엔티티 디코딩
    const decoded = withoutTags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    // 연속 공백 정리
    return decoded.replace(/\s+/g, ' ').trim();
  };

  // HTML을 줄바꿈 구조로 변환하는 함수 (p, li, br 태그를 줄바꿈으로)
  const htmlToText = (html: string): string => {
    if (!html) return '';
    return html
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Tag 관련 함수들
  const getTagsArray = (): string[] => {
    if (!newTestCase.tags) return [];
    return newTestCase.tags.split(',').map(t => t.trim()).filter(t => t);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      const trimmedTag = tagInput.trim();
      if (trimmedTag) {
        const currentTags = getTagsArray();
        if (!currentTags.includes(trimmedTag)) {
          const newTags = [...currentTags, trimmedTag].join(', ');
          setNewTestCase({ ...newTestCase, tags: newTags });
        }
        setTagInput('');
      }
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = getTagsArray();
    const newTags = currentTags.filter(t => t !== tagToRemove).join(', ');
    setNewTestCase({ ...newTestCase, tags: newTags });
  };

  // 히스토리 데이터 가져오기 함수
  const fetchHistory = async (testCaseId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('test_case_history')
        .select('*')
        .eq('test_case_id', testCaseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 사용자 정보를 별도로 가져오기
      const userIds = [...new Set(data?.map(h => h.user_id).filter(Boolean) || [])];
      
      let usersMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (users) {
          usersMap = users.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // 히스토리 데이터에 사용자 정보 병합
      const historyWithUsers = data?.map(history => ({
        ...history,
        user: history.user_id ? usersMap[history.user_id] : null
      })) || [];

      setHistoryData(historyWithUsers);
    } catch (error) {
      console.error('히스토리 조회 오류:', error);
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 테스트 결과 가져오기 함수
  const fetchTestResults = async (testCaseId: string) => {
    setLoadingResults(true);
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
          run:test_runs!test_results_run_id_fkey(
            id,
            name
          )
        `)
        .eq('test_case_id', testCaseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTestResults(data || []);

      // Issues 추출
      const allIssues: TestIssue[] = [];
      (data || []).forEach((result: any) => {
        if (result.issues && result.issues.length > 0) {
          result.issues.forEach((issueKey: string) => {
            allIssues.push({
              id: `${result.id}-${issueKey}`,
              issue_key: issueKey,
              run_name: result.run?.name || 'Unknown Run',
              run_id: result.run_id,
              status: result.status,
              created_at: result.created_at,
            });
          });
        }
      });
      setTestIssues(allIssues);
    } catch (error) {
      console.error('테스트 결과 조회 오류:', error);
      setTestResults([]);
      setTestIssues([]);
    } finally {
      setLoadingResults(false);
      setLoadingIssues(false);
    }
  };

  // 테스트 케이스 선택 시 결과 가져오기
  useEffect(() => {
    if (selectedTestCase) {
      if (activeTab === 'results' || activeTab === 'issues') {
        fetchTestResults(selectedTestCase.id);
      }
    }
  }, [selectedTestCase, activeTab]);

  // 선택된 테스트 케이스들을 폴더에 일괄 추가
  const handleBulkAddToFolder = async (folderName: string) => {
    if (selectedTestCaseIds.size === 0) return;

    try {
      const selectedIds = Array.from(selectedTestCaseIds);
      
      // 각 테스트 케이스 업데이트
      for (const id of selectedIds) {
        const { error } = await supabase
          .from('test_cases')
          .update({ folder: folderName, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
      }

      const addedCount = selectedIds.length;
      
      // 선택 초기화 및 모달 닫기
      setSelectedTestCaseIds(new Set());
      setShowBulkFolderModal(false);
      
      // 전체 데이터 새로고침
      await onRefresh();
      
      // 토스트 메시지 표시
      setToastMessage(`${addedCount}개의 테스트 케이스가 "${folderName}" 폴더로 이동되었습니다.`);
      setToastType('success');
      setShowToast(true);
      
      // 3초 후 토스트 자동 숨김
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (error) {
      console.error('폴더 일괄 추가 오류:', error);
      setToastMessage('폴더 추가에 실패했습니다.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }
  };

  // 선택된 테스트 케이스들의 폴더 제거
  const handleBulkRemoveFromFolder = async () => {
    if (selectedTestCaseIds.size === 0) return;

    try {
      const selectedIds = Array.from(selectedTestCaseIds);
      
      for (const id of selectedIds) {
        const { error } = await supabase
          .from('test_cases')
          .update({ folder: null, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
      }

      const removedCount = selectedIds.length;
      setSelectedTestCaseIds(new Set());
      
      // 전체 데이터 새로고침
      await onRefresh();
      
      // 토스트 메시지 표시
      setToastMessage(`${removedCount}개의 테스트 케이스가 폴더에서 제거되었습니다.`);
      setToastType('success');
      setShowToast(true);
      
      // 3초 후 토스트 자동 숨김
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (error) {
      console.error('폴더 제거 오류:', error);
      setToastMessage('폴더 제거에 실패했습니다.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }
  };

  // 선택된 테스트 케이스 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedTestCaseIds.size === 0) return;

    try {
      setBulkDeleting(true);
      const selectedIds = Array.from(selectedTestCaseIds);

      for (const id of selectedIds) {
        const { error } = await supabase
          .from('test_cases')
          .delete()
          .eq('id', id);

        if (error) throw error;

        onDelete(id);
      }

      const deletedCount = selectedIds.length;
      setSelectedTestCaseIds(new Set());
      setShowBulkDeleteModal(false);

      if (selectedTestCase && selectedIds.includes(selectedTestCase.id)) {
        setSelectedTestCase(null);
      }

      await onRefresh();

      setToastMessage(`${deletedCount}개의 테스트 케이스가 삭제되었습니다.`);
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('일괄 삭제 오류:', error);
      setToastMessage('테스트 케이스 삭제에 실패했습니다.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } finally {
      setBulkDeleting(false);
    }
  };

  // 복사 가능한 프로젝트 목록 가져오기
  const fetchAvailableProjects = async () => {
    try {
      setLoadingProjects(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 현재 프로젝트를 제외한 사용자의 프로젝트 목록
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, status')
        .neq('id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableProjects(data || []);
    } catch (error) {
      console.error('프로젝트 목록 조회 오류:', error);
      setAvailableProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // 선택한 테스트 케이스를 다른 프로젝트로 복사
  const handleCopyToProject = async (targetProjectId: string) => {
    if (selectedTestCaseIds.size === 0) return;

    try {
      setCopyingToProject(true);
      setCopyTargetProjectId(targetProjectId);

      const { data: { user } } = await supabase.auth.getUser();
      const selectedIds = Array.from(selectedTestCaseIds);
      const selectedCases = testCases.filter(tc => selectedIds.includes(tc.id));

      // 복사할 테스트 케이스에서 사용된 폴더 이름 목록 추출
      const requiredFolderNames = [...new Set(
        selectedCases.map(tc => tc.folder).filter((f): f is string => !!f)
      )];

      // 대상 프로젝트의 기존 폴더 조회
      const { data: existingFolders, error: folderFetchError } = await supabase
        .from('folders')
        .select('name, icon, color')
        .eq('project_id', targetProjectId);

      if (folderFetchError) throw folderFetchError;

      const existingFolderNames = new Set((existingFolders || []).map(f => f.name));

      // 현재 프로젝트의 폴더 정보 조회 (icon, color 복사용)
      const { data: sourceFolders } = await supabase
        .from('folders')
        .select('name, icon, color')
        .eq('project_id', projectId);

      const sourceFolderMap = new Map(
        (sourceFolders || []).map(f => [f.name, { icon: f.icon, color: f.color }])
      );

      // 대상 프로젝트에 없는 폴더 자동 생성
      const foldersToCreate = requiredFolderNames.filter(name => !existingFolderNames.has(name));

      if (foldersToCreate.length > 0) {
        const newFoldersData = foldersToCreate.map(name => {
          const sourceInfo = sourceFolderMap.get(name);
          return {
            project_id: targetProjectId,
            name,
            icon: sourceInfo?.icon || 'ri-folder-line',
            color: sourceInfo?.color || 'gray',
          };
        });

        const { error: folderCreateError } = await supabase
          .from('folders')
          .insert(newFoldersData);

        if (folderCreateError) throw folderCreateError;
      }

      // 테스트 케이스 복사
      const insertData = selectedCases.map(tc => ({
        project_id: targetProjectId,
        title: tc.title,
        description: tc.description || null,
        precondition: tc.precondition || null,
        priority: tc.priority,
        status: 'untested',
        is_automated: tc.is_automated,
        folder: tc.folder || null,
        tags: tc.tags || null,
        steps: tc.steps || null,
        expected_result: tc.expected_result || null,
        assignee: null,
        created_by: user?.id || null,
      }));

      const { data: inserted, error } = await supabase
        .from('test_cases')
        .insert(insertData)
        .select('id');

      if (error) throw error;

      // 히스토리 기록
      if (inserted && user) {
        const historyData = inserted.map((tc: { id: string }) => ({
          test_case_id: tc.id,
          user_id: user.id,
          action_type: 'created',
        }));
        await supabase.from('test_case_history').insert(historyData);
      }

      const targetProject = availableProjects.find(p => p.id === targetProjectId);
      setSelectedTestCaseIds(new Set());
      setShowCopyToProjectModal(false);

      const folderMsg = foldersToCreate.length > 0
        ? ` (${foldersToCreate.length}개 폴더 자동 생성됨)`
        : '';

      setToastMessage(`${selectedIds.length}개의 테스트 케이스가 "${targetProject?.name}" 프로젝트로 복사되었습니다.${folderMsg}`);
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (error) {
      console.error('복사 오류:', error);
      setToastMessage('테스트 케이스 복사에 실패했습니다.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } finally {
      setCopyingToProject(false);
      setCopyTargetProjectId(null);
    }
  };

  // 필드 레이블 변환 함수
  const getFieldLabel = (field: string): string => {
    const fieldLabels: Record<string, string> = {
      title: 'Title',
      description: 'Description',
      precondition: 'PreCondition',
      priority: 'Priority',
      folder: 'Folder',
      tags: 'Tags',
      steps: 'Steps',
      expected_result: 'Expected Result',
      assignee: 'Assignee',
      is_automated: 'Automated',
      status: 'Status',
    };
    return fieldLabels[field] || field;
  };

  return (
    <>
    <div className="flex h-full">
      {/* 폴더 사이드바 */}
      <div className={`${isFolderPanelOpen ? 'w-80' : 'w-0'} bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden`}>
        <div className="w-80 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Folders</h2>
            <div className="space-y-1">
              {allFolders.map((folder) => (
                <div key={folder.id} className="group relative">
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      selectedFolder === folder.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getFolderColorClass(folder.color)}`}>
                        <i className={`${folder.icon} text-lg`}></i>
                      </div>
                      <span className="font-medium">{folder.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{folder.count}</span>
                      {folder.id !== 'all' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line text-xl w-5 h-5 flex items-center justify-center"></i>
              New Folder
            </button>
          </div>
        </div>
      </div>

      {/* 토글 버튼 */}
      <button
        onClick={() => setIsFolderPanelOpen(!isFolderPanelOpen)}
        className="w-8 h-12 bg-white border border-gray-200 rounded-r-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer self-start mt-8 -ml-px"
      >
        <i className={`${isFolderPanelOpen ? 'ri-arrow-left-s-line' : 'ri-arrow-right-s-line'} text-xl`}></i>
      </button>

      {/* 테스트 케이스 목록 */}
      <div className={`${selectedTestCase ? 'flex-1' : 'flex-1'} p-8`}>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Cases</h1>
              <p className="text-gray-600 mb-6">Manage and execute all test cases</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingTestCase(null);
                    // 현재 선택된 폴더가 있으면 해당 폴더로 설정
                    const currentFolder = selectedFolder !== 'all' 
                      ? folders.find(f => f.id === selectedFolder)?.name || ''
                      : '';
                    setNewTestCase({
                      title: '',
                      description: '',
                      precondition: '',
                      folder: currentFolder,
                      priority: 'medium',
                      assignee: '',
                      is_automated: false,
                      steps: '',
                      expected_result: '',
                      tags: '',
                      attachments: [],
                    });
                    setTestSteps([{ id: '1', step: '', expectedResult: '' }]);
                    setShowNewCaseModal(true);
                  }}
                  className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-add-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  New Test Case
                </button>
                <button
                  onClick={handleOpenExportImport}
                  className="px-5 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-file-transfer-line text-lg w-5 h-5 flex items-center justify-center"></i>
                  Export / Import
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          {filteredTestCases.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-file-list-3-line text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No test cases</h3>
              <p className="text-gray-600 mb-6">Create your first test case</p>
              <button
                onClick={() => {
                  setEditingTestCase(null);
                  // 현재 선택된 폴더가 있으면 해당 폴더로 설정
                  const currentFolder = selectedFolder !== 'all' 
                    ? folders.find(f => f.id === selectedFolder)?.name || ''
                    : '';
                  setNewTestCase({
                    title: '',
                    description: '',
                    precondition: '',
                    folder: currentFolder,
                    priority: 'medium',
                    assignee: '',
                    is_automated: false,
                    steps: '',
                    expected_result: '',
                    tags: '',
                    attachments: [],
                  });
                  setTestSteps([{ id: '1', step: '', expectedResult: '' }]);
                  setShowNewCaseModal(true);
                }}
                className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
              >
                Create Test Case
              </button>
            </div>
          ) : (
            <div
              ref={tableContainerRef}
              className="overflow-x-auto overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = isSomeSelected;
                          }
                        }}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Test Case
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Lifecycle
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Folder
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paddingTop > 0 && (
                    <tr><td colSpan={6} style={{ height: paddingTop }} /></tr>
                  )}
                  {virtualItems.map((vItem) => {
                    const testCase = filteredTestCases[vItem.index];
                    const lcStatus = testCase.lifecycle_status || 'active';
                    return (
                    <tr
                      key={testCase.id}
                      className={`hover:bg-gray-50 transition-all cursor-pointer ${
                        selectedTestCase?.id === testCase.id ? 'bg-indigo-50' : ''
                      }`}
                      style={lcStatus === 'deprecated' ? { opacity: 0.5 } : undefined}
                      onClick={() => { setSelectedTestCase(testCase); window.scrollTo(0, 0); }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, tcId: testCase.id, tcTitle: testCase.title });
                        setContextMenuStatusOpen(false);
                      }}
                    >
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                          checked={selectedTestCaseIds.has(testCase.id)}
                          onChange={() => handleSelectTestCase(testCase.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 font-mono">
                          {testCase.custom_id || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <LifecycleBadge
                          status={lcStatus}
                          size="sm"
                          clickable
                          onStatusChange={(ns) => handleLifecycleChange(testCase, ns)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {testCase.is_automated && (
                            <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                              <i className="ri-robot-line text-purple-600 text-lg"></i>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-gray-900 mb-1">
                              {testCase.title}
                            </div>
                            {testCase.description && (
                              <div className="text-xs text-gray-500">{testCase.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {testCase.folder ? (
                          <span className="text-sm text-gray-600">{testCase.folder}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                            testCase.priority
                          )}`}
                        >
                          {testCase.priority.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                  {paddingBottom > 0 && (
                    <tr><td colSpan={6} style={{ height: paddingBottom }} /></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 우측 상세 패널 */}
      {selectedTestCase && (
        <div ref={detailPanelRef} className="w-2/5 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {selectedTestCase.custom_id && (
                  <div className="text-sm text-gray-500 font-mono mb-2">
                    {selectedTestCase.custom_id}
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedTestCase.title}
                </h2>
                {selectedTestCase.description && (
                  <p className="text-sm text-gray-600">{selectedTestCase.description}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedTestCase(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {selectedTestCase.is_automated && (
                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {selectedTestCase.assignee.substring(0, 2).toUpperCase()}
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
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Priority</label>
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
                    <label className="block text-xs font-semibold text-gray-500 mb-2">Folder</label>
                    <p className="text-sm text-gray-900">{selectedTestCase.folder}</p>
                  </div>
                )}

                {selectedTestCase.tags && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTestCase.tags.split(',').map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTestCase.assignee && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">Assignee</label>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {selectedTestCase.assignee.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-900">{selectedTestCase.assignee}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Created</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedTestCase.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {selectedTestCase.precondition && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">PreCondition</label>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{htmlToText(selectedTestCase.precondition)}</p>
                  </div>
                </div>
              )}

              {selectedTestCase.steps && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Test Steps</label>
                  <div className="space-y-2">
                    {selectedTestCase.steps.split('\n').filter(s => s.trim()).map((step, index) => {
                      const content = step.replace(/^\d+\.\s*/, '');
                      const isHtml = /<[^>]+>/.test(content);
                      return (
                        <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                          <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-semibold text-xs flex-shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          {isHtml ? (
                            <div
                              className="text-sm text-gray-700 flex-1 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                              dangerouslySetInnerHTML={{ __html: content }}
                            />
                          ) : (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">{content}</p>
                          )}
                        </div>
                      );
                    })}
                    {/* 하단 Add step 버튼 */}
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={handleAddStep}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-add-line text-lg w-4 h-4 flex items-center justify-center"></i>
                        Add step
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedTestCase.expected_result && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Expected Result</label>
                  <div className="space-y-2">
                    {selectedTestCase.expected_result.split('\n').filter(s => s.trim()).map((result, index) => {
                      const content = result.replace(/^\d+\.\s*/, '');
                      const isHtml = /<[^>]+>/.test(content);
                      return (
                        <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold text-xs flex-shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          {isHtml ? (
                            <div
                              className="text-sm text-gray-700 flex-1 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                              dangerouslySetInnerHTML={{ __html: content }}
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Attachments</label>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedTestCase.attachments.map((file, index) => (
                      <div
                        key={index}
                        onClick={() => setImagePreview(file.url)}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-all border border-gray-200"
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

              <div className="pt-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => handleEdit(selectedTestCase)}
                  className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this test case?')) {
                      onDelete(selectedTestCase.id);
                      setSelectedTestCase(null);
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all font-semibold cursor-pointer whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
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
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                History
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
                    className="mt-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap"
                  >
                    Post Comment
                  </button>
                </div>
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <div className="text-center py-8">
                      <i className="ri-chat-3-line text-3xl text-gray-300 mb-2"></i>
                      <p className="text-sm text-gray-500">No comments yet</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-4 group relative">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {comment.author.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">{comment.author}</span>
                              <span className="text-xs text-gray-500">
                                {comment.timestamp.toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
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
                {loadingResults ? (
                  <div className="text-center py-8">
                    <i className="ri-loader-4-line animate-spin text-2xl text-gray-400 mb-2"></i>
                    <p className="text-sm text-gray-500">Loading results...</p>
                  </div>
                ) : testResults.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="ri-file-list-line text-3xl text-gray-300 mb-2"></i>
                    <p className="text-sm text-gray-500">No test results yet</p>
                  </div>
                ) : (
                  testResults.map((result) => (
                    <div key={result.id} className="bg-gray-50 rounded-lg p-4">
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
                            {result.status}
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
                        <p className="text-sm text-gray-900 font-medium">{result.run?.name || 'Unknown Run'}</p>
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
                            {result.issues.map((issue, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                <i className="ri-bug-line mr-1"></i>
                                {issue}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(result.created_at).toLocaleDateString('en-US', {
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
                {loadingIssues ? (
                  <div className="text-center py-8">
                    <i className="ri-loader-4-line animate-spin text-2xl text-gray-400 mb-2"></i>
                    <p className="text-sm text-gray-500">Loading issues...</p>
                  </div>
                ) : testIssues.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="ri-bug-line text-3xl text-gray-300 mb-2"></i>
                    <p className="text-sm text-gray-500">No issues linked</p>
                  </div>
                ) : (
                  testIssues.map((issue) => (
                    <div key={issue.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="ri-bug-line text-red-600"></i>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{issue.issue_key}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            From run: <span className="font-medium text-gray-700">{issue.run_name}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              issue.status === 'passed' ? 'bg-green-100 text-green-700' :
                              issue.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {issue.status}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(issue.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* History 탭 */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {loadingHistory ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No history available</div>
                ) : (
                  historyData.map((history: any) => {
                    const userName = history.user?.full_name || history.user?.email || 'Unknown';
                    const userInitials = userName.substring(0, 2).toUpperCase();
                    const timestamp = new Date(history.created_at).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    // 변경된 필드 목록 파싱
                    const changedFields = history.field_name?.split(', ').filter((f: string) => f && f !== 'no changes') || [];
                    
                    // 액션 타입에 따른 메시지 생성
                    let actionMessage = '';
                    let actionColor = 'bg-indigo-100';
                    
                    if (history.action_type === 'created') {
                      actionMessage = 'created this test case';
                      actionColor = 'bg-green-100';
                    } else if (history.action_type === 'restored') {
                      actionMessage = 'restored to previous version';
                      actionColor = 'bg-blue-100';
                    } else if (history.action_type === 'updated') {
                      if (changedFields.length > 0) {
                        const formattedFields = changedFields.map((f: string) => getFieldLabel(f));
                        actionMessage = formattedFields.join(', ');
                      } else {
                        actionMessage = 'updated this test case';
                      }
                      actionColor = 'bg-yellow-100';
                    }

                    return (
                      <div key={history.id} className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${actionColor} rounded-full flex items-center justify-center text-gray-700 text-sm font-semibold flex-shrink-0`}>
                          {userInitials}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-semibold text-gray-900">{userName}</span>
                            {history.action_type === 'updated' && changedFields.length > 0 ? (
                              <span className="text-gray-700">
                                changed {changedFields.map((f: string, idx: number) => (
                                  <span key={f}>
                                    <span className="font-semibold">{getFieldLabel(f)}</span>
                                    {idx < changedFields.length - 1 && ', '}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className="text-gray-700">{actionMessage}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{timestamp}</p>
                          {history.action_type === 'updated' && history.old_value && history.new_value && (
                            <button
                              onClick={() => handleHistoryClick(history)}
                              className="text-sm text-indigo-600 hover:text-indigo-700 mt-1 flex items-center gap-1 cursor-pointer"
                            >
                              <i className="ri-eye-line"></i>
                              Click to view changes
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 이미지 프리뷰 모달 */}
      {imagePreview && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] p-4">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center text-white hover:text-gray-300 transition-all cursor-pointer"
            >
              <i className="ri-close-line text-3xl"></i>
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* 새 폴더 모달 */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">New Folder</h2>
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolder.name}
                  onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                  placeholder="e.g., Performance Tests"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewFolder({ ...newFolder, icon })}
                      className={`w-full h-12 flex items-center justify-center rounded-lg border-2 transition-all cursor-pointer ${
                        newFolder.icon === icon
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <i className={`${icon} text-xl`}></i>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setNewFolder({ ...newFolder, color: color.name })}
                      className={`w-full h-12 flex items-center justify-center rounded-lg border-2 transition-all cursor-pointer ${color.class} ${
                        newFolder.color === color.name
                          ? 'border-gray-900 ring-2 ring-gray-900'
                          : 'border-transparent'
                      }`}
                    >
                      <i className="ri-checkbox-blank-circle-fill text-xl"></i>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFolder}
                className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 새 테스트 케이스 모달 */}
      {showNewCaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingTestCase ? 'Edit Test Case' : 'New Test Case'}
                </h2>
                <button
                  onClick={() => {
                    setShowNewCaseModal(false);
                    setEditingTestCase(null);
                    setTestSteps([{ id: '1', step: '', expectedResult: '' }]);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Left Column - Main Content */}
                <div className="col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Test Case Title
                    </label>
                    <input
                      type="text"
                      value={newTestCase.title}
                      onChange={(e) => setNewTestCase({ ...newTestCase, title: e.target.value })}
                      placeholder="e.g., User login functionality test"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newTestCase.description}
                      onChange={(e) => setNewTestCase({ ...newTestCase, description: e.target.value })}
                      placeholder="Enter detailed description of the test case"
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">PreCondition</label>
                    <textarea
                      value={newTestCase.precondition}
                      onChange={(e) => setNewTestCase({ ...newTestCase, precondition: e.target.value })}
                      placeholder="Enter preconditions required before executing this test case"
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                    ></textarea>
                  </div>
                  
                  {/* Steps Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-gray-700">Steps</label>
                      <button
                        onClick={handleAddStep}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-add-line text-lg w-4 h-4 flex items-center justify-center"></i>
                        Add step
                      </button>
                    </div>
                    <StepEditor
                      steps={testSteps as Step[]}
                      onChange={(steps) => setTestSteps(steps as TestStep[])}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Assignee</label>
                    <select
                      value={newTestCase.assignee}
                      onChange={(e) => setNewTestCase({ ...newTestCase, assignee: e.target.value })}
                      className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {loadingMembers ? (
                        <option disabled>Loading members...</option>
                      ) : (
                        projectMembers.map((member) => (
                          <option key={member.user_id} value={member.profile?.full_name || member.profile?.email || ''}>
                            {member.profile?.full_name || member.profile?.email || 'Unknown'}
                            {member.role && ` (${member.role})`}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="automated"
                      checked={newTestCase.is_automated}
                      onChange={(e) => setNewTestCase({ ...newTestCase, is_automated: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                    <label htmlFor="automated" className="text-sm text-gray-700 cursor-pointer">
                      Automated test
                    </label>
                  </div>
                </div>

                {/* Right Column - Additional Options */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Folder</label>
                    <select
                      value={newTestCase.folder}
                      onChange={(e) => setNewTestCase({ ...newTestCase, folder: e.target.value })}
                      className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                    >
                      <option value="">No folder</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.name}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                    <select
                      value={newTestCase.priority}
                      onChange={(e) => setNewTestCase({ ...newTestCase, priority: e.target.value })}
                      className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tags</label>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onCompositionStart={handleCompositionStart}
                      onCompositionEnd={handleCompositionEnd}
                      placeholder="태그 입력 후 Enter"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter를 눌러 태그 추가</p>
                    {getTagsArray().length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {getTagsArray().map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="w-4 h-4 flex items-center justify-center text-indigo-600 hover:text-indigo-800 hover:bg-indigo-200 rounded-full transition-all cursor-pointer"
                            >
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Attachments</label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileUpload(e, !!editingTestCase)}
                      className="hidden"
                      id="file-upload-input"
                      disabled={uploadingFile}
                    />
                    <label
                      htmlFor="file-upload-input"
                      className={`block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-all cursor-pointer ${
                        uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploadingFile ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-3xl text-indigo-500 mb-2"></i>
                          <p className="text-sm text-gray-600">업로드 중...</p>
                        </>
                      ) : (
                        <>
                          <i className="ri-upload-cloud-line text-3xl text-gray-400 mb-2"></i>
                          <p className="text-sm text-gray-600 mb-1">Click to upload files</p>
                          <p className="text-xs text-gray-500">or drag and drop</p>
                        </>
                      )}
                    </label>
                    {(editingTestCase ? editingTestCase.attachments : newTestCase.attachments).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {(editingTestCase ? editingTestCase.attachments : newTestCase.attachments).map((file, index) => (
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
                              onClick={() => handleRemoveAttachment(index, !!editingTestCase)}
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
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewCaseModal(false);
                  setEditingTestCase(null);
                  setTestSteps([{ id: '1', step: '', expectedResult: '' }]);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
              >
                {editingTestCase ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export / Import 모달 */}
      {showExportImportModal && (
        <ExportImportModal
          testCases={testCases}
          selectedTestCaseIds={selectedTestCaseIds}
          projectName={propProjectName || ''}
          projectId={projectId}
          onImport={handleImportTestCases}
          onClose={() => setShowExportImportModal(false)}
        />
      )}

      {/* 업그레이드 안내 모달 */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-vip-crown-line text-yellow-500 text-3xl"></i>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Starter 플랜 이상 필요</h2>
              <p className="text-gray-600 text-sm mb-6">
                Export / Import 기능은 <strong>Starter 플랜</strong> 이상에서 사용할 수 있습니다.<br />
                테스트 케이스를 CSV로 내보내거나 가져오려면 플랜을 업그레이드하세요.
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
                <a
                  href="/settings"
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all font-semibold cursor-pointer whitespace-nowrap text-center"
                >
                  플랜 업그레이드
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 히스토리 비교 모달 */}
      {showHistoryModal && selectedHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Version Comparison</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(selectedHistory.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {' by '}
                    {selectedHistory.user?.full_name || selectedHistory.user?.email || 'Unknown user'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedHistory(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Before (Old Value) */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-gray-900">Before</h3>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
                    {(() => {
                      const oldSnapshot = parseSnapshot(selectedHistory.old_value);
                      if (!oldSnapshot) {
                        return <p className="text-sm text-gray-500">No previous data available</p>;
                      }
                      return (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Title</label>
                            <p className="text-sm text-gray-900">{oldSnapshot.title || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{stripHtml(oldSnapshot.description || '-')}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">PreCondition</label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{stripHtml(oldSnapshot.precondition || '-')}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Priority</label>
                            <p className="text-sm text-gray-900">{oldSnapshot.priority || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Folder</label>
                            <p className="text-sm text-gray-900">{oldSnapshot.folder || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tags</label>
                            <p className="text-sm text-gray-900">{oldSnapshot.tags || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Steps</label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{stripHtml(oldSnapshot.steps || '-')}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Expected Result</label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{stripHtml(oldSnapshot.expected_result || '-')}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Assignee</label>
                            <p className="text-sm text-gray-900">{oldSnapshot.assignee || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Automated</label>
                            <p className="text-sm text-gray-900">{oldSnapshot.is_automated ? 'Yes' : 'No'}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* After (New Value) */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-gray-900">After</h3>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                    {(() => {
                      const newSnapshot = parseSnapshot(selectedHistory.new_value);
                      if (!newSnapshot) {
                        return <p className="text-sm text-gray-500">No data available</p>;
                      }
                      return (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Title</label>
                            <p className="text-sm text-gray-900">{newSnapshot.title || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{stripHtml(newSnapshot.description || '-')}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">PreCondition</label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{stripHtml(newSnapshot.precondition || '-')}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Priority</label>
                            <p className="text-sm text-gray-900">{newSnapshot.priority || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Folder</label>
                            <p className="text-sm text-gray-900">{newSnapshot.folder || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tags</label>
                            <p className="text-sm text-gray-900">{newSnapshot.tags || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Steps</label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{stripHtml(newSnapshot.steps || '-')}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Expected Result</label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{stripHtml(newSnapshot.expected_result || '-')}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Assignee</label>
                            <p className="text-sm text-gray-900">{newSnapshot.assignee || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Automated</label>
                            <p className="text-sm text-gray-900">{newSnapshot.is_automated ? 'Yes' : 'No'}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                <i className="ri-information-line mr-1"></i>
                Restore will revert the test case to the "Before" state
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedHistory(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer whitespace-nowrap"
                >
                  Close
                </button>
                <button
                  onClick={handleRestoreVersion}
                  disabled={restoringHistory || !parseSnapshot(selectedHistory.old_value)}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-semibold cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {restoringHistory ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Restoring...
                    </>
                  ) : (
                    <>
                      <i className="ri-history-line"></i>
                      Restore to Before
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 폴더 일괄 추가 모달 */}
      {showBulkFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">폴더에 추가</h2>
                <button
                  onClick={() => setShowBulkFolderModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {selectedTestCaseIds.size}개의 테스트 케이스를 이동할 폴더를 선택하세요
              </p>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleBulkAddToFolder(folder.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-all cursor-pointer text-left"
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getFolderColorClass(folder.color)}`}>
                      <i className={`${folder.icon} text-2xl`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 truncate">{folder.name}</p>
                      <p className="text-xs text-gray-500">
                        {testCases.filter(tc => tc.folder === folder.name).length}개의 테스트 케이스
                      </p>
                    </div>
                    <i className="ri-arrow-right-s-line text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0"></i>
                  </button>
                ))}
                {folders.length === 0 && (
                  <div className="text-center py-8">
                    <i className="ri-folder-line text-3xl text-gray-300 mb-2"></i>
                    <p className="text-sm text-gray-500">폴더가 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1">먼저 폴더를 생성해주세요</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowBulkFolderModal(false)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all font-medium cursor-pointer whitespace-nowrap"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 폴더 삭제 확인 모달 */}
      {showDeleteFolderModal && folderToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">폴더 삭제</h2>
                <button
                  onClick={() => {
                    setShowDeleteFolderModal(false);
                    setFolderToDelete(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getFolderColorClass(folderToDelete.color)}`}>
                  <i className={`${folderToDelete.icon} text-2xl`}></i>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{folderToDelete.name}</p>
                  <p className="text-sm text-gray-500">
                    {testCases.filter(tc => tc.folder === folderToDelete.name).length}개의 테스트 케이스 포함
                  </p>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <i className="ri-alert-line text-yellow-600 text-xl mt-0.5 flex-shrink-0"></i>
                  <p className="text-sm text-yellow-700">
                    이 폴더를 삭제하면 폴더 내의 테스트 케이스는 삭제되지 않고 폴더 미지정 상태로 변경됩니다.
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                정말로 "<span className="font-semibold">{folderToDelete.name}</span>" 폴더를 삭제하시겠습니까?
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteFolderModal(false);
                  setFolderToDelete(null);
                }}
                disabled={deletingFolder}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={confirmDeleteFolder}
                disabled={deletingFolder}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
              >
                {deletingFolder ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    삭제 중...
                  </>
                ) : (
                  <>
                    <i className="ri-delete-bin-line"></i>
                    삭제
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy to Project 모달 */}
      {showCopyToProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Copy to Project</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedTestCaseIds.size} test case{selectedTestCaseIds.size > 1 ? 's' : ''} will be copied
                  </p>
                </div>
                <button
                  onClick={() => setShowCopyToProjectModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {loadingProjects ? (
                <div className="text-center py-10">
                  <i className="ri-loader-4-line animate-spin text-2xl text-indigo-500 mb-2"></i>
                  <p className="text-sm text-gray-500">Loading projects...</p>
                </div>
              ) : availableProjects.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="ri-folder-line text-2xl text-gray-400"></i>
                  </div>
                  <p className="text-sm font-medium text-gray-700">No other projects found</p>
                  <p className="text-xs text-gray-400 mt-1">Create another project to copy test cases</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleCopyToProject(project.id)}
                      disabled={copyingToProject}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-all cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                        {copyingToProject && copyTargetProjectId === project.id ? (
                          <i className="ri-loader-4-line animate-spin text-white text-lg"></i>
                        ) : (
                          <i className="ri-folder-line text-white text-lg"></i>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{project.description}</p>
                        )}
                        {project.status && (
                          <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            project.status === 'active' ? 'bg-green-100 text-green-700' :
                            project.status === 'archived' ? 'bg-gray-100 text-gray-600' :
                            project.status === 'completed' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                          </span>
                        )}
                      </div>
                      <i className="ri-arrow-right-s-line text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0"></i>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex items-start gap-2 mb-3">
                <i className="ri-information-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                <p className="text-xs text-gray-500">
                  Copied test cases will have <strong>Untested</strong> status and no assignee. Folder structure and tags will be preserved.
                </p>
              </div>
              <button
                onClick={() => setShowCopyToProjectModal(false)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all font-medium text-sm cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 삭제 확인 모달 */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">테스트 케이스 삭제</h2>
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="ri-delete-bin-line text-red-600 text-2xl"></i>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedTestCaseIds.size}개의 테스트 케이스 삭제
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    선택된 테스트 케이스가 영구적으로 삭제됩니다.
                  </p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <i className="ri-alert-line text-red-600 text-xl mt-0.5 flex-shrink-0"></i>
                  <p className="text-sm text-red-700">
                    이 작업은 되돌릴 수 없습니다. 삭제된 테스트 케이스와 관련된 모든 데이터(히스토리, 코멘트 등)도 함께 삭제됩니다.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleting}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
              >
                {bulkDeleting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    삭제 중...
                  </>
                ) : (
                  <>
                    <i className="ri-delete-bin-line"></i>
                    삭제
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-lg shadow-lg ${
            toastType === 'success' 
              ? 'bg-indigo-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="w-6 h-6 flex items-center justify-center">
              <i className={`text-xl ${
                toastType === 'success' 
                  ? 'ri-checkbox-circle-fill' 
                  : 'ri-error-warning-fill'
              }`}></i>
            </div>
            <span className="font-medium">{toastMessage}</span>
            <button
              onClick={() => setShowToast(false)}
              className="ml-2 w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded transition-all cursor-pointer"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      )}
    </div>

    {/* ─── Right-click Context Menu ─── */}
    {contextMenu && (
      <div
        ref={contextMenuRef}
        style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 200 }}
        className="bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[11rem] animate-dropdown"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {[
          { icon: 'ri-eye-line', label: 'View Details', action: () => { const tc = testCases.find(t => t.id === contextMenu.tcId); if (tc) setSelectedTestCase(tc); setContextMenu(null); } },
          { icon: 'ri-edit-line', label: 'Edit', action: () => { const tc = testCases.find(t => t.id === contextMenu.tcId); if (tc) { setSelectedTestCase(tc); } setContextMenu(null); } },
        ].map(item => (
          <button key={item.label} onClick={item.action} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            <i className={`${item.icon} text-slate-400`} /> {item.label}
          </button>
        ))}
        <div className="h-px bg-slate-100 my-1" />
        <div
          className="relative"
          onMouseEnter={() => setContextMenuStatusOpen(true)}
          onMouseLeave={() => setContextMenuStatusOpen(false)}
        >
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            <i className="ri-arrow-left-right-line text-slate-400" /> Set Status
            <i className="ri-arrow-right-s-line text-slate-400 ml-auto" />
          </button>
          {contextMenuStatusOpen && (
            <div className="absolute left-full top-0 ml-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[10rem] z-[210]">
              {(['draft', 'active', 'deprecated'] as LifecycleStatus[]).map(s => {
                const icons: Record<LifecycleStatus, string> = { draft: 'ri-draft-line', active: 'ri-checkbox-circle-line', deprecated: 'ri-forbid-line' };
                const colors: Record<LifecycleStatus, string> = { draft: 'text-amber-600', active: 'text-green-600', deprecated: 'text-slate-400' };
                const current = (testCases.find(t => t.id === contextMenu.tcId)?.lifecycle_status || 'active') as LifecycleStatus;
                return (
                  <button key={s} onClick={() => handleContextMenuLifecycleChange(s)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 capitalize">
                    <i className={`${icons[s]} ${colors[s]}`} /> {s.charAt(0).toUpperCase() + s.slice(1)}
                    {current === s && <i className="ri-check-line text-indigo-500 ml-auto" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="h-px bg-slate-100 my-1" />
        <button onClick={() => { const tc = testCases.find(t => t.id === contextMenu.tcId); if (tc) { onDelete(tc.id); } setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
          <i className="ri-delete-bin-line" /> Delete
        </button>
      </div>
    )}

    {/* ─── Deprecate Confirm Dialog ─── */}
    {deprecateDialog && (
      <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center" onClick={() => setDeprecateDialog(null)}>
        <div className="bg-white rounded-xl p-6 max-w-sm w-[90%] shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center mb-3">
            <i className="ri-alert-line text-amber-600 text-xl" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">
            {deprecateDialog.bulk ? `Deprecate ${deprecateDialog.bulkIds?.length} Test Cases?` : 'Deprecate Test Case?'}
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed mb-1">
            {deprecateDialog.bulk
              ? `${deprecateDialog.bulkIds?.length} test cases will be deprecated and won't be included in new Runs.`
              : <><span className="font-semibold text-slate-700">"{deprecateDialog.tcTitle}"</span> will be deprecated. It won't be included in new Runs.</>
            }
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={() => setDeprecateDialog(null)} className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">Cancel</button>
            <button onClick={handleConfirmDeprecate} disabled={deprecating} className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
              {deprecating ? 'Deprecating...' : deprecateDialog.bulk ? `Deprecate ${deprecateDialog.bulkIds?.length} Cases` : 'Deprecate'}
            </button>
          </div>
        </div>
      </div>
    )}

    <BulkActionBar
      selectedIds={selectedTestCaseIds}
      onClear={() => setSelectedTestCaseIds(new Set())}
      onMove={() => setShowBulkFolderModal(true)}
      onDelete={() => setShowBulkDeleteModal(true)}
      onSetLifecycleStatus={handleBulkLifecycleChange}
    />
    </>
  );
}