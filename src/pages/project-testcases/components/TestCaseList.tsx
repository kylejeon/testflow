import { useState, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { supabase } from '../../../lib/supabase';
import ExportImportModal from './ExportImportModal';
import CloneFromProjectModal from './CloneFromProjectModal';
import { BulkActionBar } from '../../../components/BulkActionBar';
import { StepEditor, SharedStepRefRow, type Step } from '../../../components/StepEditor';
import InsertSharedStepModal from '../../project-shared-steps/components/InsertSharedStepModal';
import type { AnyStep, SharedTestStep } from '../../../types/shared-steps';
import { isSharedStepRef } from '../../../types/shared-steps';
import EmptyState from '../../../components/EmptyState';
import TestCasesIllustration from '../../../components/illustrations/TestCasesIllustration';
import { LifecycleBadge, type LifecycleStatus } from '../../../components/LifecycleBadge';
import { Avatar } from '../../../components/Avatar';
import { useToast } from '../../../components/Toast';
import UpgradeBanner from '../../../components/UpgradeBanner';
import SavedViewsDropdown from '../../../components/SavedViewsDropdown';
import { useSavedViews } from '../../../hooks/useSavedViews';

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
  version_major?: number;
  version_minor?: number;
  version_status?: 'draft' | 'published';
}

