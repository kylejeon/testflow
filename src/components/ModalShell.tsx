import { ReactNode, useEffect } from 'react';
import { useModalAnimation } from '../hooks/useModalAnimation';

interface ModalShellProps {
  onClose: () => void;
  children: ReactNode;
  /** Extra classes for the white content panel wrapper */
  panelClassName?: string;
  /** Extra classes for the backdrop */
  backdropClassName?: string;
  /** z-index class, defaults to z-50 */
  zClass?: string;
}

/**
 * Shared modal shell: animated backdrop + content panel.
 * Handles ESC key and body scroll lock automatically.
 * Individual modals should remove their own ESC/overflow handlers.
 */
export function ModalShell({
  onClose,
  children,
  panelClassName = '',
  backdropClassName = '',
  zClass = 'z-50',
}: ModalShellProps) {
  const { handleClose, backdropClass, panelClass } = useModalAnimation(onClose);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [handleClose]);

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center ${zClass} p-4 ${backdropClass} ${backdropClassName}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`${panelClass} ${panelClassName}`}>
        {children}
      </div>
    </div>
  );
}
