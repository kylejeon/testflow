import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useActivityFeed, type FeedFilters, type ActivityFeedItem } from '../../hooks/useActivityFeed';

interface ActivityFeedTabProps {
  projectId: string;
  subscriptionTier: number;
}

// ── Event icon/color config ───────────────────────────────────────────────────
const EVENT_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  test_result_passed:       { icon: 'ri-checkbox-circle-fill', color: '#16A34A', bgColor: '#ECFDF5' },
  test_result_failed:       { icon: 'ri-close-circle-fill',    color: '#DC2626', bgColor: '#FEF2F2' },
  test_result_blocked:      { icon: 'ri-forbid-fill',          color: '#D97706', bgColor: '#FFFBEB' },
  test_result_retest:       { icon: 'ri-refresh-fill',         color: '#7C3AED', bgColor: '#F5F3FF' },
  test_result_untested:     { icon: 'ri-subtract-line',        color: '#64748B', bgColor: '#F8FAFC' },
  run_started:              { icon: 'ri-play-circle-fill',     color: '#6366F1', bgColor: '#EEF2FF' },
  run_completed:            { icon: 'ri-flag-fill',            color: '#10B981', bgColor: '#ECFDF5' },
  tc_created:               { icon: 'ri-file-add-fill',        color: '#6366F1', bgColor: '#EEF2FF' },
  tc_updated:               { icon: 'ri-edit-fill',            color: '#F59E0B', bgColor: '#FFFBEB' },
  tc_comment_added:         { icon: 'ri-chat-3-fill',          color: '#64748B', bgColor: '#F8FAFC' },
  milestone_created:        { icon: 'ri-flag-2-fill',          color: '#F59E0B', bgColor: '#FFFBEB' },
  milestone_status_changed: { icon: 'ri-checkbox-circle-fill', color: '#10B981', bgColor: '#ECFDF5' },
  member_joined:            { icon: 'ri-user-add-fill',        color: '#6366F1', bgColor: '#EEF2FF' },
  member_role_changed:      { icon: 'ri-shield-user-fill',     color: '#F59E0B', bgColor: '#FFFBEB' },
};

const DEFAULT_CONFIG = { icon: 'ri-information-line', color: '#64748B', bgColor: '#F8FAFC' };

// ── Event message formatter ───────────────────────────────────────────────────
function formatEventMessage(item: ActivityFeedItem): string {
  const m = item.metadata;
  const tcPrefix = m.tc_custom_id ? `${m.tc_custom_id} ` : '';
  switch (item.event_type) {
    case 'test_result_passed':   return `marked ${tcPrefix}"${m.tc_title}" as Passed`;
    case 'test_result_failed':   return `marked ${tcPrefix}"${m.tc_title}" as Failed`;
    case 'test_result_blocked':  return `marked ${tcPrefix}"${m.tc_title}" as Blocked`;
    case 'test_result_retest':   return `marked ${tcPrefix}"${m.tc_title}" as Retest`;
    case 'test_result_untested': return `marked ${tcPrefix}"${m.tc_title}" as Untested`;
    case 'run_started':          return `started run "${m.run_name}"`;
    case 'run_completed':        return `completed run "${m.run_name}"`;
    case 'tc_created':           return `created TC "${m.tc_title}" (${m.priority || ''}, ${m.folder || 'root'})`;
    case 'tc_updated':           return `updated TC "${m.tc_title}"`;
    case 'tc_comment_added':     return `added a comment on TC "${m.tc_title}"`;
    case 'milestone_created':    return `created milestone "${m.milestone_name}"`;
    case 'milestone_status_changed': return `changed milestone "${m.milestone_name}" status: ${m.old_status} → ${m.status}`;
    case 'member_joined':        return 'joined the project';
    case 'member_role_changed':  return 'role was updated';
    default:                     return item.event_type;
  }
}

