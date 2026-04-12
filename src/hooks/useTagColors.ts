import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const TAG_COLOR_PRESETS = [
  { name: 'indigo', bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
  { name: 'violet', bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  { name: 'pink',   bg: '#FDF2F8', text: '#BE185D', border: '#FBCFE8' },
  { name: 'emerald',bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  { name: 'amber',  bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  { name: 'cyan',   bg: '#ECFEFF', text: '#155E75', border: '#A5F3FC' },
  { name: 'red',    bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  { name: 'teal',   bg: '#F0FDFA', text: '#134E4A', border: '#99F6E4' },
] as const;

export type TagColorName = typeof TAG_COLOR_PRESETS[number]['name'];

export interface TagColorMap {
  [tag: string]: TagColorName;
}

export function getTagStyle(color: TagColorName | undefined): { bg: string; text: string; border: string } {
  const preset = TAG_COLOR_PRESETS.find(p => p.name === color) ?? TAG_COLOR_PRESETS[0];
  return { bg: preset.bg, text: preset.text, border: preset.border };
}

export function useTagColors(projectId: string) {
  const [colorMap, setColorMap] = useState<TagColorMap>({});

  const fetchColors = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('tag_colors')
      .select('tag, color')
      .eq('project_id', projectId);
    if (data) {
      const map: TagColorMap = {};
      data.forEach((row: { tag: string; color: string }) => { map[row.tag] = row.color as TagColorName; });
      setColorMap(map);
    }
  }, [projectId]);

  useEffect(() => { fetchColors(); }, [fetchColors]);

  const setTagColor = async (tag: string, color: TagColorName) => {
    await supabase
      .from('tag_colors')
      .upsert({ project_id: projectId, tag, color }, { onConflict: 'project_id,tag' });
    setColorMap(prev => ({ ...prev, [tag]: color }));
  };

  return { colorMap, setTagColor, refetch: fetchColors };
}
