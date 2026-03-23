import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface ShortcutOptions {
  onOpenCommandPalette?: () => void;
  onOpenFocusMode?: () => void;
  onShowShortcutsHelp?: () => void;
  enabled?: boolean;
}

/**
 * Global keyboard shortcut system.
 *
 * Global:
 *   Cmd/Ctrl+K  → Command Palette
 *   ?           → Shortcuts help overlay
 *   G then T    → Go to Test Cases (in current project)
 *   G then R    → Go to Test Runs
 *   G then D    → Go to Discovery Logs
 *   G then M    → Go to Milestones
 *   Cmd+Shift+F → Focus Mode (on Test Run page)
 */
export function useKeyboardShortcuts(options: ShortcutOptions = {}) {
  const { onOpenCommandPalette, onOpenFocusMode, onShowShortcutsHelp, enabled = true } = options;
  const navigate = useNavigate();
  const location = useLocation();

  // Track "G then ?" chord
  const gChordRef = useRef(false);
  const gChordTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in inputs/textareas/contenteditable
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.tagName === 'SELECT';

      // Cmd+K — command palette (allow even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenCommandPalette?.();
        return;
      }

      // Cmd+Shift+F — focus mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        onOpenFocusMode?.();
        return;
      }

      if (isEditable) return;

      // ? — show shortcuts help
      if (e.key === '?') {
        e.preventDefault();
        onShowShortcutsHelp?.();
        return;
      }

      // G chord shortcuts — navigate to project sections
      if (e.key === 'g' || e.key === 'G') {
        gChordRef.current = true;
        clearTimeout(gChordTimerRef.current);
        // Cancel G chord after 1s if no follow-up key
        gChordTimerRef.current = setTimeout(() => {
          gChordRef.current = false;
        }, 1000);
        return;
      }

      if (gChordRef.current) {
        gChordRef.current = false;
        clearTimeout(gChordTimerRef.current);

        // Extract project ID from current path
        const match = location.pathname.match(/\/projects\/([^/]+)/);
        const projectId = match?.[1];
        if (!projectId) return;

        switch (e.key.toLowerCase()) {
          case 't':
            e.preventDefault();
            navigate(`/projects/${projectId}/testcases`);
            break;
          case 'r':
            e.preventDefault();
            navigate(`/projects/${projectId}/runs`);
            break;
          case 'd':
            e.preventDefault();
            navigate(`/projects/${projectId}/sessions`);
            break;
          case 'm':
            e.preventDefault();
            navigate(`/projects/${projectId}/milestones`);
            break;
          case 'p':
            e.preventDefault();
            navigate('/projects');
            break;
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(gChordTimerRef.current);
    };
  }, [enabled, navigate, location.pathname, onOpenCommandPalette, onOpenFocusMode, onShowShortcutsHelp]);
}