interface TestCaseListProps {
  testCases: TestCase[];
  onAdd: (testCase: any) => void;
  onUpdate: (testCase: any) => void;
  onDelete: (id: string) => void;
  onRefresh: () => Promise<void>;
  projectId: string;
  projectName?: string;
  /** Auto-open detail panel for this TC id on mount (from ?tc= URL param) */
  initialTcId?: string;
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
  version_major?: number;
  version_minor?: number;
  version_status?: 'draft' | 'published';
  change_summary?: string;
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

// ── Compact design helpers ──────────────────────────────────────────────────
function parseStepsList(raw?: string, rawExpected?: string): { step: string; expectedResult: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // plain-text: "1. step\n2. step" — pair with expected_result column by index
  const steps = raw.split('\n').filter(Boolean).map((s) => s.replace(/^\d+\.\s*/, ''));
  const expected = rawExpected
    ? rawExpected.split('\n').filter(Boolean).map((s) => s.replace(/^\d+\.\s*/, ''))
    : [];
  return steps.map((step, i) => ({
    step,
    expectedResult: expected[i] || '',
  }));
}

function tcTimeAgo(dateStr: string): string {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const PRIORITY_DOT_COLORS: Record<string, string> = {
  critical: '#EF4444', high: '#F59E0B', medium: '#6366F1', low: '#94A3B8',
};
// ────────────────────────────────────────────────────────────────────────────

export default function TestCaseList({ testCases, onAdd, onUpdate, onDelete, onRefresh, projectId, projectName: propProjectName, initialTcId }: TestCaseListProps) {
  const [projectPrefix, setProjectPrefix] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  // Auto-open detail panel when initialTcId is provided (from ?tc= URL param)
  const initialTcIdHandled = useRef(false);
  useEffect(() => {
    if (!initialTcId || initialTcIdHandled.current || !testCases.length) return;
    const tc = testCases.find(t => t.id === initialTcId);
    if (tc) {
      initialTcIdHandled.current = true;
      setSelectedTestCase(tc);
    }
  }, [initialTcId, testCases]);
  // Removed duplicate editingTestCase declaration that caused a conflict.
  const [isFolderPanelOpen, setIsFolderPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'comments' | 'results' | 'issues' | 'history'>('comments');
  const [stepsCollapsed, setStepsCollapsed] = useState(false);
  const [stepsHeightPx, setStepsHeightPx] = useState<number | null>(null);
  const stepsAreaRef = useRef<HTMLDivElement>(null);
  const stepsHeightRef = useRef<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [testSteps, setTestSteps] = useState<AnyStep[]>([{ id: '1', step: '', expectedResult: '' }]);
  const [showInsertSharedStepModal, setShowInsertSharedStepModal] = useState(false);
  const [convertingStep, setConvertingStep] = useState<{ id: string; step: string; expectedResult: string } | null>(null);
  const [convertName, setConvertName] = useState('');
  const [convertSaving, setConvertSaving] = useState(false);
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
    color: 'indigo',
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

  // ── TC list filters ────────────────────────────────────────────────────────
  const [tcSearchQuery, setTcSearchQuery] = useState('');
  const [tcPriorityFilters, setTcPriorityFilters] = useState<string[]>([]);
  const [tcTagFilters, setTcTagFilters] = useState<string[]>([]);
  const [tcShowFilterDropdown, setTcShowFilterDropdown] = useState(false);
  const tcFilterDropdownRef = useRef<HTMLDivElement>(null);

  const allTcTags = Array.from(new Set(
    testCases.flatMap(tc => tc.tags ? tc.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [])
  )).sort();

  const tcCurrentFilters = { search: tcSearchQuery, priorities: tcPriorityFilters, tags: tcTagFilters };

  const applyTcViewFilters = useCallback((filters: Record<string, any>) => {
    setTcSearchQuery(filters.search || '');
    setTcPriorityFilters(filters.priorities || []);
    setTcTagFilters(filters.tags || []);
  }, []);

  const { views: tcSavedViews, saveView: saveTcView, deleteView: deleteTcView } = useSavedViews(projectId, 'testcase');
  // ──────────────────────────────────────────────────────────────────────────
  
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const { showToast } = useToast();

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

  // ── TC Versioning state ──────────────────────────────────────────────────
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingVersion, setPublishingVersion] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<TestCaseHistory | null>(null);
  const [showCherryPickModal, setShowCherryPickModal] = useState(false);
  const [cherryPickFields, setCherryPickFields] = useState<Record<string, boolean>>({});
  const [cherryPickSource, setCherryPickSource] = useState<TestCaseHistory | null>(null);
  const [expandedMajors, setExpandedMajors] = useState<Set<number>>(new Set());
  // ────────────────────────────────────────────────────────────────────────

  const [showExportImportModal, setShowExportImportModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
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

  // TC 전환 시 Steps 높이 리셋
  useEffect(() => {
    setStepsHeightPx(null);
    stepsHeightRef.current = null;
  }, [selectedTestCase?.id]);

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

  const handleBulkAssign = async (assigneeName: string) => {
    const ids = Array.from(selectedTestCaseIds);
    const { error } = await supabase
      .from('test_cases')
      .update({ assignee: assigneeName || null, updated_at: new Date().toISOString() })
      .in('id', ids);
    if (error) return;
    ids.forEach(tcId => {
      const tc = testCases.find(t => t.id === tcId);
      if (tc) onUpdate({ ...tc, assignee: assigneeName || undefined });
    });
    setSelectedTestCaseIds(new Set());
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

    showToast(`Imported ${importedCases.length} test case${importedCases.length === 1 ? '' : 's'} successfully.`, 'success');
  };

  const FOLDER_COLOR_MAP: Record<string, { bg: string; fg: string }> = {
    indigo:  { bg: '#EEF2FF', fg: '#6366F1' },
    violet:  { bg: '#F5F3FF', fg: '#8B5CF6' },
    pink:    { bg: '#FDF2F8', fg: '#EC4899' },
    emerald: { bg: '#F0FDF4', fg: '#10B981' },
    amber:   { bg: '#FFFBEB', fg: '#F59E0B' },
    cyan:    { bg: '#ECFEFF', fg: '#06B6D4' },
    red:     { bg: '#FEF2F2', fg: '#EF4444' },
    teal:    { bg: '#F0FDFA', fg: '#14B8A6' },
    orange:  { bg: '#FFF7ED', fg: '#F97316' },
    blue:    { bg: '#EFF6FF', fg: '#3B82F6' },
  };

  const getNextFolderColor = (existingFolders: { color: string }[]): string => {
    const allColors = Object.keys(FOLDER_COLOR_MAP);
    const usedColors = existingFolders.map(f => f.color);
    const unused = allColors.filter(c => !usedColors.includes(c));
    if (unused.length > 0) return unused[0];
    const counts = allColors.map(c => ({ color: c, count: usedColors.filter(u => u === c).length }));
    counts.sort((a, b) => a.count - b.count);
    return counts[0].color;
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
    { name: 'indigo',  bg: '#EEF2FF', fg: '#6366F1',  label: 'Indigo' },
    { name: 'violet',  bg: '#F5F3FF', fg: '#8B5CF6',  label: 'Violet' },
    { name: 'pink',    bg: '#FDF2F8', fg: '#EC4899',  label: 'Pink' },
    { name: 'emerald', bg: '#F0FDF4', fg: '#10B981',  label: 'Emerald' },
    { name: 'amber',   bg: '#FFFBEB', fg: '#F59E0B',  label: 'Amber' },
    { name: 'cyan',    bg: '#ECFEFF', fg: '#06B6D4',  label: 'Cyan' },
    { name: 'red',     bg: '#FEF2F2', fg: '#EF4444',  label: 'Red' },
    { name: 'teal',    bg: '#F0FDFA', fg: '#14B8A6',  label: 'Teal' },
    { name: 'orange',  bg: '#FFF7ED', fg: '#F97316',  label: 'Orange' },
    { name: 'blue',    bg: '#EFF6FF', fg: '#3B82F6',  label: 'Blue' },
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

  // Fetch project prefix for virtual ID display
  useEffect(() => {
    supabase
      .from('projects')
      .select('prefix')
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        if (data?.prefix) setProjectPrefix(data.prefix);
      });
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
        const updatedFolders = [...folders, folder];
        setFolders(updatedFolders);
        setNewFolder({ name: '', icon: 'ri-folder-line', color: getNextFolderColor(updatedFolders) });
        setShowNewFolderModal(false);

        showToast(`Folder "${folder.name}" has been created.`, 'success');
      } catch (error) {
        console.error('폴더 생성 오류:', error);
        showToast('Failed to create folder.', 'error');
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

      showToast(`Folder "${folderToDelete.name}" deleted. ${testCasesInFolder.length} test case(s) moved to unassigned.`, 'success');
    } catch (error) {
      console.error('폴더 삭제 오류:', error);
      showToast('Failed to delete folder.', 'error');
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
        showToast('Please sign in to continue.', 'warning'); return;
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
      showToast('Failed to add comment.', 'error');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTestCase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('Please sign in to continue.', 'warning'); return;
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
      showToast('Failed to add comment.', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const comment = comments.find(c => c.id === commentId);
      if (comment && comment.user_id !== user.id) {
        showToast('You can only delete your own comments.', 'warning'); return;
      }

      const { error } = await supabase
        .from('test_case_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      showToast('Failed to delete comment.', 'error');
    }
  };

  const getFolderStyle = (color: string): { bg: string; fg: string } => {
    return FOLDER_COLOR_MAP[color] || { bg: '#EEF2FF', fg: '#6366F1' };
  };

  const allFolders = [
    {
      id: 'all',
      name: 'All Test Cases',
      count: testCases.length,
      icon: 'ri-folder-line',
      color: 'indigo'
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
  ).filter(tc => {
    if (tcSearchQuery) {
      const q = tcSearchQuery.toLowerCase();
      if (!tc.title.toLowerCase().includes(q) && !(tc.custom_id || '').toLowerCase().includes(q)) return false;
    }
    if (tcPriorityFilters.length > 0 && !tcPriorityFilters.includes(tc.priority)) return false;
    if (tcTagFilters.length > 0) {
      const tcTags = tc.tags ? tc.tags.split(',').map((t: string) => t.trim()) : [];
      if (!tcTagFilters.some(f => tcTags.includes(f))) return false;
    }
    return true;
  }).slice().sort((a, b) => {
    const idA = a.custom_id || '';
    const idB = b.custom_id || '';
    // 숫자 부분 추출하여 숫자 정렬, 없으면 문자열 정렬
    const numA = parseInt(idA.replace(/\D/g, ''), 10);
    const numB = parseInt(idB.replace(/\D/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return idA.localeCompare(idB);
  });

  // Virtual ID map: for TCs without custom_id, assign a display ID using project prefix + sequential index
  const virtualIdMap = (() => {
    if (!projectPrefix) return new Map<string, string>();
    const map = new Map<string, string>();
    // Sort all TCs by created_at to get a stable sequential order
    const sorted = [...testCases].sort((a, b) =>
      new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    );
    let seq = 0;
    sorted.forEach(tc => {
      if (!tc.custom_id) {
        seq++;
        map.set(tc.id, `${projectPrefix}-${String(seq).padStart(3, '0')}`);
      } else {
        // Track max existing number to avoid collision
        const m = tc.custom_id.match(/-(\d+)$/);
        if (m) seq = Math.max(seq, parseInt(m[1], 10));
      }
    });
    return map;
  })();

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

  // Insert a SharedTestStep as a SharedStepRef at the end of the steps list
  const handleInsertSharedStep = (ss: SharedTestStep) => {
    const ref: AnyStep = {
      id: crypto.randomUUID(),
      type: 'shared_step_ref',
      shared_step_id: ss.id,
      shared_step_custom_id: ss.custom_id,
      shared_step_name: ss.name,
      shared_step_version: ss.version,
    };
    setTestSteps(prev => {
      // Remove trailing empty step if it's the only one
      const filtered = prev.length === 1 && !isSharedStepRef(prev[0]) && !(prev[0] as TestStep).step.trim()
        ? []
        : [...prev];
      return [...filtered, ref];
    });
    setShowInsertSharedStepModal(false);
  };

  // Update a SharedStepRef's pinned version when user clicks "Update to vN"
  const handleUpdateSharedStepVersion = (stepId: string, newVersion: number) => {
    setTestSteps(prev => prev.map(s =>
      isSharedStepRef(s) && s.id === stepId
        ? { ...s, shared_step_version: newVersion }
        : s
    ));
  };

  // Start "Convert to Shared Step" flow for a given step id
  const handleConvertToSharedStep = (stepId: string) => {
    const step = testSteps.find(s => s.id === stepId);
    if (!step || isSharedStepRef(step)) return;
    const normal = step as TestStep;
    setConvertingStep({ id: stepId, step: normal.step, expectedResult: normal.expectedResult });
    setConvertName(normal.step.substring(0, 60).trim() || 'New Shared Step');
  };

  // Confirm conversion: create shared step in DB, replace inline step with SharedStepRef
  const handleConfirmConvert = async () => {
    if (!convertingStep || !convertName.trim()) return;
    setConvertSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('shared_steps')
        .insert({
          project_id: projectId,
          name: convertName.trim(),
          steps: [{ id: crypto.randomUUID(), step: convertingStep.step, expectedResult: convertingStep.expectedResult }],
          description: null,
          category: null,
          tags: null,
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      const ref: AnyStep = {
        id: convertingStep.id,
        type: 'shared_step_ref',
        shared_step_id: data.id,
        shared_step_custom_id: data.custom_id,
        shared_step_name: data.name,
        shared_step_version: data.version,
      };
      setTestSteps(prev => prev.map(s => s.id === convertingStep.id ? ref : s));
      setConvertingStep(null);
      setConvertName('');
    } catch (err: any) {
      showToast(err.message || 'Failed to convert step.', 'error');
    } finally {
      setConvertSaving(false);
    }
  };

  // Sync shared_step_usage table so SharedStepModal can find TCs referencing a Shared Step
  const syncSharedStepUsage = async (tcId: string, stepsJson: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Delete stale records for this TC first
    await supabase.from('shared_step_usage').delete().eq('test_case_id', tcId);
    try {
      const stepsArr = JSON.parse(stepsJson);
      if (Array.isArray(stepsArr)) {
        const refs = stepsArr
          .map((s: any, idx: number) => ({ s, idx }))
          .filter(({ s }) => s?.type === 'shared_step_ref');
        if (refs.length > 0) {
          await supabase.from('shared_step_usage').insert(
            refs.map(({ s, idx }) => ({
              shared_step_id: s.shared_step_id,
              test_case_id: tcId,
              position: idx,
              linked_version: s.shared_step_version,
              linked_by: user.id,
            }))
          );
        }
      }
    } catch {}
  };

  const handleSubmit = async () => {
    if (!newTestCase.title.trim()) {
      showToast('Please enter a test case title.', 'warning');
      return;
    }

    // TC 개수 제한 체크 (신규 생성 시)
    if (!editingTestCase) {
      const TC_LIMITS: Record<number, number> = { 1: 100, 2: 200 };
      const tcLimit = TC_LIMITS[userTier];
      if (tcLimit !== undefined && testCases.length >= tcLimit) {
        showToast(`Your plan allows up to ${tcLimit} test cases per project. Upgrade to add more.`, 'warning');
        return;
      }
    }

    // Serialize steps — use JSON when SharedStepRef present, plain text otherwise.
    // SharedStepRef versions are pinned (user controls updates via ↑ button in editor).
    const hasSharedRef = testSteps.some(s => isSharedStepRef(s));
    const stepsString = hasSharedRef
      ? JSON.stringify(testSteps)
      : testSteps.map((step, index) => `${index + 1}. ${(step as TestStep).step}`).join('\n');
    const expectedResultString = hasSharedRef
      ? ''
      : testSteps.map((step, index) => `${index + 1}. ${(step as TestStep).expectedResult}`).join('\n');

    const updatedTestCaseData = {
      ...newTestCase,
      steps: stepsString,
      expected_result: expectedResultString,
    };

    if (editingTestCase) {
      // 변경된 필드 추적 및 히스토리 기록
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // ── Snapshot building ────────────────────────────────────────────────
        // SharedStepRefs are expanded to their actual sub-step content so that
        // "Convert to Shared Step" (same content, different wrapper) produces no diff.

        const rawStepsVal = editingTestCase.steps || '';
        const oldRawSteps = Array.isArray(rawStepsVal)
          ? JSON.stringify(rawStepsVal)
          : String(rawStepsVal);

        // Collect all SharedStepRef IDs from both old and new steps for a batch fetch
        const snapshotRefIds = new Set<string>();
        testSteps.forEach(s => { if (isSharedStepRef(s)) snapshotRefIds.add(s.shared_step_id); });
        try {
          const parsedForIds = JSON.parse(oldRawSteps);
          if (Array.isArray(parsedForIds)) {
            parsedForIds.forEach((s: any) => { if (s?.type === 'shared_step_ref') snapshotRefIds.add(s.shared_step_id); });
          }
        } catch {}

        // Fetch actual sub-step content for each SharedStepRef
        const sharedContentMap = new Map<string, Array<{step: string, expectedResult: string}>>();
        if (snapshotRefIds.size > 0) {
          const { data: sharedData } = await supabase
            .from('shared_steps')
            .select('id, steps')
            .in('id', [...snapshotRefIds]);
          (sharedData || []).forEach((ss: any) => {
            try {
              const steps = typeof ss.steps === 'string' ? JSON.parse(ss.steps) : ss.steps;
              if (Array.isArray(steps)) {
                sharedContentMap.set(ss.id, steps.map((c: any) => ({ step: c.step || '', expectedResult: c.expectedResult || '' })));
              }
            } catch {}
          });
        }

        // Expand an array of steps (any format) — SharedStepRefs become their sub-steps
        const expandStepsForSnapshot = (stepsArr: any[]): Array<{step: string, expectedResult: string}> => {
          const result: Array<{step: string, expectedResult: string}> = [];
          for (const s of stepsArr) {
            if (s?.type === 'shared_step_ref') {
              const content = sharedContentMap.get(s.shared_step_id);
              if (content?.length) result.push(...content);
            } else {
              result.push({ step: s.step || '', expectedResult: s.expectedResult || '' });
            }
          }
          return result;
        };

        // Build NEW snapshot strings (expanded)
        const expandedNew = expandStepsForSnapshot([...testSteps]);
        const snapshotStepsString = expandedNew.map((s, i) => `${i + 1}. ${s.step}`).join('\n');
        const snapshotExpectedResultString = expandedNew
          .map((s, i) => s.expectedResult ? `${i + 1}. ${s.expectedResult}` : null)
          .filter(Boolean).join('\n');

        // Build OLD snapshot strings (expanded)
        let oldStepsString: string;
        let oldExpectedResultString: string;
        try {
          const parsedOld = JSON.parse(oldRawSteps);
          if (!Array.isArray(parsedOld)) throw new Error('not array');
          const expandedOld = expandStepsForSnapshot(parsedOld);
          oldStepsString = expandedOld.map((s, i) => `${i + 1}. ${s.step}`).join('\n');
          oldExpectedResultString = expandedOld
            .map((s, i) => s.expectedResult ? `${i + 1}. ${s.expectedResult}` : null)
            .filter(Boolean).join('\n');
        } catch {
          // Plain text format (legacy TCs)
          const oldRawER = Array.isArray(rawStepsVal)
            ? (rawStepsVal as any[]).map((s: any) => s.expectedResult).join('\n')
            : (editingTestCase.expected_result || '');
          const oldStepsArr = oldRawSteps.split('\n').filter((s: string) => s.trim());
          const oldERArr    = oldRawER.split('\n').filter((s: string) => s.trim());
          oldStepsString = oldStepsArr
            .map((s: string, i: number) => `${i + 1}. ${s.replace(/^\d+\.\s*/, '')}`)
            .join('\n');
          oldExpectedResultString = oldStepsArr
            .map((_: string, i: number) => `${i + 1}. ${(oldERArr[i] || '').replace(/^\d+\.\s*/, '')}`)
            .join('\n');
        }

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
          steps: snapshotStepsString,
          expected_result: snapshotExpectedResultString,
          assignee: newTestCase.assignee || '',
          is_automated: newTestCase.is_automated || false,
        };

        // 변경된 필드 목록 생성
        // Use normalizeStepField for step fields to avoid false positives from
        // minor formatting differences (e.g. trailing spaces, number prefix variants).
        const normalizeForCompare = (text: string) => {
          if (!text) return '';
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
              return parsed.map((s: any, i: number) =>
                s.type === 'shared_step_ref'
                  ? `${i + 1}. 🔗 [${s.shared_step_custom_id}] ${s.shared_step_name}`
                  : `${i + 1}. ${(s.step || '').trim()}`
              ).join('\n');
            }
          } catch {}
          return text.split('\n').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join('\n');
        };

        const changedFields: string[] = [];
        if (oldSnapshot.title !== newSnapshot.title) changedFields.push('title');
        if (oldSnapshot.description !== newSnapshot.description) changedFields.push('description');
        if (oldSnapshot.precondition !== newSnapshot.precondition) changedFields.push('precondition');
        if (oldSnapshot.priority !== newSnapshot.priority) changedFields.push('priority');
        if (oldSnapshot.folder !== newSnapshot.folder) changedFields.push('folder');
        if (oldSnapshot.tags !== newSnapshot.tags) changedFields.push('tags');
        if (normalizeForCompare(oldSnapshot.steps) !== normalizeForCompare(newSnapshot.steps)) changedFields.push('steps');
        if (normalizeForCompare(oldSnapshot.expected_result) !== normalizeForCompare(newSnapshot.expected_result)) changedFields.push('expected_result');
        if (oldSnapshot.assignee !== newSnapshot.assignee) changedFields.push('assignee');
        if (String(oldSnapshot.is_automated) !== String(newSnapshot.is_automated)) changedFields.push('is_automated');

        // Only create a new version when something actually changed.
        // If all fields are identical (e.g. Convert to Shared Step with same content),
        // skip the history record and version bump entirely.
        if (changedFields.length > 0) {
          const newMinor = (editingTestCase.version_minor ?? 0) + 1;
          const currentMajor = editingTestCase.version_major ?? 1;
          const changeSummary = generateChangeSummary(oldSnapshot, newSnapshot);

          // 히스토리 기록 (전체 스냅샷 저장)
          await supabase.from('test_case_history').insert({
            test_case_id: editingTestCase.id,
            user_id: user.id,
            action_type: 'updated',
            version_major: currentMajor,
            version_minor: newMinor,
            version_status: 'draft',
            field_name: changedFields.join(', '),
            old_value: JSON.stringify(oldSnapshot),
            new_value: JSON.stringify(newSnapshot),
            change_summary: changeSummary,
          });

          // Update version on the TC itself
          await supabase.from('test_cases').update({
            version_minor: newMinor,
            version_status: 'draft',
          }).eq('id', editingTestCase.id);

          // Propagate version to finalTestCase
          Object.assign(updatedTestCaseData, {
            version_minor: newMinor,
            version_status: 'draft' as const,
          });

          // Auto-expand this major group so the new draft entry is visible when user opens History tab
          setExpandedMajors(prev => new Set([...prev, currentMajor]));
        }
      }

      // Sync shared_step_usage for the edited TC
      await syncSharedStepUsage(editingTestCase.id, stepsString);

      const finalTestCase = {
        ...editingTestCase,
        ...updatedTestCaseData,
      };
      onUpdate(finalTestCase);

      // Update the selected test case in the details panel
      if (selectedTestCase?.id === editingTestCase.id) {
        setSelectedTestCase(finalTestCase);
        // 히스토리 항상 새로고침 (탭과 무관하게)
        fetchHistory(editingTestCase.id);
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

    // Parse steps back to array format (handles both JSON and plain text)
    if (testCase.steps) {
      try {
        const parsed = JSON.parse(testCase.steps);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const withIds: AnyStep[] = parsed.map((s: any, i: number) =>
            s.type === 'shared_step_ref'
              ? s
              : { id: s.id || String(i + 1), step: s.step || '', expectedResult: s.expectedResult || '' }
          );
          setTestSteps(withIds);
          setShowNewCaseModal(true);
          return;
        }
      } catch {}
      // Plain text fallback
      const stepsArray = testCase.steps.split('\n').filter((s: string) => s.trim());
      const expectedResults = testCase.expected_result?.split('\n').filter((s: string) => s.trim()) || [];
      const parsedSteps: AnyStep[] = stepsArray.map((step: string, index: number) => ({
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
      showToast(`Failed to upload file: ${error.message || 'Unknown error'}`, 'error');
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
    if (!history.old_value && !history.new_value) return;
    setSelectedHistory(history);
    setShowHistoryModal(true);
  };

  // ── Publish Version ──────────────────────────────────────────────────────
  const handlePublishVersion = async () => {
    if (!selectedTestCase) return;
    try {
      setPublishingVersion(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newMajor = (selectedTestCase.version_major ?? 1) + 1;
      const snapshot = {
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
        lifecycle_status: selectedTestCase.lifecycle_status || 'active',
      };

      // Update test_cases
      const { data, error } = await supabase
        .from('test_cases')
        .update({
          version_major: newMajor,
          version_minor: 0,
          version_status: 'published',
          lifecycle_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTestCase.id)
        .select('*, creator:profiles!test_cases_created_by_fkey(full_name, email)')
        .single();

      if (error) throw error;

      // Insert version snapshot (ignore conflict if already exists)
      await supabase.from('test_case_version_snapshots').upsert({
        test_case_id: selectedTestCase.id,
        version_major: newMajor,
        version_minor: 0,
        snapshot,
      }, { onConflict: 'test_case_id,version_major,version_minor' });

      // Insert history record
      await supabase.from('test_case_history').insert({
        test_case_id: selectedTestCase.id,
        user_id: user.id,
        action_type: 'published',
        version_major: newMajor,
        version_minor: 0,
        version_status: 'published',
        change_summary: `Published v${newMajor}.0`,
      });

      // Use onRefresh instead of onUpdate: restore/publish already wrote to DB directly.
      // Calling onUpdate would trigger a second Supabase update (in handleUpdateTestCase)
      // that could overwrite or corrupt the just-saved state.
      await onRefresh();
      setSelectedTestCase(data);
      setShowPublishModal(false);
      fetchHistory(data.id);
      showToast(`v${newMajor}.0 published successfully.`, 'success');
    } catch (error) {
      console.error('Publish error:', error);
      setShowPublishModal(false);
      showToast('Failed to publish version. Please try again.', 'error');
    } finally {
      setPublishingVersion(false);
    }
  };

  // ── Cherry-pick Partial Restore (Pro) ────────────────────────────────────
  const handleCherryPickRestore = async () => {
    if (!cherryPickSource || !selectedTestCase) return;
    try {
      setRestoringHistory(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const oldSnapshot: TestCaseSnapshot = JSON.parse(cherryPickSource.old_value || '{}');
      const selectedFields = Object.entries(cherryPickFields)
        .filter(([, checked]) => checked)
        .map(([f]) => f);

      if (selectedFields.length === 0) return;

      const newMinor = (selectedTestCase.version_minor ?? 0) + 1;
      const currentMajor = selectedTestCase.version_major ?? 1;

      const updateData: Record<string, any> = {
        version_minor: newMinor,
        version_status: 'draft',
        updated_at: new Date().toISOString(),
      };
      for (const field of selectedFields) {
        updateData[field] = field === 'is_automated'
          ? oldSnapshot.is_automated
          : (oldSnapshot as any)[field] || null;
      }

      const { data, error } = await supabase
        .from('test_cases')
        .update(updateData)
        .eq('id', selectedTestCase.id)
        .select('*, creator:profiles!test_cases_created_by_fkey(full_name, email)')
        .single();

      if (error) throw error;

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
      const newSnapshot = { ...currentSnapshot };
      for (const field of selectedFields) {
        (newSnapshot as any)[field] = (oldSnapshot as any)[field];
      }

      await supabase.from('test_case_history').insert({
        test_case_id: selectedTestCase.id,
        user_id: user.id,
        action_type: 'partial_restored',
        version_major: currentMajor,
        version_minor: newMinor,
        version_status: 'draft',
        field_name: selectedFields.join(', '),
        old_value: JSON.stringify(currentSnapshot),
        new_value: JSON.stringify(newSnapshot),
        change_summary: `Partial restore: ${selectedFields.join(', ')} from v${cherryPickSource.version_major ?? 1}.${cherryPickSource.version_minor ?? 0}`,
      });

      await onRefresh();
      setSelectedTestCase(data);
      setShowCherryPickModal(false);
      setCherryPickSource(null);
      setCherryPickFields({});
      setShowHistoryModal(false);
      setSelectedHistory(null);
      fetchHistory(data.id);
    } catch (error) {
      console.error('Cherry-pick error:', error);
    } finally {
      setRestoringHistory(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────────

  const handleRestoreVersion = async () => {
    if (!rollbackTarget || !selectedTestCase) return;

    try {
      setRestoringHistory(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Restore to old_value snapshot (creates a new draft minor version)
      const oldSnapshot: TestCaseSnapshot = JSON.parse(rollbackTarget.old_value || '{}');
      const newMinor = (selectedTestCase.version_minor ?? 0) + 1;
      const currentMajor = selectedTestCase.version_major ?? 1;


      const { data, error } = await supabase
        .from('test_cases')
        .update({
          title: oldSnapshot.title,
          description: oldSnapshot.description || null,
          precondition: oldSnapshot.precondition || null,
          priority: oldSnapshot.priority,
          folder: oldSnapshot.folder || null,
          tags: oldSnapshot.tags || null,
          steps: oldSnapshot.steps || null,
          expected_result: oldSnapshot.expected_result || null,
          assignee: oldSnapshot.assignee || null,
          is_automated: oldSnapshot.is_automated,
          version_minor: newMinor,
          version_status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTestCase.id)
        .select('*, creator:profiles!test_cases_created_by_fkey(full_name, email)')
        .single();

      if (error) throw error;

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
        version_major: currentMajor,
        version_minor: newMinor,
        version_status: 'draft',
        field_name: 'restored from previous version',
        old_value: JSON.stringify(currentSnapshot),
        new_value: JSON.stringify(oldSnapshot),
        change_summary: `Restored to v${rollbackTarget.version_major ?? 1}.${rollbackTarget.version_minor ?? 0}`,
      });

      await onRefresh();
      setSelectedTestCase(data);
      setShowRollbackModal(false);
      setRollbackTarget(null);
      setShowHistoryModal(false);
      setSelectedHistory(null);
      fetchHistory(data.id);
    } catch (error) {
      console.error('복원 오류:', error);
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

  // ── TC Versioning helpers ────────────────────────────────────────────────

  const generateChangeSummary = (oldS: TestCaseSnapshot, newS: TestCaseSnapshot): string => {
    const changes: string[] = [];
    if (oldS.title !== newS.title) changes.push('title');
    if (oldS.priority !== newS.priority) changes.push(`priority (${oldS.priority}→${newS.priority})`);
    if (oldS.steps !== newS.steps) {
      const oldCount = oldS.steps ? oldS.steps.split('\n').filter(Boolean).length : 0;
      const newCount = newS.steps ? newS.steps.split('\n').filter(Boolean).length : 0;
      const diff = newCount - oldCount;
      changes.push(diff > 0 ? `steps (+${diff})` : diff < 0 ? `steps (-${Math.abs(diff)})` : 'steps');
    }
    if (oldS.description !== newS.description) changes.push('description');
    if (oldS.precondition !== newS.precondition) changes.push('precondition');
    if (oldS.expected_result !== newS.expected_result) changes.push('expected result');
    if (oldS.folder !== newS.folder) changes.push('folder');
    if (oldS.tags !== newS.tags) changes.push('tags');
    if (oldS.assignee !== newS.assignee) changes.push('assignee');
    if (oldS.is_automated !== newS.is_automated) changes.push('automated');
    return changes.length > 0 ? `Updated ${changes.join(', ')}` : 'No changes';
  };

  type DiffLine = { type: 'unchanged' | 'added' | 'removed'; text: string };

  const computeLineDiff = (oldText: string, newText: string): DiffLine[] => {
    const oldLines = (oldText || '').split('\n').filter(Boolean);
    const newLines = (newText || '').split('\n').filter(Boolean);
    if (oldLines.length === 0 && newLines.length === 0) return [];

    // LCS-based line diff (O(mn) – acceptable for short step lists)
    const m = oldLines.length, n = newLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    const result: DiffLine[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        result.unshift({ type: 'unchanged', text: oldLines[i - 1] });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ type: 'added', text: newLines[j - 1] });
        j--;
      } else {
        result.unshift({ type: 'removed', text: oldLines[i - 1] });
        i--;
      }
    }
    return result;
  };

  const versionLabel = (major?: number, minor?: number, status?: string) => {
    const m = major ?? 1, n = minor ?? 0;
    return `v${m}.${n}`;
  };

  // Normalize steps/expected_result for comparison: strip "N. " prefix, remove empty lines,
  // re-number, rejoin. Handles legacy data with missing prefixes or trailing empty entries.
  // For legacy JSON-format snapshots: shows step actions only (no expected result inline).
  const normalizeStepField = (text: string): string => {
    if (!text) return '';
    // Handle legacy JSON array format (old snapshots saved before plain-text split)
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((s: any, i: number) => {
          if (s.type === 'shared_step_ref') {
            return `${i + 1}. 🔗 [${s.shared_step_custom_id}] ${s.shared_step_name} (v${s.shared_step_version})`;
          }
          return `${i + 1}. ${s.step || ''}`;
        }).join('\n');
      }
    } catch {}
    // Plain text fallback
    return (text || '').split('\n')
      .map(s => s.replace(/^\d+\.\s*/, '').trim())
      .filter(s => s !== '')
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n');
  };

  // ────────────────────────────────────────────────────────────────────────

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
      
      showToast(`${addedCount} test case${addedCount === 1 ? '' : 's'} moved to "${folderName}".`, 'success');
    } catch (error) {
      console.error('폴더 일괄 추가 오류:', error);
      showToast('Failed to assign folder.', 'error');
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
      
      showToast(`${removedCount} test case${removedCount === 1 ? '' : 's'} removed from folder.`, 'success');
    } catch (error) {
      console.error('폴더 제거 오류:', error);
      showToast('Failed to remove folder.', 'error');
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

      showToast(`${deletedCount} test case${deletedCount === 1 ? '' : 's'} deleted.`, 'success');
    } catch (error) {
      console.error('일괄 삭제 오류:', error);
      showToast('Failed to delete test cases.', 'error');
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
        ? ` (${foldersToCreate.length} folder${foldersToCreate.length === 1 ? '' : 's'} created)`
        : '';

      showToast(`${selectedIds.length} test case${selectedIds.length === 1 ? '' : 's'} copied to "${targetProject?.name}".${folderMsg}`, 'success');
    } catch (error) {
      console.error('복사 오류:', error);
      showToast('Failed to copy test cases.', 'error');
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
      <div className={`${isFolderPanelOpen ? 'w-[220px] min-w-[220px]' : 'w-0'} bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex flex-col flex-shrink-0`}>
        <div className="w-[220px] flex flex-col h-full">
          <div className="px-[0.875rem] py-[0.75rem] border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[0.8125rem] font-bold text-slate-900">Folders</span>
              <button
                onClick={() => {
                  setNewFolder({ name: '', icon: 'ri-folder-line', color: getNextFolderColor(folders) });
                  setShowNewFolderModal(true);
                }}
                className="flex items-center gap-[0.25rem] text-[0.6875rem] font-semibold text-indigo-500 cursor-pointer px-2 py-1 rounded-md border-none bg-transparent hover:bg-indigo-50 transition-colors"
              >
                <i className="ri-add-line text-sm"></i>
                New
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-[0.375rem]">
            {allFolders.map((folder) => (
              <div key={folder.id} className="group relative">
                <button
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full flex items-center gap-[0.375rem] px-[0.875rem] py-[0.4375rem] text-[0.8125rem] cursor-pointer transition-all whitespace-nowrap ${
                    selectedFolder === folder.id
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {(() => {
                    const fs = getFolderStyle(folder.color);
                    return (
                      <span
                        className="flex-shrink-0 flex items-center justify-center"
                        style={{ width: 22, height: 22, borderRadius: 5, background: fs.bg }}
                      >
                        <i className={`${folder.icon} text-[0.8125rem]`} style={{ color: fs.fg }}></i>
                      </span>
                    );
                  })()}
                  <span className="flex-1 text-left truncate">{folder.name}</span>
                  <span className={`text-[0.75rem] font-medium ${selectedFolder === folder.id ? 'text-indigo-500' : 'text-slate-400'}`}>{folder.count}</span>
                  {folder.id !== 'all' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                      className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex-shrink-0"
                    >
                      <i className="ri-delete-bin-line text-xs"></i>
                    </button>
                  )}
                </button>
              </div>
            ))}
          </div>
          <div className="px-[0.875rem] py-3 border-t border-gray-200">
            <button onClick={() => setIsFolderPanelOpen(false)} className="flex items-center gap-1 text-[0.75rem] text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none transition-colors">
              <i className="ri-arrow-left-s-line text-sm"></i>
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* 폴더 패널 열기 버튼 - 닫혀있을 때만 표시 */}
      {!isFolderPanelOpen && (
        <button
          onClick={() => setIsFolderPanelOpen(true)}
          className="w-7 h-10 bg-white border-r border-y border-gray-200 rounded-r flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all cursor-pointer self-start mt-6"
        >
          <i className="ri-arrow-right-s-line text-base"></i>
        </button>
      )}

      {/* 테스트 케이스 목록 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TC 한도 접근 배너 (80%+) */}
        {(() => {
          const TC_LIMITS: Record<number, number> = { 1: 100, 2: 200 };
          const tcLimit = TC_LIMITS[userTier];
          if (!tcLimit) return null;
          const pct = testCases.length / tcLimit;
          if (pct < 0.8) return null;
          const atLimit = testCases.length >= tcLimit;
          return (
            <UpgradeBanner
              message={
                atLimit
                  ? `You've reached the ${tcLimit} test case limit on your plan. Upgrade to add more.`
                  : `You've used ${testCases.length} of ${tcLimit} test cases. Approaching your plan limit.`
              }
              ctaLabel="Upgrade Plan"
              inline
              dismissKey={`tc-limit-${userTier}`}
              className="mx-4 mt-3"
            />
          );
        })()}
        {/* 필터 바 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0 flex-wrap">
          {/* Search */}
          <div className="relative">
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={tcSearchQuery}
              onChange={e => setTcSearchQuery(e.target.value)}
              placeholder="Search test cases…"
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white w-44"
            />
          </div>

          {/* Priority filter */}
          <div className="relative" ref={tcFilterDropdownRef}>
            <button
              onClick={() => setTcShowFilterDropdown(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium cursor-pointer transition-colors ${tcPriorityFilters.length > 0 || tcTagFilters.length > 0 ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <i className="ri-filter-line" />
              Filters
              {(tcPriorityFilters.length + tcTagFilters.length) > 0 && (
                <span className="px-1 bg-indigo-600 text-white rounded text-[0.5625rem] font-bold">{tcPriorityFilters.length + tcTagFilters.length}</span>
              )}
            </button>
            {tcShowFilterDropdown && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-30 p-3">
                <div className="mb-2.5">
                  <p className="text-[0.6875rem] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Priority</p>
                  <div className="flex flex-wrap gap-1">
                    {['critical', 'high', 'medium', 'low'].map(p => (
                      <button
                        key={p}
                        onClick={() => setTcPriorityFilters(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                        className={`px-2 py-0.5 rounded-full text-xs capitalize font-medium cursor-pointer border transition-colors ${tcPriorityFilters.includes(p) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                {allTcTags.length > 0 && (
                  <div>
                    <p className="text-[0.6875rem] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                      {allTcTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setTcTagFilters(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag])}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer border transition-colors ${tcTagFilters.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(tcPriorityFilters.length + tcTagFilters.length) > 0 && (
                  <button
                    onClick={() => { setTcPriorityFilters([]); setTcTagFilters([]); }}
                    className="mt-2 w-full text-xs text-gray-500 hover:text-red-500 cursor-pointer text-center"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active filter chips */}
          {tcTagFilters.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">
              {tag}
              <button onClick={() => setTcTagFilters(prev => prev.filter(t => t !== tag))} className="text-indigo-400 hover:text-indigo-700 cursor-pointer leading-none">×</button>
            </span>
          ))}

          <div className="flex-1" />

          {/* Saved Views */}
          <SavedViewsDropdown
            views={tcSavedViews}
            currentFilters={tcCurrentFilters}
            onApplyView={applyTcViewFilters}
            onSaveView={(name) => saveTcView(name, tcCurrentFilters)}
            onDeleteView={deleteTcView}
          />

          {/* result count */}
          {(tcSearchQuery || tcPriorityFilters.length > 0 || tcTagFilters.length > 0) && (
            <span className="text-xs text-gray-400">{filteredTestCases.length} result{filteredTestCases.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* 액션 바 */}
        <div className="flex items-center justify-end gap-2 px-4 py-[0.6875rem] border-b border-gray-100 bg-white flex-shrink-0">
          <button
            onClick={() => {
              setEditingTestCase(null);
              const currentFolder = selectedFolder !== 'all'
                ? folders.find(f => f.id === selectedFolder)?.name || ''
                : '';
              setNewTestCase({ title: '', description: '', precondition: '', folder: currentFolder, priority: 'medium', assignee: '', is_automated: false, steps: '', expected_result: '', tags: '', attachments: [] });
              setTestSteps([{ id: '1', step: '', expectedResult: '' }]);
              setShowNewCaseModal(true);
            }}
            className="px-[0.875rem] py-[0.4375rem] bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all font-semibold text-[0.8125rem] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line text-base"></i>
            New Test Case
          </button>
          <button
            onClick={handleOpenExportImport}
            className="px-[0.875rem] py-[0.4375rem] border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all text-[0.8125rem] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-file-transfer-line text-base"></i>
            Export / Import
          </button>
          <button
            onClick={() => setShowCloneModal(true)}
            className="px-[0.875rem] py-[0.4375rem] border border-violet-200 text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-all text-[0.8125rem] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-file-copy-line text-base"></i>
            Clone from Project
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {filteredTestCases.length === 0 ? (
            <EmptyState
              icon={<TestCasesIllustration />}
              title="No test cases yet"
              description="Capture what your product should do. Test cases keep your team aligned on expected behavior."
              action={{
                label: 'Create test case',
                onClick: () => {
                  setEditingTestCase(null);
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
                },
              }}
            />
          ) : (
            <div
              ref={tableContainerRef}
              className="overflow-x-auto overflow-y-auto h-full"
            >
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-[0.6875rem] text-left w-9">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-indigo-500"
                        checked={isAllSelected}
                        ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-[0.6875rem] text-left text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-[0.05em]" style={{ minWidth: '80px' }}>ID</th>
                    <th className="px-4 py-[0.6875rem] text-left text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-[0.05em]">Title</th>
                    <th className="px-4 py-[0.6875rem] text-left text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-[0.05em]">Priority</th>
                    <th className="px-4 py-[0.6875rem] text-left text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-[0.05em]">Status</th>
                    <th className="px-4 py-[0.6875rem] text-left text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-[0.05em]">Folder</th>
                    <th className="px-4 py-[0.6875rem] text-left text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-[0.05em]">Assignee</th>
                    <th className="px-4 py-[0.6875rem] text-left text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-[0.05em]">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paddingTop > 0 && (
                    <tr><td colSpan={8} style={{ height: paddingTop }} /></tr>
                  )}
                  {virtualItems.map((vItem) => {
                    const testCase = filteredTestCases[vItem.index];
                    const lcStatus = testCase.lifecycle_status || 'active';
                    return (
                    <tr
                      key={testCase.id}
                      className={`transition-colors cursor-pointer ${
                        selectedTestCase?.id === testCase.id ? 'bg-indigo-50' : 'hover:bg-violet-50'
                      }`}
                      style={lcStatus === 'deprecated' ? { opacity: 0.5 } : undefined}
                      onClick={() => { setSelectedTestCase(testCase); setStepsHeightPx(null); window.scrollTo(0, 0); }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, tcId: testCase.id, tcTitle: testCase.title });
                        setContextMenuStatusOpen(false);
                      }}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-[0.6875rem] w-9" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-indigo-500"
                          checked={selectedTestCaseIds.has(testCase.id)}
                          onChange={() => handleSelectTestCase(testCase.id)}
                        />
                      </td>
                      {/* ID */}
                      <td className="px-4 py-[0.6875rem]" style={{ minWidth: '80px' }}>
                        <span className={`font-mono text-[0.8125rem] font-semibold cursor-pointer hover:underline whitespace-nowrap ${testCase.custom_id ? 'text-indigo-600' : 'text-gray-400'}`}>
                          {testCase.custom_id || virtualIdMap.get(testCase.id) || '-'}
                        </span>
                      </td>
                      {/* Title */}
                      <td className="px-4 py-[0.6875rem]">
                        <span className="text-[0.8125rem] font-semibold text-slate-900 block max-w-[360px] whitespace-nowrap overflow-hidden text-ellipsis">
                          {testCase.is_automated && <i className="ri-robot-line text-purple-500 mr-1 text-xs"></i>}
                          {testCase.title}
                        </span>
                      </td>
                      {/* Priority - dot + text */}
                      <td className="px-4 py-[0.6875rem]">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: PRIORITY_DOT_COLORS[testCase.priority] || '#94A3B8' }}
                          />
                          <span className="text-[0.8125rem] text-slate-600 capitalize">{testCase.priority}</span>
                        </span>
                      </td>
                      {/* Status (lifecycle) */}
                      <td className="px-4 py-[0.6875rem]" onClick={(e) => e.stopPropagation()}>
                        <LifecycleBadge
                          status={lcStatus}
                          size="sm"
                          clickable
                          onStatusChange={(ns) => handleLifecycleChange(testCase, ns)}
                        />
                      </td>
                      {/* Folder */}
                      <td className="px-4 py-[0.6875rem]">
                        {testCase.folder ? (() => {
                          const f = folders.find(fd => fd.name === testCase.folder);
                          const fs = getFolderStyle(f?.color || 'indigo');
                          const icon = f?.icon || 'ri-folder-line';
                          return (
                            <span className="flex items-center gap-1.5 text-[0.8125rem] text-slate-600">
                              <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 4, background: fs.bg }}>
                                <i className={`${icon} text-[0.6875rem]`} style={{ color: fs.fg }}></i>
                              </span>
                              {testCase.folder}
                            </span>
                          );
                        })() : (
                          <span className="text-[0.8125rem] text-slate-400">-</span>
                        )}
                      </td>
                      {/* Assignee */}
                      <td className="px-4 py-[0.6875rem]">
                        {testCase.assignee ? (
                          <Avatar
                            userId={testCase.assignee}
                            name={testCase.assignee}
                            size="sm"
                            title={testCase.assignee}
                          />
                        ) : (
                          <span className="text-[0.8125rem] text-slate-400">-</span>
                        )}
                      </td>
                      {/* Updated */}
                      <td className="px-4 py-[0.6875rem]">
                        <span className="text-[0.8125rem] text-slate-400">
                          {tcTimeAgo(testCase.updated_at)}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                  {paddingBottom > 0 && (
                    <tr><td colSpan={8} style={{ height: paddingBottom }} /></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 우측 상세 패널 */}
      {selectedTestCase && (
        <div ref={detailPanelRef} className="w-[500px] min-w-[500px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">


          {/* §1 — Header */}
          <div className="px-5 pt-4 pb-[0.875rem] border-b border-slate-200 flex-shrink-0">
            <div className="flex items-start justify-between gap-2 mb-[0.5rem]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-[0.25rem] flex-wrap">
                  {selectedTestCase.custom_id && (
                    <span className="text-[0.6875rem] font-mono text-slate-400">
                      {selectedTestCase.custom_id}
                    </span>
                  )}
                  {/* Version badge */}
                  {(() => {
                    const major = selectedTestCase.version_major ?? 1;
                    const minor = selectedTestCase.version_minor ?? 0;
                    const status = selectedTestCase.version_status ?? 'published';
                    const isDraft = status === 'draft';
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-bold border ${
                        isDraft
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        <i className={`text-[0.75rem] ${isDraft ? 'ri-edit-circle-line' : 'ri-checkbox-circle-fill'}`}></i>
                        v{major}.{minor} {isDraft ? 'Draft' : 'Published'}
                      </span>
                    );
                  })()}
                </div>
                <h2 className="text-[0.9375rem] font-bold text-slate-900 leading-[1.3]">
                  {selectedTestCase.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTestCase(null)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all cursor-pointer flex-shrink-0 border-none bg-transparent"
              >
                <i className="ri-close-line text-[1.125rem]"></i>
              </button>
            </div>
            {selectedTestCase.description && (
              <p className="text-[0.75rem] text-slate-500 leading-[1.5] mt-[0.375rem]">{selectedTestCase.description}</p>
            )}
          </div>

          {/* §2 — Meta Grid (always visible, 2-col) */}
          <div className="px-5 py-[0.875rem] border-b border-slate-100 flex-shrink-0">
            <div className="grid grid-cols-2 gap-x-4 gap-y-[0.625rem]">
              {/* Priority */}
              <div>
                <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-[0.1875rem]">Priority</div>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: PRIORITY_DOT_COLORS[selectedTestCase.priority] || '#94A3B8' }}
                  />
                  <span className="text-[0.8125rem] text-slate-600 capitalize">{selectedTestCase.priority}</span>
                </span>
              </div>

              {/* Folder */}
              <div>
                <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-[0.1875rem]">Folder</div>
                {selectedTestCase.folder ? (() => {
                  const f = folders.find(fd => fd.name === selectedTestCase.folder);
                  const fs = getFolderStyle(f?.color || 'indigo');
                  const icon = f?.icon || 'ri-folder-line';
                  return (
                    <p className="text-[0.8125rem] font-medium text-slate-900 flex items-center gap-1.5">
                      <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 4, background: fs.bg }}>
                        <i className={`${icon} text-[0.6875rem]`} style={{ color: fs.fg }}></i>
                      </span>
                      {selectedTestCase.folder}
                    </p>
                  );
                })() : <p className="text-[0.8125rem] text-slate-300">—</p>}
              </div>

              {/* Tags */}
              <div>
                <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-[0.1875rem]">Tags</div>
                {selectedTestCase.tags ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedTestCase.tags.split(',').map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-[0.4375rem] py-0.5 bg-indigo-50 text-indigo-700 rounded text-[0.6875rem] font-medium">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[0.8125rem] text-slate-300">—</p>
                )}
              </div>

              {/* Assignee */}
              <div>
                <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-[0.1875rem]">Assignee</div>
                {selectedTestCase.assignee ? (
                  <div className="flex items-center gap-[0.375rem]">
                    <Avatar userId={selectedTestCase.assignee} name={selectedTestCase.assignee} size="xs" />
                    <span className="text-[0.8125rem] font-medium text-slate-900 truncate">{selectedTestCase.assignee}</span>
                  </div>
                ) : (
                  <p className="text-[0.8125rem] text-slate-300">—</p>
                )}
              </div>

              {/* Created */}
              <div>
                <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-[0.1875rem]">Created</div>
                <p className="text-[0.8125rem] font-medium text-slate-900">
                  {new Date(selectedTestCase.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* ── dp-split: steps + drag handle + tabs (flex-1) ── */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Steps Toggle Bar */}
          <button
            onClick={() => setStepsCollapsed(!stepsCollapsed)}
            className="flex items-center justify-between w-full px-5 py-2 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200 flex-shrink-0 cursor-pointer border-l-0 border-r-0 border-t-0"
          >
            <div className="flex items-center gap-2">
              <i
                className={`ri-arrow-down-s-line text-[0.875rem] transition-transform duration-200 ${stepsCollapsed ? '-rotate-90' : ''}`}
                style={{ color: '#6366F1' }}
              />
              <span className="text-[0.6875rem] font-bold text-slate-600 uppercase tracking-[0.04em]">Test Steps</span>
            </div>
            <span className="text-[0.6875rem] text-slate-400 font-medium">
              {(() => {
                const stepsList = parseStepsList(selectedTestCase.steps, selectedTestCase.expected_result);
                const attachCount = selectedTestCase.attachments?.length || 0;
                const stepCount = stepsList.length;
                let right = `${stepCount} step${stepCount !== 1 ? 's' : ''}`;
                if (attachCount > 0) right += ` · ${attachCount} attachment${attachCount !== 1 ? 's' : ''}`;
                return right;
              })()}
            </span>
          </button>

          {/* Steps Area (collapsible, smart max-height) */}
          {!stepsCollapsed && (
            <div
              ref={stepsAreaRef}
              className="overflow-y-auto px-5 py-[0.875rem] border-b border-slate-200 flex-shrink-0 space-y-3"
              style={{ height: stepsHeightPx !== null ? `${stepsHeightPx}px` : undefined, maxHeight: stepsHeightPx !== null ? undefined : '40vh' }}
            >

              {/* Precondition */}
              {selectedTestCase.precondition && (
                <div>
                  <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-slate-400 mb-[0.375rem] flex items-center gap-1">
                    <i className="ri-alert-line text-[0.75rem]"></i>
                    Precondition
                  </div>
                  <div className="bg-amber-50 border border-yellow-200 rounded-md px-[0.75rem] py-[0.5rem]">
                    <p className="text-[0.75rem] text-amber-800 leading-[1.5]">{htmlToText(selectedTestCase.precondition)}</p>
                  </div>
                </div>
              )}

              {/* Steps with inline Expected Result */}
              {(() => {
                const stepsList = parseStepsList(selectedTestCase.steps, selectedTestCase.expected_result);
                if (stepsList.length > 0) {
                  return (
                    <div className="flex flex-col gap-[0.375rem]">
                      {stepsList.map((s: any, index) => {
                        // SharedStepRef — render expanded read-only view
                        if (isSharedStepRef(s)) {
                          return (
                            <SharedStepRefRow
                              key={s.id || index}
                              step={s}
                              showDelete={false}
                              tcId={selectedTestCase.id}
                              onVersionUpdated={async () => {
                                const { data } = await supabase
                                  .from('test_cases')
                                  .select('*')
                                  .eq('id', selectedTestCase.id)
                                  .single();
                                if (data) setSelectedTestCase(data as TestCase);
                              }}
                            />
                          );
                        }
                        // Normal step
                        return (
                        <div key={index} className="flex gap-2 bg-slate-50 rounded-lg px-[0.75rem] py-[0.5rem] items-start">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-[0.0625rem] bg-indigo-50 text-indigo-700" style={{ fontSize: '0.625rem' }}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            {/<[^>]+>/.test(s.step) ? (
                              <div className="text-[0.8rem] text-slate-700 leading-[1.5] prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: s.step }} />
                            ) : (
                              <p className="text-[0.8rem] text-slate-700 whitespace-pre-wrap leading-[1.5]">{s.step}</p>
                            )}
                            {s.expectedResult && (
                              <div className="mt-[0.25rem] flex items-start gap-1 leading-[1.4]">
                                <span className="text-[0.8rem] text-green-600 flex-shrink-0 font-medium">✓</span>
                                <span className="text-[0.8rem] text-green-600">{htmlToText(s.expectedResult)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  );
                } else if (selectedTestCase.expected_result) {
                  return (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <i className="ri-checkbox-circle-line text-green-600 text-xs"></i>
                        <span className="text-[0.6875rem] font-bold text-green-600 uppercase tracking-wider">Expected Result</span>
                      </div>
                      <p className="text-xs text-green-800 leading-relaxed">{selectedTestCase.expected_result}</p>
                    </div>
                  );
                }
                return <p className="text-[0.75rem] text-slate-400 text-center py-2">No steps defined</p>;
              })()}

              {/* Attachments */}
              {selectedTestCase.attachments && selectedTestCase.attachments.length > 0 && (
                <div>
                  <div className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <i className="ri-attachment-2 text-[0.75rem]"></i>
                    Attachments ({selectedTestCase.attachments.length})
                  </div>
                  <div className="grid grid-cols-3 gap-[0.375rem]">
                    {selectedTestCase.attachments.map((file, index) => (
                      <div
                        key={index}
                        onClick={() => setImagePreview(file.url)}
                        className="h-12 rounded-md overflow-hidden bg-slate-100 cursor-pointer hover:border-indigo-200 transition-all border border-slate-200 flex items-center justify-center gap-1"
                        title={file.name}
                      >
                        {/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name) ? (
                          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <i className="ri-file-text-line text-slate-400 text-sm"></i>
                            <span className="text-[0.625rem] text-slate-400 truncate px-1">{file.name}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Drag resize handle (visible only when steps expanded) ── */}
          {!stepsCollapsed && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                const startY = e.clientY;
                const actualHeight = stepsAreaRef.current?.getBoundingClientRect().height ?? 200;
                setStepsHeightPx(actualHeight);
                const onMove = (ev: MouseEvent) => {
                  ev.preventDefault();
                  const newH = Math.max(60, actualHeight + (ev.clientY - startY));
                  stepsHeightRef.current = newH;
                  if (stepsAreaRef.current) {
                    stepsAreaRef.current.style.height = `${newH}px`;
                  }
                };
                const onUp = () => {
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
                  if (stepsHeightRef.current !== null) {
                    setStepsHeightPx(stepsHeightRef.current);
                  }
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              }}
              className="h-[6px] flex-shrink-0 cursor-row-resize bg-slate-50 border-b border-slate-200 flex items-center justify-center hover:bg-indigo-50 transition-colors group"
            >
              <div className="w-8 h-[3px] bg-slate-300 rounded-full group-hover:bg-indigo-500 transition-colors" />
            </div>
          )}

          {/* §3 — Tabs (no Details tab) */}
          <div className="flex border-b border-slate-200 flex-shrink-0">
            {(['comments', 'results', 'issues', 'history'] as const).map((tab) => {
              const labels: Record<string, string> = { comments: 'Comments', results: 'Results', issues: 'Issues', history: 'History' };
              const counts: Record<string, number | undefined> = {
                comments: comments.length || undefined,
                results: testResults.length || undefined,
                issues: testIssues.length || undefined,
                history: undefined,
              };
              const count = counts[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-[0.75rem] font-semibold transition-all cursor-pointer whitespace-nowrap bg-transparent border-t-0 border-l-0 border-r-0 ${
                    activeTab === tab
                      ? 'text-indigo-500 border-b-2 border-indigo-500'
                      : 'text-slate-400 border-b-2 border-transparent hover:text-slate-600'
                  }`}
                >
                  {labels[tab]}
                  {count !== undefined && count > 0 && (
                    <span className={`text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* §4 — Tab Body (flex-1, min 220px, scrollable) */}
          <div className="flex-1 overflow-y-auto px-5 py-[0.875rem]" style={{ minHeight: '220px' }}>

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-3">
                {loadingComments ? (
                  <div className="text-center py-6">
                    <i className="ri-loader-4-line animate-spin text-xl text-slate-400"></i>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="ri-chat-3-line text-2xl text-slate-300 block mb-1"></i>
                    <p className="text-[0.75rem] text-slate-400">No comments yet</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="group">
                      <div className="flex items-center gap-[0.375rem] mb-[0.25rem]">
                        <Avatar userId={comment.user_id} name={comment.author} size="xs" />
                        <span className="text-[0.75rem] font-semibold text-slate-900">{comment.author}</span>
                        <span className="text-[0.6875rem] text-slate-400">
                          {comment.timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="ml-auto w-5 h-5 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 border-none bg-transparent"
                        >
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                      <div className="text-[0.75rem] text-slate-600 leading-[1.5] bg-slate-50 px-[0.75rem] py-[0.5rem] rounded-md border border-slate-100 ml-[1.625rem] whitespace-pre-wrap break-words">
                        {comment.text}
                      </div>
                    </div>
                  ))
                )}
                {/* Comment input — flows naturally after comments */}
                <div className="flex items-start gap-2 pt-1">
                  <Avatar
                    userId={currentUser?.id || ''}
                    name={currentUser?.full_name || currentUser?.email || 'You'}
                    size="xs"
                  />
                  <div className="flex-1 flex gap-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      rows={1}
                      className="flex-1 text-[0.75rem] px-[0.75rem] py-[0.5rem] border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500 resize-none font-[inherit]"
                      style={{ height: '2.5rem' }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (commentText.trim()) handlePostComment(); } }}
                    />
                    <button
                      onClick={handlePostComment}
                      disabled={!commentText.trim()}
                      className="text-[0.75rem] font-semibold px-[0.75rem] py-[0.375rem] rounded-md bg-indigo-500 text-white border-none cursor-pointer font-[inherit] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600 transition-colors flex-shrink-0"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <div>
                {loadingResults ? (
                  <div className="text-center py-8">
                    <i className="ri-loader-4-line animate-spin text-2xl text-slate-400 block mb-2"></i>
                    <p className="text-[0.75rem] text-slate-400">Loading results...</p>
                  </div>
                ) : testResults.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="ri-file-list-line text-2xl text-slate-300 block mb-1"></i>
                    <p className="text-[0.75rem] text-slate-400">No test results yet</p>
                  </div>
                ) : (
                  testResults.map((result) => {
                    const statusStyles: Record<string, { bg: string; color: string; dot: string }> = {
                      passed:   { bg: '#F0FDF4', color: '#166534', dot: '#22C55E' },
                      failed:   { bg: '#FEF2F2', color: '#991B1B', dot: '#EF4444' },
                      blocked:  { bg: '#FFF7ED', color: '#9A3412', dot: '#F97316' },
                      retest:   { bg: '#F5F3FF', color: '#5B21B6', dot: '#8B5CF6' },
                      untested: { bg: '#F8FAFC', color: '#64748B', dot: '#94A3B8' },
                    };
                    const st = statusStyles[result.status] || statusStyles.untested;
                    const dateStr = result.created_at
                      ? new Date(result.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '';
                    const timeAgo = result.created_at ? tcTimeAgo(result.created_at) : '';
                    return (
                      <div key={result.id} className="flex items-start gap-2 py-2 border-b border-slate-100">
                        <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold px-2 py-[0.125rem] rounded-full flex-shrink-0 mt-0.5" style={{ background: st.bg, color: st.color }}>
                          <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: st.dot }}></span>
                          {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.75rem] font-semibold text-slate-900 truncate">{result.run?.name || 'Unknown Run'}</div>
                          <div className="text-[0.6875rem] text-slate-400 flex items-center gap-1 flex-wrap">
                            {dateStr && <span>{dateStr}</span>}
                            {timeAgo && <><span>·</span><span>{timeAgo}</span></>}
                            {result.author && <><span>·</span><span className="text-slate-500">{result.author}</span></>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Issues Tab */}
            {activeTab === 'issues' && (
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  {loadingIssues ? (
                    <div className="text-center py-8">
                      <i className="ri-loader-4-line animate-spin text-2xl text-slate-400"></i>
                    </div>
                  ) : testIssues.length === 0 ? (
                    <div className="text-center py-8">
                      <i className="ri-bug-line text-2xl text-slate-300 block mb-1"></i>
                      <p className="text-[0.75rem] text-slate-400">No issues linked</p>
                    </div>
                  ) : (
                    testIssues.map((issue) => {
                      const issueDate = issue.created_at
                        ? new Date(issue.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '';
                      return (
                        <div key={issue.id} className="flex items-start gap-2 py-2 border-b border-slate-100">
                          <div className="w-6 h-6 rounded bg-rose-50 text-rose-500 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                            <i className="ri-bug-line"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[0.75rem] font-semibold text-slate-900 truncate">{issue.issue_key}</div>
                            <div className="text-[0.6875rem] text-slate-400 flex items-center gap-1 flex-wrap">
                              <span>{issue.run_name}</span>
                              {issue.status && <><span>·</span><span className={issue.status.toLowerCase() === 'resolved' ? 'text-green-600' : 'text-slate-400'}>{issue.status}</span></>}
                              {issueDate && <><span>·</span><span>{issueDate}</span></>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* Link an issue button */}
                <div className="pt-3 mt-1 border-t border-slate-100 flex-shrink-0">
                  <button className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors cursor-pointer bg-transparent border-none">
                    <i className="ri-add-circle-line text-sm"></i>
                    Link an issue
                  </button>
                </div>
              </div>
            )}

            {/* History Tab — Version Timeline */}
            {activeTab === 'history' && (
              <div>
                {loadingHistory ? (
                  <div className="text-center py-8 text-slate-400 text-[0.75rem]">Loading...</div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="ri-time-line text-2xl text-slate-300 block mb-1"></i>
                    <p className="text-[0.75rem] text-slate-400">No history yet</p>
                  </div>
                ) : (() => {
                  // Group history items by version_major
                  type GroupEntry = { published: TestCaseHistory | null; drafts: TestCaseHistory[] };
                  const groups = new Map<number, GroupEntry>();
                  const ungrouped: TestCaseHistory[] = [];
                  for (const h of historyData) {
                    const major = h.version_major;
                    if (major === undefined || major === null) {
                      ungrouped.push(h);
                      continue;
                    }
                    if (!groups.has(major)) groups.set(major, { published: null, drafts: [] });
                    const g = groups.get(major)!;
                    if (h.action_type === 'published' || h.action_type === 'created') {
                      g.published = h;
                    } else {
                      g.drafts.push(h);
                    }
                  }
                  // Sort by major desc
                  const sortedGroups = [...groups.entries()].sort((a, b) => b[0] - a[0]);

                  const renderHistoryItem = (h: TestCaseHistory, isMinor = false) => {
                    const userName = h.user?.full_name || h.user?.email || 'Unknown';
                    const dateStr = new Date(h.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const hasDiff = !!(h.old_value && h.new_value);
                    const isDraft = h.version_status === 'draft' || (h.action_type !== 'created' && h.action_type !== 'published');

                    let actionMsg = '';
                    if (h.action_type === 'created') actionMsg = 'created this test case';
                    else if (h.action_type === 'published') actionMsg = 'published this version';
                    else if (h.action_type === 'restored') actionMsg = 'restored to previous version';
                    else if (h.action_type === 'partial_restored') actionMsg = `partial restore: ${h.field_name || ''}`;
                    else {
                      actionMsg = h.change_summary || (h.field_name && h.field_name !== 'no changes'
                        ? h.field_name.split(', ').map(f => getFieldLabel(f)).join(', ')
                        : 'updated');
                    }

                    const chips = h.field_name
                      ? h.field_name.split(', ').filter(f => f && f !== 'no changes').slice(0, 3)
                      : [];

                    return (
                      <div key={h.id} className={`relative pl-5 pb-3 ${isMinor ? 'py-2' : ''}`}>
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-[0.35rem] w-[0.625rem] h-[0.625rem] rounded-full border-2 ${
                          h.action_type === 'created'
                            ? 'bg-indigo-500 border-indigo-500'
                            : h.action_type === 'published'
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'bg-white border-slate-300'
                        }`}></div>

                        <div className="flex items-start justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {h.version_major !== undefined && (
                              <span className="text-[0.75rem] font-bold text-slate-900">
                                v{h.version_major}.{h.version_minor ?? 0}
                              </span>
                            )}
                            <span className={`text-[0.5625rem] font-semibold px-1.5 py-0.5 rounded ${
                              isDraft
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {isDraft ? 'Draft' : 'Published'}
                            </span>
                            {h.action_type === 'created' && (
                              <span className="text-[0.5625rem] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500">Initial</span>
                            )}
                          </div>
                          <span className="text-[0.625rem] text-slate-400">{dateStr}</span>
                        </div>

                        <div className="text-[0.75rem] text-slate-600 mt-0.5 leading-[1.4]">
                          <strong className="font-semibold text-slate-900">{userName}</strong>{' '}
                          {actionMsg}
                        </div>

                        {chips.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {chips.map(c => (
                              <span key={c} className="px-1.5 py-0.5 bg-slate-100 rounded text-[0.5625rem] font-medium text-slate-500">
                                {getFieldLabel(c)}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 mt-1.5">
                          {hasDiff && (
                            <button
                              onClick={() => handleHistoryClick(h)}
                              className="text-[0.6875rem] text-indigo-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer bg-transparent border-none px-0 font-semibold"
                            >
                              <i className="ri-git-commit-line text-xs"></i> View diff
                            </button>
                          )}
                          {(h.action_type === 'created' || h.action_type === 'published' || hasDiff) && h.old_value && (
                            <button
                              onClick={() => { setRollbackTarget(h); setShowRollbackModal(true); }}
                              className="text-[0.6875rem] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer bg-transparent border-none px-0 font-semibold"
                            >
                              <i className="ri-arrow-go-back-line text-xs"></i> Restore
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-[0.28125rem] top-2 bottom-2 w-[2px] bg-slate-200 rounded-full"></div>

                      {sortedGroups.map(([major, group]) => (
                        <div key={major}>
                          {/* Published / Created entry */}
                          {group.published && renderHistoryItem(group.published)}

                          {/* Draft entries — collapsed by default */}
                          {group.drafts.length > 0 && (
                            <div className="relative pl-5 pb-2">
                              <div className="absolute left-0 top-[0.35rem] w-[0.625rem] h-[0.625rem] rounded-full border-2 bg-white border-slate-300"></div>
                              <button
                                onClick={() => setExpandedMajors(prev => {
                                  const next = new Set(prev);
                                  if (next.has(major)) next.delete(major); else next.add(major);
                                  return next;
                                })}
                                className="text-[0.6875rem] text-slate-400 hover:text-indigo-500 flex items-center gap-1 cursor-pointer bg-transparent border-none px-0"
                              >
                                <i className={`text-xs ${expandedMajors.has(major) ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
                                {group.drafts.length} draft version{group.drafts.length > 1 ? 's' : ''}
                                {' '}(v{major}.0–v{major}.{group.drafts.reduce((acc, d) => Math.max(acc, d.version_minor ?? 0), 0)})
                              </button>
                              {expandedMajors.has(major) && (
                                <div className="mt-1 border-l-2 border-indigo-50 ml-1 pl-3 space-y-0">
                                  {group.drafts.map(d => renderHistoryItem(d, true))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Legacy history items without version info */}
                      {ungrouped.map(h => renderHistoryItem(h))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          {/* ── /dp-split ── */}
          </div>

          {/* §5 — Footer */}
          <div className="px-5 py-[0.75rem] border-t border-slate-200 flex gap-2 flex-shrink-0">
            {/* Publish button — only shown when version_status is 'draft' */}
            {(selectedTestCase.version_status === 'draft') && (
              <button
                onClick={() => setShowPublishModal(true)}
                className="px-[0.75rem] py-[0.4375rem] bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all font-semibold text-[0.8125rem] cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 border-none"
              >
                <i className="ri-upload-2-line text-sm"></i>
                Publish v{(selectedTestCase.version_major ?? 1) + 1}.0
              </button>
            )}
            <button
              onClick={() => handleEdit(selectedTestCase)}
              className="flex-1 px-[0.75rem] py-[0.4375rem] bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold text-[0.8125rem] cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 border-none"
            >
              <i className="ri-edit-line text-sm"></i> Edit
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this test case?')) {
                  onDelete(selectedTestCase.id);
                  setSelectedTestCase(null);
                }
              }}
              className="px-[0.75rem] py-[0.4375rem] bg-white text-rose-500 border border-rose-300 rounded-lg hover:bg-rose-50 transition-all font-semibold text-[0.8125rem] cursor-pointer whitespace-nowrap flex items-center justify-center gap-1"
            >
              <i className="ri-delete-bin-line text-sm"></i>
            </button>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">New Folder</h2>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pt-6 pb-5 space-y-5">
              {/* Live Preview */}
              {(() => {
                const fs = getFolderStyle(newFolder.color);
                return (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[0.625rem] border border-dashed border-gray-200">
                    <span
                      className="flex-shrink-0 flex items-center justify-center transition-all duration-200"
                      style={{ width: 44, height: 44, borderRadius: 10, background: fs.bg }}
                    >
                      <i className={`${newFolder.icon} text-[1.25rem]`} style={{ color: fs.fg }}></i>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.625rem] font-semibold uppercase tracking-[0.04em] text-gray-400 mb-0.5">Preview</div>
                      <div className="text-[0.9375rem] font-semibold text-gray-900 truncate">
                        {newFolder.name || 'Folder Preview'}
                      </div>
                      <div className="text-[0.6875rem] text-gray-400">아이콘과 컬러를 선택하면 실시간 반영됩니다</div>
                    </div>
                  </div>
                );
              })()}

              {/* Folder Name */}
              <div>
                <label className="block text-[0.75rem] font-semibold text-gray-700 mb-1.5">Folder Name</label>
                <input
                  type="text"
                  value={newFolder.name}
                  onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                  placeholder="e.g., Performance Tests"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 text-[0.875rem] text-gray-900 placeholder:text-gray-300"
                />
              </div>

              {/* Icon Grid */}
              <div>
                <label className="block text-[0.75rem] font-semibold text-gray-700 mb-1.5">Icon</label>
                <div className="grid grid-cols-4 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewFolder({ ...newFolder, icon })}
                      className={`w-full aspect-square flex items-center justify-center rounded-lg border-2 transition-all cursor-pointer text-[1.25rem] ${
                        newFolder.icon === icon
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                          : 'border-gray-200 text-gray-500 hover:border-indigo-200 hover:bg-gray-50'
                      }`}
                    >
                      <i className={icon}></i>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Grid */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[0.75rem] font-semibold text-gray-700">Color</label>
                  <button
                    onClick={() => {
                      const randomIcon = iconOptions[Math.floor(Math.random() * iconOptions.length)];
                      const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)].name;
                      setNewFolder({ ...newFolder, icon: randomIcon, color: randomColor });
                    }}
                    className="flex items-center gap-1 text-[0.6875rem] font-semibold text-indigo-500 hover:text-indigo-700 hover:underline cursor-pointer bg-transparent border-none"
                  >
                    <i className="ri-shuffle-line text-[0.8125rem]"></i>
                    Random
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setNewFolder({ ...newFolder, color: color.name })}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-all cursor-pointer ${
                        newFolder.color === color.name
                          ? 'border-indigo-500 bg-gray-50'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-150"
                        style={{
                          background: color.fg,
                          transform: newFolder.color === color.name ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        {newFolder.color === color.name && (
                          <i className="ri-check-line text-white text-[0.75rem]"></i>
                        )}
                      </span>
                      <span className={`text-[0.5625rem] font-semibold uppercase tracking-wide ${newFolder.color === color.name ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {color.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all text-[0.8125rem] font-semibold cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFolder}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all text-[0.8125rem] font-semibold cursor-pointer whitespace-nowrap"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Shared Step modal */}
      {showInsertSharedStepModal && (
        <InsertSharedStepModal
          projectId={projectId}
          onInsert={handleInsertSharedStep}
          onClose={() => setShowInsertSharedStepModal(false)}
        />
      )}

      {/* Convert to Shared Step dialog */}
      {convertingStep && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 1099, backdropFilter: 'blur(2px)' }}
            onClick={() => { setConvertingStep(null); setConvertName(''); }}
          />
          <div
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '420px', maxWidth: 'calc(100vw - 2rem)', background: '#fff',
              borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 1100, padding: '1.5rem',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <i className="ri-links-line text-indigo-500 text-lg" />
              <h2 className="text-sm font-semibold text-slate-800">Convert to Shared Step</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              This step will be saved as a new Shared Step and replaced with a reference.
            </p>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Shared Step Name <span className="text-red-400">*</span></label>
            <input
              className="w-full border border-slate-200 rounded-lg text-sm text-slate-700 px-3 py-2 bg-white focus:outline-none focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-colors mb-4"
              value={convertName}
              onChange={e => setConvertName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setConvertingStep(null); setConvertName(''); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                disabled={!convertName.trim() || convertSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {convertSaving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-links-line" />}
                {convertSaving ? 'Converting…' : 'Convert & Save'}
              </button>
            </div>
          </div>
        </>
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
                    <div className="mb-3">
                      <label className="block text-sm font-semibold text-gray-700">Steps</label>
                    </div>
                    <StepEditor
                      steps={testSteps}
                      onChange={(steps) => setTestSteps(steps)}
                      onInsertSharedStep={() => setShowInsertSharedStepModal(true)}
                      onConvertToSharedStep={handleConvertToSharedStep}
                      onUpdateSharedStepVersion={handleUpdateSharedStepVersion}
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

      {/* 다른 프로젝트에서 복제 모달 */}
      {showCloneModal && (
        <CloneFromProjectModal
          targetProjectId={projectId}
          onRefresh={onRefresh}
          onClose={() => setShowCloneModal(false)}
        />
      )}

      {/* Export / Import 모달 */}
      {showExportImportModal && (
        <ExportImportModal
          testCases={testCases}
          selectedTestCaseIds={selectedTestCaseIds}
          projectName={propProjectName || ''}
          projectId={projectId}
          onImport={handleImportTestCases}
          onRefresh={onRefresh}
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

      {/* ── Version Diff Modal (enhanced) ── */}
      {showHistoryModal && selectedHistory && (() => {
        const oldS = parseSnapshot(selectedHistory.old_value);
        const newS = parseSnapshot(selectedHistory.new_value);
        if (!oldS || !newS) return null;

        type FieldDef = { key: keyof TestCaseSnapshot; label: string; multiline?: boolean };
        const fields: FieldDef[] = [
          { key: 'title', label: 'Title' },
          { key: 'description', label: 'Description', multiline: true },
          { key: 'precondition', label: 'Precondition', multiline: true },
          { key: 'priority', label: 'Priority' },
          { key: 'folder', label: 'Folder' },
          { key: 'tags', label: 'Tags' },
          { key: 'steps', label: 'Steps', multiline: true },
          { key: 'expected_result', label: 'Expected Result', multiline: true },
          { key: 'assignee', label: 'Assignee' },
          { key: 'is_automated', label: 'Automated' },
        ];

        const changedFields = fields.filter(f => {
          if (f.key === 'is_automated') return String(oldS[f.key]) !== String(newS[f.key]);
          // steps/expected_result: normalize before comparing to avoid false diffs
          // from format differences (e.g. trailing "N. " entries, missing prefix)
          const isStepField = f.key === 'steps' || f.key === 'expected_result';
          const o = isStepField
            ? normalizeStepField(String(oldS[f.key] ?? ''))
            : stripHtml(String(oldS[f.key] ?? ''));
          const n = isStepField
            ? normalizeStepField(String(newS[f.key] ?? ''))
            : stripHtml(String(newS[f.key] ?? ''));
          return o !== n;
        });
        const unchangedCount = fields.length - changedFields.length;

        // history record stores the version *created* by this entry (e.g. v1.1).
        // old_value = state before edit (v1.0), new_value = state after (v1.1).
        // toVer = this entry's version; fromVer = the previous entry's version.
        // We look it up from historyData (sorted DESC) instead of doing arithmetic
        // on histMinor-1, which breaks when version_minor is null/undefined for
        // older records that predate the migration.
        const histMajor = selectedHistory.version_major ?? 1;
        const histMinor = selectedHistory.version_minor ?? 0;
        const toVer = `v${histMajor}.${histMinor}`;
        const selectedIdx = historyData.findIndex(h => h.id === selectedHistory.id);
        const prevEntry = selectedIdx >= 0 && selectedIdx < historyData.length - 1
          ? historyData[selectedIdx + 1]
          : null;
        const fromVer = prevEntry && prevEntry.version_major != null
          ? `v${prevEntry.version_major}.${prevEntry.version_minor ?? 0}`
          : histMinor > 0
            ? `v${histMajor}.${histMinor - 1}`   // arithmetic fallback
            : 'Initial';
        const isProUser = userTier >= 3;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="ri-git-commit-line text-indigo-500 text-lg"></i>
                  <h2 className="text-[0.9375rem] font-bold text-slate-900">Version Diff</h2>
                  <span className="text-[0.75rem] text-slate-400">{fromVer} → {toVer}</span>
                </div>
                <button
                  onClick={() => { setShowHistoryModal(false); setSelectedHistory(null); }}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer border-none bg-transparent"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {/* Changed fields */}
                {changedFields.map(f => {
                  const isStepField = f.key === 'steps' || f.key === 'expected_result';
                  // Step fields must NOT go through stripHtml — it collapses \n to spaces,
                  // destroying the multi-line structure that computeLineDiff relies on.
                  const rawOld = f.key === 'is_automated' ? (oldS[f.key] ? 'Yes' : 'No')
                    : isStepField ? String(oldS[f.key] ?? '')
                    : stripHtml(String(oldS[f.key] ?? ''));
                  const rawNew = f.key === 'is_automated' ? (newS[f.key] ? 'Yes' : 'No')
                    : isStepField ? String(newS[f.key] ?? '')
                    : stripHtml(String(newS[f.key] ?? ''));
                  const oldVal = isStepField ? normalizeStepField(rawOld) : rawOld;
                  const newVal = isStepField ? normalizeStepField(rawNew) : rawNew;
                  const isMultiline = f.multiline && (oldVal.includes('\n') || newVal.includes('\n') || oldVal.length > 80 || newVal.length > 80);
                  const lineDiff = isMultiline ? computeLineDiff(oldVal, newVal) : null;

                  return (
                    <div key={f.key} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[0.75rem] font-semibold text-amber-700 flex items-center gap-1.5">
                          <i className="ri-edit-line text-xs"></i>
                          {f.label}
                        </span>
                        {isProUser ? (
                          <button
                            onClick={() => {
                              setCherryPickSource(selectedHistory);
                              setCherryPickFields({ [f.key]: true });
                              setShowCherryPickModal(true);
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold text-violet-700 border border-violet-200 rounded bg-violet-50 hover:bg-violet-100 cursor-pointer"
                          >
                            <i className="ri-arrow-go-back-line text-[0.625rem]"></i>
                            Restore field
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold text-slate-400 border border-slate-200 rounded bg-slate-50 cursor-not-allowed">
                            <i className="ri-arrow-go-back-line text-[0.625rem]"></i>
                            Restore field
                            <span className="ml-0.5 px-1 py-px text-[0.5rem] font-bold bg-violet-500 text-white rounded">PRO</span>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-0 divide-x divide-slate-200">
                        <div className="px-3 py-2">
                          <div className="text-[0.5625rem] font-semibold uppercase text-slate-400 tracking-wider mb-1.5">{fromVer} (Before)</div>
                          {lineDiff ? (
                            <div className="font-mono text-[0.75rem] space-y-0.5 leading-[1.5]">
                              {lineDiff.map((line, i) => (
                                <div key={i} className={`px-1 rounded ${
                                  line.type === 'removed' ? 'bg-red-100 text-red-800 line-through' :
                                  line.type === 'unchanged' ? 'text-slate-500' : 'text-slate-400 opacity-30'
                                }`}>{line.type === 'removed' || line.type === 'unchanged' ? line.text : ''}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[0.8125rem] px-1.5 py-0.5 bg-red-100 text-red-800 rounded line-through">{oldVal || '-'}</span>
                          )}
                        </div>
                        <div className="px-3 py-2">
                          <div className="text-[0.5625rem] font-semibold uppercase text-slate-400 tracking-wider mb-1.5">{toVer} (After)</div>
                          {lineDiff ? (
                            <div className="font-mono text-[0.75rem] space-y-0.5 leading-[1.5]">
                              {lineDiff.map((line, i) => (
                                <div key={i} className={`px-1 rounded ${
                                  line.type === 'added' ? 'bg-emerald-100 text-emerald-800' :
                                  line.type === 'unchanged' ? 'text-slate-500' : 'text-slate-400 opacity-30'
                                }`}>{line.type === 'added' || line.type === 'unchanged' ? line.text : ''}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[0.8125rem] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">{newVal || '-'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Unchanged fields — collapsed */}
                {unchangedCount > 0 && (
                  <div className="px-3 py-2 text-center text-[0.75rem] text-slate-400 border border-dashed border-slate-200 rounded-lg cursor-default">
                    <i className="ri-eye-off-line text-xs mr-1"></i>
                    {unchangedCount} unchanged field{unchangedCount !== 1 ? 's' : ''} hidden
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <button
                  onClick={() => {
                    // The old_value in selectedHistory IS the state we restore to (fromVer content).
                    // Override version numbers to fromVer so the confirm dialog displays correctly.
                    setRollbackTarget({
                      ...selectedHistory,
                      version_major: prevEntry?.version_major ?? histMajor,
                      version_minor: prevEntry?.version_minor ?? (histMinor > 0 ? histMinor - 1 : 0),
                    });
                    setShowRollbackModal(true);
                  }}
                  className="px-3 py-1.5 border border-slate-200 text-[0.8125rem] font-semibold text-slate-600 rounded-lg hover:bg-white cursor-pointer flex items-center gap-1.5 bg-white"
                >
                  <i className="ri-arrow-go-back-line text-sm"></i>
                  Restore entire {fromVer}
                </button>
                <button
                  onClick={() => { setShowHistoryModal(false); setSelectedHistory(null); }}
                  className="px-4 py-1.5 border border-slate-200 text-[0.8125rem] font-semibold text-slate-600 rounded-lg hover:bg-white cursor-pointer bg-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Publish Version Confirm Modal ── */}
      {showPublishModal && selectedTestCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[0.9375rem] font-bold text-slate-900 flex items-center gap-2">
                <i className="ri-upload-2-line text-emerald-500"></i>
                Publish Version
              </h3>
              <button onClick={() => setShowPublishModal(false)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer border-none bg-transparent">
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center px-4 py-3 border border-slate-200 rounded-lg">
                  <div className="text-[1rem] font-bold text-slate-900">v{selectedTestCase.version_major ?? 1}.{selectedTestCase.version_minor ?? 0}</div>
                  <div className="text-[0.625rem] text-slate-400 mt-0.5">Current Draft</div>
                </div>
                <i className="ri-arrow-right-line text-slate-400 text-lg"></i>
                <div className="text-center px-4 py-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                  <div className="text-[1rem] font-bold text-emerald-700">v{(selectedTestCase.version_major ?? 1) + 1}.0</div>
                  <div className="text-[0.625rem] text-emerald-600 mt-0.5">Published</div>
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-[0.75rem] text-emerald-700 leading-[1.5]">
                <strong>Publish v{(selectedTestCase.version_major ?? 1) + 1}.0?</strong>
                <br />
                This version will be used in future test runs. Current draft history is preserved.
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex gap-2 justify-end">
              <button onClick={() => setShowPublishModal(false)} className="px-4 py-2 text-[0.8125rem] font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handlePublishVersion}
                disabled={publishingVersion}
                className="px-4 py-2 text-[0.8125rem] font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {publishingVersion ? <><i className="ri-loader-4-line animate-spin"></i> Publishing...</> : <><i className="ri-upload-2-line"></i> Publish v{(selectedTestCase.version_major ?? 1) + 1}.0</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rollback Confirm Modal ── */}
      {showRollbackModal && rollbackTarget && selectedTestCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[0.9375rem] font-bold text-slate-900 flex items-center gap-2">
                <i className="ri-arrow-go-back-line text-amber-500"></i>
                Restore Version
              </h3>
              <button onClick={() => { setShowRollbackModal(false); setRollbackTarget(null); }} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer border-none bg-transparent">
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center px-4 py-3 border border-slate-200 rounded-lg">
                  <div className="text-[1rem] font-bold text-slate-900">v{selectedTestCase.version_major ?? 1}.{selectedTestCase.version_minor ?? 0}</div>
                  <div className="text-[0.625rem] text-slate-400 mt-0.5">Current</div>
                </div>
                <i className="ri-arrow-right-line text-slate-400 text-lg"></i>
                <div className="text-center px-4 py-3 border border-amber-200 bg-amber-50 rounded-lg">
                  <div className="text-[1rem] font-bold text-amber-700">v{rollbackTarget.version_major ?? 1}.{rollbackTarget.version_minor ?? 0}</div>
                  <div className="text-[0.625rem] text-amber-600 mt-0.5">Restore to</div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[0.75rem] text-amber-700 leading-[1.5]">
                <strong>Restore to v{rollbackTarget.version_major ?? 1}.{rollbackTarget.version_minor ?? 0}?</strong>
                <br />
                A new draft <strong>v{selectedTestCase.version_major ?? 1}.{(selectedTestCase.version_minor ?? 0) + 1}</strong> will be created with that content. Current version stays in history.
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex gap-2 justify-end">
              <button onClick={() => { setShowRollbackModal(false); setRollbackTarget(null); }} className="px-4 py-2 text-[0.8125rem] font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleRestoreVersion}
                disabled={restoringHistory}
                className="px-4 py-2 text-[0.8125rem] font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {restoringHistory ? <><i className="ri-loader-4-line animate-spin"></i> Restoring...</> : <><i className="ri-arrow-go-back-line"></i> Restore</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cherry-pick Partial Restore Modal (Pro) ── */}
      {showCherryPickModal && cherryPickSource && selectedTestCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[0.9375rem] font-bold text-slate-900 flex items-center gap-2">
                <i className="ri-git-branch-line text-violet-500"></i>
                Partial Restore from v{cherryPickSource.version_major ?? 1}.{cherryPickSource.version_minor ?? 0}
                <span className="text-[0.5rem] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded">PRO</span>
              </h3>
              <button onClick={() => { setShowCherryPickModal(false); setCherryPickSource(null); setCherryPickFields({}); }} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer border-none bg-transparent">
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[0.75rem] text-slate-500 mb-3 leading-[1.5]">
                Select fields to restore from <strong>v{cherryPickSource.version_major ?? 1}.{cherryPickSource.version_minor ?? 0}</strong>. A new draft <strong>v{selectedTestCase.version_major ?? 1}.{(selectedTestCase.version_minor ?? 0) + 1}</strong> will be created.
              </p>
              <div className="border-2 border-violet-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gradient-to-r from-violet-600 to-violet-700 flex items-center justify-between">
                  <span className="text-[0.75rem] font-bold text-violet-100 flex items-center gap-1.5">
                    <i className="ri-checkbox-multiple-line"></i> Select fields to restore
                  </span>
                  <span className="text-[0.625rem] text-violet-300">
                    {Object.values(cherryPickFields).filter(Boolean).length} selected
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  {(() => {
                    const oldS = parseSnapshot(cherryPickSource.old_value);
                    const newS = parseSnapshot(cherryPickSource.new_value);
                    if (!oldS || !newS) return null;
                    const fieldDefs: { key: keyof TestCaseSnapshot; label: string }[] = [
                      { key: 'title', label: 'Title' }, { key: 'description', label: 'Description' },
                      { key: 'precondition', label: 'Precondition' }, { key: 'priority', label: 'Priority' },
                      { key: 'folder', label: 'Folder' }, { key: 'tags', label: 'Tags' },
                      { key: 'steps', label: 'Steps' }, { key: 'expected_result', label: 'Expected Result' },
                      { key: 'assignee', label: 'Assignee' }, { key: 'is_automated', label: 'Automated' },
                    ];
                    const changedFDs = fieldDefs.filter(f => {
                      const o = f.key === 'is_automated' ? String(oldS[f.key]) : stripHtml(String(oldS[f.key] ?? ''));
                      const n = f.key === 'is_automated' ? String(newS[f.key]) : stripHtml(String(newS[f.key] ?? ''));
                      return o !== n;
                    });
                    return changedFDs.map(f => {
                      const oldVal = f.key === 'is_automated' ? (oldS[f.key] ? 'Yes' : 'No') : stripHtml(String(oldS[f.key] ?? ''));
                      const newVal = f.key === 'is_automated' ? (newS[f.key] ? 'Yes' : 'No') : stripHtml(String(newS[f.key] ?? ''));
                      const checked = !!cherryPickFields[f.key];
                      return (
                        <div
                          key={f.key}
                          onClick={() => setCherryPickFields(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer border transition-all ${
                            checked ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            checked ? 'bg-violet-500 border-violet-500' : 'border-slate-300'
                          }`}>
                            {checked && <i className="ri-check-line text-white text-[0.5rem]"></i>}
                          </div>
                          <span className="text-[0.75rem] font-semibold text-slate-700 min-w-[80px]">{f.label}</span>
                          <span className="text-[0.6875rem] text-slate-400 flex-1 truncate">
                            {newVal.slice(0, 30)} → <strong className="text-emerald-700">{oldVal.slice(0, 30)}</strong>
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[0.6875rem] text-slate-400">
                <strong className="text-slate-600">{Object.values(cherryPickFields).filter(Boolean).length}</strong> field{Object.values(cherryPickFields).filter(Boolean).length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button onClick={() => { setShowCherryPickModal(false); setCherryPickSource(null); setCherryPickFields({}); }} className="px-3 py-1.5 text-[0.8125rem] font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={handleCherryPickRestore}
                  disabled={restoringHistory || Object.values(cherryPickFields).filter(Boolean).length === 0}
                  className="px-3 py-1.5 text-[0.8125rem] font-semibold text-white bg-violet-500 rounded-lg hover:bg-violet-600 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {restoringHistory ? <><i className="ri-loader-4-line animate-spin"></i> Restoring...</> : <><i className="ri-arrow-go-back-line"></i> Restore {Object.values(cherryPickFields).filter(Boolean).length} field{Object.values(cherryPickFields).filter(Boolean).length !== 1 ? 's' : ''}</>}
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
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: getFolderStyle(folder.color).bg }}>
                      <i className={`${folder.icon} text-2xl`} style={{ color: getFolderStyle(folder.color).fg }}></i>
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
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: getFolderStyle(folderToDelete.color).bg }}>
                  <i className={`${folderToDelete.icon} text-2xl`} style={{ color: getFolderStyle(folderToDelete.color).fg }}></i>
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
                Are you sure you want to delete folder "<span className="font-semibold">{folderToDelete.name}</span>"?
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
      onAssign={handleBulkAssign}
      assignees={projectMembers.map(m => ({ id: m.user_id, name: m.profile.full_name || m.profile.email }))}
      onMove={() => setShowBulkFolderModal(true)}
      onDelete={() => setShowBulkDeleteModal(true)}
      onSetLifecycleStatus={handleBulkLifecycleChange}
    />
    </>
  );
}