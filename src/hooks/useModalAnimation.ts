import { useState, useEffect, useCallback } from 'react';

/**
 * Provides enter/exit animation state for modals.
 * - Enter: fades/scales in on mount
 * - Exit: fades/scales out, then calls onClose after 180ms
 */
export function useModalAnimation(onClose: () => void) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 180);
  }, [closing, onClose]);

  const isOpen = visible && !closing;

  return {
    handleClose,
    backdropClass: `transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`,
    panelClass: `transition-all duration-[180ms] ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'}`,
  };
}
