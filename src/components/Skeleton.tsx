// Base primitive
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse-bright rounded dark:bg-slate-700 ${className}`}
    />
  );
}

// ── Generic skeletons (legacy, still used in some places) ────────────────────

// Card skeleton — generic dashboard widget placeholder
export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-40" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-2 flex-1 rounded-full" />
        <Skeleton className="h-2 flex-1 rounded-full" />
        <Skeleton className="h-2 flex-1 rounded-full" />
      </div>
    </div>
  );
}

// List row skeleton — generic fallback
export function ListRowSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
      <Skeleton className="h-4 w-4 rounded-sm" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 flex-1 max-w-xs" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-6 w-6 rounded-full" />
    </div>
  );
}

// Full list skeleton — wraps multiple ListRowSkeleton
export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading…">
      {Array.from({ length: rows }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

// Detail panel skeleton — TC Detail sidebar
export function DetailPanelSkeleton() {
  return (
    <div role="status" aria-label="Loading details" className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-3/4" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="space-y-3 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-md border border-slate-200 p-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Content-aware skeletons — pixel-matched to actual layouts ────────────────

// widths cycle so rows look varied (not all identical)
const TITLE_WIDTHS = ['w-48', 'w-56', 'w-40', 'w-52', 'w-44', 'w-60', 'w-36', 'w-50', 'w-42', 'w-38'];

/**
 * TestCasesListSkeleton
 * Matches: TestCaseList.tsx thead/tbody structure
 * Columns: checkbox | ID | Title | Priority | Status | Folder | Assignee | Updated
 */
export function TestCasesListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading test cases" className="flex-1 overflow-hidden">
      {/* Toolbar placeholder */}
      <div className="flex items-center justify-end gap-2 px-4 py-[0.6875rem] border-b border-gray-100 bg-white">
        <Skeleton className="h-7 w-24 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      {/* Table */}
      <table className="w-full border-collapse">
        <thead className="bg-slate-50 border-b border-gray-200">
          <tr>
            {/* checkbox */}
            <th className="px-4 py-[0.6875rem] w-9">
              <Skeleton className="h-4 w-4 rounded-sm" />
            </th>
            {/* ID */}
            <th className="px-4 py-[0.6875rem]" style={{ minWidth: '80px' }}>
              <Skeleton className="h-3 w-6" />
            </th>
            {/* Title */}
            <th className="px-4 py-[0.6875rem]">
              <Skeleton className="h-3 w-8" />
            </th>
            {/* Priority */}
            <th className="px-4 py-[0.6875rem]">
              <Skeleton className="h-3 w-12" />
            </th>
            {/* Status */}
            <th className="px-4 py-[0.6875rem]">
              <Skeleton className="h-3 w-10" />
            </th>
            {/* Folder */}
            <th className="px-4 py-[0.6875rem]">
              <Skeleton className="h-3 w-10" />
            </th>
            {/* Assignee */}
            <th className="px-4 py-[0.6875rem]">
              <Skeleton className="h-3 w-14" />
            </th>
            {/* Updated */}
            <th className="px-4 py-[0.6875rem]">
              <Skeleton className="h-3 w-12" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {/* checkbox */}
              <td className="px-4 py-[0.6875rem] w-9">
                <Skeleton className="h-4 w-4 rounded-sm" />
              </td>
              {/* ID */}
              <td className="px-4 py-[0.6875rem]" style={{ minWidth: '80px' }}>
                <Skeleton className="h-4 w-14 rounded" />
              </td>
              {/* Title */}
              <td className="px-4 py-[0.6875rem]">
                <Skeleton className={`h-4 ${TITLE_WIDTHS[i % TITLE_WIDTHS.length]}`} />
              </td>
              {/* Priority */}
              <td className="px-4 py-[0.6875rem]">
                <Skeleton className="h-5 w-16 rounded-full" />
              </td>
              {/* Status */}
              <td className="px-4 py-[0.6875rem]">
                <Skeleton className="h-5 w-16 rounded-full" />
              </td>
              {/* Folder */}
              <td className="px-4 py-[0.6875rem]">
                <Skeleton className="h-4 w-20" />
              </td>
              {/* Assignee */}
              <td className="px-4 py-[0.6875rem]">
                <Skeleton className="h-6 w-6 rounded-full" />
              </td>
              {/* Updated */}
              <td className="px-4 py-[0.6875rem]">
                <Skeleton className="h-4 w-16" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * RunCardSkeleton
 * Matches: renderRunCard() in project-runs/page.tsx
 * Card with 5 rows: name+badges | milestone | progress bar | stats | footer
 */
export function RunCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      {/* Row 1: name + badges + menu */}
      <div className="flex items-center gap-2 mb-1.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <div className="ml-auto">
          <Skeleton className="h-6 w-6 rounded-md" />
        </div>
      </div>
      {/* Row 2: milestone */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <Skeleton className="h-3 w-3 rounded-sm" />
        <Skeleton className="h-3 w-28" />
      </div>
      {/* Row 3: progress bar + % */}
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="flex-1 h-[6px] rounded-full" />
        <Skeleton className="h-4 w-8" />
      </div>
      {/* Row 4: stats */}
      <div className="flex items-center gap-3.5 mb-2.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-18" />
        <Skeleton className="h-3 w-16" />
      </div>
      {/* Row 5: footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>
    </div>
  );
}

/**
 * RunsListSkeleton
 * Matches: loading block in project-runs/page.tsx
 */
export function RunsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading runs" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <RunCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * SharedStepsListSkeleton
 * Matches: table in project-shared-steps/page.tsx
 * Columns: ID | Name | Steps | Used by | Category | Tags | Ver. | actions
 */
export function SharedStepsListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading shared steps">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
            {['ID', 'Name', 'Steps', 'Used by', 'Category', 'Tags', 'Ver.', ''].map((h, i) => (
              <th
                key={i}
                style={{ padding: '0.625rem 1rem', textAlign: 'left', whiteSpace: 'nowrap' }}
              >
                {h && <Skeleton className="h-3 w-10" />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
              {/* ID badge */}
              <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                <Skeleton className="h-5 w-12 rounded" />
              </td>
              {/* Name + optional description */}
              <td style={{ padding: '0.75rem 1rem' }}>
                <Skeleton className={`h-4 ${TITLE_WIDTHS[i % TITLE_WIDTHS.length]}`} />
                {i % 3 !== 0 && <Skeleton className="mt-1 h-3 w-32" />}
              </td>
              {/* Steps count */}
              <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                <Skeleton className="h-5 w-6 rounded-full" />
              </td>
              {/* Used by */}
              <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                <Skeleton className="h-3 w-8" />
              </td>
              {/* Category */}
              <td style={{ padding: '0.75rem 1rem' }}>
                {i % 2 === 0 && <Skeleton className="h-5 w-16 rounded" />}
              </td>
              {/* Tags */}
              <td style={{ padding: '0.75rem 1rem' }}>
                <div className="flex gap-1">
                  {i % 3 !== 1 && <Skeleton className="h-5 w-12 rounded-full" />}
                  {i % 4 === 0 && <Skeleton className="h-5 w-10 rounded-full" />}
                </div>
              </td>
              {/* Version */}
              <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                <Skeleton className="h-3 w-4" />
              </td>
              {/* Actions */}
              <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                <Skeleton className="h-7 w-7 rounded-md" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * RequirementsListSkeleton
 * Matches: table in project-requirements/page.tsx
 * Columns: ID | Title | Priority | Status | Source | TCs | Coverage | actions
 */
export function RequirementsListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading requirements">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            {['ID', 'Title', 'Priority', 'Status', 'Source', 'TCs', 'Coverage', ''].map((h, i) => (
              <th
                key={i}
                style={{ padding: '0.625rem 0.875rem', textAlign: 'left', whiteSpace: 'nowrap' }}
              >
                {h && <Skeleton className="h-3 w-10" />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
              {/* ID */}
              <td style={{ padding: '0.75rem 0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton className="h-5 w-16 rounded" />
              </td>
              {/* Title */}
              <td style={{ padding: '0.75rem 0.875rem', maxWidth: '20rem' }}>
                <Skeleton className={`h-4 ${TITLE_WIDTHS[i % TITLE_WIDTHS.length]}`} />
              </td>
              {/* Priority */}
              <td style={{ padding: '0.75rem 0.875rem' }}>
                <Skeleton className="h-5 w-16 rounded-full" />
              </td>
              {/* Status */}
              <td style={{ padding: '0.75rem 0.875rem' }}>
                <Skeleton className="h-5 w-16 rounded-full" />
              </td>
              {/* Source */}
              <td style={{ padding: '0.75rem 0.875rem' }}>
                <Skeleton className="h-4 w-20" />
              </td>
              {/* TCs */}
              <td style={{ padding: '0.75rem 0.875rem' }}>
                <Skeleton className="h-4 w-8" />
              </td>
              {/* Coverage */}
              <td style={{ padding: '0.75rem 0.875rem', minWidth: '140px' }}>
                <div className="flex items-center gap-2">
                  <Skeleton className="flex-1 h-1.5 rounded-full" />
                  <Skeleton className="h-3 w-8" />
                </div>
              </td>
              {/* Actions */}
              <td style={{ padding: '0.75rem 0.875rem' }}>
                <Skeleton className="h-7 w-7 rounded-md" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * ProjectCardSkeleton
 * Matches: SparseState ProjectCard structure
 * Card with: icon+name+badge | description | stats row | footer
 */
export function ProjectCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      {/* Top row: icon + name + health badge */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
      </div>
      {/* Description */}
      <Skeleton className="mt-1 mb-4 h-4 w-full" />
      {/* Stats */}
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <div className="flex-1" />
        <div className="flex">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-5 rounded-full -ml-1.5" />
        </div>
      </div>
      {/* Footer */}
      <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100">
        <Skeleton className="h-3 w-3 rounded-sm" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

/**
 * ProjectsGridSkeleton
 * Matches: loading grid in ProjectsContent.tsx
 */
export function ProjectsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading projects"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}
