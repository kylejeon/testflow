import React, { useState } from 'react';

export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

const ALL_STATUSES = ['passed', 'failed', 'blocked', 'retest', 'untested'] as const;

const STATUS_STYLE: Record<string, string> = {
  passed: 'bg-green-50 border-green-200 text-green-700',
  failed: 'bg-red-50 border-red-200 text-red-700',
  blocked: 'bg-amber-50 border-amber-200 text-amber-700',
  retest: 'bg-violet-50 border-violet-200 text-violet-700',
  untested: 'bg-slate-50 border-slate-200 text-slate-600',
};

interface ExportModalProps {
  runName: string;
  totalCount: number;
  availableTags: string[];
  /** Called with chosen format + filters when user clicks Export */
  onExport: (
    format: ExportFormat,
    statusFilter: Set<string>,
    tagFilter: Set<string>,
    includeAiSummary?: boolean
  ) => void | Promise<void>;
  onClose: () => void;
  exporting?: boolean;
  /** Optional live count: receives current filters, returns how many TCs will export */
  getFilteredCount?: (statusFilter: Set<string>, tagFilter: Set<string>) => number;
  /** When true, shows "Include AI Summary" checkbox (PDF format only) */
  hasSummary?: boolean;
  /** Pre-check the "Include AI Summary" checkbox when modal opens */
  defaultIncludeAiSummary?: boolean;
}

export function ExportModal({
  runName,
  totalCount,
  availableTags,
  onExport,
  onClose,
  exporting = false,
  getFilteredCount,
  hasSummary = false,
  defaultIncludeAiSummary = false,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(ALL_STATUSES));
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [includeAiSummary, setIncludeAiSummary] = useState(defaultIncludeAiSummary);

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };

  const displayCount = getFilteredCount
    ? getFilteredCount(statusFilter, tagFilter)
    : totalCount;

  const formats: { id: ExportFormat; icon: string; iconColor: string; label: string }[] = [
    { id: 'pdf',  icon: 'ri-file-pdf-line',     iconColor: 'text-red-500',     label: 'PDF'  },
    { id: 'csv',  icon: 'ri-file-text-line',     iconColor: 'text-green-600',   label: 'CSV'  },
    { id: 'xlsx', icon: 'ri-file-excel-2-line',  iconColor: 'text-emerald-600', label: 'Excel'},
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-[0.9375rem] font-semibold text-slate-900">Export</h3>
            <p className="text-[0.75rem] text-slate-400 mt-0.5 truncate max-w-[220px]">{runName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── Format ── */}
          <div>
            <p className="text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Format
            </p>
            <div className="grid grid-cols-3 gap-2">
              {formats.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    format === f.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <i className={`${f.icon} ${f.iconColor} text-xl`} />
                  <span className={`text-[0.6875rem] font-bold ${format === f.id ? 'text-indigo-700' : 'text-slate-600'}`}>
                    {f.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Status filter ── */}
          <div>
            <p className="text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Status Filter
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUSES.map(s => {
                const active = statusFilter.has(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggle(statusFilter, s, setStatusFilter)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[0.75rem] font-medium cursor-pointer transition-opacity ${STATUS_STYLE[s]} ${active ? 'opacity-100' : 'opacity-35'}`}
                  >
                    {active && <i className="ri-check-line text-[0.625rem]" />}
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Tag filter (only if tags exist) ── */}
          {availableTags.length > 0 && (
            <div>
              <p className="text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Tag Filter{' '}
                <span className="normal-case font-normal text-slate-400">(empty = all tags)</span>
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {availableTags.map(tag => {
                  const active = tagFilter.has(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggle(tagFilter, tag, setTagFilter)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[0.75rem] font-medium cursor-pointer transition-all ${
                        active
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 opacity-100'
                          : 'bg-slate-50 border-slate-200 text-slate-500 opacity-55 hover:opacity-100'
                      }`}
                    >
                      {active && <i className="ri-price-tag-3-line text-[0.625rem]" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── AI Summary option (PDF only) ── */}
          {hasSummary && format === 'pdf' && (
            <div>
              <button
                type="button"
                onClick={() => setIncludeAiSummary(prev => !prev)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  includeAiSummary
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
                  includeAiSummary ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                }`}>
                  {includeAiSummary && <i className="ri-check-line text-white text-[9px]" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <i className="ri-sparkling-2-fill text-violet-500 text-sm" />
                    <span className={`text-[0.8125rem] font-semibold ${includeAiSummary ? 'text-indigo-700' : 'text-slate-700'}`}>
                      Include AI Summary
                    </span>
                  </div>
                  <p className="text-[0.6875rem] text-slate-400 mt-0.5">
                    Prepends risk level, metrics, failure patterns &amp; recommendations
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ── Count preview ── */}
          <p className="text-[0.75rem] text-slate-400">
            <span className="font-semibold text-slate-600">{displayCount}</span>
            {' '}of {totalCount} test cases will be exported
          </p>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[0.8125rem] font-medium text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer border border-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onExport(format, statusFilter, tagFilter, includeAiSummary && format === 'pdf')}
            disabled={statusFilter.size === 0 || exporting}
            className="flex items-center gap-1.5 px-4 py-2 text-[0.8125rem] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
          >
            {exporting && <i className="ri-loader-4-line animate-spin text-sm" />}
            Export {format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}
