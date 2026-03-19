import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  project_id: string | null;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter((n) => !n.is_read).length);
    } catch (err) {
      console.error('알림 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('알림 읽음 처리 오류:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('전체 읽음 처리 오류:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === notificationId);
        if (removed && !removed.is_read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });
    } catch (err) {
      console.error('알림 삭제 오류:', err);
    }
  }, []);

  // Subscribe to realtime notifications
  useEffect(() => {
    fetchNotifications();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

// Helper: create a notification for a specific user
export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  projectId?: string;
}) {
  try {
    const { error } = await supabase.from('notifications').insert([
      {
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        project_id: params.projectId || null,
      },
    ]);
    if (error) throw error;
  } catch (err) {
    console.error('알림 생성 오류:', err);
  }
}

// Helper: create notifications for all project members (respects individual preferences)
export async function notifyProjectMembers(params: {
  projectId: string;
  excludeUserId?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const { data: members, error } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', params.projectId);

    if (error) throw error;
    if (!members || members.length === 0) return;

    const eligibleUserIds = members
      .map((m) => m.user_id)
      .filter((id) => id !== params.excludeUserId);

    if (eligibleUserIds.length === 0) return;

    // Fetch preferences for all eligible users
    const { data: allPrefs } = await supabase
      .from('notification_preferences')
      .select('user_id, ' + params.type)
      .in('user_id', eligibleUserIds);

    // Build a map of user_id -> preference value
    const prefsMap: Record<string, boolean> = {};
    (allPrefs || []).forEach((p: Record<string, unknown>) => {
      prefsMap[p.user_id as string] = (p[params.type] as boolean) !== false;
    });

    // Users without a preference record default to true (opted-in)
    const notifications = eligibleUserIds
      .filter((uid) => prefsMap[uid] !== false)
      .map((uid) => ({
        user_id: uid,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        project_id: params.projectId,
      }));

    if (notifications.length === 0) return;

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;
  } catch (err) {
    console.error('프로젝트 멤버 알림 오류:', err);
  }
}
