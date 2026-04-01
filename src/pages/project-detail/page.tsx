import { LogoMark } from '../../components/Logo';
import PageLoader from '../../components/PageLoader';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { loadProjectDetailData } from './queryFns';
import ProjectMembersPanel from './components/ProjectMembersPanel';
import InviteMemberModal from './components/InviteMemberModal';
import SEOHead from '../../components/SEOHead';
import NotificationBell from '../../components/feature/NotificationBell';
import ProjectHeader from '../../components/ProjectHeader';
import QuickCreateTCModal from './components/QuickCreateTCModal';
import ContinueRunPanel from './components/ContinueRunPanel';
import AIAssistModal from './components/AIAssistModal';
import AIGenerateModal from '../project-testcases/components/AIGenerateModal';

interface UserProfile {
  email: string;
  full_name: string;
  subscription_tier: number;
  avatar_emoji: string;
}

const TIER_INFO = {
  1: { name: 'Free', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: 'ri-user-line' },
  2: { name: 'Starter', color: 'bg-indigo-50 text-indigo-700 border-indigo-300', icon: 'ri-vip-crown-line' },
  3: { name: 'Professional', color: 'bg-violet-50 text-violet-700 border-violet-300', icon: 'ri-vip-diamond-line' },
  4: { name: 'Enterprise', color: 'bg-amber-50 text-amber-700 border-amber-300', icon: 'ri-vip-diamond-line' },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberRefreshTrigger, setMemberRefreshTrigger] = useState(0);
  const [projectIntegrations, setProjectIntegrations] = useState<any[]>([]);
  const [jiraConfigured, setJiraConfigured] = useState(false);
  const [showQuickCreateTC, setShowQuickCreateTC] = useState(false);
  const [showContinueRun, setShowContinueRun] = useState(false);
  const [showAIAssist, setShowAIAssist] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'analytics' | 'activity'>('overview');
  const [trendPeriod, setTrendPeriod] = useState<'7d' | '14d' | '30d'>('7d');
  const [expandedPriorityGroups, setExpandedPriorityGroups] = useState<Set<string>>(new Set(['critical', 'high']));
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [showAllActivity, setShowAllActivity] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportToast, setExportToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const navigate = useNavigate();

  // Dashboard-specific keyboard shortcuts (N → New TC, R → Continue Run)
  useEffect(() => {
    const handleDashboardShortcuts = (e: KeyboardEvent) => {
      // Skip if modifier keys are held (except Shift)
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Skip if focus is in an input / textarea / select / contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) return;
      // Skip if any modal is open
      if (showQuickCreateTC || showContinueRun || showAIAssist || showAIGenerate) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowQuickCreateTC(true);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setShowContinueRun(true);
      }
    };
    window.addEventListener('keydown', handleDashboardShortcuts);
    return () => window.removeEventListener('keydown', handleDashboardShortcuts);
  }, [showQuickCreateTC, showContinueRun, showAIAssist, showAIGenerate]);

  const queryClient = useQueryClient();

  // userProfile: 10분 캐시 (페이지 간 공유)
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('email, full_name, subscription_tier, avatar_emoji')
        .eq('id', user.id)
        .maybeSingle();
      return {
        email: data?.email || user.email || '',
        full_name: data?.full_name || '',
        subscription_tier: data?.subscription_tier || 1,
        avatar_emoji: data?.avatar_emoji || '',
      };
    },
    staleTime: 10 * 60_000,
  });

  // Project detail data: React Query
  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project-detail', id],
    queryFn: () => loadProjectDetailData(id!),
    enabled: !!id,
  });

  const project = projectData?.project ?? null;
  const testCaseCount = projectData?.testCaseCount ?? 0;
  const milestones = projectData?.milestones ?? [];
  const testRuns = projectData?.testRuns ?? [];
  const sessions = projectData?.sessions ?? [];
  const recentActivity = projectData?.recentActivity ?? [];
  const projectPassRateData = projectData?.projectPassRateData ?? null;
  const rawTestResults = projectData?.rawTestResults ?? [];
  const allRunsRaw = projectData?.allRunsRaw ?? [];

  // Initialize expandedMilestones when milestones first load
  const expandedInitialized = useRef(false);
  useEffect(() => {
    if (milestones.length > 0 && !expandedInitialized.current) {
      expandedInitialized.current = true;
      const initial = new Set<string>();
      milestones.forEach((m: any) => {
        if (m.subMilestones?.length) initial.add(m.id);
      });
      setExpandedMilestones(initial);
    }
  }, [milestones]);

  useEffect(() => {
    if (id) {
      fetchIntegrationStatus();
    }
  }, [id]);


  const fetchIntegrationStatus = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    const [intRes, jiraRes] = await Promise.all([
      supabase.from('integrations').select('id, type, channel_name, is_active').eq('project_id', id),
      supabase.from('jira_settings').select('id, domain').eq('user_id', user?.id ?? '').maybeSingle(),
    ]);
    setProjectIntegrations(intRes.data ?? []);
    setJiraConfigured(!!(jiraRes.data?.domain));
  };

  const toggleExpanded = (milestoneId: string) => {
    const newSet = new Set(expandedMilestones);
    if (newSet.has(milestoneId)) newSet.delete(milestoneId);
    else newSet.add(milestoneId);
    setExpandedMilestones(newSet);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
      started: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
      past_due: { label: 'Overdue', className: 'bg-orange-100 text-orange-700' },
      completed: { label: 'Completed', className: 'bg-gray-100 text-gray-700' },
    };
    return badges[status as keyof typeof badges] || badges.upcoming;
  };

  const getProjectStatusDisplay = (status: string) => {
    const map = {
      active: { label: 'Active', icon: 'ri-checkbox-circle-fill', bgColor: 'bg-green-100', iconColor: 'text-green-600' },
      archived: { label: 'Archived', icon: 'ri-archive-line', bgColor: 'bg-gray-100', iconColor: 'text-gray-600' },
      completed: { label: 'Completed', icon: 'ri-check-double-line', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    };
    return map[status as keyof typeof map] || map.active;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'blocked': return 'bg-orange-500';
      case 'retest': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  };

  const calculateRunProgress = (run: any) => {
    const total = (run.passed || 0) + (run.failed || 0) + (run.blocked || 0) + (run.retest || 0) + (run.untested || 0);
    if (total === 0) return { passed: 0, failed: 0, blocked: 0, retest: 0, untested: 100 };
    return {
      passed: Math.round(((run.passed || 0) / total) * 100),
      failed: Math.round(((run.failed || 0) / total) * 100),
      blocked: Math.round(((run.blocked || 0) / total) * 100),
      retest: Math.round(((run.retest || 0) / total) * 100),
      untested: Math.round(((run.untested || 0) / total) * 100),
    };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return 'Starts TBD';
    const s = formatDate(start);
    if (!end) return `Starts ${s}`;
    return `${s} - ${formatDate(end)}`;
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} ${Math.floor(days / 7) === 1 ? 'week' : 'weeks'} ago`;
    if (days < 365) return `${Math.floor(days / 30)} ${Math.floor(days / 30) === 1 ? 'month' : 'months'} ago`;
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

  // ── Export menu outside-click ──────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExportMenu]);

  const showExportToast = (type: 'success' | 'error', message: string) => {
    setExportToast({ type, message });
    setTimeout(() => setExportToast(null), type === 'success' ? 3000 : 5000);
  };

  const formatStatus = (s: string | undefined | null): string => {
    if (!s) return '-';
    const map: Record<string, string> = {
      in_progress: 'In Progress', new: 'New', completed: 'Completed',
      active: 'Active', closed: 'Closed', draft: 'Draft', deprecated: 'Deprecated',
    };
    return map[s] || (s.charAt(0).toUpperCase() + s.slice(1)) || '-';
  };

  const handleExportRunsCSV = () => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const projectName = (project?.name || 'project').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const milestoneMap = new Map<string, string>();
      milestones.forEach((m: any) => {
        milestoneMap.set(m.id, m.name);
        (m.subMilestones || []).forEach((s: any) => milestoneMap.set(s.id, s.name));
      });
      // Aggregate test results by run_id
      const resultsByRun = new Map<string, {passed:number, failed:number, blocked:number, retest:number, untested:number}>();
      allRunsRaw.forEach((run: any) => resultsByRun.set(run.id, {passed:0, failed:0, blocked:0, retest:0, untested:0}));
      rawTestResults.forEach((r: any) => {
        const counts = resultsByRun.get(r.run_id);
        if (!counts) return;
        if (r.status === 'passed') counts.passed++;
        else if (r.status === 'failed') counts.failed++;
        else if (r.status === 'blocked') counts.blocked++;
        else if (r.status === 'retest') counts.retest++;
        else counts.untested++;
      });
      const headers = ['Run Name', 'Milestone', 'Status', 'Total TCs', 'Passed', 'Failed', 'Blocked', 'Retest', 'Not Tested', 'Pass Rate', 'Created At'];
      const rows = allRunsRaw.map((run: any) => {
        const runCounts = resultsByRun.get(run.id) || {passed:0, failed:0, blocked:0, retest:0, untested:0};
        const total = runCounts.passed + runCounts.failed + runCounts.blocked + runCounts.retest + runCounts.untested;
        const tested = total - runCounts.untested;
        const passRate = tested > 0 ? Math.round((runCounts.passed / tested) * 100) : 0;
        return [run.name, milestoneMap.get(run.milestone_id) || '', formatStatus(run.status || 'active'), total, runCounts.passed, runCounts.failed, runCounts.blocked, runCounts.retest, runCounts.untested, `${passRate}%`, new Date(run.created_at).toLocaleDateString()];
      });
      const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${projectName}-runs-${dateStr}.csv`; a.click();
      URL.revokeObjectURL(url);
      showExportToast('success', 'Runs data exported successfully');
    } catch {
      showExportToast('error', 'Failed to export runs data');
    }
  };

  const handleExportTestCasesCSV = async () => {
    try {
      setIsExporting(true);
      const dateStr = new Date().toISOString().split('T')[0];
      const projectName = (project?.name || 'project').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const { data: cases, error } = await supabase
        .from('test_cases')
        .select('custom_id, title, priority, lifecycle_status, created_at')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const headers = ['TC ID', 'Title', 'Priority', 'Lifecycle Status', 'Created At'];
      const rows = (cases || []).map((tc: any) => [tc.custom_id || '', tc.title || '', tc.priority || 'medium', tc.lifecycle_status || 'active', new Date(tc.created_at).toLocaleDateString()]);
      const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${projectName}-testcases-${dateStr}.csv`; a.click();
      URL.revokeObjectURL(url);
      showExportToast('success', 'Test cases exported successfully');
    } catch {
      showExportToast('error', 'Failed to export test cases');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!project || isLoading || !projectData) {
      showExportToast('error', 'Project data is still loading. Please try again.');
      return;
    }
    try {
      setIsExporting(true);
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // ── 한글 폰트 임베드 (실패 시 helvetica fallback) ──
      let pdfFont = 'helvetica';
      try {
        const { NotoSansKRRegular } = await import('../../assets/fonts/NotoSansKR-Regular');
        const { NotoSansKRBold } = await import('../../assets/fonts/NotoSansKR-Bold');
        if (NotoSansKRRegular && NotoSansKRBold &&
            typeof NotoSansKRRegular === 'string' && NotoSansKRRegular.length > 10000 &&
            typeof NotoSansKRBold === 'string' && NotoSansKRBold.length > 10000) {
          pdf.addFileToVFS('NotoSansKR-Regular.ttf', NotoSansKRRegular);
          pdf.addFont('NotoSansKR-Regular.ttf', 'NotoSansKR', 'normal');
          pdf.addFileToVFS('NotoSansKR-Bold.ttf', NotoSansKRBold);
          pdf.addFont('NotoSansKR-Bold.ttf', 'NotoSansKR', 'bold');
          pdfFont = 'NotoSansKR';
        }
      } catch (fontErr) {
        console.warn('PDF font load failed, falling back to helvetica:', fontErr);
      }

      const safeAllRuns = allRunsRaw || [];
      const safeResults = rawTestResults || [];
      const safeMilestones = milestones || [];

      const pageW = 210, pageH = 297, margin = 20, contentW = 170;
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const projectName = project?.name || 'Project';

      // ── resultsByRun 집계 ──
      const resultsByRun = new Map<string, {passed:number, failed:number, blocked:number, retest:number, untested:number}>();
      safeAllRuns.forEach((run: any) => resultsByRun.set(run.id, {passed:0, failed:0, blocked:0, retest:0, untested:0}));
      safeResults.forEach((r: any) => {
        const counts = resultsByRun.get(r.run_id);
        if (!counts) return;
        if (r.status === 'passed') counts.passed++;
        else if (r.status === 'failed') counts.failed++;
        else if (r.status === 'blocked') counts.blocked++;
        else if (r.status === 'retest') counts.retest++;
        else counts.untested++;
      });

      const addFooter = (pageNum: number) => {
        pdf.setFontSize(8); pdf.setFont(pdfFont, 'normal'); pdf.setTextColor(148, 163, 184);
        pdf.text(`Generated by Testably — ${dateStr}`, margin, pageH - 10);
        pdf.text(`Page ${pageNum} of 3`, pageW - margin, pageH - 10, { align: 'right' });
      };

      // ── Page 1: Executive Summary ──
      pdf.setFillColor(99, 102, 241); pdf.rect(0, 0, pageW, 32, 'F');
      pdf.setFontSize(18); pdf.setTextColor(255, 255, 255); pdf.setFont(pdfFont, 'bold');
      pdf.text(projectName, margin, 14);
      pdf.setFontSize(10); pdf.setFont(pdfFont, 'normal');
      pdf.text('Project Executive Report', margin, 22);
      pdf.text(dateStr, pageW - margin, 22, { align: 'right' });

      const passRate = projectPassRateData && projectPassRateData.total > 0
        ? Math.round((projectPassRateData.passed / projectPassRateData.total) * 100) : 0;
      const stats = [
        { label: 'Test Cases', value: String(testCaseCount) },
        { label: 'Test Runs', value: String(safeAllRuns.length) },
        { label: 'Pass Rate', value: `${passRate}%` },
        { label: 'Results', value: String(safeResults.length) },
      ];
      let y = 44;
      const cardW = (contentW - 12) / 4;
      stats.forEach((s, i) => {
        const x = margin + i * (cardW + 4);
        pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240); pdf.roundedRect(x, y, cardW, 22, 2, 2, 'FD');
        pdf.setFontSize(16); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
        pdf.text(s.value, x + cardW / 2, y + 12, { align: 'center' });
        pdf.setFontSize(8); pdf.setFont(pdfFont, 'normal'); pdf.setTextColor(100, 116, 139);
        pdf.text(s.label, x + cardW / 2, y + 19, { align: 'center' });
      });
      y += 30;

      pdf.setFontSize(11); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
      pdf.text('Overall Pass Rate', margin, y); y += 6;
      const statusCounts = {
        passed: safeResults.filter((r: any) => r.status === 'passed').length,
        failed: safeResults.filter((r: any) => r.status === 'failed').length,
        blocked: safeResults.filter((r: any) => r.status === 'blocked').length,
        retest: safeResults.filter((r: any) => r.status === 'retest').length,
        untested: safeResults.filter((r: any) => r.status === 'untested').length,
      };
      const totalRes = safeResults.length || 1;
      const statusColors: Record<string, [number, number, number]> = {
        passed: [34, 197, 94], failed: [239, 68, 68], blocked: [249, 115, 22], retest: [234, 179, 8], untested: [203, 213, 225],
      };
      let barX = margin;
      Object.entries(statusCounts).forEach(([status, count]) => {
        const w = contentW * (count / totalRes);
        if (w > 0) { const [r, g, b] = statusColors[status]; pdf.setFillColor(r, g, b); pdf.rect(barX, y, w, 8, 'F'); barX += w; }
      });
      y += 12;
      let legX = margin;
      Object.entries(statusCounts).forEach(([status, count]) => {
        const [r, g, b] = statusColors[status]; pdf.setFillColor(r, g, b); pdf.rect(legX, y, 4, 4, 'F');
        pdf.setFontSize(8); pdf.setFont(pdfFont, 'normal'); pdf.setTextColor(71, 85, 105);
        pdf.text(`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`, legX + 6, y + 3.5);
        legX += 36;
      });
      y += 14;

      pdf.setFontSize(11); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
      pdf.text('Project Information', margin, y); y += 6;
      pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240); pdf.roundedRect(margin, y, contentW, 30, 2, 2, 'FD');
      const infoItems = [
        { label: 'Project Name', value: projectName },
        { label: 'Status', value: formatStatus(project?.status || 'active') },
        { label: 'Created', value: project?.created_at ? new Date(project.created_at).toLocaleDateString() : '-' },
        { label: 'Updated', value: project?.updated_at ? new Date(project.updated_at).toLocaleDateString() : '-' },
      ];
      infoItems.forEach((item, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const ix = margin + 6 + col * (contentW / 2), iy = y + 8 + row * 12;
        pdf.setFontSize(8); pdf.setFont(pdfFont, 'normal'); pdf.setTextColor(100, 116, 139); pdf.text(item.label.toUpperCase(), ix, iy);
        pdf.setFontSize(9); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42); pdf.text(item.value, ix, iy + 5);
      });
      y += 38;

      // ── Milestone 진행 현황 ──
      const flatMilestones: any[] = [];
      safeMilestones.forEach((m: any) => {
        flatMilestones.push(m);
        (m.subMilestones || []).forEach((s: any) => flatMilestones.push(s));
      });
      if (flatMilestones.length > 0) {
        pdf.setFontSize(11); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
        pdf.text('Milestone Progress', margin, y); y += 7;
        flatMilestones.slice(0, 6).forEach((m: any) => {
          const mRuns = safeAllRuns.filter((r: any) => r.milestone_id === m.id);
          const mCompleted = mRuns.filter((r: any) => r.status === 'completed').length;
          const mTotal = mRuns.length;
          const pct = mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0;
          const safeMName = String(m.name || '');
          const mName = safeMName.length > 30 ? safeMName.slice(0, 27) + '...' : (safeMName || '-');
          pdf.setFontSize(8); pdf.setFont(pdfFont, 'normal'); pdf.setTextColor(71, 85, 105);
          pdf.text(mName, margin, y + 5);
          pdf.setFillColor(241, 245, 249); pdf.rect(margin + 42, y, contentW - 62, 6, 'F');
          if (pct > 0) { pdf.setFillColor(99, 102, 241); pdf.rect(margin + 42, y, (contentW - 62) * (pct / 100), 6, 'F'); }
          pdf.setFontSize(8); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
          pdf.text(`${pct}%`, margin + contentW - 15, y + 5);
          y += 10;
        });
      }
      addFooter(1);

      // ── Page 2: Recent Test Runs ──
      pdf.addPage();
      pdf.setFillColor(99, 102, 241); pdf.rect(0, 0, pageW, 20, 'F');
      pdf.setFontSize(13); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(255, 255, 255);
      pdf.text('Recent Test Runs', margin, 13);
      y = 30;
      // milestoneMap for Page 2
      const msMap = new Map<string, string>();
      safeMilestones.forEach((m: any) => {
        msMap.set(m.id, m.name);
        (m.subMilestones || []).forEach((s: any) => msMap.set(s.id, s.name));
      });
      pdf.setFillColor(241, 245, 249); pdf.rect(margin, y, contentW, 8, 'F');
      pdf.setFontSize(8); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(71, 85, 105);
      pdf.text('Run Name', margin + 2, y + 5.5); pdf.text('Milestone', margin + 62, y + 5.5);
      pdf.text('Status', margin + 98, y + 5.5); pdf.text('Pass', margin + 122, y + 5.5);
      pdf.text('Fail', margin + 134, y + 5.5); pdf.text('Total', margin + 146, y + 5.5);
      pdf.text('Pass Rate', margin + 158, y + 5.5);
      y += 8;
      safeAllRuns.slice(0, 10).forEach((run: any, i: number) => {
        const rowY = y + i * 10;
        if (i % 2 === 1) { pdf.setFillColor(248, 250, 252); pdf.rect(margin, rowY, contentW, 10, 'F'); }
        const runCounts = resultsByRun.get(run.id) || {passed:0, failed:0, blocked:0, retest:0, untested:0};
        const total = runCounts.passed + runCounts.failed + runCounts.blocked + runCounts.retest + runCounts.untested;
        const tested = total - runCounts.untested;
        const pr = tested > 0 ? Math.round((runCounts.passed / tested) * 100) : 0;
        pdf.setFontSize(8); pdf.setFont(pdfFont, 'normal'); pdf.setTextColor(30, 41, 59);
        const safeRunName = String(run.name || '');
        const runName = safeRunName.length > 22 ? safeRunName.slice(0, 19) + '...' : (safeRunName || '-');
        pdf.text(runName, margin + 2, rowY + 6.5);
        const msName = String(msMap.get(run.milestone_id) || '-');
        const msLabel = msName.length > 14 ? msName.slice(0, 11) + '...' : msName;
        pdf.setTextColor(100, 116, 139); pdf.text(msLabel, margin + 62, rowY + 6.5);
        const sc: Record<string, [number, number, number]> = {
          active: [99, 102, 241], in_progress: [99, 102, 241], new: [99, 102, 241], completed: [34, 197, 94],
        };
        const [sr, sg, sb] = sc[run.status || 'active'] || [148, 163, 184];
        pdf.setTextColor(sr, sg, sb); pdf.text(formatStatus(run.status || 'active'), margin + 98, rowY + 6.5);
        pdf.setTextColor(30, 41, 59);
        pdf.text(String(runCounts.passed), margin + 122, rowY + 6.5);
        pdf.text(String(runCounts.failed), margin + 134, rowY + 6.5);
        pdf.text(String(total), margin + 146, rowY + 6.5);
        const prc: [number, number, number] = pr >= 80 ? [34, 197, 94] : pr >= 50 ? [234, 179, 8] : [239, 68, 68];
        pdf.setTextColor(...prc); pdf.text(`${pr}%`, margin + 158, rowY + 6.5);
      });
      y += safeAllRuns.slice(0, 10).length * 10 + 10;
      const activeRuns = safeAllRuns.filter((r: any) => ['active', 'in_progress', 'new'].includes(r.status)).length;
      const completedRuns = safeAllRuns.filter((r: any) => r.status === 'completed').length;
      pdf.setFontSize(9); pdf.setFont(pdfFont, 'normal'); pdf.setTextColor(100, 116, 139);
      pdf.text(`Total: ${safeAllRuns.length} runs  |  Active: ${activeRuns}  |  Completed: ${completedRuns}`, margin, y);
      addFooter(2);

      // ── Page 3: Test Case Overview ──
      pdf.addPage();
      pdf.setFillColor(99, 102, 241); pdf.rect(0, 0, pageW, 20, 'F');
      pdf.setFontSize(13); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(255, 255, 255);
      pdf.text('Test Case Overview', margin, 13);
      y = 30;
      const { data: tcData } = await supabase.from('test_cases').select('title, priority, lifecycle_status, created_at, folder').eq('project_id', id).order('created_at', { ascending: false });
      const tcs = tcData || [];
      const priorityCounts = {
        critical: tcs.filter((t: any) => t.priority === 'critical').length,
        high: tcs.filter((t: any) => t.priority === 'high').length,
        medium: tcs.filter((t: any) => t.priority === 'medium' || !t.priority).length,
        low: tcs.filter((t: any) => t.priority === 'low').length,
      };
      const lifecycleCounts = {
        active: tcs.filter((t: any) => t.lifecycle_status === 'active' || !t.lifecycle_status).length,
        draft: tcs.filter((t: any) => t.lifecycle_status === 'draft').length,
        deprecated: tcs.filter((t: any) => t.lifecycle_status === 'deprecated').length,
      };
      pdf.setFontSize(11); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
      pdf.text('Priority Distribution', margin, y); y += 8;
      const priorityColors: Record<string, [number, number, number]> = {
        critical: [239, 68, 68], high: [249, 115, 22], medium: [234, 179, 8], low: [34, 197, 94],
      };
      Object.entries(priorityCounts).forEach(([priority, count], i) => {
        const barW = tcs.length > 0 ? (count / tcs.length) * (contentW - 50) : 0;
        const [r, g, b] = priorityColors[priority];
        pdf.setFontSize(9); pdf.setFont(pdfFont, 'normal'); pdf.setTextColor(71, 85, 105);
        pdf.text(priority.charAt(0).toUpperCase() + priority.slice(1), margin, y + i * 10 + 5);
        pdf.setFillColor(241, 245, 249); pdf.rect(margin + 25, y + i * 10, contentW - 50, 7, 'F');
        if (barW > 0) { pdf.setFillColor(r, g, b); pdf.rect(margin + 25, y + i * 10, barW, 7, 'F'); }
        pdf.setFontSize(8); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
        pdf.text(String(count), margin + contentW - 20, y + i * 10 + 5);
      });
      y += 52;

      // ── 폴더별 TC 분포 ──
      const folderCounts = new Map<string, number>();
      tcs.forEach((tc: any) => {
        const folder = tc.folder || 'Uncategorized';
        folderCounts.set(folder, (folderCounts.get(folder) || 0) + 1);
      });
      const topFolders = Array.from(folderCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (topFolders.length > 0) {
        pdf.setFontSize(11); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
        pdf.text('Folder Distribution', margin, y); y += 8;
        topFolders.forEach(([folder, count], i) => {
          const barW = tcs.length > 0 ? (count / tcs.length) * (contentW - 50) : 0;
          const folderLabel = folder.length > 20 ? folder.slice(0, 17) + '...' : folder;
          pdf.setFontSize(9); pdf.setFont(pdfFont, 'normal'); pdf.setTextColor(71, 85, 105);
          pdf.text(folderLabel, margin, y + i * 10 + 5);
          pdf.setFillColor(241, 245, 249); pdf.rect(margin + 45, y + i * 10, contentW - 65, 7, 'F');
          if (barW > 0) { pdf.setFillColor(99, 102, 241); pdf.rect(margin + 45, y + i * 10, Math.min(barW, contentW - 65), 7, 'F'); }
          pdf.setFontSize(8); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
          pdf.text(String(count), margin + contentW - 18, y + i * 10 + 5);
        });
        y += topFolders.length * 10 + 6;
      }

      pdf.setFontSize(11); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
      pdf.text('Lifecycle Status', margin, y); y += 8;
      const lifecycleColors: Record<string, [number, number, number]> = {
        active: [34, 197, 94], draft: [99, 102, 241], deprecated: [148, 163, 184],
      };
      const lcCardW = (contentW - 8) / 3;
      Object.entries(lifecycleCounts).forEach(([lc, count], i) => {
        const x = margin + i * (lcCardW + 4);
        const [r, g, b] = lifecycleColors[lc];
        pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240); pdf.roundedRect(x, y, lcCardW, 20, 2, 2, 'FD');
        pdf.setFillColor(r, g, b); pdf.circle(x + 8, y + 10, 3, 'F');
        pdf.setFontSize(14); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
        pdf.text(String(count), x + lcCardW / 2, y + 10, { align: 'center' });
        pdf.setFontSize(8); pdf.setFont(pdfFont, 'normal'); pdf.setTextColor(100, 116, 139);
        pdf.text(lc.charAt(0).toUpperCase() + lc.slice(1), x + lcCardW / 2, y + 17, { align: 'center' });
      });
      y += 28;
      pdf.setFontSize(11); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(15, 23, 42);
      pdf.text('Recently Added Test Cases', margin, y); y += 6;
      pdf.setFillColor(241, 245, 249); pdf.rect(margin, y, contentW, 8, 'F');
      pdf.setFontSize(8); pdf.setFont(pdfFont, 'bold'); pdf.setTextColor(71, 85, 105);
      pdf.text('Title', margin + 2, y + 5.5); pdf.text('Priority', margin + 110, y + 5.5);
      pdf.text('Status', margin + 138, y + 5.5); pdf.text('Created', margin + 163, y + 5.5);
      y += 8;
      tcs.slice(0, 20).forEach((tc: any, i: number) => {
        const rowY = y + i * 10;
        if (i % 2 === 1) { pdf.setFillColor(248, 250, 252); pdf.rect(margin, rowY, contentW, 10, 'F'); }
        pdf.setFontSize(8); pdf.setFont(pdfFont, 'normal'); pdf.setTextColor(30, 41, 59);
        const safeTitle = String(tc.title || '');
        const titleLines = safeTitle ? (pdf.splitTextToSize(safeTitle, 100) || ['-']) : ['-'];
        const titleText = String(titleLines[0] || '-') + (titleLines.length > 1 ? '...' : '');
        pdf.text(titleText, margin + 2, rowY + 6.5);
        const ptc: Record<string, [number, number, number]> = { critical: [239, 68, 68], high: [249, 115, 22], medium: [234, 179, 8], low: [34, 197, 94] };
        const [pr2, pg2, pb2] = ptc[tc.priority || 'medium'] || [100, 116, 139];
        pdf.setTextColor(pr2, pg2, pb2); pdf.text(String(tc.priority || 'medium'), margin + 110, rowY + 6.5);
        pdf.setTextColor(30, 41, 59);
        pdf.text(formatStatus(String(tc.lifecycle_status || 'active')), margin + 138, rowY + 6.5);
        const createdStr = tc.created_at ? new Date(tc.created_at).toLocaleDateString() : '-';
        pdf.text(createdStr, margin + 163, rowY + 6.5);
      });
      addFooter(3);

      const safeName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      pdf.save(`${safeName}-report-${new Date().toISOString().split('T')[0]}.pdf`);
      showExportToast('success', 'PDF report exported successfully');
    } catch (err: any) {
      console.error('PDF export error:', err);
      console.error('PDF export stack:', err?.stack);
      console.error('PDF export data state:', {
        hasProject: !!project,
        allRunsRawLen: allRunsRaw?.length,
        rawTestResultsLen: rawTestResults?.length,
        milestonesLen: milestones?.length,
      });
      showExportToast('error', 'Failed to export PDF report');
    } finally {
      setIsExporting(false);
    }
  };

  const currentTier = userProfile?.subscription_tier || 1;
  const tierInfo = TIER_INFO[currentTier as keyof typeof TIER_INFO];

  // ── Grouped Activity (by date) ──
  const groupedActivity = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const groups: { label: string; items: typeof recentActivity }[] = [];
    recentActivity.forEach(event => {
      const d = new Date(event.created_at); d.setHours(0, 0, 0, 0);
      const label = d.getTime() === today.getTime() ? 'Today'
        : d.getTime() === yesterday.getTime() ? 'Yesterday'
        : new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const group = groups.find(g => g.label === label);
      if (group) group.items.push(event);
      else groups.push({ label, items: [event] });
    });
    return groups;
  }, [recentActivity]);

  // ── Trend Data ──
  // Primary: test_results rows aggregated by created_at (accurate for user-entered results).
  // Fallback: allRunsRaw counters by executed_at (covers sample projects where test_results is empty).
  const trendData = useMemo(() => {
    const days = trendPeriod === '7d' ? 7 : trendPeriod === '14d' ? 14 : 30;
    const dateMap = new Map<string, { passed: number; failed: number; blocked: number }>();

    if (rawTestResults.length > 0) {
      // Real test_results rows — most accurate source
      rawTestResults.forEach((r: any) => {
        const dateKey = (r.created_at || '').slice(0, 10);
        if (!dateKey) return;
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, { passed: 0, failed: 0, blocked: 0 });
        const entry = dateMap.get(dateKey)!;
        if (r.status === 'passed') entry.passed++;
        else if (r.status === 'failed') entry.failed++;
        else if (r.status === 'blocked') entry.blocked++;
      });
    } else {
      // Fallback: use run-level counters + executed_at (e.g. sample project)
      allRunsRaw.filter((r: any) => r.executed_at).forEach((r: any) => {
        const total = (r.passed || 0) + (r.failed || 0) + (r.blocked || 0);
        if (total === 0) return;
        const dateKey = (r.executed_at || '').slice(0, 10);
        if (!dateKey) return;
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, { passed: 0, failed: 0, blocked: 0 });
        const entry = dateMap.get(dateKey)!;
        entry.passed  += (r.passed  || 0);
        entry.failed  += (r.failed  || 0);
        entry.blocked += (r.blocked || 0);
      });
    }

    if (dateMap.size === 0) return [];

    // Check if any data falls inside the current calendar window
    const today = new Date();
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - (days - 1));
    const windowStartKey = windowStart.toISOString().slice(0, 10);
    const hasDataInWindow = Array.from(dateMap.keys()).some(k => k >= windowStartKey);

    if (hasDataInWindow) {
      // Calendar-based: one slot per day in the selected period
      const points: { label: string; passed: number; failed: number; blocked: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().slice(0, 10);
        const label = days <= 7
          ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : i % 3 === 0 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const entry = dateMap.get(dateKey) || { passed: 0, failed: 0, blocked: 0 };
        points.push({ label, ...entry });
      }
      return points;
    } else {
      // No data in the current window — show the last N dates that have data
      const allDates = Array.from(dateMap.keys()).sort();
      const recentDates = allDates.slice(-days);
      return recentDates.map((dateKey, idx) => {
        const d = new Date(dateKey + 'T12:00:00Z');
        const label = recentDates.length <= 7
          ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : idx % 3 === 0 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const entry = dateMap.get(dateKey)!;
        return { label, ...entry };
      });
    }
  }, [rawTestResults, allRunsRaw, trendPeriod]);

  // ── Loading / Not found states ──
  if (isLoading) {
    return (
      <>
        <SEOHead title="Loading project... | Testably" description="Loading your Testably project." noindex />
        <PageLoader fullScreen />
      </>
    );
  }

  if (!project) {
    return (
      <>
        <SEOHead title="Project not found | Testably" description="The project you requested could not be found." noindex />
        <div className="flex h-screen bg-white">
          <div className="flex-1 flex flex-col overflow-hidden">
            <ProjectHeader projectId={id || ''} projectName="" />
            <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-error-warning-line text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">프로젝트를 찾을 수 없습니다</h3>
                <Link to="/projects" className="text-indigo-600 hover:text-indigo-700 font-medium">프로젝트 목록으로 돌아가기</Link>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  // ── Dashboard computed values ──
  const activeRunsCount = testRuns.filter(r => r.status !== 'completed').length;
  // Use all-runs aggregate for pass rate (falls back to recent 5 runs if not yet loaded)
  const prTotal = projectPassRateData?.total ?? testRuns.reduce((acc, r) => acc + (r.passed||0) + (r.failed||0) + (r.blocked||0) + (r.retest||0), 0);
  const prPassed = projectPassRateData?.passed ?? testRuns.reduce((acc, r) => acc + (r.passed||0), 0);
  const passRate = prTotal > 0 ? Math.round((prPassed / prTotal) * 100) : 0;
  const healthColor = passRate >= 80 ? '#16A34A' : passRate >= 50 ? '#D97706' : '#DC2626';
  const AI_LIMITS: Record<number, number> = { 1: 5, 2: 30, 3: 150, 4: -1, 5: -1, 6: -1 };
  const aiLimit = AI_LIMITS[currentTier] ?? 5;

  // ── Active milestones filter ──
  const activeMilestones = milestones.filter(m => {
    if (m.status === 'completed') return false;
    if (m.subMilestones && m.subMilestones.length) {
      m.subMilestones = m.subMilestones.filter((sub: any) => sub.status !== 'completed');
    }
    return true;
  });

  // ── Release Readiness ──
  const failedTotal = testRuns.reduce((a, r) => a + (r.failed||0), 0);
  const criticalBugScore = failedTotal === 0 ? 100 : Math.max(0, 100 - failedTotal * 8);
  const untestedInRuns = testRuns.reduce((a, r) => a + (r.untested||0), 0);
  const testedInRuns = testRuns.reduce((a, r) => a + (r.passed||0) + (r.failed||0) + (r.blocked||0) + (r.retest||0), 0);
  const totalInRuns = testedInRuns + untestedInRuns;
  const coverageScore = totalInRuns > 0 ? Math.round((testedInRuns / totalInRuns) * 100) : 0;
  const avgMilestoneProgress = activeMilestones.length > 0
    ? Math.round(activeMilestones.reduce((a: number, m: any) => a + m.progress, 0) / activeMilestones.length)
    : 100;
  const releaseScore = Math.round(passRate * 0.4 + criticalBugScore * 0.25 + coverageScore * 0.2 + avgMilestoneProgress * 0.15);
  const releaseSignal: 'go' | 'conditional' | 'not-ready' = releaseScore >= 80 ? 'go' : releaseScore >= 60 ? 'conditional' : 'not-ready';

  // ── Run Priority (milestone-based) ──
  const milestoneEndDateMap = new Map<string, string>();
  milestones.forEach((m: any) => {
    if (m.end_date) milestoneEndDateMap.set(m.id, m.end_date);
    (m.subMilestones || []).forEach((sub: any) => {
      if (sub.end_date) milestoneEndDateMap.set(sub.id, sub.end_date);
    });
  });
  const getRunPriority = (run: any): { level: 'critical'|'high'|'medium'|'low'; daysLeft: number|null } => {
    if (run.priority_override) return { level: run.priority_override, daysLeft: null };
    if (!run.milestone_id) return { level: 'low', daysLeft: null };
    const endDate = milestoneEndDateMap.get(run.milestone_id);
    if (!endDate) return { level: 'low', daysLeft: null };
    const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    const level = daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'high' : daysLeft <= 14 ? 'medium' : 'low';
    return { level, daysLeft };
  };
  const incompleteRuns = testRuns.filter((r: any) => r.status !== 'completed');
  const runsWithPriority = incompleteRuns.map((run: any) => ({ ...run, _priority: getRunPriority(run) }));
  const myRunsPriorityGroups = (['critical','high','medium','low'] as const).map(level => ({
    level,
    runs: runsWithPriority.filter((r: any) => r._priority.level === level),
  })).filter(g => g.runs.length > 0);

  const renderMilestone = (milestone: any, isSub = false) => {
    const badge = getStatusBadge(milestone.status);
    const hasSubs = !!(milestone.subMilestones && milestone.subMilestones.length);
    const isExpanded = expandedMilestones.has(milestone.id);

    return (
      <div key={milestone.id}>
        <div className={`border border-gray-200 rounded-lg p-4 hover:border-indigo-500 transition-all ${isSub ? 'ml-8 bg-gray-50/50' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {hasSubs && !isSub && (
                <button
                  onClick={() => toggleExpanded(milestone.id)}
                  className="w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded cursor-pointer flex-shrink-0"
                >
                  <i className={`ri-arrow-${isExpanded ? 'down' : 'right'}-s-line`}></i>
                </button>
              )}
              <i className={`${isSub ? 'ri-run-line' : 'ri-flag-line'} text-gray-400 text-lg w-5 h-5 flex items-center justify-center flex-shrink-0`}></i>
              <h3 className="font-semibold text-gray-900 truncate">{milestone.name}</h3>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              <span className="text-sm text-gray-500 whitespace-nowrap">{formatDateRange(milestone.start_date, milestone.end_date)}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className} whitespace-nowrap`}>{badge.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${milestone.status === 'past_due' ? 'bg-orange-500' : milestone.status === 'started' ? 'bg-green-500' : 'bg-gray-400'}`}
                style={{ width: `${milestone.progress}%` }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-gray-700 min-w-[40px] text-right">{milestone.progress}%</span>
          </div>
        </div>

        {hasSubs && isExpanded && (
          <div className="mt-3 space-y-3">
            {milestone.subMilestones.map((sub: any) => renderMilestone(sub, true))}
          </div>
        )}
      </div>
    );
  };

  // ── Main render ──
  return (
    <>
      {exportToast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2.5 px-4 py-2.5 rounded-[10px] text-[13px] font-medium shadow-[0_4px_12px_rgba(0,0,0,0.08)] whitespace-nowrap ${exportToast.type === 'success' ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]' : 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'}`}>
          <i className={`text-base flex-shrink-0 ${exportToast.type === 'success' ? 'ri-check-line text-[#10B981]' : 'ri-error-warning-line text-[#EF4444]'}`} />
          <span>{exportToast.message}</span>
          <i className="ri-close-line text-sm opacity-50 cursor-pointer ml-2 flex-shrink-0" onClick={() => setExportToast(null)} />
        </div>
      )}
      <SEOHead title={`${project.name} — Dashboard | Testably`} description={`Project dashboard for ${project.name}.`} noindex />
      <div className="flex h-screen bg-white">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <ProjectHeader projectId={id || ''} projectName={project.name} />

          {/* Main content */}
          <main className="flex-1 overflow-y-auto flex flex-col bg-slate-50">

            {/* Subtab row */}
            <div className="flex items-center border-b border-[#E2E8F0] bg-white flex-shrink-0 h-[2.625rem] px-5">
              {[
                { key: 'overview',  label: 'Overview',      icon: 'ri-eye-line',          iconColor: '#6366F1' },
                { key: 'analytics', label: 'Analytics',     icon: 'ri-bar-chart-2-fill',  iconColor: '#8B5CF6' },
                { key: 'activity',  label: 'Activity Feed', icon: 'ri-time-fill',         iconColor: '#F59E0B' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setDashboardTab(tab.key as typeof dashboardTab)}
                  className={`flex items-center gap-[0.3125rem] h-full px-[0.875rem] text-[0.8125rem] font-medium relative border-b-[2.5px] transition-colors cursor-pointer whitespace-nowrap ${
                    dashboardTab === tab.key
                      ? 'text-[#6366F1] border-[#6366F1]'
                      : 'text-[#64748B] border-transparent hover:text-[#1E293B]'
                  }`}
                >
                  <i className={`${tab.icon} text-[0.875rem]`} style={{ color: tab.iconColor }} />
                  {tab.label}
                </button>
              ))}
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQuickCreateTC(true)}
                  className="flex items-center gap-1.5 px-3 py-[5px] text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <i className="ri-file-add-line"></i>
                  <span>New TC</span>
                  <kbd className="text-[9px] font-semibold px-1 py-0.5 rounded bg-black/5">N</kbd>
                </button>
                <button
                  onClick={() => setShowContinueRun(true)}
                  className="flex items-center gap-1.5 px-3 py-[5px] text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <i className="ri-play-circle-line"></i>
                  <span>Continue Run</span>
                  <kbd className="text-[9px] font-semibold px-1 py-0.5 rounded bg-black/5">R</kbd>
                </button>
                <button
                  onClick={() => setShowAIAssist(true)}
                  className="flex items-center gap-1.5 px-3 py-[5px] text-xs font-medium text-white bg-violet-500 border border-violet-500 rounded-md hover:bg-violet-600 transition-all"
                >
                  <i className="ri-sparkling-line"></i>
                  <span>AI Assist</span>
                </button>
                {/* Export Report */}
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => { if (!isExporting) setShowExportMenu(prev => !prev); }}
                    disabled={isExporting}
                    className={`flex items-center gap-1.5 px-[0.875rem] py-[0.375rem] text-white rounded-[0.375rem] text-[0.8125rem] font-medium transition-colors whitespace-nowrap ${isExporting ? 'bg-[#818CF8] opacity-80 cursor-not-allowed' : showExportMenu ? 'bg-[#4F46E5] cursor-pointer' : 'bg-[#6366F1] hover:bg-[#4F46E5] cursor-pointer'}`}
                  >
                    {isExporting
                      ? <><i className="ri-loader-4-line text-sm animate-spin" />Exporting...</>
                      : <><i className={`${showExportMenu ? 'ri-arrow-up-s-line' : 'ri-download-line'} text-sm`} />Export Report</>
                    }
                  </button>
                  {showExportMenu && !isExporting && (
                    <div className="absolute top-[calc(100%+4px)] right-0 w-64 bg-white border border-[#E2E8F0] rounded-lg shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] z-50 py-1" role="menu">
                      {currentTier <= 1 ? (
                        <>
                          {[
                            { icon: 'ri-file-pdf-line', iconColor: '#EF4444', main: 'Export as PDF', sub: 'Project summary report' },
                            { icon: 'ri-file-excel-2-line', iconColor: '#10B981', main: 'Export Runs (CSV)', sub: 'All runs with results' },
                            { icon: 'ri-file-excel-2-line', iconColor: '#10B981', main: 'Export Test Cases (CSV)', sub: 'All test cases data' },
                          ].map(item => (
                            <div key={item.main} role="menuitem" onClick={() => { setShowExportMenu(false); navigate('/settings?tab=billing'); }} className="flex items-start gap-2.5 px-3 py-3 cursor-pointer border-b border-[#F1F5F9] last:border-b-0">
                              <i className={`${item.icon} text-lg flex-shrink-0 mt-0.5`} style={{ color: item.iconColor, opacity: 0.45 }} />
                              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <span className="text-[13px] font-medium text-[#94A3B8]">{item.main}</span>
                                <span className="text-[11px] text-[#CBD5E1]">{item.sub}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                                <i className="ri-lock-line text-[12px] text-[#94A3B8]" />
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] whitespace-nowrap">Starter+</span>
                              </div>
                            </div>
                          ))}
                          <div className="px-3 py-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-lg flex items-center gap-2">
                            <i className="ri-vip-crown-2-fill text-base text-[#D97706]" />
                            <span className="text-[12px] text-[#475569] font-medium">Upgrade to unlock all exports</span>
                            <button onClick={(e) => { e.stopPropagation(); setShowExportMenu(false); navigate('/settings?tab=billing'); }} className="ml-auto px-3 py-1 bg-[#6366F1] text-white rounded-[6px] text-[11px] font-semibold cursor-pointer hover:bg-[#4F46E5] transition-colors">Upgrade</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div role="menuitem" onClick={() => { setShowExportMenu(false); handleExportPDF(); }} className="flex items-start gap-2.5 px-3 py-3 cursor-pointer border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                            <i className="ri-file-pdf-line text-lg flex-shrink-0 mt-0.5 text-[#EF4444]" />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-medium text-[#334155]">Export as PDF</span>
                              <span className="text-[11px] text-[#94A3B8]">Project summary report</span>
                            </div>
                          </div>
                          <div role="menuitem" onClick={() => { setShowExportMenu(false); handleExportRunsCSV(); }} className="flex items-start gap-2.5 px-3 py-3 cursor-pointer border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                            <i className="ri-file-excel-2-line text-lg flex-shrink-0 mt-0.5 text-[#10B981]" />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-medium text-[#334155]">Export Runs (CSV)</span>
                              <span className="text-[11px] text-[#94A3B8]">All runs with results</span>
                            </div>
                          </div>
                          <div role="menuitem" onClick={() => { setShowExportMenu(false); handleExportTestCasesCSV(); }} className="flex items-start gap-2.5 px-3 py-3 cursor-pointer hover:bg-[#F8FAFC] transition-colors">
                            <i className="ri-file-excel-2-line text-lg flex-shrink-0 mt-0.5 text-[#10B981]" />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-medium text-[#334155]">Export Test Cases (CSV)</span>
                              <span className="text-[11px] text-[#94A3B8]">All test cases data</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dashboard — Overview tab */}
            {dashboardTab === 'overview' && (
              <div className="flex flex-1 overflow-hidden">

                {/* ── MAIN CONTENT ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 min-w-0" style={{ scrollbarWidth: 'thin' }}>

                  {/* WIDGET 1: RELEASE READINESS */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <i className="ri-shield-check-line text-lg" style={{ color: releaseSignal === 'go' ? '#16A34A' : releaseSignal === 'conditional' ? '#D97706' : '#DC2626' }} />
                      <span className="text-sm font-bold text-gray-900">Release Readiness</span>
                      <span className="ml-auto text-xs text-gray-400">Updated just now</span>
                    </div>
                    <div className="flex flex-wrap gap-5 items-start">
                      {/* Score circle */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                            <circle cx="40" cy="40" r="35" fill="none" stroke="#E2E8F0" strokeWidth="6" />
                            <circle cx="40" cy="40" r="35" fill="none"
                              stroke={releaseSignal === 'go' ? '#16A34A' : releaseSignal === 'conditional' ? '#F59E0B' : '#EF4444'}
                              strokeWidth="6"
                              strokeDasharray={`${(releaseScore / 100) * 219.9} 219.9`}
                              strokeLinecap="round" />
                          </svg>
                          <span className="text-2xl font-extrabold text-gray-900 relative z-10">{releaseScore}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          releaseSignal === 'go' ? 'bg-green-100 text-green-800' :
                          releaseSignal === 'conditional' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {releaseSignal === 'go' ? '🟢 Go' : releaseSignal === 'conditional' ? '🟡 Conditional' : '🔴 Not Ready'}
                        </span>
                      </div>

                      {/* Formula */}
                      <div className="flex flex-col gap-1.5 min-w-[160px] flex-shrink-0">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Score Formula</p>
                        {[
                          { label: 'Pass Rate', weight: '40%' },
                          { label: 'Critical Bug Resolution', weight: '25%' },
                          { label: 'Coverage', weight: '20%' },
                          { label: 'Milestone Progress', weight: '15%' },
                        ].map(({ label, weight }) => (
                          <div key={label} className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-bold text-indigo-600 ml-4">{weight}</span>
                          </div>
                        ))}
                        <div className="h-px bg-gray-100 my-1" />
                        <div className="flex gap-3 text-[10px] font-semibold flex-wrap">
                          <span className="text-green-700">● ≥80 Go</span>
                          <span className="text-amber-700">● 60-79 Conditional</span>
                          <span className="text-red-700">● &lt;60 Not Ready</span>
                        </div>
                      </div>

                      {/* Metric cards */}
                      <div className="flex gap-3 flex-wrap flex-1 min-w-0">
                        {[
                          { label: 'Pass Rate', value: `${passRate}%`, sub: 'Target: 80%', gap: passRate < 80 ? `gap ${80 - passRate}%` : null, bar: passRate, critical: passRate < 60 },
                          { label: 'Critical Bugs', value: `${failedTotal}`, sub: failedTotal > 0 ? 'open failures' : 'clean', bar: null, critical: failedTotal > 0 },
                          { label: 'Coverage', value: `${coverageScore}%`, sub: `${untestedInRuns} untested`, bar: coverageScore, critical: coverageScore < 50 },
                          { label: 'Milestone', value: `${avgMilestoneProgress}%`, sub: activeMilestones[0]?.name || 'No active', bar: avgMilestoneProgress, critical: false },
                        ].map(({ label, value, sub, gap, bar, critical }) => (
                          <div key={label} className="flex-1 min-w-[100px] bg-slate-50 border border-slate-100 rounded-lg p-3">
                            <p className="text-[11px] text-gray-400 font-medium mb-1">{label}</p>
                            <p className={`text-xl font-extrabold mb-1 ${critical ? 'text-red-500' : 'text-gray-900'}`}>{value}</p>
                            <p className="text-[11px] text-gray-500 mb-2">{sub}</p>
                            {bar !== null && (
                              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${bar}%` }} />
                              </div>
                            )}
                            {gap && <p className="text-[10px] text-red-500 font-semibold mt-1">{gap}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* WIDGET 2: MY RUNS */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <i className="ri-play-circle-line text-lg text-indigo-500" />
                      <span className="text-sm font-bold text-gray-900">My Runs</span>
                      <span className="text-sm font-extrabold text-gray-900">{incompleteRuns.length}</span>
                      <span className="text-sm text-gray-400">active</span>
                      <Link to={`/projects/${id}/runs`} className="ml-auto text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5">
                        View all runs <i className="ri-arrow-right-s-line" />
                      </Link>
                    </div>

                    {myRunsPriorityGroups.length === 0 ? (
                      <div className="text-center py-10">
                        <i className="ri-checkbox-circle-line text-4xl text-green-400 block mb-2" />
                        <p className="text-sm text-gray-500">All runs completed. Great work!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myRunsPriorityGroups.map(({ level, runs }) => {
                          const isExpanded = expandedPriorityGroups.has(level);
                          const PRIORITY_STYLE = {
                            critical: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-900', dot: '#EF4444', badge: 'bg-red-100 text-red-800', desc: 'milestone ≤3d' },
                            high:     { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-900', dot: '#F59E0B', badge: 'bg-amber-100 text-amber-800', desc: 'milestone 4~7d' },
                            medium:   { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900', dot: '#FBBF24', badge: 'bg-yellow-100 text-yellow-800', desc: 'milestone 8~14d' },
                            low:      { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-900', dot: '#22C55E', badge: 'bg-green-100 text-green-800', desc: 'milestone >14d' },
                          }[level];
                          return (
                            <div key={level}>
                              <button
                                onClick={() => {
                                  const s = new Set(expandedPriorityGroups);
                                  if (s.has(level)) s.delete(level); else s.add(level);
                                  setExpandedPriorityGroups(s);
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg border-l-[3px] text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-80 ${PRIORITY_STYLE.bg} ${PRIORITY_STYLE.border} ${PRIORITY_STYLE.text}`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span style={{ color: PRIORITY_STYLE.dot }}>●</span>
                                  {level.charAt(0).toUpperCase() + level.slice(1)} ({runs.length})
                                  <span className="font-normal opacity-70 normal-case">— {PRIORITY_STYLE.desc}</span>
                                </span>
                                <i className={`ri-arrow-${isExpanded ? 'down' : 'right'}-s-line text-base`} />
                              </button>

                              {isExpanded && (
                                <div className="divide-y divide-gray-50 border border-t-0 border-gray-100 rounded-b-lg overflow-hidden">
                                  {runs.map((run: any) => {
                                    const total = (run.passed||0) + (run.failed||0) + (run.blocked||0) + (run.retest||0) + (run.untested||0);
                                    const pPct = total ? Math.round(((run.passed||0)/total)*100) : 0;
                                    const fPct = total ? Math.round(((run.failed||0)/total)*100) : 0;
                                    const daysLeft = run._priority.daysLeft;
                                    const dueDate = run.milestone_id ? milestoneEndDateMap.get(run.milestone_id) : null;
                                    return (
                                      <div key={run.id} className="px-3.5 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-[13px] font-semibold text-gray-900 flex-1 min-w-0 truncate">{run.name}</span>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${PRIORITY_STYLE.badge}`}>
                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                            {daysLeft !== null && <span className="font-normal opacity-70"> · {daysLeft}d left</span>}
                                          </span>
                                          {run.priority_override && (
                                            <span className="text-[9px] font-semibold bg-violet-100 text-violet-700 px-1 py-0.5 rounded flex-shrink-0">Manual</span>
                                          )}
                                          <Link
                                            to={`/projects/${id}/runs/${run.id}?focus=true`}
                                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex-shrink-0"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            <i className="ri-play-fill text-xs" />Continue
                                          </Link>
                                        </div>
                                        {/* 3-color progress bar */}
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-green-500 transition-all" style={{ width: `${pPct}%` }} />
                                            <div className="h-full bg-red-500 transition-all" style={{ width: `${fPct}%` }} />
                                          </div>
                                          <span className="text-[11px] font-bold text-gray-700 min-w-[32px] text-right">{pPct}%</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                                          {run.milestoneName && <span><i className="ri-flag-line mr-0.5" />{run.milestoneName}</span>}
                                          {dueDate && (
                                            <span className={daysLeft !== null && daysLeft <= 3 ? 'text-red-500 font-semibold' : ''}>
                                              <i className="ri-calendar-line mr-0.5" />Due {formatDate(dueDate)}
                                            </span>
                                          )}
                                          <span>{run.passed||0}/{total} passed · {run.failed||0} failed · {run.untested||0} remaining</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* WIDGET 3: TEST EXECUTION TREND */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <i className="ri-line-chart-line text-lg text-indigo-500" />
                        Test Execution Trend
                      </div>
                      <div className="flex gap-1.5">
                        {(['7d','14d','30d'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setTrendPeriod(p)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                              trendPeriod === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >{p}</button>
                        ))}
                      </div>
                    </div>
                    {trendData.length === 0 ? (
                      <div className="text-center py-14 text-sm text-gray-400">
                        <i className="ri-line-chart-line text-4xl block mb-2 text-gray-300" />
                        No test execution data yet
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: '#94A3B8' }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#94A3B8' }}
                            axisLine={false}
                            tickLine={false}
                            width={28}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                            labelStyle={{ fontWeight: 600, color: '#0F172A', marginBottom: 4 }}
                          />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                          />
                          <Line type="monotone" dataKey="passed" name="Passed" stroke="#22C55E" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="failed" name="Failed" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="blocked" name="Blocked" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* WIDGET 4: ATTENTION NEEDED */}
                  {(() => {
                    const attentionItems: { icon: string; iconColor: string; text: string; link: string; linkText: string }[] = [];
                    testRuns.filter((r: any) => (r.failed||0) > 0).forEach((run: any) => {
                      attentionItems.push({
                        icon: 'ri-error-warning-fill', iconColor: '#EF4444',
                        text: `${run.name} — ${run.failed} failed test${(run.failed||0) > 1 ? 's' : ''}`,
                        link: `/projects/${id}/runs/${run.id}`, linkText: 'View run',
                      });
                    });
                    testRuns.filter((r: any) => (r.blocked||0) > 0).forEach((run: any) => {
                      attentionItems.push({
                        icon: 'ri-pause-circle-fill', iconColor: '#F59E0B',
                        text: `${run.name} — ${run.blocked} blocked`,
                        link: `/projects/${id}/runs/${run.id}`, linkText: 'View run',
                      });
                    });
                    activeMilestones.filter((m: any) => {
                      const d = m.end_date ? Math.ceil((new Date(m.end_date).getTime() - Date.now()) / 86400000) : null;
                      return d !== null && d <= 9;
                    }).forEach((m: any) => {
                      const daysLeft = Math.ceil((new Date(m.end_date).getTime() - Date.now()) / 86400000);
                      attentionItems.push({
                        icon: 'ri-alarm-warning-fill', iconColor: '#EF4444',
                        text: `${m.name} — ${daysLeft <= 0 ? 'Overdue' : `${daysLeft} days left`}, ${m.progress}% complete`,
                        link: `/projects/${id}/milestones`, linkText: 'View Milestone',
                      });
                    });
                    const totalUntested = testRuns.reduce((a: number, r: any) => a + (r.untested||0), 0);
                    if (totalUntested > 0) {
                      attentionItems.push({
                        icon: 'ri-time-line', iconColor: '#94A3B8',
                        text: `${totalUntested} test case${totalUntested > 1 ? 's' : ''} untested`,
                        link: `/projects/${id}/testcases`, linkText: 'View Untested',
                      });
                    }
                    return (
                      <div className="bg-white border border-gray-200 rounded-xl p-5" style={{ borderLeft: '3px solid #EF4444' }}>
                        <div className="flex items-center gap-2 mb-4">
                          <i className="ri-error-warning-fill text-[18px] text-red-500" />
                          <span className="text-sm font-bold text-gray-900">Attention Needed</span>
                          {attentionItems.length > 0 && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded ml-0.5">({attentionItems.length})</span>
                          )}
                        </div>
                        {attentionItems.length === 0 ? (
                          <div className="text-center py-8">
                            <i className="ri-shield-check-line text-4xl text-green-400 block mb-2" />
                            <p className="text-sm text-gray-500">No issues detected. Looking good!</p>
                          </div>
                        ) : (
                          <div>
                            {attentionItems.map((item, i) => (
                              <div key={i} className="flex gap-2.5 items-start py-2.5 border-b border-[#F1F5F9] last:border-0">
                                <i className={`${item.icon} text-[18px] flex-shrink-0 mt-0.5`} style={{ color: item.iconColor }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] text-[#334155] mb-1">{item.text}</p>
                                  <Link to={item.link} className="text-xs font-semibold text-indigo-600 hover:underline">{item.linkText}</Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* WIDGET 5: RECENT ACTIVITY */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    {/* Header with filter */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <i className="ri-time-line text-[18px] text-gray-500" />
                        Recent Activity
                      </div>
                      <select
                        value={activityFilter}
                        onChange={e => setActivityFilter(e.target.value)}
                        className="bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] text-[#64748B] px-2.5 py-1 rounded-md cursor-pointer focus:outline-none"
                      >
                        <option value="all">All Types ▾</option>
                        <option value="run">Runs</option>
                        <option value="milestone">Milestones</option>
                        <option value="session">Discovery</option>
                        <option value="test_activity">Test Results</option>
                      </select>
                    </div>

                    {recentActivity.length === 0 ? (
                      <div className="text-center py-10">
                        <i className="ri-time-line text-4xl text-gray-300 block mb-2" />
                        <p className="text-sm text-gray-500">No activity yet</p>
                      </div>
                    ) : (() => {
                      const ICON_MAP: Record<string, { icon: string; color: string; action: string }> = {
                        'milestone-created':    { icon: 'ri-flag-line',             color: '#6366F1', action: 'created milestone' },
                        'milestone-completed':  { icon: 'ri-flag-fill',             color: '#16A34A', action: 'completed milestone' },
                        'run-created':          { icon: 'ri-play-circle-line',      color: '#6366F1', action: 'created run' },
                        'run-completed':        { icon: 'ri-checkbox-circle-fill',  color: '#16A34A', action: 'completed run' },
                        'session-created':      { icon: 'ri-search-eye-line',       color: '#8B5CF6', action: 'started session' },
                        'session-completed':    { icon: 'ri-check-double-line',     color: '#16A34A', action: 'closed session' },
                        'test_activity-tested': { icon: 'ri-test-tube-line',        color: '#3B82F6', action: 'executed tests in' },
                      };

                      const filtered = activityFilter === 'all'
                        ? recentActivity
                        : recentActivity.filter(e => e.type === activityFilter);

                      const visibleGroups = groupedActivity
                        .map(g => ({
                          ...g,
                          items: activityFilter === 'all' ? g.items : g.items.filter(e => e.type === activityFilter),
                        }))
                        .filter(g => g.items.length > 0);

                      const MAX_ITEMS = 7;
                      let shownCount = 0;

                      return (
                        <div>
                          {visibleGroups.map((group, gi) => (
                            <div key={gi}>
                              <p className="text-[11px] font-bold uppercase text-[#94A3B8] tracking-[0.5px] mt-3 mb-2 first:mt-0">{group.label}</p>
                              {group.items.map((event, idx) => {
                                if (!showAllActivity && shownCount >= MAX_ITEMS) return null;
                                shownCount++;
                                const key = `${event.type}-${event.action}`;
                                const info = ICON_MAP[key] || { icon: 'ri-information-line', color: '#94A3B8', action: event.action };
                                return (
                                  <div key={idx} className="flex items-start gap-2.5 py-2 border-b border-[#F1F5F9] last:border-0">
                                    <i className={`${info.icon} text-[16px] flex-shrink-0 mt-0.5`} style={{ color: info.color }} />
                                    <div className="flex-1 min-w-0 text-[13px]">
                                      <span className="font-semibold text-[#0F172A]">{info.action} </span>
                                      <span className="font-medium text-[#0F172A]">{event.name}</span>
                                      {event.type === 'test_activity' && (
                                        <span className="text-[#64748B]">
                                          {(event.meta?.passed||0) > 0 && <span className="text-green-600 font-semibold ml-1">{event.meta.passed}✓</span>}
                                          {(event.meta?.failed||0) > 0 && <span className="text-red-600 font-semibold ml-1">{event.meta.failed}✗</span>}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[12px] text-[#94A3B8] whitespace-nowrap flex-shrink-0 ml-auto">{getRelativeTime(event.created_at)}</div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}

                          {filtered.length > MAX_ITEMS && (
                            <button
                              onClick={() => setShowAllActivity(v => !v)}
                              className="w-full text-center py-2.5 text-xs font-semibold text-indigo-600 hover:underline mt-2 cursor-pointer bg-none border-none"
                            >
                              {showAllActivity ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                </div>

                {/* ── RIGHT SIDEBAR ── */}
                <div className="w-[320px] border-l border-gray-200 bg-white overflow-y-auto p-5 space-y-5 flex-shrink-0" style={{ scrollbarWidth: 'thin' }}>

                  {/* Sidebar: Summary */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                      <i className="ri-layout-grid-line text-indigo-500" />
                      Summary
                    </div>
                    {[
                      { label: 'Test Cases', value: testCaseCount, link: `/projects/${id}/testcases`, color: '#6366F1' },
                      { label: 'Pass Rate', value: prTotal > 0 ? `${passRate}%` : '—', link: `/projects/${id}/runs`, color: healthColor },
                      { label: 'Active Runs', value: activeRunsCount, link: `/projects/${id}/runs`, color: '#6366F1' },
                      { label: 'Discovery Logs', value: sessions.length, link: `/projects/${id}/discovery-logs`, color: '#8B5CF6' },
                    ].map(({ label, value, link, color }) => (
                      <Link key={label} to={link} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors">
                        <div>
                          <p className="text-xs text-gray-400 font-medium">{label}</p>
                          <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
                        </div>
                        <i className="ri-arrow-right-s-line text-gray-300" />
                      </Link>
                    ))}
                  </div>

                  {/* Sidebar: Run Progress */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                      <i className="ri-play-circle-line text-indigo-500" />
                      Run Progress
                      {incompleteRuns.length > 0 && (
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">{incompleteRuns.length} active</span>
                      )}
                    </div>
                    {incompleteRuns.length === 0 ? (
                      <p className="text-xs text-gray-400 py-4 text-center">No active runs</p>
                    ) : (
                      <div className="space-y-3">
                        {incompleteRuns.slice(0, 5).map((run: any) => {
                          const total = (run.passed||0) + (run.failed||0) + (run.blocked||0) + (run.retest||0) + (run.untested||0);
                          const pPct = total ? Math.round(((run.passed||0)/total)*100) : 0;
                          const fPct = total ? Math.round(((run.failed||0)/total)*100) : 0;
                          return (
                            <div key={run.id} className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-700 truncate" style={{ minWidth: 0, maxWidth: '100px' }}>{run.name}</span>
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex min-w-0">
                                <div className="h-full bg-green-500" style={{ width: `${pPct}%` }} />
                                <div className="h-full bg-red-500" style={{ width: `${fPct}%` }} />
                              </div>
                              <span className="text-xs font-bold text-gray-700 min-w-[32px] text-right">
                                {pPct === 100 ? <><i className="ri-check-line text-green-500" />100%</> : `${pPct}%`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Sidebar: Milestones */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                      <i className="ri-flag-line text-amber-500" />
                      Milestones
                      <Link to={`/projects/${id}/milestones`} className="ml-auto text-xs text-indigo-600 font-semibold hover:text-indigo-700">View all</Link>
                    </div>
                    {activeMilestones.length === 0 ? (
                      <p className="text-xs text-gray-400 py-4 text-center">No active milestones</p>
                    ) : (
                      <div className="space-y-4">
                        {activeMilestones.slice(0, 3).map((m: any) => {
                          const daysLeft = m.end_date ? Math.ceil((new Date(m.end_date).getTime() - Date.now()) / 86400000) : null;
                          const barColor = m.status === 'past_due' ? '#EF4444' : m.progress >= 80 ? '#16A34A' : '#6366F1';
                          const isUrgent = daysLeft !== null && daysLeft <= 9;
                          return (
                            <div key={m.id}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-gray-900 truncate flex-1 mr-2">{m.name}</span>
                                <span className="text-xs font-bold" style={{ color: barColor }}>{m.progress}%</span>
                              </div>
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                                <div className="h-full rounded-full transition-all" style={{ width: `${m.progress}%`, background: barColor }} />
                              </div>
                              <p className={`text-[11px] font-medium ${isUrgent ? 'text-red-600' : 'text-gray-400'}`}>
                                {m.end_date ? `Due: ${formatDate(m.end_date)}${daysLeft !== null ? ` (${daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`})` : ''}` : 'No due date'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Sidebar: AI Usage */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                      <i className="ri-sparkling-line text-violet-500" />
                      AI Usage
                      <span className="ml-auto text-xs text-gray-400 font-normal">This month</span>
                    </div>
                    {aiLimit < 0 ? (
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1">
                          <p className="text-xl font-bold text-gray-900">Unlimited</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">AI generations</p>
                        </div>
                        <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-1 rounded-full">Enterprise</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-gray-900 mb-0.5">—<span className="text-sm font-normal text-gray-400 ml-1">/ {aiLimit}</span></p>
                        <p className="text-[11px] text-gray-400 mb-3">generations this month</p>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: '0%' }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-400">Plan: <strong className="text-gray-600">{tierInfo?.name || 'Free'}</strong></span>
                          <Link to="/settings?tab=billing" className="text-[11px] text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-0.5">
                            Upgrade <i className="ri-arrow-right-up-line text-xs" />
                          </Link>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Sidebar: Team Members */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <i className="ri-team-line text-indigo-500" />
                        Team Members
                      </div>
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                        style={{ boxShadow: '0 1px 3px rgba(99,102,241,0.3)' }}
                      >
                        <i className="ri-user-add-line text-xs" />
                        Invite
                      </button>
                    </div>
                    <ProjectMembersPanel
                      projectId={id || ''}
                      onInviteClick={() => setShowInviteModal(true)}
                      refreshTrigger={memberRefreshTrigger}
                      compact={true}
                      ownerId={project?.owner_id}
                    />
                    <div className="mt-2 pt-2 border-t border-[#F1F5F9] text-center">
                      <Link to={`/settings?tab=members&projectId=${id}`} className="text-xs font-medium text-indigo-600 hover:underline">
                        Manage in Settings →
                      </Link>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Analytics & Activity tabs (unchanged placeholder) */}
            {dashboardTab !== 'overview' && (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400 py-20">
                <div className="text-center">
                  <i className={`${dashboardTab === 'analytics' ? 'ri-bar-chart-2-fill' : 'ri-time-fill'} text-4xl text-gray-300 block mb-3`} />
                  <p>{dashboardTab === 'analytics' ? 'Analytics' : 'Activity Feed'} coming soon</p>
                </div>
              </div>
            )}
          </main>

        </div>
      </div>

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        projectId={id!}
        onInvited={() => setMemberRefreshTrigger(prev => prev + 1)}
      />

      <QuickCreateTCModal
        isOpen={showQuickCreateTC}
        onClose={() => setShowQuickCreateTC(false)}
        projectId={id!}
      />

      <ContinueRunPanel
        isOpen={showContinueRun}
        onClose={() => setShowContinueRun(false)}
        projectId={id!}
      />

      <AIAssistModal
        isOpen={showAIAssist}
        onClose={() => setShowAIAssist(false)}
        projectId={id!}
        onOpenGenerate={() => setShowAIGenerate(true)}
      />

      {showAIGenerate && (
        <AIGenerateModal
          projectId={id!}
          subscriptionTier={userProfile?.subscription_tier || 1}
          onSave={async (cases) => {
            const { data: { user } } = await supabase.auth.getUser();
            for (const tc of cases) {
              const stepsStr = Array.isArray(tc.steps) ? tc.steps.join('\n') : '';
              await supabase.from('test_cases').insert({
                project_id: id!,
                title: tc.title,
                description: tc.description || '',
                steps: stepsStr,
                expected_result: tc.expected_result || '',
                priority: tc.priority || 'medium',
                status: 'untested',
                created_by: user?.id || null,
                is_automated: false,
              });
            }
          }}
          onClose={() => setShowAIGenerate(false)}
        />
      )}
    </>
  );
}
