import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SavedView {
  id: string;
  name: string;
  entity_type: 'testcase' | 'run';
  filters: Record<string, any>;
  created_at: string;
}

export function useSavedViews(projectId: string, entityType: 'testcase' | 'run') {
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchViews = useCallback(async () => {
    if (!projectId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('saved_views')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('entity_type', entityType)
      .order('created_at', { ascending: false });

    setViews(data || []);
  }, [projectId, entityType]);

  useEffect(() => { fetchViews(); }, [fetchViews]);

  const saveView = async (name: string, filters: Record<string, any>) => {
    if (!projectId || !name.trim()) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('saved_views').insert({
        user_id: user.id,
        project_id: projectId,
        name: name.trim(),
        entity_type: entityType,
        filters,
      });
      if (error) throw error;
      await fetchViews();
    } finally {
      setLoading(false);
    }
  };

  const deleteView = async (id: string) => {
    await supabase.from('saved_views').delete().eq('id', id);
    await fetchViews();
  };

  return { views, loading, saveView, deleteView, refetch: fetchViews };
}
