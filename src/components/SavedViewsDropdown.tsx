import { useState, useRef, useEffect } from 'react';
import type { SavedView } from '../hooks/useSavedViews';

interface SavedViewsDropdownProps {
  views: SavedView[];
  currentFilters: Record<string, any>;
  onApplyView: (filters: Record<string, any>) => void;
  onSaveView: (name: string) => Promise<void>;
  onDeleteView: (id: string) => void;
}

export default function SavedViewsDropdown({
  views,
  currentFilters,
  onApplyView,
  onSaveView,
  onDeleteView,
}: SavedViewsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [viewName, setViewName] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowSaveInput(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSave = async () => {
    if (!viewName.trim()) return;
    setSaving(true);
    try {
      await onSaveView(viewName);
      setViewName('');
      setShowSaveInput(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-gray-50 text-[0.8125rem] font-medium cursor-pointer transition-colors"
        title="Saved views"
      >
        <i className="ri-bookmark-line text-sm" />
        Views
        {views.length > 0 && (
          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[0.625rem] font-bold">
            {views.length}
          </span>
        )}
        <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line text-xs text-gray-400`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30">
          {/* Save current view */}
          {!showSaveInput ? (
            <button
              onClick={() => setShowSaveInput(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[0.8125rem] text-indigo-600 hover:bg-indigo-50 font-medium cursor-pointer border-b border-gray-100"
            >
              <i className="ri-save-line" />
              Save current view…
            </button>
          ) : (
            <div className="px-3 py-2.5 border-b border-gray-100">
              <input
                type="text"
                autoFocus
                value={viewName}
                onChange={e => setViewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setShowSaveInput(false); setViewName(''); } }}
                placeholder="View name…"
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 mb-1.5"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={handleSave}
                  disabled={saving || !viewName.trim()}
                  className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setShowSaveInput(false); setViewName(''); }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Saved views list */}
          {views.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400">
              <i className="ri-bookmark-line text-lg block mb-1" />
              No saved views yet
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto py-1">
              {views.map(view => (
                <div
                  key={view.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 group"
                >
                  <button
                    onClick={() => { onApplyView(view.filters); setOpen(false); }}
                    className="flex-1 text-left text-[0.8125rem] text-gray-700 hover:text-indigo-600 cursor-pointer truncate"
                  >
                    <i className="ri-bookmark-fill text-indigo-400 mr-1.5 text-xs" />
                    {view.name}
                  </button>
                  <button
                    onClick={() => onDeleteView(view.id)}
                    className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <i className="ri-delete-bin-line text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hint */}
          <div className="px-3 py-2 border-t border-gray-100 text-[0.6875rem] text-gray-400">
            Saved views are personal to you
          </div>
        </div>
      )}
    </div>
  );
}
