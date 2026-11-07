import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { PROTOCOL_THEME } from '@/renderer/lib/protocolTheme';
import { mecpBlockKey, useMecpBlockStore } from '@/renderer/stores/mecpBlockStore';

/** App → MECP: senders whose MECP reports are audited only (no alert, incident, or rebroadcast). */
export function MecpBlockedSendersSection() {
  const { t } = useTranslation();
  const blocked = useMecpBlockStore((s) => s.blocked);
  const unblock = useMecpBlockStore((s) => s.unblock);
  const entries = useMemo(
    () => Object.values(blocked).sort((a, b) => b.createdAt - a.createdAt),
    [blocked],
  );

  return (
    <div className="space-y-2">
      <h4 className="text-ink-300 text-body-lg font-medium">{t('mecp.block.listTitle')}</h4>
      <p className="text-muted text-label leading-relaxed">{t('mecp.block.listHint')}</p>
      {entries.length === 0 ? (
        <p className="text-muted text-label italic">{t('mecp.block.listEmpty')}</p>
      ) : (
        <ul className="space-y-1" aria-label={t('mecp.block.listTitle')}>
          {entries.map((entry) => (
            <li
              key={mecpBlockKey(entry.protocol, entry.senderId)}
              className="border-ink-700/70 bg-ink-900/40 flex items-center justify-between gap-2 rounded border px-2 py-1"
            >
              <span className="text-ink-200 text-label min-w-0 truncate">{entry.label}</span>
              <span className="text-muted text-label shrink-0 font-mono">{entry.senderId}</span>
              <span className="text-muted text-label shrink-0">
                {PROTOCOL_THEME[entry.protocol].displayName}
              </span>
              <button
                type="button"
                aria-label={t('mecp.block.unblockAria', { sender: entry.label })}
                onClick={() => {
                  unblock(entry.protocol, entry.senderId);
                }}
                className="border-ink-600 text-ink-300 hover:bg-ink-700 text-label ml-auto shrink-0 rounded border px-2 py-0.5"
              >
                {t('mecp.block.unblock')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
