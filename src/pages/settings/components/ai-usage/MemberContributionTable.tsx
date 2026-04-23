/**
 * f011 — Team Contribution table
 * Design Spec §3-5 (MemberContributionTable)
 * AC-8 (avatar + name + email + credits DESC), AC-9 (Self View hides this),
 * Edge case: >100 rows → "and N more" footer + virtualized body (v1 MVP: simple slice).
 */

import { useTranslation } from 'react-i18next';
import type { MemberContributionRow } from '../../../../types/aiUsage';
import { Avatar } from '../../../../components/Avatar';

const MAX_ROWS_VISIBLE = 100;

export interface MemberContributionTableProps {
  rows: MemberContributionRow[];
  className?: string;
}

function formatPercent(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export default function MemberContributionTable({
  rows,
  className = '',
}: MemberContributionTableProps) {
  const { t } = useTranslation('settings');
  const visible = rows.slice(0, MAX_ROWS_VISIBLE);
  const overflow = rows.length - visible.length;

  return (
    <section
      className={`bg-white border border-slate-200 rounded-xl overflow-hidden dark:bg-slate-800 dark:border-white/10 ${className}`}
      data-testid="ai-usage-member-contribution"
    >
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-white/[0.06]">
        <h3 className="text-[0.9375rem] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <i className="ri-team-line text-indigo-500" aria-hidden="true" />
          {t('aiUsage.memberTable.title')}
        </h3>
      </header>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50 dark:bg-white/[0.03] dark:border-white/[0.06]">
            <th
              scope="col"
              className="text-left px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500"
            >
              {t('aiUsage.memberTable.colMember')}
            </th>
            <th
              scope="col"
              className="text-right px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500"
            >
              {t('aiUsage.memberTable.colCredits')}
            </th>
            <th
              scope="col"
              className="text-right px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500"
            >
              {t('aiUsage.memberTable.colShare')}
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            const displayName = row.fullName || row.email || row.userId.slice(0, 8);
            return (
              <tr
                key={row.userId}
                data-testid={`member-row-${row.userId}`}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors dark:border-white/[0.06] dark:hover:bg-white/[0.04]"
                style={{ minHeight: '3.25rem' }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      userId={row.userId}
                      name={row.fullName ?? undefined}
                      email={row.email ?? undefined}
                      photoUrl={row.avatarUrl ?? undefined}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      {row.fullName ? (
                        <>
                          <div
                            className="text-[0.8125rem] font-semibold text-slate-900 dark:text-white truncate"
                            title={row.fullName}
                          >
                            {row.fullName}
                          </div>
                          {row.email && (
                            <div
                              className="text-[0.75rem] text-slate-500 dark:text-slate-400 truncate"
                              title={row.email}
                            >
                              {row.email}
                            </div>
                          )}
                        </>
                      ) : (
                        <div
                          className="text-[0.8125rem] font-medium text-slate-700 dark:text-slate-300 truncate"
                          title={displayName}
                        >
                          {displayName}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-[0.8125rem] font-semibold text-slate-900 dark:text-white tabular-nums">
                  {row.credits}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2 justify-end">
                    <div
                      aria-hidden="true"
                      className="w-[60px] h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.min(100, row.percent)}%` }}
                      />
                    </div>
                    <span className="text-[0.8125rem] text-slate-500 dark:text-slate-400 tabular-nums min-w-[3rem]">
                      {formatPercent(row.percent)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {overflow > 0 && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-white/[0.03] text-[0.75rem] text-slate-500 dark:text-slate-400">
          {t('aiUsage.memberTable.more', { n: overflow })}
        </div>
      )}
    </section>
  );
}
