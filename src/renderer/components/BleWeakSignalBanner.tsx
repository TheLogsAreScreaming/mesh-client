import { useTranslation } from 'react-i18next';

import { isWeakBleRssi } from '../lib/signal';

export interface BleWeakSignalBannerProps {
  rssi: number | null | undefined;
  className?: string;
}

/** Amber Connection-panel style warning when BLE RSSI is weak (≤ -80 dBm). */
export function BleWeakSignalBanner({ rssi, className }: BleWeakSignalBannerProps) {
  const { t } = useTranslation();
  if (!isWeakBleRssi(rssi) || rssi == null) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className={
        className ??
        'border-warning-800/60 bg-warning-900/40 text-label text-warning-200 border-t px-4 py-2'
      }
    >
      {t('connectionPanel.bleWeakSignalWarning', { rssi: Math.round(rssi) })}
    </p>
  );
}
