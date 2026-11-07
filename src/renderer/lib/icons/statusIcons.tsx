import { Check, Download, RotateCcw, TriangleAlert } from 'lucide-react-motion';

import { ICON_SM, ICON_SM_PLUS } from '@/renderer/lib/icons/iconClass';
import { useIconTrigger } from '@/renderer/lib/icons/iconMotionContext';

export function IconUpToDate({ className }: { className?: string }) {
  const trigger = useIconTrigger();
  return (
    <Check
      aria-hidden
      className={className ?? `${ICON_SM} text-success-400`}
      trigger={trigger}
      size={12}
    />
  );
}

export function IconWarning({ className }: { className?: string }) {
  const trigger = useIconTrigger();
  return (
    <TriangleAlert
      aria-hidden
      className={className ?? `${ICON_SM} text-warning-400`}
      trigger={trigger}
      size={12}
    />
  );
}

export function IconUpdateAvailable({ className }: { className?: string }) {
  const trigger = useIconTrigger();
  return (
    <Download
      aria-hidden
      className={className ?? `${ICON_SM_PLUS} text-success-400`}
      trigger={trigger}
      size={14}
    />
  );
}

export function IconRestart({ className }: { className?: string }) {
  const trigger = useIconTrigger();
  return (
    <RotateCcw
      aria-hidden
      className={className ?? `${ICON_SM_PLUS} text-warning-400`}
      trigger={trigger}
      size={14}
    />
  );
}
