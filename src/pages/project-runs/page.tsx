import { LogoMark } from '../../components/Logo';
import PageLoader from '../../components/PageLoader';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import NotificationBell from '../../components/feature/NotificationBell';
import { notifyProjectMembers } from '../../hooks/useNotifications';
import { triggerWebhook } from '../../hooks/useWebhooks';
import ProjectHeader from '../../components/ProjectHeader';
import { Avatar } from '../../components/Avatar';
import { useToast, ToastContainer } from '../../components/Toast';

interface TestRun {
  id: string;
  project_id: string;
  milestone_id: string;
  name: string;
  status: 'new' | 'in_progress' | 'paused' | 'under_review' | 'completed';
  progress: number;
  passed: number;
  failed: number;
  blocked: number;
  retest: number;
  untested: number;
  tags: string[];
  assignees: string[];
  test_case_ids: string[];
  executed_at: string;
  created_at: string;
  is_automated?: boolean; // CI/CD 자동화 여부
}

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
  progress: number;
  created_at: string;
}

interface TestCase {
  id: string;
  title: string;
  folder?: string;
  priority: string;
  status: string;
  tags?: string[];
  description?: string;
}

interface FolderMeta {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const RUNS_FOLDER_COLOR_MAP: Record<string, { bg: string; fg: string }> = {
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

interface Contributor {
  id: string;
  name: string;
  email: string;
}

export default function ProjectRunsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toasts, showToast, dismiss } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [milestoneFilter, setMilestoneFilter] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'created' | 'name' | 'progress'>('priority');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showMilestoneDropdown, setShowMilestoneDropdown] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const milestoneDropdownRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRunModal, setShowAddRunModal] = useState(false);
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    milestone_id: '',
    status: 'new' as 'new' | 'in_progress' | 'under_review' | 'completed',
    tags: '',
    include_all_cases: true,
    is_ci_cd_run: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [showSelectCasesModal, setShowSelectCasesModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderMetas, setFolderMetas] = useState<FolderMeta[]>([]);

  // ─── Add Run 2-step wizard ──────────────────────────────────────
  const [addRunStep, setAddRunStep] = useState<1 | 2>(1);
  const [runAssignees, setRunAssignees] = useState<string[]>([]);
  const [includeDraftTCs, setIncludeDraftTCs] = useState(false);
  const [showDraftWarningDismissed, setShowDraftWarningDismissed] = useState(false);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [selectedCaseFolder, setSelectedCaseFolder] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [runNameError, setRunNameError] = useState('');
  const [priorityFilters, setPriorityFilters] = useState<string[]>(['high', 'medium', 'low']);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleRunClick = (runId: string) => {
    navigate(`/projects/${id}/runs/${runId}`);
  };

  const generateMilestonePdf = async (milestone: Milestone, runs: TestRun[]) => {
    setGeneratingPdf(milestone.id);

    const fmtDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    try {
      const totalPassed = runs.reduce((sum, run) => sum + run.passed, 0);
      const totalFailed = runs.reduce((sum, run) => sum + run.failed, 0);
      const totalBlocked = runs.reduce((sum, run) => sum + run.blocked, 0);
      const totalRetest = runs.reduce((sum, run) => sum + run.retest, 0);
      const totalUntested = runs.reduce((sum, run) => sum + run.untested, 0);
      const totalTests = totalPassed + totalFailed + totalBlocked + totalRetest + totalUntested;
      const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

      // Fetch all test cases for these runs — created_at 오름차순 정렬
      const allTestCaseIds = [...new Set(runs.flatMap(run => run.test_case_ids))];
      const { data: testCasesData } = await supabase
        .from('test_cases')
        .select('*')
        .in('id', allTestCaseIds)
        .order('created_at', { ascending: true });

      const { data: allTestResultsData } = await supabase
        .from('test_results')
        .select('*')
        .in('run_id', runs.map(r => r.id))
        .order('created_at', { ascending: false });

      const { data: allCommentsData } = await supabase
        .from('test_case_comments')
        .select(`
          id,
          comment,
          created_at,
          test_case_id,
          user_id,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .in('test_case_id', allTestCaseIds)
        .order('created_at', { ascending: false });

      const { data: jiraSettingsData } = await supabase
        .from('jira_settings')
        .select('domain')
        .maybeSingle();
      const jiraDomain = jiraSettingsData?.domain || '';

      const testCasesMap = new Map((testCasesData || []).map(tc => [tc.id, tc]));

      const commentsMap = new Map<string, any[]>();
      (allCommentsData || []).forEach(comment => {
        const existing = commentsMap.get(comment.test_case_id) || [];
        commentsMap.set(comment.test_case_id, [...existing, comment]);
      });

      const resultsMap = new Map<string, any[]>();
      (allTestResultsData || []).forEach(result => {
        const key = `${result.run_id}_${result.test_case_id}`;
        const existing = resultsMap.get(key) || [];
        resultsMap.set(key, [...existing, result]);
      });

      const runsSectionHtml = runs.map(run => {
        const runResults = (allTestResultsData || []).filter(r => r.run_id === run.id);
        const statusMap = new Map<string, any>();
        runResults.forEach(result => {
          if (!statusMap.has(result.test_case_id)) {
            statusMap.set(result.test_case_id, result);
          }
        });

        const runStatusBadge = run.status === 'completed' ? 'status-completed'
          : run.status === 'in_progress' ? 'status-in-progress'
          : run.status === 'paused' ? 'status-paused'
          : 'status-new';
        const runStatusLabel = run.status === 'completed' ? 'Completed'
          : run.status === 'in_progress' ? 'In Progress'
          : run.status === 'paused' ? 'Paused'
          : 'New';

        // created_at 오름차순으로 테스트 케이스 정렬
        const sortedTcIds = [...run.test_case_ids].sort((a, b) => {
          const tcA = testCasesMap.get(a);
          const tcB = testCasesMap.get(b);
          if (!tcA || !tcB) return 0;
          return new Date(tcA.created_at).getTime() - new Date(tcB.created_at).getTime();
        });

        const testCaseBlocksHtml = sortedTcIds.map(tcId => {
          const testCase = testCasesMap.get(tcId);
          if (!testCase) return '';

          const latestResult = statusMap.get(tcId);
          const status = latestResult?.status || 'untested';
          const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

          const priorityClass = testCase.priority === 'high' ? 'priority-high'
            : testCase.priority === 'medium' ? 'priority-medium'
            : 'priority-low';
          const priorityLabel = testCase.priority
            ? testCase.priority.charAt(0).toUpperCase() + testCase.priority.slice(1)
            : '-';

          const tcResults = runResults.filter(r => r.test_case_id === tcId);
          const tcComments = commentsMap.get(tcId) || [];

          const allIssues: string[] = [];
          tcResults.forEach(r => {
            if (r.issues && Array.isArray(r.issues)) {
              r.issues.forEach((iss: string) => {
                if (!allIssues.includes(iss)) allIssues.push(iss);
              });
            }
          });

          const resultsHtml = tcResults.length === 0
            ? '<div class="no-data">No results recorded.</div>'
            : tcResults.map(r => {
                const rStatusLabel = r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : '-';
                const rDate = new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const issuesHtml = r.issues && r.issues.length > 0
                  ? `<div style="margin-top:5px;">${r.issues.map((iss: string) => `<span class="issue-badge">🐛 ${iss}</span>`).join('')}</div>`
                  : '';
                const noteHtml = r.note ? `<div style="font-size:11px;color:#444;margin-top:4px;white-space:pre-wrap;">${r.note}</div>` : '';
                const authorHtml = r.author ? `<span style="font-size:10px;color:#555;margin-left:auto;">by ${r.author}</span>` : '';
                const elapsedHtml = r.elapsed ? `<span style="font-size:10px;color:#888;">⏱ ${r.elapsed}</span>` : '';
                return `
                  <div class="result-item">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                      <span class="status-badge status-${r.status}">${rStatusLabel}</span>
                      ${elapsedHtml}
                      ${authorHtml}
                    </div>
                    ${noteHtml}
                    ${issuesHtml}
                    <div class="result-meta">${rDate}</div>
                  </div>`;
              }).join('');

          const commentsHtml = tcComments.length === 0
            ? '<div class="no-data">No comments.</div>'
            : tcComments.map((c: any) => {
                const author = (c.profiles as any)?.full_name || (c.profiles as any)?.email || 'Unknown';
                const cDate = new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `
                  <div class="comment-item">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                      <span style="font-size:10px;font-weight:700;color:#065f46;">${author}</span>
                      <span style="font-size:10px;color:#888;margin-left:auto;">${cDate}</span>
                    </div>
                    <div style="font-size:11px;color:#333;white-space:pre-wrap;">${c.comment}</div>
                  </div>`;
              }).join('');

          const issuesSummaryHtml = allIssues.length === 0
            ? '<div class="no-data">No linked issues.</div>'
            : `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
                ${allIssues.map(iss => {
                  const issUrl = jiraDomain ? ` (https://${jiraDomain}/browse/${iss})` : '';
                  return `<span class="issue-badge">🐛 ${iss}${issUrl}</span>`;
                }).join('')}
              </div>`;

          const stepsHtml = (() => {
            if (!testCase.steps) return '<div class="no-data">No steps defined.</div>';

            const isHtmlFormat = /<[^>]+>/.test(testCase.steps);
            let stepsArr: string[] = [];

            if (isHtmlFormat) {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = testCase.steps;
              const blocks = tempDiv.querySelectorAll('p, li, div');
              if (blocks.length > 0) {
                stepsArr = Array.from(blocks)
                  .map(el => el.textContent?.trim() || '')
                  .filter(s => s.length > 0);
              } else {
                stepsArr = [tempDiv.textContent?.trim() || ''].filter(s => s.length > 0);
              }
            } else {
              stepsArr = testCase.steps.split('\n').filter((s: string) => s.trim());
            }

            let expectedArr: string[] = [];
            if (testCase.expected_result) {
              const isExpectedHtml = /<[^>]+>/.test(testCase.expected_result);
              if (isExpectedHtml) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = testCase.expected_result;
                const blocks = tempDiv.querySelectorAll('p, li, div');
                if (blocks.length > 0) {
                  expectedArr = Array.from(blocks)
                    .map(el => el.textContent?.trim() || '')
                    .filter(s => s.length > 0);
                } else {
                  expectedArr = [tempDiv.textContent?.trim() || ''].filter(s => s.length > 0);
                }
              } else {
                expectedArr = testCase.expected_result.split('\n').filter((s: string) => s.trim());
              }
            }

            if (stepsArr.length === 0) return '<div class="no-data">No steps defined.</div>';

            const latestResult = statusMap.get(tcId);
            const rawStepStatuses = latestResult?.step_statuses || {};
            const getStepStatus = (idx: number): string => {
              return rawStepStatuses[idx] || rawStepStatuses[String(idx)] || 'untested';
            };

            const stepStatusLabel = (s: string) => {
              switch (s) {
                case 'passed': return { label: 'Passed', bg: '#dcfce7', color: '#166534' };
                case 'failed': return { label: 'Failed', bg: '#fee2e2', color: '#991b1b' };
                case 'blocked': return { label: 'Blocked', bg: '#f3f4f6', color: '#374151' };
                default: return { label: 'Untested', bg: '#e5e7eb', color: '#6b7280' };
              }
            };

            return stepsArr.map((step: string, idx: number) => {
              const stepContent = step.replace(/^\d+\.\s*/, '');
              const expectedContent = expectedArr[idx]
                ? expectedArr[idx].replace(/^\d+\.\s*/, '')
                : '';
              const stepStatus = getStepStatus(idx);
              const statusInfo = stepStatusLabel(stepStatus);
              return `
                <div style="display:flex;gap:8px;margin-bottom:8px;padding:8px 10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:5px;">
                  <div style="min-width:22px;height:22px;background:#ccfbf1;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#4F46E5;flex-shrink:0;">${idx + 1}</div>
                  <div style="flex:1;">
                    <div style="font-size:11px;color:#111;white-space:pre-wrap;">${stepContent}</div>
                    ${expectedContent ? `
                    <div style="margin-top:5px;padding:5px 8px;background:#f0fdf4;border-left:3px solid #86efac;border-radius:3px;">
                      <div style="font-size:9px;font-weight:700;color:#166534;text-transform:uppercase;margin-bottom:2px;">Expected Result</div>
                      <div style="font-size:11px;color:#166534;white-space:pre-wrap;">${expectedContent}</div>
                    </div>` : ''}
                    <div style="margin-top:6px;">
                      <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${statusInfo.bg};color:${statusInfo.color};">${statusInfo.label}</span>
                    </div>
                  </div>
                </div>`;
            }).join('');
          })();

          return `
            <div class="tc-block">
              <div class="tc-title">
                <span class="status-badge status-${status}">${statusLabel}</span>
                <span>${testCase.title}</span>
                <span class="${priorityClass}" style="font-size:10px;margin-left:auto;">${priorityLabel}</span>
              </div>
              ${testCase.description ? `<div style="font-size:11px;color:#555;margin-bottom:6px;padding-left:4px;">${testCase.description}</div>` : ''}
              <div class="tc-section-label">Steps &amp; Expected Results (${testCase.steps ? testCase.steps.split('\n').filter((s: string) => s.trim()).length : 0})</div>
              ${stepsHtml}
              <div class="tc-section-label">Results (${tcResults.length})</div>
              ${resultsHtml}
              <div class="tc-section-label">Comments (${tcComments.length})</div>
              ${commentsHtml}
              <div class="tc-section-label">Issues (${allIssues.length})</div>
              ${issuesSummaryHtml}
            </div>`;
        }).join('');

        return `
          <div style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="background:#f3f4f6;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="color:#6366F1;font-size:14px;">▶</span>
                <span style="font-weight:700;font-size:13px;color:#111;">${run.name}</span>
                <span class="status-badge ${runStatusBadge}">${runStatusLabel}</span>
              </div>
              <div style="display:flex;gap:16px;font-size:11px;color:#555;">
                <span>✅ ${run.passed} Passed</span>
                <span>❌ ${run.failed} Failed</span>
                <span>🚫 ${run.blocked} Blocked</span>
                <span>🔄 ${run.retest} Retest</span>
                <span>⬜ ${run.untested} Untested</span>
                <span style="font-weight:600;color:#6366F1;">${run.progress}%</span>
              </div>
            </div>
            <div style="padding:12px 16px;">
              ${testCaseBlocksHtml}
            </div>
          </div>`;
      }).join('');

      const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Test Report - ${milestone.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Helvetica','Arial',sans-serif; padding:40px; color:#333; background:#fff; font-size:12px; line-height:1.5; }
    .header { border-bottom:3px solid #6366F1; padding-bottom:20px; margin-bottom:30px; }
    .header h1 { font-size:24px; color:#6366F1; margin-bottom:8px; font-weight:600; }
    .header .subtitle { color:#666; font-size:13px; }
    .section { margin-bottom:30px; }
    .section-title { font-size:14px; font-weight:600; color:#333; margin-bottom:15px; padding-bottom:8px; border-bottom:2px solid #e5e7eb; text-transform:uppercase; letter-spacing:0.5px; }
    .info-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:15px; margin-bottom:20px; }
    .info-item { background:#f9fafb; padding:12px 15px; border-radius:6px; border:1px solid #e5e7eb; }
    .info-label { font-size:11px; color:#666; margin-bottom:4px; text-transform:uppercase; font-weight:500; }
    .info-value { font-size:14px; font-weight:600; color:#333; }
    .summary-container { display:flex; gap:20px; margin-bottom:30px; }
    .summary-left { flex:0 0 200px; }
    .summary-right { flex:1; }
    .pass-rate-circle { width:180px; height:180px; border-radius:50%; background:linear-gradient(135deg,#6366F1,#4F46E5); display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; margin:0 auto; }
    .pass-rate-number { font-size:48px; font-weight:700; line-height:1; color:white; }
    .pass-rate-label { font-size:12px; opacity:0.9; margin-top:5px; color:white; }
    .stats-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
    .stat-box { text-align:center; padding:15px 10px; border-radius:6px; border:1px solid #e5e7eb; }
    .stat-box.passed { background:#dcfce7 !important; border-color:#86efac !important; }
    .stat-box.failed { background:#fee2e2 !important; border-color:#fca5a5 !important; }
    .stat-box.blocked { background:#f3f4f6 !important; border-color:#d1d5db !important; }
    .stat-box.retest { background:#fef3c7 !important; border-color:#fde047 !important; }
    .stat-box.untested { background:#e5e7eb !important; border-color:#d1d5db !important; }
    .stat-number { font-size:28px; font-weight:700; margin-bottom:4px; }
    .stat-box.passed .stat-number { color:#166534 !important; }
    .stat-box.failed .stat-number { color:#991b1b !important; }
    .stat-box.blocked .stat-number { color:#374151 !important; }
    .stat-box.retest .stat-number { color:#92400e !important; }
    .stat-box.untested .stat-number { color:#6b7280 !important; }
    .stat-label { font-size:10px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px; }
    .status-badge { display:inline-block; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:600; text-transform:uppercase; }
    .status-passed { background:#dcfce7 !important; color:#166534 !important; }
    .status-failed { background:#fee2e2 !important; color:#991b1b !important; }
    .status-blocked { background:#f3f4f6 !important; color:#374151 !important; }
    .status-retest { background:#fef3c7 !important; color:#92400e !important; }
    .status-untested { background:#e5e7eb !important; color:#6b7280 !important; }
    .status-completed { background:#dcfce7 !important; color:#166534 !important; }
    .status-in-progress { background:#d1fae5 !important; color:#065f46 !important; }
    .status-paused { background:#fef3c7 !important; color:#92400e !important; }
    .status-new { background:#e0f2fe !important; color:#0369a1 !important; }
    .priority-high { color:#dc2626 !important; font-weight:600; }
    .priority-medium { color:#f59e0b !important; font-weight:600; }
    .priority-low { color:#6b7280 !important; font-weight:600; }
    .tc-block { margin:0 0 16px 20px; border-left:3px solid #e5e7eb; padding-left:12px; page-break-inside:avoid; }
    .tc-title { font-size:12px; font-weight:600; color:#111; margin-bottom:6px; display:flex; align-items:center; gap:8px; }
    .tc-section-label { font-size:10px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin:8px 0 4px 0; }
    .result-item { background:#f9fafb !important; border:1px solid #e5e7eb; border-radius:5px; padding:8px 10px; margin-bottom:6px; }
    .result-meta { font-size:10px; color:#888; margin-top:4px; }
    .comment-item { background:#f0fdf4 !important; border:1px solid #bbf7d0; border-radius:5px; padding:8px 10px; margin-bottom:6px; }
    .issue-badge { display:inline-block; background:#fee2e2 !important; color:#991b1b !important; border:1px solid #fca5a5; border-radius:4px; padding:2px 8px; font-size:10px; font-weight:600; margin-right:4px; margin-bottom:4px; }
    .no-data { font-size:11px; color:#aaa; font-style:italic; }
    .footer { margin-top:40px; padding-top:20px; border-top:1px solid #e5e7eb; text-align:center; color:#999; font-size:11px; }
    @media print { body { padding:20px; } * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${project?.name || 'Test Report'}</h1>
    <div class="subtitle">${milestone.name} — Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
  </div>

  <div class="section">
    <div class="section-title">Milestone Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Milestone Name</div>
        <div class="info-value">${milestone.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Project</div>
        <div class="info-value">${project?.name || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Duration</div>
        <div class="info-value">${fmtDate(milestone.start_date)} — ${fmtDate(milestone.end_date)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value">${milestone.status === 'completed' ? 'Completed' : 'Active'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Test Results Summary</div>
    <div class="summary-container">
      <div class="summary-left">
        <div class="pass-rate-circle">
          <div class="pass-rate-number">${passRate}%</div>
          <div class="pass-rate-label">Pass Rate</div>
        </div>
      </div>
      <div class="summary-right">
        <div class="stats-grid">
          <div class="stat-box passed"><div class="stat-number">${totalPassed}</div><div class="stat-label">Passed</div></div>
          <div class="stat-box failed"><div class="stat-number">${totalFailed}</div><div class="stat-label">Failed</div></div>
          <div class="stat-box blocked"><div class="stat-number">${totalBlocked}</div><div class="stat-label">Blocked</div></div>
          <div class="stat-box retest"><div class="stat-number">${totalRetest}</div><div class="stat-label">Retest</div></div>
          <div class="stat-box untested"><div class="stat-number">${totalUntested}</div><div class="stat-label">Untested</div></div>
        </div>
        <div style="margin-top:20px;padding:15px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:11px;color:#666;font-weight:500;">Total Test Cases</span>
            <span style="font-size:14px;font-weight:700;color:#333;">${totalTests}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:11px;color:#666;font-weight:500;">Total Test Runs</span>
            <span style="font-size:14px;font-weight:700;color:#333;">${runs.length}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Test Runs &amp; Cases — Results, Comments, Issues (${runs.length} runs)</div>
    ${runsSectionHtml}
  </div>

  <div class="footer">
    <p><strong>Testably</strong> — Test Management Platform</p>
    <p style="margin-top:5px;font-size:10px;">This report was automatically generated on ${new Date().toLocaleString('en-US')}</p>
  </div>

  <script>
    window.onload = function() { setTimeout(function(){ window.print(); }, 500); };
  </script>
</body>
</html>`;

      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onbeforeunload = () => { URL.revokeObjectURL(url); };
      } else {
        showToast('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.', 'warning');
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('PDF 생성에 실패했습니다.', 'error');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleExportPdfClick = (e: React.MouseEvent, milestone: Milestone, runs: TestRun[]) => {
    e.stopPropagation();
    const tier = userProfile?.subscription_tier || 1;
    if (tier < 2) {
      setShowUpgradeModal(true);
    } else {
      generateMilestonePdf(milestone, runs);
    }
  };

  // userProfile: 10분 캐시 (페이지 간 공유, supabase.auth 재호출 방지)
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, subscription_tier, avatar_emoji')
        .eq('id', user.id)
        .maybeSingle();
      return {
        full_name: profile?.full_name || user.email?.split('@')[0] || 'User',
        email: profile?.email || user.email || '',
        subscription_tier: profile?.subscription_tier || 1,
        avatar_emoji: profile?.avatar_emoji || '',
      };
    },
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (!id || id === 'undefined') {
      navigate('/projects');
      return;
    }
    fetchData();
    // activeTab을 deps에서 제거: fetchData는 탭과 무관하게 전체 runs를 fetch하므로
    // activeTab 변경 시 re-fetch 불필요 (클라이언트 사이드 필터링)
  }, [id]);

  const fetchUserProfileLegacy = async () => {
    // userProfile은 이제 React Query로 관리됨 (위의 useQuery 참조)
    // 이 함수는 호환성을 위해 유지하지만 실제로 호출되지 않음
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, subscription_tier, avatar_emoji')
          .eq('id', user.id)
          .maybeSingle();

        setUserProfile({
          full_name: profile?.full_name || user.email?.split('@')[0] || 'User',
          email: profile?.email || user.email || '',
          subscription_tier: profile?.subscription_tier || 1,
          avatar_emoji: profile?.avatar_emoji || '',
        });
      }
    } catch (error) {
      console.error('프로필 로딩 오류:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getTierInfo = (tier: number) => {
    switch (tier) {
      case 2:
        return { name: 'Starter', icon: 'ri-vip-crown-line', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' };
      case 3:
        return { name: 'Professional', icon: 'ri-vip-diamond-line', color: 'bg-violet-50 text-violet-700 border-violet-300' };
      case 4:
        return { name: 'Enterprise', icon: 'ri-vip-diamond-line', color: 'bg-amber-50 text-amber-700 border-amber-300' };
      default:
        return { name: 'Free', icon: 'ri-user-line', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const tierInfo = getTierInfo(userProfile?.subscription_tier || 1);

  const fetchData = async () => {
    if (!id || id === 'undefined') return;
    try {
      setLoading(true);

      // 독립적인 쿼리 5개를 병렬로 실행 (순차 실행 대비 ~4배 빠름)
      const [
        { data: projectData, error: projectError },
        { data: milestonesData, error: milestonesError },
        { data: testCasesData, error: testCasesError },
        { data: foldersData },
        { data: testRunsData, error: testRunsError },
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('milestones').select('*').eq('project_id', id).order('created_at', { ascending: false }),
        supabase.from('test_cases').select('id, title, folder, priority, status, tags, description, lifecycle_status, custom_id').eq('project_id', id).order('created_at', { ascending: true }),
        supabase.from('folders').select('id, name, icon, color').eq('project_id', id).order('created_at', { ascending: true }),
        supabase.from('test_runs').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      ]);

      if (projectError) throw projectError;
      if (milestonesError) throw milestonesError;
      if (testCasesError) throw testCasesError;
      if (testRunsError) throw testRunsError;

      setProject(projectData);
      setMilestones(milestonesData || []);
      setTestCases(testCasesData || []);
      setFolderMetas((foldersData || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        icon: f.icon || 'ri-folder-line',
        color: f.color || 'indigo',
      })));

      const { data: testResultsData, error: testResultsError } = await supabase
        .from('test_results')
        .select('run_id, test_case_id, status, author, step_statuses')
        .in('run_id', (testRunsData || []).map(r => r.id))
        .order('created_at', { ascending: false });

      if (testResultsError) throw testResultsError;

      const uniqueAuthors = new Set<string>();
      testResultsData?.forEach(result => {
        if (result.author) {
          uniqueAuthors.add(result.author);
        }
      });

      if (uniqueAuthors.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', Array.from(uniqueAuthors));

        const contributorsList: Contributor[] = (profilesData || []).map((profile) => ({
          id: profile.id,
          name: profile.name || profile.email?.split('@')[0] || 'Unknown',
          email: profile.email || '',
        }));

        setContributors(contributorsList);
      } else {
        setContributors([]);
      }

      const runsWithStats = (testRunsData || []).map(run => {
        const runResults = testResultsData?.filter(r => r.run_id === run.id) || [];
        const statusMap = new Map<string, string>();
        
        runResults.forEach(result => {
          if (!statusMap.has(result.test_case_id)) {
            statusMap.set(result.test_case_id, result.status);
          }
        });

        let passed = 0;
        let failed = 0;
        let blocked = 0;
        let retest = 0;
        let untested = 0;

        run.test_case_ids.forEach((tcId: string) => {
          const status = statusMap.get(tcId) || 'untested';
          switch (status) {
            case 'passed':
              passed++;
              break;
            case 'failed':
              failed++;
              break;
            case 'blocked':
              blocked++;
              break;
            case 'retest':
              retest++;
              break;
            default:
              untested++;
          }
        });

        const totalTests = run.test_case_ids.length;
        const completedTests = passed + failed + blocked + retest;
        const progress = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

        return {
          ...run,
          passed,
          failed,
          blocked,
          retest,
          untested,
          progress,
        };
      });

      setTestRuns(runsWithStats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddRun = async () => {
    if (!formData.name.trim()) {
      showToast('Please enter a run name', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const testCaseIds = formData.include_all_cases 
        ? testCases.map(tc => tc.id)
        : selectedTestCases;

      const { data: { user } } = await supabase.auth.getUser();

      if (editingRunId) {
        const prevRun = testRuns.find(r => r.id === editingRunId);
        const { error } = await supabase
          .from('test_runs')
          .update({
            name: formData.name,
            ...(formData.description !== undefined ? { description: formData.description.trim() || null } : {}),
            milestone_id: formData.milestone_id && formData.milestone_id.trim() !== '' ? formData.milestone_id : null,
            status: formData.status,
            tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
            test_case_ids: testCaseIds,
            is_automated: formData.is_ci_cd_run,
          })
          .eq('id', editingRunId);

        if (error) throw error;

        // Notify when run is completed
        if (formData.status === 'completed' && prevRun?.status !== 'completed') {
          await notifyProjectMembers({
            projectId: id!,
            excludeUserId: user?.id,
            type: 'run_completed',
            title: '테스트 런이 완료되었습니다',
            message: `"${formData.name}" 런이 완료되었습니다.`,
            link: `/projects/${id}/runs/${editingRunId}`,
          });
          const prevRunData = testRuns.find(r => r.id === editingRunId);
          triggerWebhook(id!, 'run_completed', {
            project_id: id!,
            project_name: project?.name ?? '',
            run_id: editingRunId,
            run_name: formData.name,
            passed: prevRunData?.passed ?? 0,
            failed: prevRunData?.failed ?? 0,
            total: (prevRunData?.passed ?? 0) + (prevRunData?.failed ?? 0) + (prevRunData?.blocked ?? 0) + (prevRunData?.retest ?? 0) + (prevRunData?.untested ?? 0),
          });
        }
      } else {
        const newRun = {
          project_id: id,
          milestone_id: formData.milestone_id && formData.milestone_id.trim() !== '' ? formData.milestone_id : null,
          name: formData.name,
          ...(formData.description !== undefined ? { description: formData.description.trim() || null } : {}),
          status: formData.status,
          progress: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          retest: 0,
          untested: testCaseIds.length,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
          assignees: runAssignees.length > 0 ? runAssignees : (user?.id ? [user.id] : []),
          test_case_ids: testCaseIds,
          executed_at: new Date().toISOString(),
          is_automated: formData.is_ci_cd_run,
        };

        const { data: insertedData, error } = await supabase
          .from('test_runs')
          .insert([newRun])
          .select();

        if (error) throw error;

        // Notify all project members when a new run is created
        await notifyProjectMembers({
          projectId: id!,
          excludeUserId: user?.id,
          type: 'run_created',
          title: '새 테스트 런이 생성되었습니다',
          message: `"${formData.name}" 런이 생성되었습니다. (${testCaseIds.length}개 테스트)`,
          link: `/projects/${id}/runs${insertedData?.[0]?.id ? `/${insertedData[0].id}` : ''}`,
        });
        triggerWebhook(id!, 'run_created', {
          project_id: id!,
          project_name: project?.name ?? '',
          run_id: insertedData?.[0]?.id ?? '',
          run_name: formData.name,
        });

        if (formData.status === 'completed') {
          await notifyProjectMembers({
            projectId: id!,
            excludeUserId: user?.id,
            type: 'run_completed',
            title: '테스트 런이 완료되었습니다',
            message: `"${formData.name}" 런이 완료되었습니다.`,
            link: `/projects/${id}/runs`,
          });
          triggerWebhook(id!, 'run_completed', {
            project_id: id!,
            project_name: project?.name ?? '',
            run_id: insertedData?.[0]?.id ?? '',
            run_name: formData.name,
            passed: 0,
            failed: 0,
            total: testCaseIds.length,
          });
        }
      }

      await fetchData();
      
      setFormData({
        name: '',
        description: '',
        milestone_id: '',
        status: 'new',
        tags: '',
        include_all_cases: true,
        is_ci_cd_run: false,
      });
      setSelectedTestCases([]);
      setEditingRunId(null);
      setShowAddRunModal(false);
      setAddRunStep(1);
      setRunAssignees([]);
      setIncludeDraftTCs(false);
      setShowDraftWarningDismissed(false);
    } catch (error) {
      console.error('Error saving test run:', error);
      showToast('Failed to save test run. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTestCase = (testCaseId: string) => {
    setSelectedTestCases(prev => 
      prev.includes(testCaseId)
        ? prev.filter(id => id !== testCaseId)
        : [...prev, testCaseId]
    );
  };

  const toggleAllTestCases = () => {
    if (selectedTestCases.length === testCases.length) {
      setSelectedTestCases([]);
    } else {
      setSelectedTestCases(testCases.map(tc => tc.id));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getMilestoneStatus = (milestone: Milestone) => {
    const now = new Date();
    const endDate = new Date(milestone.end_date);
    
    if (milestone.status === 'completed') {
      return { label: 'Completed', className: 'bg-gray-100 text-gray-700' };
    }
    
    if (endDate < now) {
      return { label: 'Past due', className: 'bg-orange-100 text-orange-700' };
    }
    
    return { label: 'Started', className: 'bg-green-100 text-green-700' };
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      new: { label: 'New', className: 'bg-yellow-100 text-yellow-700' },
      in_progress: { label: 'In progress', className: 'bg-indigo-100 text-indigo-700' },
      paused: { label: 'Paused', className: 'bg-amber-100 text-amber-700' },
      under_review: { label: 'Under review', className: 'bg-purple-100 text-purple-700' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
    };
    return badges[status] || badges.new;
  };

  const getRunsByMilestone = (milestoneId: string) => {
    return testRuns.filter(run => {
      const runMilestoneId = run.milestone_id ? String(run.milestone_id).trim() : null;
      const milestoneMatch = runMilestoneId === String(milestoneId).trim();
      const statusMatch = activeTab === 'active'
        ? run.status !== 'completed'
        : run.status === 'completed';
      return milestoneMatch && statusMatch;
    });
  };

  const getRunsWithoutMilestone = () => {
    return testRuns.filter(run => {
      const statusMatch = activeTab === 'active'
        ? run.status !== 'completed'
        : run.status === 'completed';
      return !run.milestone_id && statusMatch;
    });
  };

  // ─── Priority helpers ────────────────────────────────────────────
  type RunPriority = 'critical' | 'high' | 'medium' | 'low';
  const PRIORITY_ORDER: RunPriority[] = ['critical', 'high', 'medium', 'low'];
  const PRIORITY_CONFIG: Record<RunPriority, { label: string; dotColor: string; badgeClass: string; icon: string }> = {
    critical: { label: 'Critical', dotColor: '#EF4444', badgeClass: 'bg-red-50 text-red-700', icon: 'ri-alarm-warning-fill' },
    high:     { label: 'High',     dotColor: '#F59E0B', badgeClass: 'bg-amber-50 text-amber-700', icon: 'ri-arrow-up-line' },
    medium:   { label: 'Medium',   dotColor: '#3B82F6', badgeClass: 'bg-blue-50 text-blue-700', icon: 'ri-subtract-line' },
    low:      { label: 'Low',      dotColor: '#22C55E', badgeClass: 'bg-green-50 text-green-700', icon: 'ri-arrow-down-line' },
  };

  const getRunPriority = (run: TestRun): RunPriority => {
    if ((run as any).priority_override) return (run as any).priority_override as RunPriority;
    const milestone = milestones.find(m => m.id === run.milestone_id);
    if (!milestone?.end_date) return 'low';
    const daysUntilDue = Math.ceil((new Date(milestone.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 3) return 'critical';
    if (daysUntilDue <= 7) return 'high';
    if (daysUntilDue <= 14) return 'medium';
    return 'low';
  };

  const getFilteredRuns = (): TestRun[] => {
    return testRuns.filter(run => {
      const tabMatch =
        activeTab === 'all' ? true
        : activeTab === 'active' ? ['new', 'in_progress', 'paused', 'under_review'].includes(run.status)
        : activeTab === 'completed' ? run.status === 'completed'
        : activeTab === 'failed' ? run.status === 'completed' && run.failed > 0
        : true;
      const searchMatch = !searchQuery.trim() || run.name.toLowerCase().includes(searchQuery.toLowerCase());
      const msMatch = !milestoneFilter || run.milestone_id === milestoneFilter;
      return tabMatch && searchMatch && msMatch;
    });
  };

  const getSortedRuns = (runs: TestRun[]): TestRun[] => {
    return [...runs].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'progress') return b.progress - a.progress;
      if (sortBy === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      // priority: sort by priority then milestone due date
      const pa = PRIORITY_ORDER.indexOf(getRunPriority(a));
      const pb = PRIORITY_ORDER.indexOf(getRunPriority(b));
      if (pa !== pb) return pa - pb;
      const ma = milestones.find(m => m.id === a.milestone_id);
      const mb = milestones.find(m => m.id === b.milestone_id);
      const da = ma?.end_date ? new Date(ma.end_date).getTime() : Infinity;
      const db = mb?.end_date ? new Date(mb.end_date).getTime() : Infinity;
      return da - db;
    });
  };

  const getCalculateStats = () => {
    const activeRuns = testRuns.filter(run => ['new', 'in_progress', 'paused', 'under_review'].includes(run.status)).length;
    const totalRuns = testRuns.length;
    const totalTests = testRuns.reduce((sum, run) => sum + run.passed + run.failed + run.blocked + run.retest + run.untested, 0);
    const passedTests = testRuns.reduce((sum, run) => sum + run.passed, 0);
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    // Avg duration: use executed_at - created_at for completed runs
    const completedWithDates = testRuns.filter(r => r.status === 'completed' && r.executed_at && r.created_at);
    const avgDurationMs = completedWithDates.length > 0
      ? completedWithDates.reduce((sum, r) => sum + (new Date(r.executed_at).getTime() - new Date(r.created_at).getTime()), 0) / completedWithDates.length
      : 0;
    const avgDurationMin = Math.round(avgDurationMs / 60000);
    const avgDurationH = Math.floor(avgDurationMin / 60);
    const avgDurationM = avgDurationMin % 60;
    const avgDurationStr = avgDurationMin > 0 ? (avgDurationH > 0 ? `${avgDurationH}h ${avgDurationM}m` : `${avgDurationM}m`) : '—';
    return { activeRuns, totalRuns, passRate, avgDurationStr };
  };

  const calculateStats = () => {
    const activeRuns = testRuns.filter(run => run.status !== 'completed').length;
    const totalTests = testRuns.reduce((sum, run) => sum + run.passed + run.failed + run.blocked + run.retest + run.untested, 0);
    const passedTests = testRuns.reduce((sum, run) => sum + run.passed, 0);
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    const closedRuns = testRuns.filter(run => run.status === 'completed').length;

    const runDates = testRuns
      .filter(run => run.created_at)
      .map(run => new Date(run.created_at));
    
    let dateRangeText = 'No data yet';
    if (runDates.length > 0) {
      const minDate = new Date(Math.min(...runDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...runDates.map(d => d.getTime())));
      
      const formatDateShort = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };
      
      if (minDate.getTime() === maxDate.getTime()) {
        dateRangeText = formatDateShort(minDate);
      } else {
        dateRangeText = `${formatDateShort(minDate)} - ${formatDateShort(maxDate)}`;
      }
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const closedThisMonth = testRuns.filter(run => {
      if (run.status !== 'completed') return false;
      const runDate = new Date(run.created_at);
      return runDate >= thisMonthStart;
    }).length;

    return { activeRuns, successRate, closedRuns, dateRangeText, closedThisMonth };
  };

  const stats = calculateStats();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
      if (milestoneDropdownRef.current && !milestoneDropdownRef.current.contains(event.target as Node)) {
        setShowMilestoneDropdown(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDeleteRun = async (runId: string) => {
    if (!confirm('이 테스트 런을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('test_runs')
        .delete()
        .eq('id', runId);

      if (error) throw error;

      await fetchData();
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error deleting test run:', error);
      showToast('테스트 런 삭제에 실패했습니다.', 'error');
    }
  };

  const handlePauseResumeRun = async (run: TestRun) => {
    const newStatus = run.status === 'in_progress' ? 'paused' : 'in_progress';
    
    try {
      const { error } = await supabase
        .from('test_runs')
        .update({ status: newStatus })
        .eq('id', run.id);

      if (error) throw error;

      await fetchData();
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error updating test run status:', error);
      showToast('상태 변경에 실패했습니다.', 'error');
    }
  };

  const handleEditRun = (run: TestRun) => {
    setEditingRunId(run.id);
    setFormData({
      name: run.name,
      description: (run as any).description || '',
      milestone_id: run.milestone_id || '',
      status: run.status,
      tags: run.tags ? run.tags.join(', ') : '',
      include_all_cases: run.test_case_ids.length === testCases.length,
      is_ci_cd_run: run.is_automated || false,
    });
    setSelectedTestCases(run.test_case_ids);
    setShowAddRunModal(true);
    setOpenMenuId(null);
  };

  const getFolders = () => {
    const folders = new Map<string, number>();
    testCases.forEach(tc => {
      const folder = tc.folder || 'Uncategorized';
      folders.set(folder, (folders.get(folder) || 0) + 1);
    });
    return Array.from(folders.entries()).map(([name, count]) => ({ name, count }));
  };

  const getTestCasesByFolder = (folderName: string | null) => {
    if (!folderName) return testCases;
    if (folderName === 'Uncategorized') {
      return testCases.filter(tc => !tc.folder);
    }
    return testCases.filter(tc => tc.folder === folderName);
  };

  const folders = getFolders();
  const displayedTestCases = selectedFolder ? getTestCasesByFolder(selectedFolder) : testCases;
  
  const filteredTestCases = testCases.filter(tc => {
    const matchesFolder = selectedFolder === null
      ? true
      : selectedFolder === 'Uncategorized'
      ? !tc.folder
      : tc.folder === selectedFolder;

    const matchesSearch = tc.title.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
      (tc.description && tc.description.toLowerCase().includes(caseSearchQuery.toLowerCase()));
    
    const matchesPriority = priorityFilters.length === 0 || priorityFilters.some(p => p.toLowerCase() === tc.priority.toLowerCase());
    
    const matchesTags = tagFilters.length === 0 || (tc.tags && tagFilters.some(tag => tc.tags!.includes(tag)));
    
    return matchesFolder && matchesSearch && matchesPriority && matchesTags;
  });

  const handlePriorityFilterChange = (priority: string) => {
    setPriorityFilters(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const handleTagFilterChange = (tag: string) => {
    setPriorityFilters(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleTagFilterToggle = (tag: string) => {
    setTagFilters(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const removeTagFilter = (tag: string) => {
    setTagFilters(prev => prev.filter(t => t !== tag));
  };

  const clearAllFilters = () => {
    setSelectedTestCases([]);
    setPriorityFilters([]);
    setTagFilters([]);
    setCaseSearchQuery('');
  };

  const selectedInFolder = filteredTestCases.filter(tc => selectedTestCases.includes(tc.id)).length;

  const getAllTags = () => {
    const tagsSet = new Set<string>();
    testCases.forEach(tc => {
      if (tc.tags) {
        if (typeof tc.tags === 'string') {
          tc.tags.split(',').forEach((tag: string) => {
            const trimmedTag = tag.trim();
            if (trimmedTag) {
              tagsSet.add(trimmedTag);
            }
          });
        } else if (Array.isArray(tc.tags)) {
          tc.tags.forEach((tag: string) => {
            const trimmedTag = tag.trim();
            if (trimmedTag) {
              tagsSet.add(trimmedTag);
            }
          });
        }
      }
    });
    return Array.from(tagsSet).sort();
  };

  const allTags = getAllTags();

  const renderRunCard = (run: TestRun, priority: RunPriority) => {
    const total = run.passed + run.failed + run.blocked + run.retest + run.untested;
    const passedPct = total > 0 ? (run.passed / total) * 100 : 0;
    const failedPct = total > 0 ? (run.failed / total) * 100 : 0;
    const blockedPct = total > 0 ? (run.blocked / total) * 100 : 0;
    const retestPct = total > 0 ? (run.retest / total) * 100 : 0;
    const milestone = milestones.find(m => m.id === run.milestone_id);
    const pConfig = PRIORITY_CONFIG[priority];
    const isInProgress = run.status === 'in_progress';
    const isCompleted = run.status === 'completed';
    const hasManualOverride = !!(run as any).priority_override;
    return (
      <div
        key={run.id}
        className="bg-white border border-[#E2E8F0] rounded-xl p-4 cursor-pointer hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] hover:border-[#CBD5E1] transition-all"
        onClick={() => handleRunClick(run.id)}
      >
        {/* Row 1: Name + Status Badge + Priority Badge + ⋯ menu */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-semibold text-[0.9375rem] text-[#0F172A] hover:text-indigo-600 transition-colors truncate min-w-0">{run.name}</span>
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[0.6875rem] font-semibold rounded-full ${getStatusBadge(run.status).className}`}>
            {isInProgress && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block"></span>}
            {getStatusBadge(run.status).label}
          </span>
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[0.6875rem] font-semibold rounded-full ${pConfig.badgeClass}`}>
            <i className={`${pConfig.icon} text-[0.625rem]`}></i>
            {pConfig.label}
            {hasManualOverride && <i className="ri-pushpin-fill text-[0.5625rem] ml-0.5 opacity-60"></i>}
          </span>
          {run.is_automated && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0F9FF] text-[#0284C7] rounded-full text-[0.6875rem] font-semibold">
              <i className="ri-robot-line text-[0.6875rem]"></i>Auto
            </span>
          )}
          <div className="ml-auto relative flex-shrink-0" ref={openMenuId === run.id ? menuRef : null}>
            <button
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === run.id ? null : run.id); }}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded cursor-pointer"
            >
              <i className="ri-more-2-fill"></i>
            </button>
            {openMenuId === run.id && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button onClick={(e) => { e.stopPropagation(); handleEditRun(run); }} className="w-full text-left px-3.5 py-[7px] text-[0.8125rem] text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                  <i className="ri-edit-line"></i><span>Edit</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handlePauseResumeRun(run); }} className="w-full text-left px-3.5 py-[7px] text-[0.8125rem] text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                  <i className={run.status === 'in_progress' ? 'ri-pause-line' : 'ri-play-line'}></i>
                  <span>{run.status === 'in_progress' ? 'Pause' : 'Resume'}</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteRun(run.id); }} className="w-full text-left px-3.5 py-[7px] text-[0.8125rem] text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-t border-gray-200">
                  <i className="ri-delete-bin-line"></i><span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Row 2: Milestone + Due date */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <i className="ri-flag-line text-[0.8125rem] text-[#94A3B8]"></i>
          {milestone ? (
            <>
              <span className="text-[0.75rem] text-[#64748B]">{milestone.name}</span>
              {milestone.end_date && (
                <span className="text-[0.75rem] text-[#94A3B8]">· Due {new Date(milestone.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              )}
            </>
          ) : (
            <span className="text-[0.75rem] text-[#CBD5E1] italic">No Milestone</span>
          )}
        </div>
        {/* Row 3: Progress bar */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-[6px] bg-[#F1F5F9] rounded-full overflow-hidden flex gap-px">
            {run.passed > 0 && <div className="h-full bg-[#22C55E] transition-all" style={{ width: `${passedPct}%` }}></div>}
            {run.failed > 0 && <div className="h-full bg-[#EF4444] transition-all" style={{ width: `${failedPct}%` }}></div>}
            {run.blocked > 0 && <div className="h-full bg-[#94A3B8] transition-all" style={{ width: `${blockedPct}%` }}></div>}
            {run.retest > 0 && <div className="h-full bg-[#FACC15] transition-all" style={{ width: `${retestPct}%` }}></div>}
          </div>
          <span className="text-[0.8125rem] font-semibold text-[#0F172A] min-w-[2.5rem] text-right">{run.progress}%</span>
        </div>
        {/* Row 4: Stats */}
        <div className="flex items-center gap-3.5 text-[0.75rem] text-[#64748B] mb-2.5">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block"></span>{run.passed} passed</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] inline-block"></span>{run.failed} failed</span>
          {run.blocked > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] inline-block"></span>{run.blocked} blocked</span>}
          {run.retest > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] inline-block"></span>{run.retest} retest</span>}
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#E2E8F0] inline-block"></span>{run.untested} untested</span>
        </div>
        {/* Row 5: Assignees + Continue/Start button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.75rem] text-[#64748B]">
            <span className="text-[#94A3B8]">Assigned to</span>
            <div className="flex gap-1">
              {run.assignees && run.assignees.slice(0, 3).map((assignee) => (
                <Avatar key={assignee} userId={assignee} name={assignee} size="sm" title={assignee} />
              ))}
            </div>
            {run.created_at && (
              <>
                <span className="text-[#CBD5E1]">·</span>
                <span>{new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </>
            )}
          </div>
          {isCompleted ? (
            <button
              onClick={(e) => { e.stopPropagation(); handleRunClick(run.id); }}
              className="text-[0.75rem] font-medium text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              View Report →
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleRunClick(run.id); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[0.75rem] font-semibold text-white shadow-sm cursor-pointer transition-all hover:opacity-90 hover:-translate-y-px ${isInProgress ? 'bg-[#6366F1]' : 'bg-[#22C55E]'}`}
            >
              <i className="ri-play-line text-[0.75rem]"></i>
              {isInProgress ? 'Continue' : 'Start'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-white">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader projectId={id || ''} projectName={project?.name || ''} />
        
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* ── Subtab row: lifecycle tabs + action button ── */}
          <div className="flex items-center border-b border-[#E2E8F0] bg-white flex-shrink-0 h-[2.625rem] px-5">
            {([
              { key: 'all' as const, label: 'All', icon: 'ri-list-check-3', iconColor: '#6366F1', count: testRuns.length },
              { key: 'active' as const, label: 'Active', icon: 'ri-play-circle-fill', iconColor: '#3B82F6', count: testRuns.filter(r => ['new','in_progress','paused','under_review'].includes(r.status)).length },
              { key: 'completed' as const, label: 'Completed', icon: 'ri-checkbox-circle-fill', iconColor: '#22C55E', count: testRuns.filter(r => r.status === 'completed').length },
              { key: 'failed' as const, label: 'Failed', icon: 'ri-close-circle-fill', iconColor: '#EF4444', count: testRuns.filter(r => r.status === 'completed' && r.failed > 0).length },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-[0.3125rem] px-[0.75rem] h-full text-[0.8125rem] font-medium border-b-[2.5px] transition-colors cursor-pointer bg-transparent border-l-0 border-r-0 border-t-0 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-[#6366F1] border-[#6366F1] font-semibold'
                    : 'text-[#64748B] border-transparent hover:text-[#475569]'
                }`}
              >
                <i className={`${tab.icon} text-[0.875rem]`} style={{ color: tab.iconColor }}></i>
                {tab.label}
                <span className={`text-[0.625rem] px-[0.375rem] py-[0.0625rem] rounded-full font-bold min-w-[1.25rem] text-center ${activeTab === tab.key ? 'bg-[#EEF2FF] text-[#6366F1]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => {
                setEditingRunId(null);
                setFormData({
                  name: '',
                  configuration: '',
                  milestone_id: '',
                  status: 'new',
                  issues: '',
                  tags: '',
                  include_all_cases: true,
                  is_ci_cd_run: false,
                });
                setSelectedTestCases([]);
                setShowAddRunModal(true);
              }}
              className="flex items-center gap-[0.3125rem] px-[0.875rem] py-[0.375rem] bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-[0.375rem] hover:opacity-90 transition-opacity font-semibold text-[0.8125rem] cursor-pointer whitespace-nowrap"
              style={{ boxShadow: '0 1px 3px rgba(99,102,241,0.3)' }}
            >
              <i className="ri-play-circle-line text-sm" />
              Start New Run
            </button>
          </div>

          {/* ── Compact Stats Bar (40px, fixed) ── */}
          {(() => {
            const cs = getCalculateStats();
            return (
              <div className="flex items-center bg-white border-b border-[#E2E8F0] flex-shrink-0 h-10 px-5 gap-6">
                <div className="flex items-center gap-2 pr-6 border-r border-[#E2E8F0]">
                  <i className="ri-play-circle-line text-base text-[#3B82F6]"></i>
                  <span className="text-[0.75rem] text-[#94A3B8]">Active Runs</span>
                  <span className="text-[0.8125rem] font-bold text-[#0F172A]">{cs.activeRuns}</span>
                  <span className="text-[0.75rem] text-[#64748B]">of {cs.totalRuns}</span>
                </div>
                <div className="flex items-center gap-2 pr-6 border-r border-[#E2E8F0]">
                  <i className="ri-checkbox-circle-line text-base text-[#22C55E]"></i>
                  <span className="text-[0.75rem] text-[#94A3B8]">Pass Rate</span>
                  <span className="text-[0.8125rem] font-bold text-[#0F172A]">{cs.passRate}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="ri-time-line text-base text-[#8B5CF6]"></i>
                  <span className="text-[0.75rem] text-[#94A3B8]">Avg Duration</span>
                  <span className="text-[0.8125rem] font-bold text-[#0F172A]">{cs.avgDurationStr}</span>
                </div>
              </div>
            );
          })()}

          {/* ── Toolbar ── */}
          <div className="flex items-center bg-white border-b border-[#E2E8F0] flex-shrink-0 h-11 px-5 gap-3">
            <div className="flex-1 relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search runs..."
                className="w-full pl-9 pr-3 py-[0.3125rem] bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[0.8125rem] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            <div className="relative" ref={milestoneDropdownRef}>
              <button
                onClick={() => setShowMilestoneDropdown(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-[0.3125rem] border rounded-md text-[0.8125rem] cursor-pointer whitespace-nowrap transition-colors ${milestoneFilter ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}
              >
                <i className="ri-flag-line text-sm"></i>
                {milestoneFilter ? (milestones.find(m => m.id === milestoneFilter)?.name || 'Milestone') : 'Milestone'}
                {milestoneFilter ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setMilestoneFilter(''); }} className="ml-0.5 text-indigo-400 hover:text-indigo-700"><i className="ri-close-line text-xs"></i></button>
                ) : (
                  <i className="ri-arrow-down-s-line text-xs text-[#94A3B8]"></i>
                )}
              </button>
              {showMilestoneDropdown && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-lg border border-[#E2E8F0] shadow-lg z-30 py-1 min-w-[180px]">
                  <button onClick={() => { setMilestoneFilter(''); setShowMilestoneDropdown(false); }} className="w-full text-left px-3 py-2 text-[0.8125rem] text-[#475569] hover:bg-[#F8FAFC]">All Milestones</button>
                  {milestones.map(m => (
                    <button key={m.id} onClick={() => { setMilestoneFilter(m.id); setShowMilestoneDropdown(false); }} className={`w-full text-left px-3 py-2 text-[0.8125rem] hover:bg-indigo-50 ${milestoneFilter === m.id ? 'text-indigo-600 font-medium' : 'text-[#475569]'}`}>{m.name}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu(p => !p)}
                className="flex items-center gap-1.5 px-3 py-[0.3125rem] border border-[#E2E8F0] bg-white text-[#475569] rounded-md text-[0.8125rem] cursor-pointer whitespace-nowrap hover:bg-[#F8FAFC] transition-colors"
              >
                <i className="ri-sort-desc text-sm"></i>
                Sort
                <i className="ri-arrow-down-s-line text-xs text-[#94A3B8]"></i>
              </button>
              {showSortMenu && (
                <div className="absolute top-full mt-1 right-0 bg-white rounded-lg border border-[#E2E8F0] shadow-lg z-30 py-1 min-w-[160px]">
                  {([
                    { key: 'priority' as const, label: 'Priority' },
                    { key: 'created' as const, label: 'Created Date' },
                    { key: 'name' as const, label: 'Name' },
                    { key: 'progress' as const, label: 'Progress' },
                  ]).map(opt => (
                    <button key={opt.key} onClick={() => { setSortBy(opt.key); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2 text-[0.8125rem] hover:bg-indigo-50 flex items-center justify-between ${sortBy === opt.key ? 'text-indigo-600 font-medium' : 'text-[#475569]'}`}>
                      {opt.label}
                      {sortBy === opt.key && <i className="ri-check-line text-indigo-500"></i>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="p-5">
            {loading ? (
              <PageLoader />
            ) : (() => {
              const filteredRuns = getSortedRuns(getFilteredRuns());
              if (filteredRuns.length === 0) {
                return (
                  <div className="text-center py-16">
                    <i className="ri-play-circle-line text-5xl text-gray-200 mb-3 block"></i>
                    <p className="text-gray-500 text-sm">No runs found</p>
                    <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or create a new run</p>
                  </div>
                );
              }
              const useGroups = activeTab === 'all' || activeTab === 'active';
              if (useGroups) {
                const groups = PRIORITY_ORDER.map(p => ({ priority: p, runs: filteredRuns.filter(r => getRunPriority(r) === p) })).filter(g => g.runs.length > 0);
                return (
                  <div className="space-y-5">
                    {groups.map(({ priority, runs: groupRuns }) => {
                      const config = PRIORITY_CONFIG[priority];
                      const isCollapsed = collapsedGroups.has(priority);
                      return (
                        <div key={priority}>
                          <button
                            onClick={() => setCollapsedGroups(prev => { const s = new Set(prev); s.has(priority) ? s.delete(priority) : s.add(priority); return s; })}
                            className="flex items-center gap-2 w-full text-left mb-3"
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.dotColor }}></span>
                            <span className="text-[0.8125rem] font-semibold text-[#0F172A]">{config.label.toUpperCase()}</span>
                            <span className="w-5 h-5 bg-[#F1F5F9] text-[#64748B] rounded-full text-[0.6875rem] font-semibold flex items-center justify-center">{groupRuns.length}</span>
                            <span className="flex-1 h-px bg-[#E2E8F0] ml-1"></span>
                            <i className={`ri-arrow-down-s-line text-[#94A3B8] transition-transform ${isCollapsed ? '-rotate-90' : ''}`}></i>
                          </button>
                          {!isCollapsed && (
                            <div className="space-y-3">
                              {groupRuns.map(run => renderRunCard(run, priority))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              } else {
                const grouped = milestones
                  .map(m => ({ milestone: m, runs: filteredRuns.filter(r => r.milestone_id === m.id) }))
                  .filter(g => g.runs.length > 0);
                const unassigned = filteredRuns.filter(r => !r.milestone_id);
                return (
                  <div className="space-y-4">
                    {grouped.map(({ milestone, runs: mRuns }) => (
                      <div key={milestone.id} className="bg-white rounded-lg border border-[#E2E8F0]">
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 rounded-t-lg border-b border-[#E2E8F0]">
                          <div className="flex items-center gap-2">
                            <i className="ri-flag-line text-[#94A3B8] text-sm"></i>
                            <span className="font-semibold text-[0.875rem] text-[#0F172A]">{milestone.name}</span>
                            <span className="text-[0.6875rem] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{mRuns.length} runs</span>
                          </div>
                          <button
                            onClick={(e) => handleExportPdfClick(e, milestone, mRuns)}
                            disabled={generatingPdf === milestone.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-[0.75rem] font-medium cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            {generatingPdf === milestone.id ? <><i className="ri-loader-4-line animate-spin"></i> Generating...</> : <><i className="ri-file-pdf-line"></i> Export PDF</>}
                          </button>
                        </div>
                        <div className="p-4 space-y-3">
                          {mRuns.map(run => renderRunCard(run, getRunPriority(run)))}
                        </div>
                      </div>
                    ))}
                    {unassigned.length > 0 && (
                      <div className="space-y-3">
                        {unassigned.map(run => renderRunCard(run, getRunPriority(run)))}
                      </div>
                    )}
                  </div>
                );
              }
            })()}
          </div>
          {/* ── /scrollable content ── */}}
          </div>
        </main>
      </div>

      {showAddRunModal && (() => {
        // TC lists for step 2 (exclude deprecated always)
        const activeTCs = testCases.filter((tc: TestCase & { lifecycle_status?: string }) => (tc.lifecycle_status || 'active') === 'active');
        const draftTCs = testCases.filter((tc: TestCase & { lifecycle_status?: string }) => (tc.lifecycle_status || 'active') === 'draft');
        const baseTCs = includeDraftTCs ? [...activeTCs, ...draftTCs] : activeTCs;
        const visibleTCs = selectedCaseFolder
          ? baseTCs.filter(tc => selectedCaseFolder === '__none__' ? !tc.folder : tc.folder === selectedCaseFolder)
          : baseTCs;
        const selectedDraftIds = selectedTestCases.filter(id => draftTCs.some(tc => tc.id === id));
        const hasDraftSelected = selectedDraftIds.length > 0;

        const closeModal = () => {
          setShowAddRunModal(false);
          setEditingRunId(null);
          setAddRunStep(1);
          setRunAssignees([]);
          setIncludeDraftTCs(false);
          setShowDraftWarningDismissed(false);
          setTagInput('');
          setSelectedCaseFolder('');
          setRunNameError('');
        };

        return (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-start justify-center z-50 py-[3vh] overflow-y-auto">
            <div className={`bg-white rounded-xl shadow-2xl w-full overflow-hidden animate-fade-in ${addRunStep === 1 ? 'max-w-lg' : 'max-w-3xl'}`}>

              {/* ── Modal Header ── */}
              <div className="flex items-center justify-between px-[1.3125rem] py-[1rem] border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <i className="ri-play-circle-line text-indigo-500 text-lg" />
                  </div>
                  <span className="text-base font-bold text-gray-900">{editingRunId ? 'Edit Run' : 'Add Run'}</span>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100">
                  <i className="ri-close-line text-xl" />
                </button>
              </div>

              {/* ── Step Indicator ── */}
              <div className="flex border-b border-gray-100 px-6">
                {[{ n: 1, label: 'Configure' }, { n: 2, label: 'Select Cases' }].map(s => (
                  <button
                    key={s.n}
                    onClick={() => s.n < addRunStep ? setAddRunStep(s.n as 1 | 2) : undefined}
                    className={`flex items-center gap-1.5 py-3 mr-6 text-xs font-medium border-b-2 transition-colors ${
                      addRunStep === s.n ? 'text-indigo-600 border-indigo-500 font-semibold'
                      : s.n < addRunStep ? 'text-green-600 border-transparent'
                      : 'text-gray-400 border-transparent'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border-1.5 ${
                      addRunStep === s.n ? 'bg-indigo-500 text-white border-indigo-500'
                      : s.n < addRunStep ? 'bg-green-500 text-white border-green-500'
                      : 'border-gray-300 text-gray-400'
                    }`}>{s.n < addRunStep ? '✓' : s.n}</span>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* ═══════════════ STEP 1: Configure ═══════════════ */}
              {addRunStep === 1 && (
                <>
                  <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Run Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={e => { handleInputChange(e); if (runNameError) setRunNameError(''); }}
                        placeholder="e.g. Sprint 24 — Regression Run"
                        autoFocus
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm ${runNameError ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      {runNameError && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <i className="ri-error-warning-line" />{runNameError}
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Optional notes about this run's scope or goals"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none"
                      />
                    </div>

                    {/* Milestone */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Milestone</label>
                      <select
                        name="milestone_id"
                        value={formData.milestone_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, milestone_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm cursor-pointer"
                      >
                        <option value="">No milestone</option>
                        {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>

                    {/* Assignees multi-select */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Assignees</label>
                      <div className="flex flex-wrap gap-2">
                        {contributors.map(c => {
                          const selected = runAssignees.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setRunAssignees(prev => selected ? prev.filter(a => a !== c.id) : [...prev, c.id])}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                selected ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-200'
                              }`}
                            >
                              <Avatar userId={c.id} name={c.name} size="xs" />
                              {c.name}
                              {selected && <i className="ri-check-line text-indigo-500" />}
                            </button>
                          );
                        })}
                        {contributors.length === 0 && <span className="text-xs text-gray-400">No project members found</span>}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm cursor-pointer"
                      >
                        <option value="new">New</option>
                        <option value="in_progress">In Progress</option>
                        <option value="under_review">Under Review</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tags</label>
                      {formData.tags && formData.tags.split(',').map(t => t.trim()).filter(Boolean).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {formData.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">
                              {tag}
                              <button
                                type="button"
                                onClick={() => {
                                  const newTags = formData.tags.split(',').map(t => t.trim()).filter((_, idx) => idx !== i);
                                  setFormData(prev => ({ ...prev, tags: newTags.join(', ') }));
                                }}
                                className="ml-0.5 text-indigo-400 hover:text-indigo-700 cursor-pointer leading-none"
                              >×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && tagInput.trim()) {
                            e.preventDefault();
                            const tag = tagInput.trim();
                            const existing = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                            if (!existing.includes(tag)) {
                              setFormData(prev => ({ ...prev, tags: [...existing, tag].join(', ') }));
                            }
                            setTagInput('');
                          }
                        }}
                        placeholder="Type a tag and press Enter"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                      />
                    </div>

                    {/* CI/CD toggle */}
                    <div className="bg-purple-50 rounded-lg p-3.5 border border-purple-100">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_ci_cd_run}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_ci_cd_run: e.target.checked }))}
                          className="w-4 h-4 text-purple-600 cursor-pointer mt-0.5"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <i className="ri-robot-line text-purple-600 text-sm" />
                            <span className="text-xs font-semibold text-purple-900">CI/CD Run</span>
                          </div>
                          <p className="text-xs text-purple-700">Mark as automated for GitHub Actions / GitLab CI integration.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <button onClick={closeModal} className="px-[0.875rem] py-[0.4375rem] text-[0.8125rem] text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">Cancel</button>
                    <button
                      onClick={() => { if (!formData.name.trim()) { setRunNameError('Please enter a run name'); return; } setRunNameError(''); setAddRunStep(2); }}
                      className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold cursor-pointer flex items-center gap-2"
                    >
                      Next: Select Cases <i className="ri-arrow-right-line" />
                    </button>
                  </div>
                </>
              )}

              {/* ═══════════════ STEP 2: Select Cases ═══════════════ */}
              {addRunStep === 2 && (
                <>
                  {/* Filter bar */}
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
                    <div className="relative flex-1 min-w-[140px]">
                      <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                      <input
                        type="text"
                        value={caseSearchQuery}
                        onChange={e => setCaseSearchQuery(e.target.value)}
                        placeholder="Search test cases..."
                        className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    {/* Folder filter */}
                    {folderMetas.length > 0 && (
                      <select
                        value={selectedCaseFolder}
                        onChange={e => setSelectedCaseFolder(e.target.value)}
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer bg-white"
                      >
                        <option value="">All Folders</option>
                        {folderMetas.map(f => (
                          <option key={f.id} value={f.name}>{f.name}</option>
                        ))}
                        <option value="__none__">No Folder</option>
                      </select>
                    )}
                    {/* Draft toggle */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setIncludeDraftTCs(p => !p)}
                        className={`relative flex-shrink-0 cursor-pointer transition-colors duration-200 rounded-full overflow-hidden ${includeDraftTCs ? 'bg-indigo-600' : 'bg-gray-300'}`}
                        style={{ width: 42, height: 24 }}
                      >
                        <span
                          className="absolute top-[3px] left-0 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200"
                          style={{ transform: includeDraftTCs ? 'translateX(21px)' : 'translateX(3px)' }}
                        />
                      </button>
                      <span className="text-xs text-gray-600 font-medium whitespace-nowrap">Include Draft TCs</span>
                      {!includeDraftTCs && draftTCs.length > 0 && (
                        <span className="text-[10px] text-gray-400">{draftTCs.length} hidden</span>
                      )}
                    </div>
                  </div>

                  {/* TC count summary */}
                  <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                    {includeDraftTCs
                      ? `${activeTCs.length} Active + ${draftTCs.length} Draft TCs`
                      : `${activeTCs.length} Active TCs available`
                    }
                  </div>

                  {/* TC table */}
                  <div className="max-h-[42vh] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                        <tr>
                          <th className="px-5 py-2.5 w-9">
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                              checked={visibleTCs.length > 0 && visibleTCs.every(tc => selectedTestCases.includes(tc.id))}
                              onChange={() => {
                                const allSelected = visibleTCs.every(tc => selectedTestCases.includes(tc.id));
                                setSelectedTestCases(allSelected ? [] : visibleTCs.map(tc => tc.id));
                              }}
                            />
                          </th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Title</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {visibleTCs
                          .filter(tc => !caseSearchQuery || tc.title.toLowerCase().includes(caseSearchQuery.toLowerCase()))
                          .map((tc: TestCase & { lifecycle_status?: string }) => {
                            const lcStatus = tc.lifecycle_status || 'active';
                            return (
                              <tr
                                key={tc.id}
                                onClick={() => toggleTestCase(tc.id)}
                                className={`cursor-pointer transition-colors ${
                                  lcStatus === 'draft' ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-indigo-50/40'
                                }`}
                              >
                                <td className="px-5 py-2.5">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                                    checked={selectedTestCases.includes(tc.id)}
                                    onChange={() => {}}
                                  />
                                </td>
                                <td className="px-3 py-2.5 font-mono text-[0.8125rem] text-indigo-600 font-semibold whitespace-nowrap">{(tc as any).custom_id || '-'}</td>
                                <td className="px-3 py-2.5 text-xs font-medium text-gray-800">{tc.title}</td>
                                <td className="px-3 py-2.5">
                                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                                    lcStatus === 'draft' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-green-50 text-green-800 border-green-200'
                                  }`}>
                                    <i className={lcStatus === 'draft' ? 'ri-draft-line' : 'ri-checkbox-circle-line'} />
                                    {lcStatus.charAt(0).toUpperCase() + lcStatus.slice(1)}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                    tc.priority === 'critical' ? 'bg-red-100 text-red-700'
                                    : tc.priority === 'high' ? 'bg-amber-100 text-amber-700'
                                    : tc.priority === 'medium' ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-gray-100 text-gray-600'
                                  }`}>{tc.priority?.toUpperCase()}</span>
                                </td>
                              </tr>
                            );
                          })}
                        {visibleTCs.filter(tc => !caseSearchQuery || tc.title.toLowerCase().includes(caseSearchQuery.toLowerCase())).length === 0 && (
                          <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-gray-400">No test cases found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Draft Warning Banner */}
                  {hasDraftSelected && !showDraftWarningDismissed && (
                    <div className="flex items-start gap-2.5 mx-5 my-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <i className="ri-error-warning-line text-base mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Draft TCs included:</strong> {selectedDraftIds.length} draft TC(s) are selected and may be incomplete.
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={async () => {
                              // Convert selected drafts to active
                              const { data: { user } } = await supabase.auth.getUser();
                              await supabase.from('test_cases').update({ lifecycle_status: 'active' }).in('id', selectedDraftIds);
                              if (user) {
                                await supabase.from('test_case_history').insert(
                                  selectedDraftIds.map(tcId => ({ test_case_id: tcId, user_id: user.id, action_type: 'status_changed', field_name: 'lifecycle_status', old_value: 'draft', new_value: 'active' }))
                                );
                              }
                              setShowDraftWarningDismissed(true);
                            }}
                            className="px-2.5 py-1 bg-amber-100 border border-amber-200 rounded text-[11px] font-semibold hover:bg-amber-200 cursor-pointer"
                          >
                            <i className="ri-checkbox-circle-line" /> Convert all to Active
                          </button>
                          <button onClick={() => setShowDraftWarningDismissed(true)} className="px-2.5 py-1 bg-white border border-gray-200 rounded text-[11px] font-semibold text-gray-500 hover:bg-gray-50 cursor-pointer">
                            Proceed as is
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50">
                    <div className="text-xs text-gray-500">
                      <strong className="text-gray-900 text-sm">{selectedTestCases.length}</strong> selected
                      {includeDraftTCs && selectedDraftIds.length > 0 && (
                        <span className="ml-2 text-amber-600">({selectedDraftIds.length} draft)</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setAddRunStep(1)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer flex items-center gap-1">
                        <i className="ri-arrow-left-line" /> Back
                      </button>
                      <button
                        onClick={() => { setFormData(prev => ({ ...prev, include_all_cases: false })); handleAddRun(); }}
                        disabled={submitting}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? 'Creating...' : editingRunId ? 'Update Run' : 'Create Run'}
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        );
      })()}

      {showSelectCasesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Select cases</h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    setShowSelectCasesModal(false);
                    setSelectedFolder(null);
                    setCaseSearchQuery('');
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            <div className="flex h-[calc(90vh-140px)]">
              <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Folders</h3>
                  <div className="space-y-1">
                    <div
                      onClick={() => setSelectedFolder(null)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer ${
                        selectedFolder === null
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 5, background: '#EEF2FF' }}>
                        <i className="ri-folder-line text-[0.8125rem]" style={{ color: '#6366F1' }}></i>
                      </span>
                      <span className="font-medium">All Cases</span>
                      <span className={`ml-auto text-xs px-2 py-1 rounded ${
                        selectedFolder === null
                            ? 'bg-indigo-200 text-indigo-700'
                            : 'text-gray-500'
                      }`}>
                        {selectedTestCases.length}/{testCases.length}
                      </span>
                    </div>
                    {folders.map((folder) => {
                      const meta = folderMetas.find(m => m.name === folder.name);
                      const fs = RUNS_FOLDER_COLOR_MAP[meta?.color || 'indigo'] || { bg: '#EEF2FF', fg: '#6366F1' };
                      const icon = meta?.icon || 'ri-folder-line';
                      return (
                        <div
                          key={folder.name}
                          onClick={() => setSelectedFolder(folder.name)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer ${
                            selectedFolder === folder.name
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 5, background: fs.bg }}>
                            <i className={`${icon} text-[0.8125rem]`} style={{ color: fs.fg }}></i>
                          </span>
                          <span>{folder.name}</span>
                          <span className={`ml-auto text-xs px-2 py-1 rounded ${
                            selectedFolder === folder.name
                              ? 'bg-indigo-200 text-indigo-700'
                              : 'text-gray-500'
                          }`}>
                            {getTestCasesByFolder(folder.name).filter(tc => selectedTestCases.includes(tc.id)).length}/{folder.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedFolder || 'All Cases'} ({selectedInFolder}/{filteredTestCases.length})
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input
                          type="text"
                          placeholder="Search cases..."
                          value={caseSearchQuery}
                          onChange={(e) => setCaseSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredTestCases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <i className="ri-file-list-3-line text-6xl mb-4"></i>
                      <p className="text-lg">No test cases found</p>
                      <p className="text-sm mt-2">
                        {caseSearchQuery ? 'Try a different search term' : 'Create test cases to add them to your runs'}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="w-8 px-4 py-3">
                            <input 
                              type="checkbox" 
                              onChange={() => {
                                const allIds = filteredTestCases.map(tc => tc.id);
                                const allSelected = allIds.every(id => selectedTestCases.includes(id));
                                if (allSelected) {
                                  setSelectedTestCases(prev => prev.filter(id => !allIds.includes(id)));
                                } else {
                                  setSelectedTestCases(prev => [...new Set([...prev, ...allIds])]);
                                }
                              }}
                              checked={filteredTestCases.length > 0 && filteredTestCases.every(tc => selectedTestCases.includes(tc.id))}
                              className="w-4 h-4 text-indigo-600 cursor-pointer"
                            />
                          </th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Case</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredTestCases.map((testCase) => (
                          <tr key={testCase.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedTestCases.includes(testCase.id)}
                                onChange={() => toggleTestCase(testCase.id)}
                                className="w-4 h-4 text-indigo-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <i className="ri-file-list-3-line text-gray-400"></i>
                                <span className="text-sm text-indigo-600 hover:underline cursor-pointer">
                                  {testCase.title}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                testCase.priority === 'high' 
                                  ? 'bg-red-100 text-red-700'
                                  : testCase.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {testCase.priority === 'high' ? 'High' : 
                                 testCase.priority === 'medium' ? 'Medium' : 'Low'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      {selectedTestCases.length}/{testCases.length} selected
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setShowSelectCasesModal(false);
                          setSelectedFolder(null);
                          setCaseSearchQuery('');
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setShowSelectCasesModal(false);
                          setSelectedFolder(null);
                          setCaseSearchQuery('');
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer whitespace-nowrap"
                      >
                        Select cases
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-64 bg-gray-50 border-l border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
                    <button 
                      onClick={clearAllFilters}
                      className="text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap"
                    >
                      Clear all
                    </button>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="border-b border-gray-200 pb-3">
                      <div className="font-medium text-gray-700 mb-2">Priority</div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-indigo-600 cursor-pointer"
                            checked={priorityFilters.includes('high')}
                            onChange={() => handlePriorityFilterChange('high')}
                          />
                          <span className="text-gray-600">High</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-indigo-600 cursor-pointer"
                            checked={priorityFilters.includes('medium')}
                            onChange={() => handlePriorityFilterChange('medium')}
                          />
                          <span className="text-gray-600">Medium</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-indigo-600 cursor-pointer"
                            checked={priorityFilters.includes('low')}
                            onChange={() => handlePriorityFilterChange('low')}
                          />
                          <span className="text-gray-600">Low</span>
                        </label>
                      </div>
                    </div>

                    <div className="border-b border-gray-200 pb-3">
                      <div className="font-medium text-gray-700 mb-2">Tags</div>
                      {allTags.length > 0 ? (
                        <div className="space-y-2">
                          <div className="relative" ref={tagDropdownRef}>
                            <button
                              onClick={() => setShowTagDropdown(!showTagDropdown)}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                            >
                              <span>Select tags...</span>
                              <i className={`ri-arrow-${showTagDropdown ? 'up' : 'down'}-s-line text-gray-400`}></i>
                            </button>
                            
                            {showTagDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                {allTags.map((tag) => (
                                  <div
                                    key={tag}
                                    onClick={() => {
                                      handleTagFilterToggle(tag);
                                    }}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                                      tagFilters.includes(tag) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                    }`}
                                  >
                                    <span>{tag}</span>
                                    {tagFilters.includes(tag) && (
                                      <i className="ri-check-line text-indigo-600"></i>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {tagFilters.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {tagFilters.map((tag) => (
                                <div
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs"
                                >
                                  <span>{tag}</span>
                                  <button
                                    onClick={() => removeTagFilter(tag)}
                                    className="hover:bg-indigo-200 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                                  >
                                    <i className="ri-close-line text-xs"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {tagFilters.length === 0 && (
                            <div className="text-xs text-gray-500 italic">No tags selected</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">No tags available</div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button 
                        onClick={toggleAllTestCases}
                        className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer whitespace-nowrap"
                      >
                        {selectedTestCases.length === testCases.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <i className="ri-vip-crown-line text-yellow-500 text-xl"></i>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Starter 플랜 이상 필요</h2>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer w-8 h-8 flex items-center justify-center"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Export PDF Report 기능은 <strong>Starter 플랜 이상</strong>에서 사용할 수 있습니다.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-xs font-semibold text-yellow-700 uppercase mb-2">Starter 플랜 혜택</p>
                <ul className="space-y-1.5">
                  {['프로젝트 10개까지', '팀 멤버 8명까지', 'Jira Integration', '기본 리포팅', 'Testcase Export/Import', 'Export PDF Report'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                      <i className="ri-check-line text-yellow-500"></i>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap transition-colors"
                >
                  플랜 업그레이드
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm cursor-pointer whitespace-nowrap"
                >
                  나중에
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
