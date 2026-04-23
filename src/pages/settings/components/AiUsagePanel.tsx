/**
 * f011 — AI Usage Panel (tab root)
 *
 * Related spec:
 *   - docs/specs/dev-spec-f011-ai-token-budget-dashboard.md (22 ACs)
 *   - docs/specs/design-spec-f011-ai-token-budget-dashboard.md (9 wireframes, 10 new comps)
 *
 * Responsibilities:
 *   1. Identify current user + effective billing owner (getEffectiveOwnerId)
 *   2. Route to Team View (Owner/Admin) or Self View (Member)
 *   3. Provide period filter + URL sync (searchParams.period)
 *   4. Fetch data via useAiUsageBreakdown (Team) or useMyAiUsage (Self)
 *   5. Aggregate raw rows into KPI + chart + tables (memoised)
 *   6. Handle loading / empty / error / forbidden states
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { getEffectiveOwnerId, getSharedPoolUsage } from '../../../lib/aiUsage';
import {
  MODE_COLORS,
  MODE_LABEL_KEYS,
  isPeriodAllowed,
  normalizeMode,
  orderDisplayedModes,
  resolvePeriodRange,
} from '../../../lib/aiUsageMeta';
import { PLAN_LIMITS } from '../../../hooks/useAiFeature';
import {
  useAiUsageBreakdown,
  useMyAiUsage,
} from '../../../hooks/useAiUsageBreakdown';
import { useToast } from '../../../components/Toast';
import EmptyState from '../../../components/EmptyState';
import IllustrationPlaceholder from '../../../components/illustrations/IllustrationPlaceholder';
import UpgradeBanner from '../../../components/UpgradeBanner';
import { Skeleton } from '../../../components/Skeleton';
import type {
  AiUsageBreakdownRow,
  DailySeriesPoint,
  MemberContributionRow,
  ModeBreakdownRow,
  PeriodKey,
} from '../../../types/aiUsage';
import type { DisplayMode } from '../../../lib/aiUsageMeta';
import PeriodFilter from './ai-usage/PeriodFilter';
import BurnRateCard from './ai-usage/BurnRateCard';
import KpiCard from './ai-usage/KpiCard';
import DailyUsageChart from './ai-usage/DailyUsageChart';
import ModeBreakdownTable from './ai-usage/ModeBreakdownTable';
import MemberContributionTable from './ai-usage/MemberContributionTable';
import ExportCsvButton from './ai-usage/ExportCsvButton';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayIsoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(iso: string): string {
  // 'YYYY-MM-DD' → 'Apr 12' style, locale independent
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function daysInCurrentUtcMonth(now: Date = new Date()): number {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
}

function daysElapsedInCurrentUtcMonth(now: Date = new Date()): number {
  return now.getUTCDate();
}

function daysLeftInCurrentUtcMonth(now: Date = new Date()): number {
  return Math.max(1, daysInCurrentUtcMonth(now) - daysElapsedInCurrentUtcMonth(now));
}

function aggregateDailySeries(
  rows: Array<{ day: string; mode: string; credits: number }>,
): { data: DailySeriesPoint[]; modes: DisplayMode[] } {
  // Group by day with per-mode credit totals
  const byDay = new Map<string, Record<string, number>>();
  const modesSeen = new Set<string>();
  for (const row of rows) {
    modesSeen.add(row.mode);
    const dayBucket = byDay.get(row.day) ?? {};
    const mode = normalizeMode(row.mode);
    dayBucket[mode] = (dayBucket[mode] ?? 0) + row.credits;
    byDay.set(row.day, dayBucket);
  }
  const modes = orderDisplayedModes(modesSeen);
  const data: DailySeriesPoint[] = Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, bucket]) => {
      const point: DailySeriesPoint = {
        day,
        label: formatDayLabel(day),
        total: Object.values(bucket).reduce((s, v) => s + v, 0),
      };
      for (const m of modes) {
        point[m] = bucket[m] ?? 0;
      }
      return point;
    });
  return { data, modes };
}

function aggregateModeBreakdown(
  rows: Array<{ mode: string; credits: number; calls: number }>,
  tLabel: (key: string) => string,
): ModeBreakdownRow[] {
  const acc = new Map<DisplayMode, { credits: number; calls: number }>();
  for (const row of rows) {
    const m = normalizeMode(row.mode);
    const cur = acc.get(m) ?? { credits: 0, calls: 0 };
    cur.credits += row.credits;
    cur.calls += row.calls;
    acc.set(m, cur);
  }
  const total = Array.from(acc.values()).reduce((s, r) => s + r.credits, 0);
  return Array.from(acc.entries())
    .map(([mode, r]) => ({
      mode,
      label: tLabel(MODE_LABEL_KEYS[mode]),
      credits: r.credits,
      calls: r.calls,
      percent: total > 0 ? (r.credits / total) * 100 : 0,
      color: MODE_COLORS[mode],
    }))
    .sort((a, b) => b.credits - a.credits);
}

function aggregateMemberContribution(
  rows: AiUsageBreakdownRow[],
  profileById: Record<string, ProfileLite>,
): MemberContributionRow[] {
  const byUser = new Map<string, number>();
  for (const row of rows) {
    byUser.set(row.user_id, (byUser.get(row.user_id) ?? 0) + row.credits_sum);
  }
  const total = Array.from(byUser.values()).reduce((s, v) => s + v, 0);
  return Array.from(byUser.entries())
    .map(([userId, credits]): MemberContributionRow => {
      const p = profileById[userId];
      return {
        userId,
        fullName: p?.full_name ?? null,
        email: p?.email ?? null,
        avatarUrl: p?.avatar_url ?? null,
        credits,
        percent: total > 0 ? (credits / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.credits - a.credits);
}

interface ProfileLite {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

async function fetchProfilesByIds(ids: string[]): Promise<ProfileLite[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', ids);
  if (error) throw error;
  return (data ?? []) as ProfileLite[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AiUsagePanel() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── 1. Resolve current user + effective owner ──
  const { data: session } = useQuery({
    queryKey: ['aiUsagePanel', 'session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: 60_000,
  });

  const { data: effective, isLoading: loadingEffective } = useQuery({
    queryKey: ['aiUsagePanel', 'effective', session?.id ?? 'none'],
    queryFn: async () => {
      if (!session) return null;
      const info = await getEffectiveOwnerId(session.id);
      return info;
    },
    enabled: !!session,
    staleTime: 60_000,
  });

  const { data: ownProfile } = useQuery({
    queryKey: ['aiUsagePanel', 'profile', session?.id ?? 'none'],
    queryFn: async () => {
      if (!session) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, subscription_tier')
        .eq('id', session.id)
        .maybeSingle();
      return data as (ProfileLite & { subscription_tier: number }) | null;
    },
    enabled: !!session,
    staleTime: 60_000,
  });

  // ── 2. Determine view mode ──
  //
  // Team View eligibility (AC-2, §4-3):
  //   - self is the billing owner (own tier > 1), OR
  //   - self is an organization admin/owner for an org whose projects are
  //     owned by `effective.ownerId` (verified against organization_members).
  //
  // The RPC itself re-checks authorization (SECURITY DEFINER). Client-side
  // detection is purely cosmetic: it toggles which sections render.
  const effectiveTier = effective?.tier ?? 1;
  const isOwnerSelf = effectiveTier > 1 && !!effective?.ownerId && effective.ownerId === session?.id;

  const { data: isOrgAdmin = false } = useQuery({
    queryKey: ['aiUsagePanel', 'orgAdmin', session?.id ?? 'none', effective?.ownerId ?? 'none'],
    queryFn: async () => {
      if (!session || !effective?.ownerId || isOwnerSelf) return false;
      // Find orgs whose projects are owned by the effective owner, then see if
      // the caller is admin/owner of any of them.
      const { data: projectsOfOwner } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('owner_id', effective.ownerId);
      const orgIds = Array.from(
        new Set((projectsOfOwner ?? []).map((p: { organization_id: string | null }) => p.organization_id).filter(Boolean)),
      );
      if (orgIds.length === 0) return false;
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', session.id)
        .in('organization_id', orgIds);
      return (memberships ?? []).some((m: { role: string }) => m.role === 'owner' || m.role === 'admin');
    },
    enabled: !!session && !!effective?.ownerId,
    staleTime: 5 * 60_000,
  });

  const isTeamView = isOwnerSelf || isOrgAdmin;

  // ── 2a. Calendar-month-to-date credits (THIS MONTH KPI) ──
  //
  // The THIS MONTH KPI card shows progress against the monthly plan quota
  // (e.g. 27 / 150). Its number MUST be scoped to the current UTC calendar
  // month regardless of the selected period filter — otherwise the
  // "used / quota" ratio becomes meaningless.
  //
  // Previously this card used `totalCredits` which aggregates over the
  // selected period (default 30d), so when a user started on Mar 24 the
  // card showed 27 credits while the project sidebar — which always uses
  // `getSharedPoolUsage` (calendar month) — showed 25. Same metric, two
  // windows. We now call `getSharedPoolUsage` here too so both cards stay
  // in lockstep.
  const { data: monthCredits = 0 } = useQuery({
    queryKey: ['aiUsagePanel', 'monthCredits', effective?.ownerId ?? 'none'],
    queryFn: async () => {
      if (!effective?.ownerId) return 0;
      return await getSharedPoolUsage(effective.ownerId);
    },
    enabled: !!effective?.ownerId,
    // Panel 을 벗어나 다른 페이지에서 credit 을 소비한 뒤 돌아왔을 때
    // "THIS MONTH" KPI 가 즉시 갱신되도록 staleTime 0 + refetchOnMount always.
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // ── 2b. Forbidden detection (Dev Spec §4-1 alt-flow 2) ──
  //
  // When a caller explicitly requests Team View via `?view=team` but their
  // role does NOT qualify (neither owner nor org admin), render a dedicated
  // 403 banner instead of silently falling back to Self View or Empty State.
  //
  // Rationale (QA P1-2, option 1):
  //   The RPC returns an empty array for unauthorized callers (by design,
  //   to avoid leaking role state). That collides with the "no data" empty
  //   state. We disambiguate at the UI layer by gating on an explicit URL
  //   intent — safer than changing the RPC contract. Any future entry point
  //   that wants to express "Team View" intent (e.g. a deep link from an
  //   email alert) can pass `?view=team` and will get a useful banner when
  //   the caller is a non-admin Member.
  const viewIntent = searchParams.get('view');
  const attemptingTeamView = viewIntent === 'team';
  const isForbidden = attemptingTeamView && !isTeamView && !loadingEffective;

  // ── 3. Period filter (URL-synced) ──
  //
  // Default = 'thisMonth' (calendar-month-to-date). This matches the "THIS MONTH"
  // KPI card scope + the project sidebar's aiUsageCount so all three surfaces
  // render the same number for new visitors. Users can still switch to rolling
  // windows (30d / 90d / 6m / 12m) via the PeriodFilter dropdown.
  const rawPeriod = searchParams.get('period') as PeriodKey | null;
  const validPeriods: PeriodKey[] = ['thisMonth', '30d', '90d', '6m', '12m'];
  let period: PeriodKey = 'thisMonth';
  if (rawPeriod && validPeriods.includes(rawPeriod) && isPeriodAllowed(rawPeriod, effectiveTier)) {
    period = rawPeriod;
  }

  const { from, to } = useMemo(() => resolvePeriodRange(period), [period]);

  const setPeriod = useCallback(
    (next: PeriodKey) => {
      const params = new URLSearchParams(searchParams);
      params.set('tab', 'ai-usage');
      params.set('period', next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // ── 4. Fetch usage data ──
  //
  // When `isForbidden === true` we suppress both Team and Self fetches so the
  // dedicated banner is the only thing rendered (AC-14, Dev Spec §4-1 alt 2).
  const teamQuery = useAiUsageBreakdown(
    isTeamView && !isForbidden ? effective?.ownerId : null,
    from,
    to,
  );
  const selfQuery = useMyAiUsage(
    !isTeamView && !isForbidden ? session?.id : null,
    from,
    to,
  );

  // For Team View: fetch profiles of team members to enrich Member Contribution + CSV export
  const memberIds = useMemo(() => {
    if (!isTeamView || !teamQuery.data) return [];
    return Array.from(new Set(teamQuery.data.map((r) => r.user_id)));
  }, [isTeamView, teamQuery.data]);

  const { data: memberProfiles } = useQuery({
    queryKey: ['aiUsagePanel', 'profiles', ...memberIds],
    queryFn: () => fetchProfilesByIds(memberIds),
    enabled: memberIds.length > 0,
    staleTime: 60_000,
  });

  const profileById = useMemo(() => {
    const map: Record<string, ProfileLite> = {};
    for (const p of memberProfiles ?? []) map[p.id] = p;
    return map;
  }, [memberProfiles]);

  // Also include own profile in the map so Self View member-like slices have data.
  useEffect(() => {
    if (ownProfile && !profileById[ownProfile.id]) {
      // no mutation needed — just guaranteed re-render when memberProfiles changes
    }
  }, [ownProfile, profileById]);

  // ── 5. Aggregate ──
  const normalizedRows = useMemo(() => {
    if (isTeamView) {
      return (teamQuery.data ?? []).map((r) => ({
        day: r.day,
        mode: r.mode,
        credits: r.credits_sum,
        calls: r.call_count,
        user_id: r.user_id,
      }));
    }
    // Self View — convert direct query rows to the shared shape
    const rows = selfQuery.data ?? [];
    const byDayMode = new Map<string, { credits: number; calls: number }>();
    for (const row of rows) {
      const day = row.created_at.slice(0, 10); // UTC ISO
      const key = `${day}__${row.mode}`;
      const cur = byDayMode.get(key) ?? { credits: 0, calls: 0 };
      cur.credits += row.credits_used ?? 1;
      cur.calls += 1;
      byDayMode.set(key, cur);
    }
    return Array.from(byDayMode.entries()).map(([key, v]) => {
      const [day, ...modeParts] = key.split('__');
      return {
        day,
        mode: modeParts.join('__'),
        credits: v.credits,
        calls: v.calls,
        user_id: session?.id ?? '',
      };
    });
  }, [isTeamView, teamQuery.data, selfQuery.data, session?.id]);

  const { data: chartData, modes: chartModes } = useMemo(
    () => aggregateDailySeries(normalizedRows),
    [normalizedRows],
  );

  const modeBreakdown = useMemo(
    () => aggregateModeBreakdown(normalizedRows, (k) => t(k)),
    [normalizedRows, t],
  );

  const memberRows = useMemo(() => {
    if (!isTeamView) return [];
    return aggregateMemberContribution(teamQuery.data ?? [], profileById);
  }, [isTeamView, teamQuery.data, profileById]);

  const totalCredits = useMemo(
    () => normalizedRows.reduce((s, r) => s + r.credits, 0),
    [normalizedRows],
  );

  // ── 6. KPI ──
  const tierLimit = PLAN_LIMITS[effectiveTier] ?? 3;
  const daysElapsed = daysElapsedInCurrentUtcMonth();
  const daysLeft = daysLeftInCurrentUtcMonth();
  const activeMembers = useMemo(() => {
    const ids = new Set(normalizedRows.map((r) => r.user_id));
    return ids.size;
  }, [normalizedRows]);
  const totalModesUsed = chartModes.length;

  // ── 7. UI handlers ──
  const isLoading =
    loadingEffective ||
    (isTeamView ? teamQuery.isLoading : selfQuery.isLoading);
  const isError = isTeamView ? teamQuery.isError : selfQuery.isError;
  const isEmpty = !isLoading && !isError && totalCredits === 0;

  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['aiUsageBreakdown'] }),
        qc.invalidateQueries({ queryKey: ['myAiUsage'] }),
      ]);
      showToast(t('aiUsage.toast.refreshed'), 'success');
    } catch {
      showToast(t('aiUsage.toast.refreshFailed'), 'error');
    }
  }, [qc, showToast, t]);

  const handleRetry = useCallback(() => {
    if (isTeamView) teamQuery.refetch();
    else selfQuery.refetch();
  }, [isTeamView, teamQuery, selfQuery]);

  const handleEmptyCta = useCallback(async () => {
    // Pick the first project this user is a member of; fallback to /projects
    try {
      if (!session) return navigate('/projects');
      const { data } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', session.id)
        .limit(1);
      const pid = (data ?? [])[0]?.project_id;
      if (pid) navigate(`/projects/${pid}/testcases?action=ai-generate`);
      else navigate('/projects');
    } catch {
      navigate('/projects');
    }
  }, [navigate, session]);

  // ── 8. Renders ──
  //
  // Forbidden short-circuit: the caller explicitly requested Team View
  // (`?view=team`) but does not qualify. Render only the header + a dedicated
  // 403 banner with a "Contact Owner" CTA. No data fetch, no chart, no tables.
  if (isForbidden) {
    return (
      <div className="max-w-[1160px] mx-auto px-4 md:px-8 pt-6 pb-12">
        <div className="flex items-center gap-3 mb-1">
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-[0.625rem] bg-violet-500/10 flex items-center justify-center"
          >
            <i className="ri-sparkling-2-fill text-violet-500 text-xl" />
          </div>
          <h2 className="text-[1.25rem] font-bold text-slate-900 dark:text-white">
            {t('aiUsage.title')}
          </h2>
        </div>
        <p className="text-[0.8125rem] text-slate-500 dark:text-slate-400 mb-4">
          {t('aiUsage.subtitle.team')}
        </p>
        <div className="border-t border-slate-200 dark:border-white/[0.06] my-4" />

        <div
          role="alert"
          data-testid="ai-usage-forbidden-banner"
          className="flex items-start gap-3 px-4 py-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/30"
        >
          <i
            className="ri-shield-keyhole-line text-amber-500 text-lg shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[0.875rem] font-semibold text-amber-800 dark:text-amber-200">
              {t('aiUsage.forbidden.title')}
            </p>
            <p className="text-[0.8125rem] text-amber-700 dark:text-amber-300 mt-0.5">
              {t('aiUsage.forbidden.body')}
            </p>
            <button
              type="button"
              onClick={() => {
                // Drop the `?view=team` intent so Self View (the Member's
                // valid default) renders on the next tick.
                const params = new URLSearchParams(searchParams);
                params.delete('view');
                setSearchParams(params, { replace: true });
              }}
              data-testid="ai-usage-forbidden-self-cta"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-amber-300 hover:bg-amber-100 text-[0.75rem] font-semibold text-amber-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              <i className="ri-user-line" aria-hidden="true" />
              {t('aiUsage.forbidden.selfCta')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1160px] mx-auto px-4 md:px-8 pt-6 pb-12">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-1">
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-[0.625rem] bg-violet-500/10 flex items-center justify-center"
        >
          <i className="ri-sparkling-2-fill text-violet-500 text-xl" />
        </div>
        <h2 className="text-[1.25rem] font-bold text-slate-900 dark:text-white">
          {isTeamView ? t('aiUsage.title') : t('aiUsage.titleSelf')}
        </h2>
      </div>
      <p className="text-[0.8125rem] text-slate-500 dark:text-slate-400 mb-4">
        {isTeamView ? t('aiUsage.subtitle.team') : t('aiUsage.subtitle.self')}
      </p>
      <div className="border-t border-slate-200 dark:border-white/[0.06] my-4" />

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <PeriodFilter value={period} onChange={setPeriod} tier={effectiveTier} />
        <button
          type="button"
          onClick={handleRefresh}
          aria-label={t('aiUsage.refresh')}
          data-testid="ai-usage-refresh"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[0.8125rem] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-slate-800 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
        >
          <i className="ri-refresh-line text-slate-500" aria-hidden="true" />
          {t('aiUsage.refresh')}
        </button>
        <div className="flex-1" />
        {isTeamView && !isEmpty && !isError && (
          <ExportCsvButton
            rows={teamQuery.data ?? []}
            emails={Object.fromEntries(
              Object.values(profileById).map((p) => [p.id, p.email ?? '']),
            )}
            names={Object.fromEntries(
              Object.values(profileById).map((p) => [p.id, p.full_name ?? p.email ?? '']),
            )}
            today={todayIsoDate()}
            onSuccess={() => showToast(t('aiUsage.toast.exportReady'), 'success')}
            onError={() => showToast(t('aiUsage.toast.exportFailed'), 'error')}
          />
        )}
      </div>

      {/* ── Error banner ── */}
      {isError && (
        <div
          role="alert"
          data-testid="ai-usage-error-banner"
          className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800/30"
        >
          <i className="ri-error-warning-line text-red-500 text-lg shrink-0" aria-hidden="true" />
          <span className="flex-1 text-[0.8125rem] text-red-700 dark:text-red-300">
            {t('aiUsage.error.title')}
          </span>
          <button
            type="button"
            onClick={handleRetry}
            data-testid="ai-usage-retry"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-red-300 hover:bg-red-100 text-[0.75rem] font-semibold text-red-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <i className="ri-refresh-line" aria-hidden="true" />
            {t('aiUsage.error.retry')}
          </button>
        </div>
      )}

      {/* ── Upgrade warning banner (80%+ / 100%+) ── */}
      {isTeamView && tierLimit > 0 && totalCredits / tierLimit >= 0.8 && (
        <UpgradeBanner
          message={
            totalCredits >= tierLimit
              ? t('aiUsage.warning.reached', { limit: tierLimit })
              : t('aiUsage.warning.near', { used: totalCredits, limit: tierLimit })
          }
          ctaLabel={t('aiUsage.warning.upgrade')}
          dismissKey={`ai-usage-warn-${effectiveTier}`}
          className="mb-6"
          hideDismiss={totalCredits >= tierLimit}
        />
      )}

      {/* ── KPI cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: isTeamView ? 4 : 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-5 dark:bg-slate-800 dark:border-white/10"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-8 w-24" />
              <Skeleton className="mt-2 h-3 w-32" />
              <Skeleton className="mt-3 h-1.5 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 ${
            isTeamView ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2'
          } gap-4 mb-6`}
        >
          <BurnRateCard
            variant="thisMonth"
            used={monthCredits}
            limit={tierLimit}
            daysElapsedInCycle={daysElapsed}
            daysLeftInCycle={daysLeft}
          />
          <BurnRateCard
            variant="burnRate"
            used={totalCredits}
            limit={tierLimit}
            daysElapsedInCycle={daysElapsed}
            daysLeftInCycle={daysLeft}
          />
          {isTeamView && (
            <>
              <KpiCard
                eyebrow={t('aiUsage.kpi.modeCountLabel')}
                primary={
                  <>
                    {totalModesUsed}
                    <span className="text-slate-400 dark:text-slate-500 text-base font-normal ml-1">
                      / 9
                    </span>
                  </>
                }
                sub={t('aiUsage.kpi.modeCountSub', { total: 9 })}
                testId="ai-usage-kpi-mode-count"
              />
              <KpiCard
                eyebrow={t('aiUsage.kpi.activeMembersLabel')}
                primary={
                  <>
                    {activeMembers}
                    <span className="text-slate-400 dark:text-slate-500 text-base font-normal ml-1">
                      / {Math.max(activeMembers, Object.keys(profileById).length)}
                    </span>
                  </>
                }
                sub={t('aiUsage.kpi.activeMembersSub')}
                testId="ai-usage-kpi-active-members"
              />
            </>
          )}
        </div>
      )}

      {/* ── Chart ── */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 dark:bg-slate-800 dark:border-white/10">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-[280px] w-full rounded-lg" />
        </div>
      ) : isError ? (
        <div
          data-testid="ai-usage-chart-placeholder"
          className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl h-[280px] flex items-center justify-center text-[0.8125rem] text-slate-400 mb-6"
        >
          {t('aiUsage.error.chartUnavailable')}
        </div>
      ) : isEmpty ? (
        <div className="mb-6">
          <EmptyState
            testId="ai-usage-empty"
            illustration={<IllustrationPlaceholder kind="testcases" />}
            title={t('aiUsage.empty.title')}
            description={t('aiUsage.empty.body')}
            cta={{
              label: t('aiUsage.empty.cta'),
              icon: <i className="ri-sparkling-2-line" aria-hidden="true" />,
              onClick: handleEmptyCta,
            }}
            size="md"
            tone="vivid"
          />
        </div>
      ) : (
        <DailyUsageChart
          data={chartData}
          modes={chartModes}
          fromLabel={todayIsoDate(from)}
          toLabel={todayIsoDate(to)}
          className="mb-6"
        />
      )}

      {/* ── Tables ── */}
      {!isLoading && !isError && !isEmpty && (
        <div
          className={`grid grid-cols-1 ${isTeamView ? 'xl:grid-cols-12' : ''} gap-4`}
        >
          <div className={isTeamView ? 'xl:col-span-5' : ''}>
            <ModeBreakdownTable rows={modeBreakdown} />
          </div>
          {isTeamView && (
            <div className="xl:col-span-7">
              <MemberContributionTable rows={memberRows} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
