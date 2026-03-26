import { useState } from 'react';

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

  // Assignee
  projectMembers?: any[];
  assigneeName?: string;
  onAssigneeChange?: (name: string) => void;

  // Image preview
  onPreviewImage?: (url: string, name: string) => void;

  // Folder metadata for icon+color display
  folders?: Array<{ id: string; name: string; icon: string; color: string }>;
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

function parseSteps(raw?: string): { step: string; expectedResult: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return raw.split('\n').filter(Boolean).map((s) => ({
    step: s.replace(/^\d+\.\s*/, ''),
    expectedResult: '',
  }));
}

const STATUS_COLORS: Record<string, string> = {
  passed:   'bg-green-50 text-green-700 border border-green-200',
  failed:   'bg-red-50 text-red-700 border border-red-200',
  blocked:  'bg-amber-50 text-amber-700 border border-amber-200',
  retest:   'bg-violet-50 text-violet-700 border border-violet-200',
  untested: 'bg-gray-50 text-gray-500 border border-gray-200',
};

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#FEE2E2', color: '#991B1B' },
  high:     { bg: '#FEE2E2', color: '#991B1B' },
  medium:   { bg: '#FEF3C7', color: '#D97706' },
  low:      { bg: '#F1F5F9', color: '#64748B' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
            className="text-xs text-gray-700 leading-relaxed prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded [&_img]:my-1 [&_img]:cursor-pointer [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
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
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{step}</p>
        )}
        {expectedResult && (
          <p className="text-[0.6875rem] text-green-600 mt-1 flex items-start gap-1">
            <i className="ri-checkbox-circle-line text-xs flex-shrink-0 mt-0.5" />
            {expectedResult}
          </p>
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
  projectMembers = [],
  assigneeName,
  onAssigneeChange,
  onPreviewImage,
  folders = [],
}: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'results' | 'issues' | 'history'>('comments');
  const [stepsCollapsed, setStepsCollapsed] = useState(false);
  const [localStepResults, setLocalStepResults] = useState<Record<number, 'passed' | 'failed'>>({});

  const isRun = context === 'run';
  const effectiveStepResults = Object.keys(stepResults).length > 0 ? stepResults : localStepResults;
  const steps = parseSteps(testCase.steps);
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
  const uniqueIssues = Array.from(
    new Map(allIssues.map((i) => [i.issueKey, i])).values()
  );

  return (
    <div className="w-[500px] min-w-[500px] bg-white border-l border-gray-200 flex flex-col overflow-hidden flex-shrink-0">

      {/* ① Header */}
      <div className="px-5 pt-4 pb-3.5 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            {testCase.customId && (
              <div className="font-mono text-[0.6875rem] text-gray-400 mb-1">{testCase.customId}</div>
            )}
            <h3 className="text-[0.9375rem] font-bold text-gray-900 leading-[1.3]">{testCase.title}</h3>
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
        <div className="flex items-center gap-1.5 px-5 py-[0.625rem] border-b border-[#F1F5F9] flex-shrink-0">
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
            className="flex items-center gap-1 px-2.5 py-[0.3125rem] rounded text-xs font-semibold bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] transition-colors cursor-pointer border-0"
          >
            <i className="ri-add-line text-sm" />
            Add Result
          </button>

          <div className="flex-1" />

          {/* Pass & Next */}
          <button
            onClick={onPassAndNext}
            className="flex items-center gap-1 px-2.5 py-[0.3125rem] rounded text-xs font-semibold bg-[#22C55E] text-white hover:bg-[#16A34A] transition-colors cursor-pointer border-0"
          >
            <i className="ri-check-line text-sm" />
            Pass &amp; Next
          </button>

          {/* Nav ↑↓ */}
          <button
            onClick={onPrev}
            disabled={!canGoPrev}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 bg-white text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Previous"
          >
            <i className="ri-arrow-up-s-line text-[0.875rem]" />
          </button>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 bg-white text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Next"
          >
            <i className="ri-arrow-down-s-line text-[0.875rem]" />
          </button>
        </div>
      )}

      {/* ③ Meta Grid — Always visible */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Priority */}
          <div>
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-0.5">Priority</div>
            {(() => {
              const style = PRIORITY_STYLE[testCase.priority] || PRIORITY_STYLE.low;
              return (
                <span
                  className="inline-flex items-center gap-1 px-2 py-[0.125rem] rounded-full text-[0.625rem] font-semibold"
                  style={{ background: style.bg, color: style.color }}
                >
                  <i className="ri-flag-fill" />
                  {testCase.priority.charAt(0).toUpperCase() + testCase.priority.slice(1)}
                </span>
              );
            })()}
          </div>

          {/* Folder */}
          <div>
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-0.5">Folder</div>
            <div className="text-[0.8125rem] font-medium text-gray-800 flex items-center gap-1.5">
              {testCase.folder ? (() => {
                const f = folders.find(fd => fd.name === testCase.folder);
                const fs = FOLDER_COLOR_MAP[f?.color || 'indigo'] || { bg: '#EEF2FF', fg: '#6366F1' };
                const icon = f?.icon || 'ri-folder-line';
                return (
                  <>
                    <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 4, background: fs.bg }}>
                      <i className={`${icon} text-[0.6875rem]`} style={{ color: fs.fg }}></i>
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
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-0.5">Tags</div>
            {tagList.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {tagList.map((tag) => (
                  <span key={tag} className="text-[0.6875rem] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[0.8125rem] text-gray-400">—</span>
            )}
          </div>

          {/* Assignee */}
          <div>
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-0.5">Assignee</div>
            {projectMembers.length > 0 ? (
              <div className="relative">
                <div className="flex items-center gap-1.5 px-2 py-1 border border-gray-200 rounded-lg bg-white text-[0.8125rem]">
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
              <div className="text-[0.8125rem] font-medium text-gray-700">
                {testCase.assignee || <span className="text-gray-400">—</span>}
              </div>
            )}
          </div>

          {/* Created */}
          <div>
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-0.5">Created</div>
            <div className="text-[0.8125rem] font-medium text-gray-800">{formatDate(testCase.createdAt)}</div>
          </div>
        </div>
      </div>

      {/* ④ Steps Toggle Bar */}
      <button
        onClick={() => setStepsCollapsed(!stepsCollapsed)}
        className="flex items-center justify-between w-full px-5 py-2 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200 flex-shrink-0 cursor-pointer border-l-0 border-r-0 border-t-0"
      >
        <div className="flex items-center gap-2">
          <i
            className={`ri-arrow-down-s-line text-gray-500 text-base transition-transform duration-200 ${stepsCollapsed ? '-rotate-90' : ''}`}
          />
          <span className="text-[0.6875rem] font-bold text-gray-600 uppercase tracking-wider">Test Steps</span>
        </div>
        {isRun && steps.length > 0 ? (
          <span className="text-[0.6875rem]">
            <span className={`font-semibold ${passedCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>{passedCount}</span>
            <span className="text-gray-300 mx-0.5">/</span>
            <span className="text-gray-500">{steps.length} steps passed</span>
          </span>
        ) : (
          <span className="text-[0.6875rem] text-gray-400">
            {steps.length} step{steps.length !== 1 ? 's' : ''}
            {testCase.attachments && testCase.attachments.length > 0 && ` · ${testCase.attachments.length} attachment${testCase.attachments.length !== 1 ? 's' : ''}`}
          </span>
        )}
      </button>

      {/* ⑤ Steps Area — collapsible, max-height 40vh */}
      {!stepsCollapsed && (
        <div className="max-h-[40vh] overflow-y-auto px-5 py-3.5 border-b border-gray-200 flex-shrink-0 space-y-3">
          {/* Precondition */}
          {testCase.precondition && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <i className="ri-alert-line text-amber-500 text-xs" />
                <span className="text-[0.6875rem] font-bold text-amber-700 uppercase tracking-wider">Precondition</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">{testCase.precondition}</p>
            </div>
          )}

          {/* Steps */}
          {steps.length > 0 ? (
            <div className="space-y-1.5">
              {steps.map((s, i) => (
                <StepRow
                  key={i}
                  step={s.step}
                  expectedResult={s.expectedResult}
                  index={i}
                  result={effectiveStepResults[i]}
                  showResultButtons={isRun}
                  onStepResult={handleStepResult}
                  onPreviewImage={onPreviewImage}
                />
              ))}
            </div>
          ) : testCase.expected_result ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <i className="ri-checkbox-circle-line text-indigo-500 text-xs" />
                <span className="text-[0.6875rem] font-bold text-indigo-700 uppercase tracking-wider">Expected Result</span>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed">{testCase.expected_result}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">No steps defined</p>
          )}

          {/* Attachments */}
          {testCase.attachments && testCase.attachments.length > 0 && (
            <div>
              <div className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Attachments</div>
              <div className="grid grid-cols-3 gap-1.5">
                {testCase.attachments.map((file, i) => (
                  <a
                    key={i}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 h-12 px-2 bg-gray-50 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors overflow-hidden"
                    title={file.name}
                  >
                    {isImageFile(file.name) ? (
                      <img src={file.url} alt={file.name} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                    ) : (
                      <i className="ri-file-text-line text-gray-400 text-base flex-shrink-0" />
                    )}
                    <span className="text-[0.625rem] text-gray-600 truncate">{file.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ⑥ Tab Bar */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {(['comments', 'results', 'issues', 'history'] as const).map((tab) => {
          const labels: Record<string, string> = { comments: 'Comments', results: 'Results', issues: 'Issues', history: 'History' };
          const counts: Record<string, number | undefined> = {
            comments: comments.length || undefined,
            results: testResults.length || undefined,
            issues: uniqueIssues.length || undefined,
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

      {/* ⑦ Tab Body — flex-1, scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-4">

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            <div>
              <textarea
                value={commentText}
                onChange={(e) => onCommentChange?.(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs resize-none"
              />
              <button
                onClick={onCommentSubmit}
                disabled={!commentText?.trim()}
                className="mt-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Post Comment
              </button>
            </div>
            {loadingComments ? (
              <div className="text-center py-6">
                <i className="ri-loader-4-line animate-spin text-xl text-gray-400" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-6">
                <i className="ri-chat-3-line text-2xl text-gray-300 block mb-1" />
                <p className="text-xs text-gray-400">No comments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="bg-white border border-gray-100 rounded-lg p-3 group relative">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-white text-[0.4375rem] font-bold flex-shrink-0">
                        {c.author.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-gray-800">{c.author}</span>
                          <span className="text-[0.6875rem] text-gray-400">
                            {c.timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{c.text}</p>
                      </div>
                      <button
                        onClick={() => onCommentDelete?.(c.id)}
                        className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer flex-shrink-0"
                      >
                        <i className="ri-delete-bin-line text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-2.5">
            {testResults.length === 0 ? (
              <div className="text-center py-6">
                <i className="ri-file-list-line text-2xl text-gray-300 block mb-1" />
                <p className="text-xs text-gray-400">No test results yet</p>
              </div>
            ) : (
              testResults.map((result) => {
                const isAutomated =
                  result.author && (
                    result.author.includes('GitHub Actions') ||
                    result.author.includes('GitLab CI') ||
                    result.author.includes('Jenkins') ||
                    result.author.includes('CI/CD') ||
                    result.is_automated
                  );
                return (
                  <div
                    key={result.id}
                    className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => onResultClick?.(result)}
                  >
                    <div className="flex items-center gap-2.5">
                      {isAutomated ? (
                        <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="ri-robot-line text-purple-600" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {result.author ? result.author.substring(0, 2).toUpperCase() : 'NA'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-semibold capitalize ${STATUS_TEXT_COLORS[result.status] || 'text-gray-700'}`}>
                            {result.status}
                          </span>
                          {result.elapsed && result.elapsed !== '00:00' && (
                            <span className="text-[0.6875rem] text-gray-400">{result.elapsed}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[0.6875rem] text-gray-500">
                          <span className="font-medium text-gray-700">{result.author}</span>
                          <span className="text-gray-300">·</span>
                          <span>
                            {result.timestamp instanceof Date
                              ? result.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : ''}
                          </span>
                        </div>
                        {result.note && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{result.note}</p>
                        )}
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
          <div className="space-y-2.5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Linked Issues</span>
              <button
                onClick={onAddIssue}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
              >
                <i className="ri-add-line" />
                Add Issue
              </button>
            </div>

            {!isProfessionalOrHigher && (
              <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <div className="flex items-start gap-2.5">
                  <i className="ri-lock-line text-indigo-600 text-lg mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800 mb-1">Jira integration requires Professional+</p>
                    <p className="text-xs text-gray-500">Upgrade to create and manage Jira issues from test results.</p>
                  </div>
                </div>
              </div>
            )}

            {uniqueIssues.length === 0 ? (
              <div className="text-center py-6">
                <i className="ri-bug-line text-2xl text-gray-300 block mb-1" />
                <p className="text-xs text-gray-400">No issues linked</p>
              </div>
            ) : (
              uniqueIssues.map((issue, idx) => {
                const issueUrl = jiraDomain ? `https://${jiraDomain}/browse/${issue.issueKey}` : '';
                const card = (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="ri-bug-line text-red-600 text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800">{issue.issueKey}</div>
                      <div className="text-[0.6875rem] text-gray-500">From run: {issue.runName}</div>
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
              })
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="text-center py-8">
            <i className="ri-time-line text-2xl text-gray-300 block mb-1" />
            <p className="text-xs text-gray-400">No history yet</p>
          </div>
        )}
      </div>

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
