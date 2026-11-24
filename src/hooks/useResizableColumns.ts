import { useCallback, useEffect, useRef, useState } from 'react';

export interface ResizableColumnConfig {
  /** default width in px */
  default: number;
  /** minimum width in px */
  min: number;
  /** maximum width in px (optional) */
  max?: number;
}

/**
 * Column widths for a CSS-grid table with one flexible (1fr) column.
 *
 * - Widths persist in localStorage under `storageKey`.
 * - `startResize(key, direction, e, flexEl)` begins a drag:
 *     direction = +1 → dragging right widens `key` (divider sits on its right edge)
 *     direction = -1 → dragging right narrows `key` (divider sits on its left edge)
 *   so the divider always follows the mouse while the flexible column absorbs
 *   the difference. `flexEl` (the flexible column's header cell) caps growth so
 *   the flexible column never shrinks below `flexMin`.
 * - `resetColumn(key)` restores a column's default width.
 */
export function useResizableColumns<K extends string>(
  storageKey: string,
  config: Record<K, ResizableColumnConfig>,
  flexMin = 120,
) {
  const configRef = useRef(config);
  configRef.current = config;

  const clamp = (key: K, w: number) => {
    const c = configRef.current[key];
    return Math.round(Math.min(c.max ?? 800, Math.max(c.min, w)));
  };

  const [widths, setWidths] = useState<Record<K, number>>(() => {
    const defaults = Object.fromEntries(
      (Object.keys(config) as K[]).map((k) => [k, config[k].default]),
    ) as Record<K, number>;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaults;
      const saved = JSON.parse(raw) as Partial<Record<K, number>>;
      for (const k of Object.keys(defaults) as K[]) {
        const v = saved[k];
        if (typeof v === 'number' && Number.isFinite(v)) defaults[k] = clamp(k, v);
      }
    } catch {
      /* ignore corrupt storage */
    }
    return defaults;
  });

  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const persist = useCallback(
    (next: Record<K, number>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
    },
    [storageKey],
  );

  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  const startResize = useCallback(
    (key: K, direction: 1 | -1, e: React.MouseEvent, flexEl?: HTMLElement | null) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = widthsRef.current[key];
      const maxGrowth = flexEl ? Math.max(0, flexEl.offsetWidth - flexMin) : Infinity;

      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: MouseEvent) => {
        const growth = Math.min((ev.clientX - startX) * direction, maxGrowth);
        const w = clamp(key, startW + growth);
        setWidths((prev) => (prev[key] === w ? prev : { ...prev, [key]: w }));
      };
      const finish = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', finish);
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
        cleanupRef.current = null;
        persist(widthsRef.current);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', finish);
      cleanupRef.current = finish;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flexMin, persist],
  );

  const resetColumn = useCallback(
    (key: K) => {
      setWidths((prev) => {
        const next = { ...prev, [key]: configRef.current[key].default };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { widths, startResize, resetColumn };
}
