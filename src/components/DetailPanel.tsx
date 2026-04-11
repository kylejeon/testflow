import { useState, useEffect, useRef } from 'react';
import { Avatar } from './Avatar';
import { supabase } from '../lib/supabase';
import { type AnyStep, isSharedStepRef } from '../types/shared-steps';
import { expandFlatSteps, type SharedStepCache } from '../lib/expandSharedSteps';

export type TestStatus = 'passed' | 'failed' | 'blocked' | 'retest' | 'untested';

export interface DetailPanelTestCase {
  id: string;
  customId?: string;
  title: string;
  description?: string;
  folder?: string;
  priority: string;
  tags?: string;
  assignee?: string;
  createdAt: string;
  steps?: string;
  expected_result?: string;
  precondition?: string;
  is_automated?: boolean;
  attachments?: { name: string; url: string; size: number }[];
}

export interface DetailPanelProps {
  context: 'testcase' | 'run';
  testCase: DetailPanelTestCase;

  // Run context
  runStatus?: string;
  stepResults?: Record<number, 'passed' | 'failed'>;

  // Core callbacks
  onClose: () => void;
  onStatusChange?: (status: string) => void;

  // Run actions
  onPassAndNext?: () => void;
  onAddResult?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onStepResult?: (stepIndex: number, status: 'passed' | 'failed' | null) => void;

  // TC footer
  onEdit?: () => void;
  onDelete?: () => void;

  // Comments tab
  comments?: Array<{ id: string; text: string; author: string; timestamp: Date; user_id?: string }>;
  commentText?: string;
  loadingComments?: boolean;
  onCommentChange?: (text: string) => void;
  onCommentSubmit?: () => void;
  onCommentDelete?: (id: string) => void;
  currentUserId?: string;

  // Results tab
  testResults?: any[];
  onResultClick?: (result: any) => void;

  // Issues tab
  jiraDomain?: string;
  isProfessionalOrHigher?: boolean;
  onAddIssue?: () => void;
  onLinkExistingIssue?: (issueKey: string) => Promise<void>;

  // Assignee
  projectMembers?: any[];
  assigneeName?: string;
  onAssigneeChange?: (name: string) => void;

  // Image preview
  onPreviewImage?: (url: string, name: string) => void;

  // Folder metadata for icon+color display
  folders?: Array<{ id: string; name: string; icon: string; color: string }>;

  // Shared Step version tracking
  ssLatestVersions?: Record<string, { version: number; custom_id: string; name: string; steps: { step: string; expectedResult: string }[] }>;
  runCompleted?: boolean;
  onUpdateSharedStep?: (ssId: string) => Promise<void>;
}

// ── Folder Color Map ─────────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSteps(raw?: string, expectedResultRaw?: string): { step: string; expectedResult: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const stepsArr = raw.split('\n').filter(Boolean);
  const expectedArr = expectedResultRaw ? expectedResultRaw.split('\n').filter(Boolean) : [];
  return stepsArr.map((s, i) => ({
    step: s.replace(/^\d+\.\s*/, ''),
    expectedResult: (expectedArr[i] || '').replace(/^\d+\.\s*/, ''),
  }));
}

const STATUS_COLORS: Record<string, string> = {
  passed:   'bg-green-50 text-green-700 border border-green-200',
  failed:   'bg-red-50 text-red-700 border border-red-200',
  blocked:  'bg-amber-50 text-amber-700 border border-amber-200',
  retest:   'bg-violet-50 text-violet-700 border border-violet-200',
  untested: 'bg-gray-50 text-gray-500 border border-gray-200',
};

const PRIORITY_DOT_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high:     '#F59E0B',
  medium:   '#6366F1',
  low:      '#94A3B8',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isImageFile(name: string) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

// ── MiniBtn (Step Pass/Fail) ──────────────────────────────────────────────────

function MiniBtn({ type, active, onClick }: { type: 'pass' | 'fail'; active: boolean; onClick: () => void }) {
  const isPass = type === 'pass';
  const activeClass = isPass
    ? 'bg-green-500 border-green-500 text-white'
    : 'bg-red-500 border-red-500 text-white';
  const hoverClass = isPass
    ? 'hover:bg-green-50 hover:border-green-300 hover:text-green-600'
    : 'hover:bg-red-50 hover:border-red-300 hover:text-red-600';
  const defaultClass = 'bg-white border-gray-200 text-gray-400';

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={isPass ? 'Pass' : 'Fail'}
      className={`w-[22px] h-[22px] flex items-center justify-center border rounded text-[10px] transition-all flex-shrink-0 ${
        active ? activeClass : `${defaultClass} ${hoverClass}`
      }`}
    >
      <i className={isPass ? 'ri-check-line' : 'ri-close-line'} />
    </button>
  );
}

// ── StepRow ───────────────────────────────────────────────────────────────────

interface StepRowProps {
  step: string;
  expectedResult: string;
  index: number;
  result?: 'passed' | 'failed';
  showResultButtons: boolean;
  onStepResult?: (index: number, status: 'passed' | 'failed' | null) => void;
  onPreviewImage?: (url: string, name: string) => void;
}

