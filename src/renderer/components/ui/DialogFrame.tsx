import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Open frames, oldest first. Only the last one answers Tab and Escape, so nested dialogs work. */
const openFrames: symbol[] = [];

function isTopFrame(token: symbol): boolean {
  return openFrames[openFrames.length - 1] === token;
}

/** Surface shared by every modal: Level 3 panel, modal radius, entry animation. */
export const DIALOG_SURFACE_CLASS =
  'bg-deep-black rounded-modal shadow-level-3 border-ink-700 animate-dialog-in relative flex flex-col border outline-none';

export interface DialogFrameProps {
  /** id of the visible heading that names the dialog. */
  labelledBy: string;
  describedBy?: string;
  /** Backdrop click. */
  onClose: () => void;
  /** Escape key; defaults to `onClose` (pass a "go back one view" handler for multi-view dialogs). */
  onEscape?: () => void;
  role?: 'dialog' | 'alertdialog';
  /** Close on backdrop click (default true). */
  dismissOnBackdrop?: boolean;
  /** Ignores the backdrop while work is in flight. */
  busy?: boolean;
  /** Stacking order; defaults to z-50. */
  zIndex?: number;
  /** Accessible name of the click-to-close backdrop; defaults to `common.cancel`. */
  backdropLabel?: string;
  /** Width / height classes for the panel (defaults to a small dialog). */
  panelClassName?: string;
  /** Element to focus on open; defaults to `[data-autofocus]`, then the first focusable. */
  initialFocus?: (panel: HTMLElement) => HTMLElement | null;
  /** When this value changes (e.g. the dialog switches view), focus moves to the first control again. */
  focusKey?: unknown;
  /**
   * Handle Escape in the capture phase and stop it there, so handlers on the page underneath never
   * see it. Off by default so inputs inside the dialog can still react to Escape first.
   */
  captureEscape?: boolean;
  panelRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/**
 * Behaviour and chrome every modal shares: dimmed backdrop, Level 3 surface, focus trap with
 * Tab / Shift+Tab wrap, Escape, focus returned to the opener, entry animation (dropped under
 * Reduce motion) and nesting (only the topmost frame answers keys). `Dialog` builds the standard
 * title / body / footer layout on top; dialogs with their own toolbars render inside this directly.
 */
export function DialogFrame({
  labelledBy,
  describedBy,
  onClose,
  onEscape,
  role = 'dialog',
  dismissOnBackdrop = true,
  busy = false,
  zIndex,
  backdropLabel,
  panelClassName = 'w-full max-w-sm max-h-[calc(100vh-2rem)]',
  initialFocus,
  focusKey,
  captureEscape = false,
  panelRef: externalPanelRef,
  children,
}: DialogFrameProps) {
  const { t } = useTranslation();
  const ownPanelRef = useRef<HTMLDivElement>(null);
  const panelRef = externalPanelRef ?? ownPanelRef;
  // Key handling reads the latest callbacks without re-running the mount effect (which would steal focus).
  const escapeRef = useRef(onEscape ?? onClose);
  const initialFocusRef = useRef(initialFocus);
  useEffect(() => {
    escapeRef.current = onEscape ?? onClose;
    initialFocusRef.current = initialFocus;
  }, [onEscape, onClose, initialFocus]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const token = Symbol('dialog');
    openFrames.push(token);
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTopFrame(token)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (captureEscape) e.stopPropagation();
        escapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = dialogFocusables(panel);
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
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
    document.addEventListener('keydown', onKeyDown, captureEscape);
    return () => {
      document.removeEventListener('keydown', onKeyDown, captureEscape);
      const index = openFrames.indexOf(token);
      if (index !== -1) openFrames.splice(index, 1);
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [captureEscape, panelRef]);

  // Initial focus, and again whenever focusKey changes (a multi-view dialog switching view).
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const target =
      initialFocusRef.current?.(panel) ??
      panel.querySelector<HTMLElement>('[data-autofocus]') ??
      dialogFocusables(panel)[0] ??
      panel;
    target.focus();
  }, [focusKey, panelRef]);

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
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`${DIALOG_SURFACE_CLASS} ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Visible focusable descendants; without layout (tests, unpainted frame) falls back to all of them. */
export function dialogFocusables(panel: HTMLElement): HTMLElement[] {
  const all = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
  if (!all.some((el) => el.offsetParent !== null)) return all;
  return all.filter((el) => el.offsetParent !== null || el === document.activeElement);
}