// ── Relative time ─────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Date grouping ─────────────────────────────────────────────────────────────
function groupByDate(items: ActivityFeedItem[]): [string, ActivityFeedItem[]][] {
  const groups: Record<string, ActivityFeedItem[]> = {};
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400000);

  items.forEach(item => {
    const d = new Date(item.created_at);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });

  return Object.entries(groups);
}

// ── FeedItem component ────────────────────────────────────────────────────────
function FeedItem({ item }: { item: ActivityFeedItem }) {
  const config = EVENT_CONFIG[item.event_type] ?? DEFAULT_CONFIG;
  const highlightClass = item.is_highlighted
    ? item.event_type.includes('failed')
      ? 'border-l-[3px] border-l-red-500 bg-red-50/50 pl-[13px]'
      : 'border-l-[3px] border-l-amber-500 bg-amber-50/50 pl-[13px]'
    : '';

  return (
    <div className={`flex gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${highlightClass}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: config.bgColor }}
      >
        <i className={`${config.icon} text-[16px]`} style={{ color: config.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-slate-700 leading-[1.5]">
          <strong className="text-gray-900 font-semibold">{item.actor_name}</strong>
          {' '}{formatEventMessage(item)}
        </p>
        {item.metadata.comment && (
          <div className="mt-1 text-xs text-gray-600 px-2.5 py-1.5 bg-gray-50 rounded-md border-l-2 border-gray-200">
            "{item.metadata.comment}"
          </div>
        )}
        <p className="text-[12px] text-gray-400 mt-0.5">
          {item.metadata.run_name && !['run_started', 'run_completed'].includes(item.event_type) && (
            <span className="mr-1">Run: {item.metadata.run_name} ·</span>
          )}
          {timeAgo(item.created_at)}
        </p>
      </div>

      <span className="text-[11px] text-gray-400 flex-shrink-0 whitespace-nowrap pt-0.5">
        {new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
      </span>
    </div>
  );
}

// ── AI Daily Summary card (Pro+) ──────────────────────────────────────────────
function AIDailySummary({ projectId }: { projectId: string }) {
  const [expanded, setExpanded] = useState(true);
  const [summary, setSummary] = useState<{ text: string; points: string[] } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: runs } = await supabase
          .from('test_runs').select('id').eq('project_id', projectId);
        const runIds = (runs ?? []).map((r: any) => r.id);
        if (!runIds.length) { setSummary({ text: 'No tests were executed today.', points: [] }); return; }

        const since = new Date(Date.now() - 86400000).toISOString();
        const { data: results } = await supabase
          .from('test_results').select('status').in('run_id', runIds).gte('created_at', since);

        const total = (results ?? []).length;
        const passed = (results ?? []).filter((r: any) => r.status === 'passed').length;
        const failed = (results ?? []).filter((r: any) => r.status === 'failed').length;
        const blocked = (results ?? []).filter((r: any) => r.status === 'blocked').length;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        setSummary({
          text: total > 0
            ? `${total} tests were executed today with an overall pass rate of ${passRate}%.`
            : 'No tests have been executed today yet.',
          points: [
            total > 0 ? `✅ Passed ${passed} (${passRate}%)` : '',
            failed > 0 ? `❌ Failed ${failed} — review needed` : '',
            blocked > 0 ? `⚠️ Blocked ${blocked}` : '',
          ].filter(Boolean),
        });
      } catch (e) {
        console.error('AIDailySummary:', e);
      }
    }
    load();
  }, [projectId]);

  return (
    <div className="mx-5 mt-3 mb-3 rounded-xl overflow-hidden border border-violet-200"
      style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #eef2ff 100%)' }}>
      <button
        className="w-full flex items-center justify-between px-[22px] pt-[18px] pb-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[20px] leading-none">🤖</span>
          <span className="text-[15px] font-semibold text-gray-900">AI Daily Summary</span>
          <span className="text-[11px] font-semibold text-violet-600 bg-violet-100 border border-violet-200 px-1.5 py-0.5 rounded-full">Pro+</span>
        </div>
        <i className={`text-violet-500 transition-transform ${expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`} />
      </button>
      {expanded && (
        <div className="px-[22px] pb-[18px]">
          {summary ? (
            <>
              <p className="text-[14px] text-slate-700 leading-[1.65]">{summary.text}</p>
              {summary.points.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {summary.points.map((p, i) => (
                    <li key={i} className="text-[13px] text-slate-700 leading-[1.5]">{p}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="h-8 bg-violet-100 rounded animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}

// ── Filter Chips ──────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  test_execution: 'Test Execution',
  tc_management: 'TC Management',
  milestone: 'Milestone',
  team: 'Team',
};
const DATE_LABELS: Record<string, string> = { '1d': 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days' };

function FilterChips({
  filters,
  onChange,
}: {
  filters: FeedFilters;
  onChange: (f: FeedFilters) => void;
}) {
  const chips: { label: string; onRemove: () => void }[] = [];

  if (filters.category) {
    chips.push({
      label: CATEGORY_LABELS[filters.category] ?? filters.category,
      onRemove: () => onChange({ ...filters, category: null }),
    });
  }
  if (filters.actorId) {
    chips.push({
      label: 'Member filter applied',
      onRemove: () => onChange({ ...filters, actorId: null }),
    });
  }
  if (filters.dateRange !== '7d') {
    chips.push({
      label: DATE_LABELS[filters.dateRange],
      onRemove: () => onChange({ ...filters, dateRange: '7d' }),
    });
  }
  if (filters.searchQuery) {
    chips.push({
      label: `"${filters.searchQuery}"`,
      onRemove: () => onChange({ ...filters, searchQuery: '' }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-5 pb-2.5 pt-0 flex-wrap">
      {chips.map((chip, i) => (
        <span key={i} className="flex items-center gap-1 bg-indigo-50 text-indigo-500 px-2.5 py-1 rounded-full text-xs font-medium">
          {chip.label}
          <button onClick={chip.onRemove} className="ml-0.5 hover:text-indigo-900 cursor-pointer leading-none">
            <i className="ri-close-line text-[12px]" />
          </button>
        </span>
      ))}
      <button
        onClick={() => onChange({ category: null, actorId: null, dateRange: '7d', searchQuery: '' })}
        className="text-[12px] font-semibold text-red-500 hover:text-red-700 cursor-pointer"
      >
        Clear all
      </button>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
interface Member { user_id: string; full_name: string; }

function FilterBar({
  filters, onChange, projectId, subscriptionTier,
}: {
  filters: FeedFilters;
  onChange: (f: FeedFilters) => void;
  projectId: string;
  subscriptionTier: number;
}) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    supabase
      .from('project_members')
      .select('user_id, profiles!user_id(full_name)')
      .eq('project_id', projectId)
      .then(({ data }) => {
        setMembers((data ?? []).map((m: any) => ({
          user_id: m.user_id,
          full_name: m.profiles?.full_name ?? m.user_id.slice(0, 8),
        })));
      });
  }, [projectId]);

  const categories = [
    { value: null, label: 'All' },
    { value: 'test_execution', label: 'Test Execution' },
    { value: 'tc_management', label: 'TC Management' },
    { value: 'milestone', label: 'Milestone' },
    { value: 'team', label: 'Team' },
  ];

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-wrap gap-2">
      {/* Category filter */}
      <div className="flex items-center gap-1">
        {categories.map(opt => (
          <button
            key={opt.label}
            onClick={() => onChange({ ...filters, category: opt.value })}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              filters.category === opt.value
                ? 'bg-indigo-500 text-white border-indigo-500'
                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Member filter */}
        <select
          value={filters.actorId ?? ''}
          onChange={e => onChange({ ...filters, actorId: e.target.value || null })}
          className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white focus:outline-none cursor-pointer"
        >
          <option value="">Member: All</option>
          {members.map(m => (
            <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
          ))}
        </select>

        {/* Date range */}
        <select
          value={filters.dateRange}
          onChange={e => onChange({ ...filters, dateRange: e.target.value as FeedFilters['dateRange'] })}
          className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white focus:outline-none cursor-pointer"
        >
          <option value="1d">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>

        {/* Search (Starter+) */}
        {subscriptionTier >= 2 && (
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 w-[160px] bg-white">
            <i className="ri-search-line text-sm text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={filters.searchQuery}
              onChange={e => onChange({ ...filters, searchQuery: e.target.value })}
              className="text-[12px] text-gray-700 bg-transparent outline-none flex-1 min-w-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ActivityFeedTab({ projectId, subscriptionTier }: ActivityFeedTabProps) {
  const feedTopRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<FeedFilters>({
    category: null,
    actorId: null,
    dateRange: '7d',
    searchQuery: '',
  });

  const { feedItems, isLoading, loadMore, hasMore, newEventCount, refreshFeed } =
    useActivityFeed(projectId, filters, subscriptionTier);

  const grouped = groupByDate(feedItems);

  return (
    <div className="flex-1 overflow-y-auto">
      <div ref={feedTopRef} />

      {/* Live indicator (Starter+) */}
      {subscriptionTier >= 2 && (
        <div className="flex items-center gap-2 px-5 py-2 text-xs text-gray-500 border-b border-gray-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-emerald-600">Live</span>
          <span className="text-gray-300">|</span>
          <span>Real-time updates active</span>
        </div>
      )}

      {/* New event banner */}
      {newEventCount > 0 && (
        <div
          className="mx-5 mt-2 mb-1 text-center py-2 bg-indigo-500 text-white text-[13px] font-medium rounded-lg cursor-pointer shadow-lg shadow-indigo-200"
          onClick={() => {
            feedTopRef.current?.scrollIntoView({ behavior: 'smooth' });
            refreshFeed();
          }}
        >
          {newEventCount} new {newEventCount === 1 ? 'event' : 'events'} — click to refresh
        </div>
      )}

      {/* AI Daily Summary (Pro+) */}
      {subscriptionTier >= 3 && <AIDailySummary projectId={projectId} />}

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        projectId={projectId}
        subscriptionTier={subscriptionTier}
      />

      {/* Filter Chips */}
      <FilterChips filters={filters} onChange={setFilters} />

      {/* Feed content */}
      {isLoading ? (
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 border-b border-gray-100 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : feedItems.length === 0 ? (
        <div className="text-center py-16">
          <i className="ri-time-line text-4xl text-gray-300 block mb-3" />
          <p className="text-[13px] text-gray-400">
            {filters.category || filters.actorId || filters.searchQuery
              ? 'No activity matches the current filters'
              : 'No activity yet'}
          </p>
          {!filters.category && !filters.actorId && (
            <p className="text-[12px] text-gray-400 mt-1">
              Run tests or add TCs to see activity here
            </p>
          )}
        </div>
      ) : (
        <>
          {grouped.map(([dateLabel, items]) => (
            <div key={dateLabel}>
              {/* Date divider */}
              <div className="flex items-center gap-3 px-5 py-2.5">
                <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">{dateLabel}</span>
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-[11px] text-gray-400">{items.length}</span>
              </div>
              {/* Items */}
              {items.map(item => <FeedItem key={item.id} item={item} />)}
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="p-4 text-center">
              <button
                onClick={loadMore}
                className="text-[13px] font-semibold text-indigo-500 hover:text-indigo-700 cursor-pointer"
              >
                Load more <i className="ri-arrow-down-s-line" />
              </button>
            </div>
          )}

          {/* Free tier limit notice */}
          {subscriptionTier < 2 && feedItems.length >= 20 && (
            <div className="mx-5 my-4 p-3 bg-violet-50 border border-violet-200 rounded-lg text-center">
              <p className="text-[12px] text-violet-700">
                Free plan shows the most recent 20 events only.
                <a href="/pricing" className="font-semibold ml-1 hover:underline">Upgrade to Starter →</a>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