function StepRow({ step, expectedResult, index, result, showResultButtons, onStepResult, onPreviewImage }: StepRowProps) {
  const stateClass =
    result === 'passed' ? 'bg-green-50 border border-green-200' :
    result === 'failed'  ? 'bg-red-50 border border-red-200' :
    'bg-gray-50';

  const numClass =
    result === 'passed' ? 'bg-green-500 text-white' :
    result === 'failed'  ? 'bg-red-500 text-white' :
    'bg-indigo-100 text-indigo-700';

  const handleClick = (status: 'passed' | 'failed') => {
    onStepResult?.(index, result === status ? null : status);
  };

  const isHtml = /<[^>]+>/.test(step);

  return (
    <div className={`flex gap-2 rounded-lg p-2 items-start ${stateClass}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.625rem] font-bold flex-shrink-0 mt-0.5 ${numClass}`}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        {isHtml ? (
          <div
            className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded [&_img]:my-1 [&_img]:cursor-pointer [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
            dangerouslySetInnerHTML={{ __html: step }}
            onClick={(e) => {
              const t = e.target as HTMLElement;
              if (t.tagName === 'IMG') {
                const img = t as HTMLImageElement;
                onPreviewImage?.(img.src, img.alt || 'image');
              }
            }}
          />
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{step}</p>
        )}
        {expectedResult && (
          <div className="mt-1 flex items-start gap-1">
            <i className="ri-checkbox-circle-line text-green-500 text-sm flex-shrink-0 mt-[0.05rem]" />
            <p className="text-sm text-green-600 leading-relaxed">
              {expectedResult.replace(/<[^>]*>/g, '').trim()}
            </p>
          </div>
        )}
      </div>
      {showResultButtons && (
        <div className="flex gap-[3px] flex-shrink-0 mt-0.5">
          <MiniBtn type="pass" active={result === 'passed'} onClick={() => handleClick('passed')} />
          <MiniBtn type="fail" active={result === 'failed'} onClick={() => handleClick('failed')} />
        </div>
      )}
    </div>
  );
}

// ── ResultItem ────────────────────────────────────────────────────────────────

const STATUS_TEXT_COLORS: Record<string, string> = {
  passed:   'text-green-700',
  failed:   'text-red-700',
  blocked:  'text-amber-700',
  retest:   'text-violet-700',
  untested: 'text-gray-500',
};

// ── Main Component ────────────────────────────────────────────────────────────

export function DetailPanel({
  context,
  testCase,
  runStatus = 'untested',
  stepResults = {},
  onClose,
  onStatusChange,
  onPassAndNext,
  onAddResult,
  onPrev,
  onNext,
  canGoPrev = false,
  canGoNext = false,
  onStepResult,
  onEdit,
  onDelete,
  comments = [],
  commentText = '',
  loadingComments = false,
  onCommentChange,
  onCommentSubmit,
  onCommentDelete,
  currentUserId,
  testResults = [],
  onResultClick,
  jiraDomain,
  isProfessionalOrHigher = false,
  onAddIssue,
  onLinkExistingIssue,
  projectMembers = [],
  assigneeName,
  onAssigneeChange,
  onPreviewImage,
  folders = [],
  ssLatestVersions = {},
  runCompleted = false,
  onUpdateSharedStep,
}: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'results' | 'issues' | 'history'>('comments');
  const [stepsCollapsed, setStepsCollapsed] = useState(false);
  const [stepsHeightPx, setStepsHeightPx] = useState<number | null>(null);
  const [localStepResults, setLocalStepResults] = useState<Record<number, 'passed' | 'failed'>>({});
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkIssueKey, setLinkIssueKey] = useState('');
  const [linkingIssue, setLinkingIssue] = useState(false);
  const [sharedStepsCache, setSharedStepsCache] = useState<SharedStepCache>({});
  // SS version badge inline diff
  const [expandedSsDiffId, setExpandedSsDiffId] = useState<string | null>(null); // ssId
  const [oldVersionSteps, setOldVersionSteps] = useState<Record<string, { step: string; expectedResult: string }[]>>({}); // "ssId:version"
  const detailBodyRef = useRef<HTMLDivElement>(null);
  const stepsAreaRef = useRef<HTMLDivElement>(null);
  const stepsHeightRef = useRef<number | null>(null);

  // Fetch shared step content when TC steps contain SharedStepRefs
  useEffect(() => {
    if (!testCase.steps) { setSharedStepsCache({}); return; }
    let parsed: AnyStep[] | null = null;
    try {
      const p = JSON.parse(testCase.steps);
      if (Array.isArray(p)) parsed = p as AnyStep[];
    } catch {}
    if (!parsed) { setSharedStepsCache({}); return; }
    const refs = parsed.filter(isSharedStepRef);
    if (refs.length === 0) { setSharedStepsCache({}); return; }
    const ids = [...new Set(refs.map((r) => r.shared_step_id))];

    (async () => {
      const { data } = await supabase
        .from('shared_steps')
        .select('id, name, custom_id, steps, version')
        .in('id', ids);
      if (!data) return;

      const cache: SharedStepCache = {};
      // Store latest under both `id` (fallback) and `id:latestVersion`
      data.forEach((ss: any) => {
        cache[ss.id] = { name: ss.name, custom_id: ss.custom_id, steps: ss.steps };
        cache[`${ss.id}:${ss.version}`] = { name: ss.name, custom_id: ss.custom_id, steps: ss.steps };
      });

      // For refs pinned to an older version, fetch historical content
      const outdatedRefs = refs.filter((r) => {
        const latest = data.find((ss: any) => ss.id === r.shared_step_id);
        return latest && r.shared_step_version < latest.version;
      });
      if (outdatedRefs.length > 0) {
        const historyQueries = outdatedRefs.map((r) =>
          supabase
            .from('shared_step_versions')
            .select('steps')
            .eq('shared_step_id', r.shared_step_id)
            .eq('version', r.shared_step_version)
            .maybeSingle()
            .then(({ data: hist }) => ({ ref: r, steps: hist?.steps ?? null }))
        );
        const results = await Promise.all(historyQueries);
        results.forEach(({ ref, steps }) => {
          if (steps) {
            const latest = data.find((ss: any) => ss.id === ref.shared_step_id)!;
            cache[`${ref.shared_step_id}:${ref.shared_step_version}`] = {
              name: latest.name,
              custom_id: latest.custom_id,
              steps,
            };
          }
        });
      }

      setSharedStepsCache(cache);
    })();
  }, [testCase.id]);

  const isRun = context === 'run';
  const effectiveStepResults = Object.keys(stepResults).length > 0 ? stepResults : localStepResults;
  const steps = (() => {
    if (!testCase.steps) return [] as { step: string; expectedResult: string }[];
    try {
      const p = JSON.parse(testCase.steps);
      if (Array.isArray(p)) return expandFlatSteps(p as AnyStep[], sharedStepsCache);
    } catch {}
    return parseSteps(testCase.steps, testCase.expected_result);
  })();
  const passedCount = Object.values(effectiveStepResults).filter((v) => v === 'passed').length;

  const handleStepResult = (index: number, status: 'passed' | 'failed' | null) => {
    if (onStepResult) {
      onStepResult(index, status);
    } else {
      setLocalStepResults((prev) => {
        const next = { ...prev };
        if (status === null) delete next[index];
        else next[index] = status;
        return next;
      });
    }
  };

  // SS version helpers
  const fetchOldVersionStepsDP = async (ssId: string, version: number) => {
    const key = `${ssId}:${version}`;
    if (oldVersionSteps[key] !== undefined) return;
    const { data } = await supabase
      .from('shared_step_versions')
      .select('steps')
      .eq('shared_step_id', ssId)
      .eq('version', version)
      .maybeSingle();
    setOldVersionSteps(prev => ({ ...prev, [key]: data?.steps ?? [] }));
  };

  // Build map from groupHeader → SharedStepRef (for version badge lookup in steps)
  const ssRefByHeader = (() => {
    const map: Record<string, any> = {};
    if (!testCase.steps) return map;
    try {
      const p = JSON.parse(testCase.steps);
      if (Array.isArray(p)) {
        p.filter((s: any) => s.type === 'shared_step_ref').forEach((s: any) => {
          map[`${s.shared_step_custom_id}: ${s.shared_step_name}`] = s;
        });
      }
    } catch {}
    return map;
  })();

  const canUpdateSSInPanel = (ref: any) =>
    !runCompleted && (runStatus === 'untested' || runStatus === 'retest');

  const handleLinkExistingIssue = async () => {
    const key = linkIssueKey.trim();
    if (!key || !onLinkExistingIssue) return;
    setLinkingIssue(true);
    try {
      await onLinkExistingIssue(key);
      setShowLinkInput(false);
      setLinkIssueKey('');
    } finally {
      setLinkingIssue(false);
    }
  };

  // Build tag list
  const tagList = testCase.tags ? testCase.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  // Issues from test results
  const allIssues = testResults
    .filter((r) => r.issues && r.issues.length > 0)
    .flatMap((r) =>
      (r.issues || []).map((issueKey: string) => ({
        issueKey,
        runName: r.run?.name || 'Unknown Run',
        status: r.status,
        createdAt: r.timestamp,
      }))
    );
  // Keep only the FIRST occurrence per issueKey (testResults is newest-first,
  // so first = most recent result). Using new Map(array) would keep the LAST
  // occurrence, which would surface stale status from older results.
  const uniqueIssuesMap = new Map<string, (typeof allIssues)[0]>();
  for (const issue of allIssues) {
    if (!uniqueIssuesMap.has(issue.issueKey)) {
      uniqueIssuesMap.set(issue.issueKey, issue);
    }
  }
  const uniqueIssues = Array.from(uniqueIssuesMap.values());

  // GitHub issues from test results
  const allGithubIssues = testResults
    .filter((r) => r.github_issues && r.github_issues.length > 0)
    .flatMap((r) =>
      (r.github_issues || []).map((gi: { number: number; url: string; repo: string }) => ({
        number: gi.number,
        url: gi.url,
        repo: gi.repo,
        status: r.status,
        createdAt: r.timestamp,
      }))
    );
  // Same: keep first occurrence (= most recent result) per GitHub issue URL
  const uniqueGithubIssuesMap = new Map<string, (typeof allGithubIssues)[0]>();
  for (const gi of allGithubIssues) {
    if (!uniqueGithubIssuesMap.has(gi.url)) {
      uniqueGithubIssuesMap.set(gi.url, gi);
    }
  }
  const uniqueGithubIssues = Array.from(uniqueGithubIssuesMap.values());

  return (
    <div className="w-[500px] min-w-[500px] bg-white border-l border-gray-200 flex flex-col overflow-hidden flex-shrink-0">

      {/* ① Header */}
      <div className="px-5 pt-4 pb-3.5 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            {testCase.customId && (
              <div className="font-mono text-xs text-gray-400 mb-1">{testCase.customId}</div>
            )}
            <h3 className="text-base font-bold text-gray-900 leading-[1.3]">{testCase.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 border-0 bg-transparent cursor-pointer"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        {testCase.description && (
          <p className="text-xs text-gray-500 leading-relaxed mt-1.5">{testCase.description}</p>
        )}
      </div>

      {/* ② Quick Actions Bar — Run Only */}
      {isRun && (
        <div className="flex items-center gap-1.5 px-5 py-[0.625rem] border-b border-slate-100 flex-shrink-0">
          {/* Status select */}
          <select
            value={runStatus}
            onChange={(e) => onStatusChange?.(e.target.value)}
            className={`px-2.5 py-[0.3125rem] rounded-full text-xs font-semibold cursor-pointer border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${STATUS_COLORS[runStatus] || STATUS_COLORS.untested}`}
          >
            <option value="untested">— Untested</option>
            <option value="passed">✓ Passed</option>
            <option value="failed">✕ Failed</option>
            <option value="blocked">⊘ Blocked</option>
            <option value="retest">↻ Retest</option>
          </select>

          {/* Add Result */}
          <button
            onClick={onAddResult}
            className="flex items-center gap-1 px-2.5 py-[0.3125rem] rounded text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer border-0"
          >
            <i className="ri-add-line text-sm" />
            Add Result
          </button>

          <div className="flex-1" />

          {/* Pass & Next */}
          <button
            onClick={onPassAndNext}
            className="flex items-center gap-1 px-2.5 py-[0.3125rem] rounded text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors cursor-pointer border-0"
          >
            <i className="ri-check-line text-sm" />
            Pass &amp; Next
          </button>

          {/* Nav ↑↓ */}
          <button
            onClick={onPrev}
            disabled={!canGoPrev}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Previous"
          >
            <i className="ri-arrow-up-s-line text-sm" />
          </button>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Next"
          >
            <i className="ri-arrow-down-s-line text-sm" />
          </button>
        </div>
      )}

      {/* ③ Meta Grid — Always visible */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Priority */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-gray-400 mb-0.5">Priority</div>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: PRIORITY_DOT_COLORS[testCase.priority] || '#94A3B8' }}
              />
              <span className="text-sm text-slate-600 capitalize">{testCase.priority}</span>
            </span>
          </div>

          {/* Folder */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-gray-400 mb-0.5">Folder</div>
            <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
              {testCase.folder ? (() => {
                const f = folders.find(fd => fd.name === testCase.folder);
                const fs = FOLDER_COLOR_MAP[f?.color || 'indigo'] || { bg: '#EEF2FF', fg: '#6366F1' };
                const icon = f?.icon || 'ri-folder-line';
                return (
                  <>
                    <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 4, background: fs.bg }}>
                      <i className={`${icon} text-xs`} style={{ color: fs.fg }}></i>
                    </span>
                    {testCase.folder}
                  </>
                );
              })() : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-gray-400 mb-0.5">Tags</div>
            {tagList.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {tagList.map((tag) => (
                  <span key={tag} className="text-xs font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>

          {/* Assignee */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-gray-400 mb-0.5">Assignee</div>
            {isRun ? (
              /* Run context: read-only */
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                {assigneeName ? (
                  <>
                    {(() => {
                      const m = projectMembers.find((mb) => (mb.full_name || mb.email) === assigneeName);
                      return (
                        <Avatar
                          userId={m?.user_id || assigneeName}
                          name={assigneeName}
                          size="xs"
                        />
                      );
                    })()}
                    <span>{assigneeName}</span>
                  </>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            ) : projectMembers.length > 0 ? (
              <div className="relative">
                <div className="flex items-center gap-1.5 px-2 py-1 border border-gray-200 rounded-lg bg-white text-sm">
                  {assigneeName ? (
                    <>
                      {(() => {
                        const m = projectMembers.find((mb) => (mb.full_name || mb.email) === assigneeName);
                        return m?.avatar_emoji ? (
                          <span className="text-base leading-none">{m.avatar_emoji}</span>
                        ) : (
                          <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-[0.4375rem] font-bold">
                            {assigneeName.substring(0, 2).toUpperCase()}
                          </div>
                        );
                      })()}
                      <span className="font-medium text-gray-800 flex-1 truncate">{assigneeName}</span>
                    </>
                  ) : (
                    <span className="text-gray-400 flex-1">— Unassigned —</span>
                  )}
                  <i className="ri-arrow-down-s-line text-gray-400 text-xs flex-shrink-0" />
                  <select
                    value={assigneeName || ''}
                    onChange={(e) => onAssigneeChange?.(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  >
                    <option value="">— Unassigned —</option>
                    {projectMembers.map((m) => (
                      <option key={m.id} value={m.full_name || m.email}>
                        {m.avatar_emoji ? `${m.avatar_emoji} ` : ''}{m.full_name || m.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-700">
                {testCase.assignee || <span className="text-gray-400">—</span>}
              </div>
            )}
          </div>

          {/* Created */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-gray-400 mb-0.5">Created</div>
            <div className="text-sm font-medium text-gray-800">{formatDate(testCase.createdAt)}</div>
          </div>

          {/* Last Run */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-gray-400 mb-0.5">Last Run</div>
            {testResults.length > 0 ? (() => {
              const lastResult = testResults[0];
              const timeAgo = lastResult.timestamp instanceof Date ? getTimeAgo(lastResult.timestamp) : '';
              const statusColor: Record<string, string> = {
                passed: '#16A34A', failed: '#DC2626', blocked: '#D97706', retest: '#7C3AED', untested: '#64748B',
              };
              const label = lastResult.status.charAt(0).toUpperCase() + lastResult.status.slice(1);
              return (
                <div className="text-sm font-medium" style={{ color: statusColor[lastResult.status] || '#64748B' }}>
                  {label}
                  {timeAgo && <span className="text-slate-400 font-normal text-xs"> · {timeAgo}</span>}
                </div>
              );
            })() : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        </div>
      </div>

      {/* ④ Steps Toggle Bar */}
      <button
        onClick={() => setStepsCollapsed(!stepsCollapsed)}
        className="flex items-center justify-between w-full px-5 py-2 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200 flex-shrink-0 cursor-pointer border-l-0 border-r-0 border-t-0"
      >
        <div className="flex items-center gap-[0.375rem]">
          <i
            className={`ri-arrow-down-s-line text-indigo-500 text-sm transition-transform duration-200 ${stepsCollapsed ? '-rotate-90' : ''}`}
          />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-[0.04em]">
            {steps.length} step{steps.length !== 1 ? 's' : ''}
            {testCase.attachments && testCase.attachments.length > 0 ? ` · ${testCase.attachments.length} attachment${testCase.attachments.length !== 1 ? 's' : ''}` : ''}
          </span>
        </div>
        {isRun && steps.length > 0 ? (
          <span className="text-xs font-semibold flex items-center gap-[0.25rem]">
            <span className={passedCount > 0 ? 'text-green-600' : 'text-slate-500'}>{passedCount}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">{steps.length} steps passed</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400 font-medium">
            {testCase.attachments && testCase.attachments.length > 0 ? `${testCase.attachments.length} attachment${testCase.attachments.length !== 1 ? 's' : ''}` : ''}
          </span>
        )}
      </button>

      {/* ── dp-split: steps + drag handle + tabs (flex-1) ── */}
      <div ref={detailBodyRef} className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ⑤ Steps Area — collapsible, dynamic height */}
      {!stepsCollapsed && (
        <div
          ref={stepsAreaRef}
          className="overflow-y-auto px-5 py-3.5 border-b border-gray-200 flex-shrink-0 space-y-3"
          style={{
            height: stepsHeightPx !== null ? `${stepsHeightPx}px` : undefined,
            maxHeight: stepsHeightPx !== null ? undefined : '40vh',
          }}
        >
          {/* Precondition */}
          {testCase.precondition && (
            <div className="rounded-md px-3 py-2.5 bg-amber-50 border border-yellow-200">
              <div className="flex items-center gap-1.5 mb-1">
                <i className="ri-alert-line text-amber-500 text-xs" />
                <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-amber-800">⚠ Precondition</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-800">{testCase.precondition}</p>
            </div>
          )}

          {/* Steps */}
          {steps.length > 0 ? (
            <div className="space-y-1.5">
              {(() => {
                const dpGroups: any[] = [];
                let curDpGroup: any = null;
                for (let i = 0; i < steps.length; i++) {
                  const fs = steps[i] as any;
                  if (fs.groupHeader) {
                    if (curDpGroup) dpGroups.push(curDpGroup);
                    curDpGroup = { isShared: true, header: fs.groupHeader, entries: [{ s: steps[i], i }] };
                  } else if (fs.isSubStep && curDpGroup) {
                    curDpGroup.entries.push({ s: steps[i], i });
                  } else {
                    if (curDpGroup) { dpGroups.push(curDpGroup); curDpGroup = null; }
                    dpGroups.push({ isShared: false, s: steps[i], i });
                  }
                }
                if (curDpGroup) dpGroups.push(curDpGroup);
                return dpGroups.map((group, gi) => {
                  if (!group.isShared) {
                    return (
                      <StepRow
                        key={group.i}
                        step={group.s.step}
                        expectedResult={group.s.expectedResult}
                        index={group.i}
                        result={effectiveStepResults[group.i]}
                        showResultButtons={isRun}
                        onStepResult={handleStepResult}
                        onPreviewImage={onPreviewImage}
                      />
                    );
                  }
                  const ref = ssRefByHeader[group.header];
                  const latestInfo = ref ? ssLatestVersions[ref.shared_step_id] : null;
                  const hasNewVer = ref && latestInfo && ref.shared_step_version != null && latestInfo.version > ref.shared_step_version;
                  const canUp = ref && canUpdateSSInPanel(ref);
                  const isDiffOpen = ref && expandedSsDiffId === ref.shared_step_id;
                  const oldKey = ref ? `${ref.shared_step_id}:${ref.shared_step_version}` : null;
                  return (
                    <div key={`ss-dp-${gi}`} className="border border-violet-200 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-1 px-2 py-1 bg-violet-50 border-b border-violet-100">
                        <i className="ri-links-line text-violet-500 text-[10px]" />
                        <span className="text-[10px] font-semibold text-violet-700">{group.header}</span>
                        {hasNewVer && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isDiffOpen) { setExpandedSsDiffId(null); }
                              else { setExpandedSsDiffId(ref.shared_step_id); fetchOldVersionStepsDP(ref.shared_step_id, ref.shared_step_version); }
                            }}
                            className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[0.5rem] font-bold ml-1 cursor-pointer transition-all duration-200 ${canUp ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-500'}`}
                            title={canUp ? `New version: v${latestInfo!.version}` : 'Locked: test result recorded'}
                          >
                            {canUp ? <><i className="ri-arrow-up-line" /> v{latestInfo!.version}</> : <><i className="ri-lock-line" /> v{latestInfo!.version}</>}
                          </span>
                        )}
                      </div>
                      {isDiffOpen && hasNewVer && (
                        <div className="border-b border-violet-200 overflow-hidden">
                          <div className="flex items-center justify-between px-2 py-1.5 bg-amber-50 border-b border-amber-200">
                            <span className="text-[0.5625rem] font-semibold text-amber-700">v{ref.shared_step_version} → v{latestInfo!.version}</span>
                            <div className="flex items-center gap-1.5">
                              {canUp && onUpdateSharedStep && (
                                <button onClick={() => { onUpdateSharedStep(ref.shared_step_id); setExpandedSsDiffId(null); }} className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[0.5625rem] font-bold rounded cursor-pointer transition-colors">Update</button>
                              )}
                              {!canUp && <span className="flex items-center gap-0.5 text-[0.5625rem] text-slate-500"><i className="ri-lock-line" /> Locked to preserve test results</span>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-gray-200">
                            <div className="p-1.5 bg-red-50">
                              <div className="text-[0.5rem] font-bold text-red-400 uppercase tracking-wider mb-1">Current v{ref.shared_step_version}</div>
                              {oldKey && oldVersionSteps[oldKey] !== undefined
                                ? oldVersionSteps[oldKey].length > 0
                                  ? oldVersionSteps[oldKey].map((st, si) => <div key={si} className="text-[0.5625rem] text-red-700 mb-0.5 leading-relaxed"><span className="font-semibold text-red-400 mr-0.5">{si+1}.</span>{st.step}</div>)
                                  : <div className="text-[0.5625rem] text-gray-400 italic">Version history unavailable</div>
                                : <div className="text-[0.5625rem] text-gray-400">Loading...</div>
                              }
                            </div>
                            <div className="p-1.5 bg-emerald-50">
                              <div className="text-[0.5rem] font-bold text-emerald-400 uppercase tracking-wider mb-1">Latest v{latestInfo!.version}</div>
                              {latestInfo!.steps.map((st, si) => <div key={si} className="text-[0.5625rem] text-emerald-700 mb-0.5 leading-relaxed"><span className="font-semibold text-emerald-400 mr-0.5">{si+1}.</span>{st.step}</div>)}
                            </div>
                          </div>
                        </div>
                      )}
                      <div>
                        {group.entries.map(({ s, i }: { s: any; i: number }, ei: number) => (
                          <div key={i} className={ei > 0 ? 'border-t border-violet-100' : ''}>
                            <StepRow
                              step={s.step}
                              expectedResult={s.expectedResult}
                              index={i}
                              result={effectiveStepResults[i]}
                              showResultButtons={isRun}
                              onStepResult={handleStepResult}
                              onPreviewImage={onPreviewImage}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : testCase.expected_result ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <i className="ri-checkbox-circle-line text-indigo-500 text-xs" />
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Expected Result</span>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed">{testCase.expected_result}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">No steps defined</p>
          )}

          {/* Attachments */}
          {testCase.attachments && testCase.attachments.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <i className="ri-attachment-2 text-gray-400 text-xs" />
                <span className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-wider">
                  Attachments ({testCase.attachments.length})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {testCase.attachments.map((file, i) => (
                  <a
                    key={i}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1 bg-gray-50 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors overflow-hidden"
                    style={{ height: '80px' }}
                    title={file.name}
                  >
                    {isImageFile(file.name) ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" style={{ maxHeight: '60px' }} />
                    ) : (
                      <>
                        <i className="ri-file-text-line text-gray-400 text-xl" />
                        <span className="text-[0.5625rem] text-gray-500 truncate px-1 w-full text-center">{file.name}</span>
                      </>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drag resize handle */}
      {!stepsCollapsed && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startHeight = stepsHeightPx !== null
              ? stepsHeightPx
              : (stepsAreaRef.current?.getBoundingClientRect().height ?? 200);
            const onMove = (ev: MouseEvent) => {
              ev.preventDefault();
              const newH = Math.max(60, startHeight + (ev.clientY - startY));
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

      {/* ⑥ Tab Bar */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {(['comments', 'results', 'issues', 'history'] as const).map((tab) => {
          const labels: Record<string, string> = { comments: 'Comments', results: 'Results', issues: 'Issues', history: 'History' };
          const counts: Record<string, number | undefined> = {
            comments: comments.length || undefined,
            results: testResults.length || undefined,
            issues: (uniqueIssues.length + uniqueGithubIssues.length) || undefined,
            history: undefined,
          };
          const count = counts[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-xs font-semibold transition-colors cursor-pointer border-0 bg-transparent ${
                activeTab === tab
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {labels[tab]}
              {count !== undefined && count > 0 && (
                <span className={`text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ⑦ Tab Body — flex-1, scrollable, min 220px */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: '220px' }}>

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="flex flex-col gap-3">
            {/* Comment list first */}
            {loadingComments ? (
              <div className="text-center py-6">
                <i className="ri-loader-4-line animate-spin text-xl text-gray-400" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-4">
                <i className="ri-chat-3-line text-2xl text-gray-300 block mb-1" />
                <p className="text-xs text-gray-400">No comments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="group">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Avatar
                        userId={c.user_id || c.author}
                        name={c.author}
                        size="xs"
                      />
                      <span className="text-xs font-semibold text-gray-800">{c.author}</span>
                      <span className="text-xs text-gray-400">
                        {c.timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                      {c.user_id === currentUserId && (
                        <button
                          onClick={() => onCommentDelete?.(c.id)}
                          className="ml-auto w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer flex-shrink-0"
                        >
                          <i className="ri-delete-bin-line text-xs" />
                        </button>
                      )}
                    </div>
                    <div
                      className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap break-words bg-slate-50 border border-slate-100 rounded px-3 py-2"
                      style={{ marginLeft: '1.625rem' }}
                    >
                      {c.text}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input at bottom */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <textarea
                value={commentText}
                onChange={(e) => onCommentChange?.(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs resize-none"
              />
              <button
                onClick={onCommentSubmit}
                disabled={!commentText?.trim()}
                className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer self-end whitespace-nowrap"
              >
                Post
              </button>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div>
            {testResults.length === 0 ? (
              <div className="text-center py-6">
                <i className="ri-file-list-line text-2xl text-gray-300 block mb-1" />
                <p className="text-xs text-gray-400">No test results yet</p>
              </div>
            ) : (
              testResults.map((result) => {
                const statusDot: Record<string, string> = {
                  passed:   '#22C55E',
                  failed:   '#EF4444',
                  blocked:  '#F59E0B',
                  retest:   '#8B5CF6',
                  untested: '#94A3B8',
                };
                const statusBg: Record<string, string> = {
                  passed:   '#F0FDF4',
                  failed:   '#FEF2F2',
                  blocked:  '#FFFBEB',
                  retest:   '#F5F3FF',
                  untested: '#F8FAFC',
                };
                const statusFg: Record<string, string> = {
                  passed:   '#166534',
                  failed:   '#991B1B',
                  blocked:  '#92400E',
                  retest:   '#5B21B6',
                  untested: '#64748B',
                };
                const dot = statusDot[result.status] || '#94A3B8';
                const bg  = statusBg[result.status]  || '#F8FAFC';
                const fg  = statusFg[result.status]  || '#64748B';
                const runName = result.run?.name || 'Unknown Run';
                const dateStr = result.timestamp instanceof Date
                  ? result.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '';
                const timeStr = result.timestamp instanceof Date
                  ? result.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : '';

                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-2.5 py-2 border-b border-slate-100 cursor-pointer hover:bg-indigo-50/60 rounded px-1 transition-colors"
                    onClick={() => onResultClick?.(result)}
                  >
                    {/* Status badge */}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                      style={{ background: bg, color: fg }}
                    >
                      <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: dot }} />
                      {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                    </span>

                    {/* Run info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">{runName}</div>
                      <div className="text-xs text-gray-400">
                        {dateStr}{timeStr ? ` · ${timeStr}` : ''}{result.author ? ` · by ${result.author}` : ''}
                        {result.elapsed && result.elapsed !== '00:00' ? ` · ${result.elapsed}` : ''}
                      </div>
                      {result.note && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{result.note}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div className="space-y-2.5">
            {!isProfessionalOrHigher && (
              <div className="mb-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <div className="flex items-start gap-2.5">
                  <i className="ri-lock-line text-indigo-600 text-lg mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800 mb-1">Jira integration requires Hobby+</p>
                    <p className="text-xs text-gray-500">Upgrade to create and manage Jira issues from test results.</p>
                  </div>
                </div>
              </div>
            )}

            {uniqueIssues.length === 0 && uniqueGithubIssues.length === 0 ? (
              <div className="text-center py-6">
                <i className="ri-bug-line text-2xl text-gray-300 block mb-2" />
                <p className="text-xs text-gray-400 mb-3">No linked issues</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setShowLinkInput(true); setLinkIssueKey(''); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <i className="ri-link" />
                    Link Existing Issue
                  </button>
                  <button
                    onClick={onAddIssue}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <i className="ri-add-line" />
                    Create Jira Issue
                  </button>
                </div>
              </div>
            ) : (
              <>
                {uniqueIssues.map((issue, idx) => {
                  const issueUrl = jiraDomain ? `https://${jiraDomain}/browse/${issue.issueKey}` : '';
                  const dateStr = issue.createdAt instanceof Date
                    ? issue.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '';
                  const statusLabel = issue.status
                    ? issue.status.charAt(0).toUpperCase() + issue.status.slice(1)
                    : '';
                  const card = (
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-rose-50 text-rose-500 rounded">
                        <i className="ri-bug-line text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800 truncate">{issue.issueKey}</div>
                        <div className="text-xs text-gray-400">
                          {issue.issueKey}{statusLabel ? ` · ${statusLabel}` : ''}{dateStr ? ` · ${dateStr}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                  return issueUrl ? (
                    <a
                      key={idx}
                      href={issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-400 hover:shadow-sm transition-all"
                    >
                      {card}
                    </a>
                  ) : (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                      {card}
                    </div>
                  );
                })}

                {uniqueGithubIssues.map((gi, idx) => {
                  const dateStr = gi.createdAt instanceof Date
                    ? gi.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '';
                  const statusLabel = gi.status
                    ? gi.status.charAt(0).toUpperCase() + gi.status.slice(1)
                    : '';
                  return (
                    <a
                      key={idx}
                      href={gi.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-slate-400 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-600 rounded">
                          <i className="ri-github-fill text-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-800 truncate">{gi.repo}#{gi.number}</div>
                          <div className="text-xs text-gray-400">
                            #{gi.number}{statusLabel ? ` · ${statusLabel}` : ''}{dateStr ? ` · ${dateStr}` : ''}
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}

                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  <button
                    onClick={() => { setShowLinkInput(true); setLinkIssueKey(''); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <i className="ri-link" />
                    Link Existing Issue
                  </button>
                  <button
                    onClick={onAddIssue}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <i className="ri-add-circle-line" />
                    Create Jira Issue
                  </button>
                </div>
              </>
            )}

            {/* Link Existing Issue inline input */}
            {showLinkInput && (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs font-semibold text-gray-700 mb-2">Link Existing Issue</p>
                <input
                  type="text"
                  value={linkIssueKey}
                  onChange={(e) => setLinkIssueKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && linkIssueKey.trim()) {
                      e.preventDefault();
                      handleLinkExistingIssue();
                    } else if (e.key === 'Escape') {
                      setShowLinkInput(false);
                      setLinkIssueKey('');
                    }
                  }}
                  placeholder="Enter issue key, e.g. PROJ-123"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleLinkExistingIssue}
                    disabled={!linkIssueKey.trim() || linkingIssue}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {linkingIssue ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-link" />}
                    Link
                  </button>
                  <button
                    onClick={() => { setShowLinkInput(false); setLinkIssueKey(''); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {testResults.length === 0 ? (
              <div className="text-center py-8">
                <i className="ri-time-line text-2xl text-gray-300 block mb-1" />
                <p className="text-xs text-gray-400">No history yet</p>
              </div>
            ) : (
              <div>
                {testResults.map((result) => {
                  const statusLabel = result.status.charAt(0).toUpperCase() + result.status.slice(1);
                  const statusColors: Record<string, string> = {
                    passed: '#16A34A', failed: '#DC2626', blocked: '#D97706', retest: '#7C3AED', untested: '#64748B',
                  };
                  const color = statusColors[result.status] || '#64748B';
                  const dateStr = result.timestamp instanceof Date
                    ? result.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '';
                  const timeStr = result.timestamp instanceof Date
                    ? result.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '';

                  return (
                    <div key={result.id} className="flex gap-2.5 py-2.5 border-b border-slate-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 flex-shrink-0 mt-[0.4rem]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-700 leading-relaxed">
                          <span className="font-semibold text-gray-900">{result.author || 'Unknown'}</span>
                          {' marked as '}
                          <span className="font-semibold" style={{ color }}>{statusLabel}</span>
                          {result.run?.name ? ` in ${result.run.name}` : ''}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {dateStr}{timeStr ? ` · ${timeStr}` : ''}
                        </div>
                        {result.note && (
                          <p className="text-xs text-gray-500 mt-0.5 italic line-clamp-2">"{result.note}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      </div>{/* end dp-split */}

      {/* ⑧ Footer — TC Only */}
      {!isRun && (
        <div className="px-5 py-3 border-t border-gray-200 flex gap-2 flex-shrink-0">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500 text-white rounded-lg text-xs font-semibold hover:bg-indigo-600 transition-colors cursor-pointer"
          >
            <i className="ri-edit-line" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-red-500 border border-red-300 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors cursor-pointer"
          >
            <i className="ri-delete-bin-6-line" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
