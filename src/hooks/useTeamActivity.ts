import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AVATAR_COLORS = ['#6366F1', '#10B981', '#EC4899', '#F59E0B', '#8B5CF6', '#06B6D4', '#3B82F6', '#EF4444'];

export interface TeamMember {
  userId: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  isOnline: boolean;
  executedToday: number;
  createdToday: number;
  failedToday: number;
  lastAction: string;
  lastTime: string;
}

export type FeedBadgeType = 'created' | 'executed' | 'failed' | 'commented';

export interface FeedItem {
  key: string;
  initials: string;
  color: string;
  actorName: string;
  action: string;
  target: string;
  badge: { text: string; type: FeedBadgeType };
  time: string;
  project: string;
  createdAt: string;
}

export interface TeamActivityData {
  members: TeamMember[];
  heatmapData: number[];  // 28 cells: 4 weeks × 7 days (Mon–Sun), intensity 0–5
  feedItems: FeedItem[];
  activeToday: number;
  tcCreatedToday: number;
  tcExecutedToday: number;
  tcPassedToday: number;
  tcFailedToday: number;
  tcBlockedToday: number;
  totalMembers: number;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function useTeamActivity() {
  const navigate = useNavigate();
  const [data, setData] = useState<TeamActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      const userId = session.user.id;

      // Get user's project IDs
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);

      const projectIds = memberRows?.map(m => m.project_id) ?? [];
      if (projectIds.length === 0) { setData(empty()); return; }

      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // All runs (needed to get run IDs for test_results lookup)
      const { data: allRuns } = await supabase
        .from('test_runs')
        .select('id, project_id, name')
        .in('project_id', projectIds);

      const runIds = (allRuns ?? []).map(r => r.id);
      const runProjectMap: Record<string, string> = {};
      (allRuns ?? []).forEach(r => { runProjectMap[r.id] = r.project_id; });
      const runNameMap: Record<string, string> = {};
      (allRuns ?? []).forEach(r => { runNameMap[r.id] = r.name; });

      // Parallel fetches
      const [
        { data: allMembersData },
        { data: projectsData },
        { data: recentTCs },
        { data: recentResults },
        { data: recentComments },
      ] = await Promise.all([
        // All members across user's projects (distinct by user_id)
        supabase
          .from('project_members')
          .select('user_id, role, profiles(full_name, email, avatar_emoji)')
          .in('project_id', projectIds),

        supabase.from('projects').select('id, name').in('id', projectIds),

        // Recent TCs (last 30 days)
        supabase
          .from('test_cases')
          .select('id, title, project_id, priority, created_by, created_at')
          .in('project_id', projectIds)
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })
          .limit(50),

