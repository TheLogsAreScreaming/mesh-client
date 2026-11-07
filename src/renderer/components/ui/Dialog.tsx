import { X } from 'lucide-react-motion';
import { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { DialogFrame } from './DialogFrame';

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
 * Standard modal: title (with optional icon and description), scrolling body and an action footer,
 * on the shared `DialogFrame` (backdrop, focus trap, Escape, focus return, nesting). Dialogs with
 * their own toolbars use `DialogFrame` directly.
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

  return (
    <DialogFrame
      labelledBy={titleId}
      describedBy={description != null ? descriptionId : undefined}
      onClose={onClose}
      role={role}
      dismissOnBackdrop={dismissOnBackdrop}
      busy={busy}
      zIndex={zIndex}
      backdropLabel={backdropLabel}
      panelClassName={['max-h-[calc(100vh-2rem)] w-full', DIALOG_WIDTH[size], className]
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
        <div className="flex flex-wrap items-center justify-end gap-2 px-5 pt-5 pb-5">{footer}</div>
      )}
      {footer == null && <div className="pb-5" />}
    </DialogFrame>
  );
}
