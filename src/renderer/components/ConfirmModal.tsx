import { TriangleAlert } from 'lucide-react-motion';
import { useTranslation } from 'react-i18next';

import { ICON_LG } from '@/renderer/lib/icons/iconClass';

import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';

export interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** Defaults to `common.cancel`. */
  cancelLabel?: string;
  danger?: boolean;
  /** Optional second positive action (e.g. a choice between two destinations). */
  altActionLabel?: string;
  onAltAction?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  preserveFavorites?: boolean;
  onPreserveFavoritesChange?: (value: boolean) => void;
  confirmDisabled?: boolean;
}

/**
 * Yes / no confirmation in the shared Dialog shell. Destructive confirms (`danger`) get a warning
 * icon and a solid red confirm button; others confirm with the primary accent button. Cancel is
 * always first in tab order and focused on open, so Enter never triggers a destructive action by
 * accident.
 */
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  altActionLabel,
  onAltAction,
  onConfirm,
  onCancel,
  preserveFavorites,
  onPreserveFavoritesChange,
  confirmDisabled,
}: ConfirmModalProps) {
  const { t } = useTranslation();
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');

  return (
    <Dialog
      role="alertdialog"
      title={title}
      description={message}
      onClose={onCancel}
      icon={
        danger ? <TriangleAlert aria-hidden className={`${ICON_LG} text-danger-400`} /> : undefined
      }
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onCancel}>
            {resolvedCancelLabel}
          </Button>
          {altActionLabel != null && onAltAction != null && (
            <Button variant="secondary" size="lg" onClick={onAltAction}>
              {altActionLabel}
            </Button>
          )}
          <Button
            variant={danger ? 'destructive' : 'primary'}
            size="lg"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {onPreserveFavoritesChange != null && (
        <label className="text-ink-300 text-body-lg flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={preserveFavorites ?? false}
            onChange={(e) => {
              onPreserveFavoritesChange(e.target.checked);
            }}
            className="accent-brand-green h-4 w-4"
            aria-label={t('radioPanel.resetNodeDbPreserveFavorites')}
          />
          {t('radioPanel.resetNodeDbPreserveFavorites')}
        </label>
      )}
    </Dialog>
  );
}