        // Recent test results (last 30 days) — only if runs exist
        runIds.length > 0
          ? supabase
              .from('test_results')
              .select('id, run_id, test_case_id, status, author, created_at')
              .in('run_id', runIds)
              .gte('created_at', thirtyDaysAgo)
              .order('created_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [] }),

        // Recent comments (last 30 days)
        supabase
          .from('test_case_comments')
          .select('id, test_case_id, user_id, comment, created_at, test_cases(title, project_id)')
          .in('test_case_id',
            // We need test case IDs for user's projects — use a subquery approach via filtering
            // First get all TC IDs for projects (limited)
            [] // will handle separately below if needed
          )
          .gte('created_at', thirtyDaysAgo)
          .limit(30),
      ]);

      const projectNameMap: Record<string, string> = {};
      (projectsData ?? []).forEach(p => { projectNameMap[p.id] = p.name; });

      // Deduplicate members by user_id
      const seenUsers = new Set<string>();
      const memberMap: Record<string, { userId: string; name: string; email: string; role: string }> = {};
      (allMembersData ?? []).forEach((m) => {
        if (seenUsers.has(m.user_id)) return;
        seenUsers.add(m.user_id);
        const profile = (m as { user_id: string; role: string; profiles?: { full_name?: string; email?: string } | null }).profiles;
        const name = profile?.full_name || profile?.email || 'Unknown';
        memberMap[m.user_id] = { userId: m.user_id, name, email: profile?.email ?? '', role: m.role ?? '' };
      });

      const memberList = Object.values(memberMap);

      // Build a map: profile UUID → name (for matching created_by in test_cases)
      const profileByEmail: Record<string, string> = {};
      memberList.forEach(m => { if (m.email) profileByEmail[m.email] = m.userId; });

      // Per-member stats today
      const memberStatsToday: Record<string, { created: number; executed: number; failed: number; lastAction: string; lastTime: string }> = {};
      memberList.forEach(m => {
        memberStatsToday[m.userId] = { created: 0, executed: 0, failed: 0, lastAction: '', lastTime: '' };
      });

      // TC created today (by user)
      const tcsToday = (recentTCs ?? []).filter(tc => tc.created_at >= todayISO);
      tcsToday.forEach(tc => {
        const uid = tc.created_by;
        if (uid && memberStatsToday[uid]) {
          memberStatsToday[uid].created++;
          if (!memberStatsToday[uid].lastTime || tc.created_at > memberStatsToday[uid].lastTime) {
            memberStatsToday[uid].lastAction = `Created ${tc.title.slice(0, 20)}`;
            memberStatsToday[uid].lastTime = tc.created_at;
          }
        }
      });

      // Test results today — match author string to member by email
      const resultsToday = (recentResults ?? []).filter(r => r.created_at >= todayISO);
      resultsToday.forEach(r => {
        // Try to match author to a user by email
        const uid = r.author ? profileByEmail[r.author] : null;
        if (uid && memberStatsToday[uid]) {
          memberStatsToday[uid].executed++;
          if (r.status === 'failed') memberStatsToday[uid].failed++;
          if (!memberStatsToday[uid].lastTime || r.created_at > memberStatsToday[uid].lastTime) {
            memberStatsToday[uid].lastAction = `Executed test case`;
            memberStatsToday[uid].lastTime = r.created_at;
          }
        }
      });

      // Last activity per member (across all recent data)
      (recentTCs ?? []).forEach(tc => {
        const uid = tc.created_by;
        if (uid && memberStatsToday[uid] && (!memberStatsToday[uid].lastTime || tc.created_at > memberStatsToday[uid].lastTime)) {
          memberStatsToday[uid].lastAction = `Created ${tc.title.slice(0, 20)}`;
          memberStatsToday[uid].lastTime = tc.created_at;
        }
      });

      const members: TeamMember[] = memberList.map((m, i) => {
        const stats = memberStatsToday[m.userId];
        const isOnline = !!(stats.lastTime && stats.lastTime >= oneHourAgo);
        return {
          userId: m.userId,
          name: m.name,
          initials: getInitials(m.name),
          color: AVATAR_COLORS[i % AVATAR_COLORS.length],
          role: m.role,
          isOnline,
          executedToday: stats.executed,
          createdToday: stats.created,
          failedToday: stats.failed,
          lastAction: stats.lastAction || 'No recent activity',
          lastTime: stats.lastTime ? timeAgo(stats.lastTime) : '',
        };
      }).sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0) || b.executedToday + b.createdToday - a.executedToday - a.createdToday);

      // Summary stats today
      const activeToday = members.filter(m => m.isOnline || m.executedToday > 0 || m.createdToday > 0).length;
      const tcCreatedToday = tcsToday.length;
      const tcExecutedToday = resultsToday.filter(r => r.status !== 'untested').length;
      const tcPassedToday = resultsToday.filter(r => r.status === 'passed').length;
      const tcFailedToday = resultsToday.filter(r => r.status === 'failed').length;
      const tcBlockedToday = resultsToday.filter(r => r.status === 'blocked').length;

      // Heatmap: 28 days (4×7), count test_results + test_cases per day, mapped to intensity 0–5
      const activityByDay: Record<string, number> = {};
      const now = new Date();
      for (let d = 27; d >= 0; d--) {
        const day = new Date(now);
        day.setDate(day.getDate() - d);
        activityByDay[toDateStr(day)] = 0;
      }
      (recentResults ?? []).forEach(r => {
        const d = r.created_at.slice(0, 10);
        if (d in activityByDay) activityByDay[d]++;
      });
      (recentTCs ?? []).forEach(tc => {
        const d = tc.created_at.slice(0, 10);
        if (d in activityByDay) activityByDay[d]++;
      });

      // Align to Mon–Sun grid (start from Monday 4 weeks ago)
      const monday4WeeksAgo = new Date(now);
      // Go back to last Monday
      const dayOfWeek = monday4WeeksAgo.getDay(); // 0=Sun, 1=Mon...
      const daysToLastMon = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      monday4WeeksAgo.setDate(monday4WeeksAgo.getDate() - daysToLastMon - 21);
      monday4WeeksAgo.setHours(0, 0, 0, 0);

      const activityValues = Object.values(activityByDay);
      const maxActivity = Math.max(...activityValues, 1);
      const heatmapData: number[] = [];
      for (let i = 0; i < 28; i++) {
        const d = new Date(monday4WeeksAgo);
        d.setDate(d.getDate() + i);
        const key = toDateStr(d);
        const count = activityByDay[key] ?? 0;
        // Map to 0–5 intensity
        const intensity = count === 0 ? 0 : Math.min(5, Math.ceil((count / maxActivity) * 5));
        heatmapData.push(intensity);
      }

      // Activity feed: combine TCs + results, sort by created_at desc
      interface RawFeedItem { createdAt: string; item: FeedItem }
      const rawFeed: RawFeedItem[] = [];

      // From test_cases (created)
      (recentTCs ?? []).slice(0, 20).forEach((tc, idx) => {
        const uid = tc.created_by;
        const member = uid ? memberMap[uid] : null;
        const actorName = member?.name ?? 'Someone';
        const memberIdx = memberList.findIndex(m => m.userId === uid);
        rawFeed.push({
          createdAt: tc.created_at,
          item: {
            key: `tc-${tc.id}`,
            initials: getInitials(actorName),
            color: AVATAR_COLORS[(memberIdx >= 0 ? memberIdx : idx) % AVATAR_COLORS.length],
            actorName,
            action: 'created',
            target: tc.title.length > 30 ? tc.title.slice(0, 30) + '…' : tc.title,
            badge: { text: 'New', type: 'created' as FeedBadgeType },
            time: timeAgo(tc.created_at),
            project: projectNameMap[tc.project_id] ?? 'Unknown',
            createdAt: tc.created_at,
          },
        });
      });

      // From test_results (executed)
      (recentResults ?? []).slice(0, 30).forEach((r, idx) => {
        const authorUid = r.author ? profileByEmail[r.author] : null;
        const memberIdx = memberList.findIndex(m => m.userId === authorUid);
        const actorName = r.author || 'Someone';
        const projectId = runProjectMap[r.run_id];
        let badgeText = 'Executed';
        let badgeType: FeedBadgeType = 'executed';
        if (r.status === 'failed') { badgeText = 'Failed'; badgeType = 'failed'; }
        else if (r.status === 'blocked') { badgeText = 'Blocked'; badgeType = 'failed'; }
        else if (r.status === 'passed') { badgeText = 'Passed'; badgeType = 'executed'; }
        rawFeed.push({
          createdAt: r.created_at,
          item: {
            key: `result-${r.id}`,
            initials: getInitials(actorName),
            color: AVATAR_COLORS[(memberIdx >= 0 ? memberIdx : idx) % AVATAR_COLORS.length],
            actorName,
            action: r.status === 'failed' ? 'failed' : r.status === 'blocked' ? 'blocked' : 'executed',
            target: `in ${runNameMap[r.run_id] ?? 'run'}`,
            badge: { text: badgeText, type: badgeType },
            time: timeAgo(r.created_at),
            project: projectNameMap[projectId] ?? 'Unknown',
            createdAt: r.created_at,
          },
        });
      });

      rawFeed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const feedItems = rawFeed.slice(0, 15).map(r => r.item);

      setData({
        members,
        heatmapData,
        feedItems,
        activeToday,
        tcCreatedToday,
        tcExecutedToday,
        tcPassedToday,
        tcFailedToday,
        tcBlockedToday,
        totalMembers: memberList.length,
      });
    } catch (e) {
      console.error('useTeamActivity:', e);
      setError('Failed to load team activity');
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error };
}

function empty(): TeamActivityData {
  return {
    members: [], heatmapData: Array(28).fill(0),
    feedItems: [], activeToday: 0, tcCreatedToday: 0,
    tcExecutedToday: 0, tcPassedToday: 0, tcFailedToday: 0, tcBlockedToday: 0,
    totalMembers: 0,
  };
}
