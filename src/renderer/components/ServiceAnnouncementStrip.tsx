import {
  ChevronRight,
  ExternalLink,
  Info,
  OctagonAlert,
  TriangleAlert,
  X,
} from 'lucide-react-motion';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { VisibleServiceAnnouncement } from '@/renderer/hooks/useServiceAnnouncements';
import { ICON_MD, ICON_SM } from '@/renderer/lib/icons/iconClass';
import type { ServiceAnnouncementSeverity } from '@/shared/serviceAnnouncementFeed';

const SEVERITY_STYLE: Record<
  ServiceAnnouncementSeverity,
  { strip: string; icon: string; title: string; body: string; control: string }
> = {
  info: {
    strip: 'border-info-700 bg-info-900/80',
    icon: 'text-info-300',
    title: 'text-info-100',
    body: 'text-info-200',
    control: 'text-info-200 hover:text-ink-50',
  },
  warning: {
    strip: 'border-warning-700 bg-warning-900/80',
    icon: 'text-warning-300',
    title: 'text-warning-100',
    body: 'text-warning-200',
    control: 'text-warning-200 hover:text-ink-50',
  },
  critical: {
    strip: 'border-danger-700 bg-danger-900/80',
    icon: 'text-danger-300',
    title: 'text-danger-100',
    body: 'text-danger-200',
    control: 'text-danger-200 hover:text-ink-50',
  },
};

const SEVERITY_ICON = {
  info: Info,
  warning: TriangleAlert,
  critical: OctagonAlert,
} as const;

export interface ServiceAnnouncementStripProps {
  announcements: readonly VisibleServiceAnnouncement[];
  onDismiss: (id: string) => void;
  onOpenUrl: (url: string) => void;
}

/** One developer announcement at a time; text is rendered as plain text only. */
export function ServiceAnnouncementStrip({
  announcements,
  onDismiss,
  onOpenUrl,
}: ServiceAnnouncementStripProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  if (announcements.length === 0) return null;
  const position = index < announcements.length ? index : 0;
  const current = announcements[position];
  if (!current) return null;

  const style = SEVERITY_STYLE[current.severity];
  const Icon = SEVERITY_ICON[current.severity];
  const total = announcements.length;
  const linkLabel = current.urlLabel ?? t('serviceAnnouncement.learnMore');

  return (
    <div
      role={current.severity === 'critical' ? 'alert' : 'status'}
      aria-live={current.severity === 'critical' ? undefined : 'polite'}
      aria-label={t('serviceAnnouncement.regionLabel')}
      data-service-announcement-id={current.id}
      className={`flex shrink-0 items-start gap-3 border-b px-4 py-2 ${style.strip}`}
    >
      <Icon aria-hidden className={`${ICON_MD} mt-0.5 ${style.icon}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-body-lg font-semibold ${style.title}`}>{current.title}</p>
        <p className={`text-body-lg break-words whitespace-pre-wrap ${style.body}`}>
          {current.body}
        </p>
        {current.url ? (
          <button
            type="button"
            onClick={() => {
              if (current.url) onOpenUrl(current.url);
            }}
            aria-label={t('serviceAnnouncement.openLinkAria', { label: linkLabel })}
            className={`text-body-lg mt-1 inline-flex items-center gap-1 font-medium underline ${style.control}`}
          >
            {linkLabel}
            <ExternalLink aria-hidden className={ICON_SM} />
          </button>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {total > 1 ? (
          <button
            type="button"
            onClick={() => {
              setIndex((position + 1) % total);
            }}
            aria-label={t('serviceAnnouncement.next')}
            className={`text-label inline-flex items-center gap-1 rounded px-1.5 py-1 font-medium ${style.control}`}
          >
            {t('serviceAnnouncement.position', { current: position + 1, total })}
            <ChevronRight aria-hidden className={ICON_SM} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onDismiss(current.id);
          }}
          aria-label={t('serviceAnnouncement.dismiss')}
          title={t('serviceAnnouncement.dismiss')}
          className={`rounded p-1 ${style.control}`}
        >
          <X aria-hidden className={ICON_MD} />
        </button>
      </div>
    </div>
  );
}
