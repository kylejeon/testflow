import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface FeedFilters {
  category: string | null;
  actorId: string | null;
  dateRange: '1d' | '7d' | '30d';
  searchQuery: string;
}

export interface ActivityFeedItem {
  id: string;
  event_type: string;
  event_category: string;
  actor_id: string | null;
  actor_name: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, any>;
  is_highlighted: boolean;
  created_at: string;
}

function getDateFrom(dateRange: FeedFilters['dateRange']): Date {
  const now = new Date();
  if (dateRange === '1d') return new Date(now.getTime() - 86400000);
  if (dateRange === '7d') return new Date(now.getTime() - 7 * 86400000);
  return new Date(now.getTime() - 30 * 86400000);
}

const PAGE_SIZE = 30;

export function useActivityFeed(
  projectId: string,
  filters: FeedFilters,
  subscriptionTier: number
) {
  const [feedItems, setFeedItems] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [newEventCount, setNewEventCount] = useState(0);

  const maxItems = subscriptionTier >= 2 ? 100 : 20;

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    setNewEventCount(0);
    try {
      let q = supabase
        .from('activity_logs')
        .select('id, event_type, event_category, actor_id, target_type, target_id, metadata, is_highlighted, created_at, actor:profiles!actor_id(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .gte('created_at', getDateFrom(filters.dateRange).toISOString());

      if (filters.category) q = q.eq('event_category', filters.category);
      if (filters.actorId) q = q.eq('actor_id', filters.actorId);

      const limit = Math.min(maxItems, PAGE_SIZE);
      q = q.limit(limit + 1); // fetch one extra to determine hasMore

      const { data, error } = await q;
      if (error) throw error;

      const items = (data ?? []).slice(0, limit);
      const hasMoreItems = (data ?? []).length > limit;

      const mapped: ActivityFeedItem[] = items.map((row: any) => ({
        id: row.id,
        event_type: row.event_type,
        event_category: row.event_category,
        actor_id: row.actor_id,
        actor_name: row.actor?.full_name ?? '시스템',
        target_type: row.target_type,
        target_id: row.target_id,
        metadata: row.metadata ?? {},
        is_highlighted: row.is_highlighted ?? false,
        created_at: row.created_at,
      }));

      // Client-side search filter
      const filtered = filters.searchQuery
        ? mapped.filter(item => {
            const meta = JSON.stringify(item.metadata).toLowerCase();
            const q = filters.searchQuery.toLowerCase();
            return meta.includes(q) || item.actor_name.toLowerCase().includes(q);
          })
        : mapped;

      setFeedItems(filtered);
      setHasMore(hasMoreItems);
      setCursor(items[items.length - 1]?.created_at ?? null);
    } catch (e) {
      console.error('useActivityFeed:', e);
      setFeedItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, filters.category, filters.actorId, filters.dateRange, filters.searchQuery, maxItems]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const loadMore = useCallback(async () => {
    if (!cursor || !hasMore) return;
    try {
      let q = supabase
        .from('activity_logs')
        .select('id, event_type, event_category, actor_id, target_type, target_id, metadata, is_highlighted, created_at, actor:profiles!actor_id(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .lt('created_at', cursor)
        .limit(PAGE_SIZE + 1);

      if (filters.category) q = q.eq('event_category', filters.category);
      if (filters.actorId) q = q.eq('actor_id', filters.actorId);

      const { data } = await q;
      const moreItems = (data ?? []).slice(0, PAGE_SIZE);
      const hasMoreNow = (data ?? []).length > PAGE_SIZE;

      const mapped: ActivityFeedItem[] = moreItems.map((row: any) => ({
        id: row.id,
        event_type: row.event_type,
        event_category: row.event_category,
        actor_id: row.actor_id,
        actor_name: row.actor?.full_name ?? '시스템',
        target_type: row.target_type,
        target_id: row.target_id,
        metadata: row.metadata ?? {},
        is_highlighted: row.is_highlighted ?? false,
        created_at: row.created_at,
      }));

      setFeedItems(prev => [...prev, ...mapped]);
      setHasMore(hasMoreNow);
      setCursor(moreItems[moreItems.length - 1]?.created_at ?? null);
    } catch (e) {
      console.error('useActivityFeed loadMore:', e);
    }
  }, [cursor, hasMore, projectId, filters.category, filters.actorId]);

  // Realtime subscription (Starter+)
  useEffect(() => {
    if (subscriptionTier < 2) return;

    const channel = supabase
      .channel(`activity-feed-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs',
        filter: `project_id=eq.${projectId}`,
      }, () => {
        setNewEventCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, subscriptionTier]);

  const refreshFeed = useCallback(() => {
    setNewEventCount(0);
    loadFeed();
  }, [loadFeed]);

  return { feedItems, isLoading, loadMore, hasMore, newEventCount, refreshFeed };
}
