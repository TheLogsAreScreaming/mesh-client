import { X } from 'lucide-react-motion';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

const DIALOG_WIDTH: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export interface DialogProps {
  title: ReactNode;
  /** One or two sentences under the title; wired to aria-describedby. */
  description?: ReactNode;
  /** Leading icon in a tinted circle (destructive dialogs pass a warning icon). */
  icon?: ReactNode;
  children?: ReactNode;
  /** Action row, right-aligned; put the primary action last. */
  footer?: ReactNode;
  onClose: () => void;
  size?: DialogSize;
  /** `alertdialog` for confirmations that interrupt; `dialog` for forms. */
  role?: 'dialog' | 'alertdialog';
  /** Close on backdrop click (default true; forms with unsaved input may pass false). */
  dismissOnBackdrop?: boolean;
  /** Shows an X button in the header (aria-label `common.close`). */
  showCloseButton?: boolean;
  /** Disables the X and the backdrop while work is in flight (saving). */
  busy?: boolean;
  /** Stacking order; defaults to z-50. Nested dialogs above other overlays pass their own. */
  zIndex?: number;
  /** Accessible name of the backdrop (click-to-close) button; defaults to `common.cancel`. */
  backdropLabel?: string;
  className?: string;
}

/**
 * Modal shell for the whole app: dimmed backdrop, Level 3 surface, focus trap with Tab / Shift+Tab
 * wrap, Escape to close, focus returned to the opener, and a short entry animation (dropped under
 * Reduce motion). Every modal should render inside this so they all look and behave the same.
 */
export function Dialog({
  title,
  description,
  icon,
  children,
  footer,
  onClose,
  size = 'sm',
  role = 'dialog',
  dismissOnBackdrop = true,
  showCloseButton = false,
  busy = false,
  zIndex,
  backdropLabel,
  className,
}: DialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  // Escape reads the latest onClose without re-running the focus effect (which would steal focus).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = () => {
      const all = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
      const visible = all.filter((el) => el.offsetParent !== null || el === document.activeElement);
      // Without layout (tests, a not-yet-painted frame) nothing has an offsetParent: keep them all.
      return visible.length > 0 ? visible : all;
    };
    const autofocus = panel.querySelector<HTMLElement>('[data-autofocus]');
    (autofocus ?? focusables()[0] ?? panel).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const prev = previouslyFocusedRef.current;
      if (prev && document.contains(prev)) prev.focus();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${zIndex == null ? 'z-50' : ''}`}
      style={zIndex == null ? undefined : { zIndex }}
    >
      <button
        type="button"
        aria-label={backdropLabel ?? t('common.cancel')}
        tabIndex={-1}
        className="animate-fade-in absolute inset-0 cursor-default border-0 bg-black/60 p-0 backdrop-blur-sm"
        onClick={() => {
          if (dismissOnBackdrop && !busy) onClose();
        }}
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description != null ? descriptionId : undefined}
        tabIndex={-1}
        className={[
          'bg-deep-black rounded-modal shadow-level-3 border-ink-700 animate-dialog-in relative flex max-h-[calc(100vh-2rem)] w-full flex-col border outline-none',
          DIALOG_WIDTH[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          {icon != null && (
            <span
              aria-hidden
              className="bg-ink-800 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            >
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <h2 id={titleId} className="text-ink-100 text-heading font-semibold">
              {title}
            </h2>
            {description != null && (
              <div id={descriptionId} className="text-muted text-body-lg leading-relaxed">
                {description}
              </div>
            )}
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label={t('common.close')}
              title={t('common.close')}
              className="text-muted hover:bg-ink-800 hover:text-ink-100 rounded-control -mt-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center transition-colors disabled:opacity-40"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          )}
        </div>
        {children != null && <div className="min-h-0 overflow-y-auto px-5 pt-4">{children}</div>}
        {footer != null && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-5 pt-5 pb-5">
            {footer}
          </div>
        )}
        {footer == null && <div className="pb-5" />}
      </div>
    </div>
  );
}
