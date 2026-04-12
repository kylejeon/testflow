import { useState, useRef, useEffect } from 'react';
import { TAG_COLOR_PRESETS, getTagStyle, type TagColorName, type TagColorMap } from '../hooks/useTagColors';

interface TagChipProps {
  tag: string;
  colorMap?: TagColorMap;
  onColorChange?: (tag: string, color: TagColorName) => void;
  onRemove?: () => void;
  size?: 'xs' | 'sm';
}

export default function TagChip({ tag, colorMap, onColorChange, onRemove, size = 'xs' }: TagChipProps) {
  const color = colorMap?.[tag] as TagColorName | undefined;
  const style = getTagStyle(color);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const padX = size === 'sm' ? 'px-2' : 'px-1.5';
  const padY = size === 'sm' ? 'py-0.5' : 'py-0';
  const textSize = size === 'sm' ? 'text-xs' : 'text-[0.625rem]';

  return (
    <span className="relative inline-flex items-center group">
      <span
        className={`inline-flex items-center gap-0.5 ${padX} ${padY} rounded-full ${textSize} font-medium border`}
        style={{ background: style.bg, color: style.text, borderColor: style.border }}
      >
        {onColorChange && (
          <button
            type="button"
            onClick={() => setShowPicker(o => !o)}
            className="w-2 h-2 rounded-full mr-0.5 flex-shrink-0 cursor-pointer hover:ring-1 hover:ring-offset-1 transition-all"
            style={{ background: style.text }}
            title="Change color"
          />
        )}
        {tag}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-0.5 hover:opacity-70 cursor-pointer leading-none"
            style={{ color: style.text }}
          >
            ×
          </button>
        )}
      </span>

      {showPicker && onColorChange && (
        <div
          ref={pickerRef}
          className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2"
        >
          <p className="text-[0.625rem] text-gray-400 uppercase tracking-wide mb-1.5 px-0.5">Color</p>
          <div className="flex gap-1.5 flex-wrap" style={{ width: 120 }}>
            {TAG_COLOR_PRESETS.map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() => { onColorChange(tag, preset.name as TagColorName); setShowPicker(false); }}
                className="w-5 h-5 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
                style={{
                  background: preset.text,
                  borderColor: color === preset.name ? '#1e293b' : 'transparent',
                }}
                title={preset.name}
              />
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
