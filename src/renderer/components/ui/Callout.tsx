import { CircleCheck, CircleX, Info, Lightbulb, TriangleAlert } from 'lucide-react-motion';
import type { ReactNode } from 'react';

import { ICON_MD } from '@/renderer/lib/icons/iconClass';

import { type Tone, TONE_ICON_CLASS, TONE_SOFT_CLASS } from './tone';

const DEFAULT_ICON: Record<Tone, typeof Info> = {
  neutral: Info,
  accent: Lightbulb,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
};

export interface CalloutProps {
  tone?: Tone;
  /** Short bold first line. Optional: a one-line notice can be children only. */
  title?: ReactNode;
  children?: ReactNode;
  /** Replaces the tone's default icon; pass `null` for none. */
  icon?: ReactNode | null;
  /** Trailing controls (a Button, a link). */
  action?: ReactNode;
  /** `sm` for dense panels and inline form hints. */
  size?: 'sm' | 'md';
  /**
   * Live-region role. Defaults to `alert` for danger and `status` otherwise; pass `none` for a
   * static explanatory note that should not be announced.
   */
  role?: 'alert' | 'status' | 'none';
  className?: string;
}

/**
 * Inline notice (banner) in a semantic tone: icon + optional title + body + optional action.
 * Color is never the only signal: every tone has its own icon.
 */
export function Callout({
  tone = 'info',
  title,
  children,
  icon,
  action,
  size = 'md',
  role,
  className,
}: CalloutProps) {
  const Icon = DEFAULT_ICON[tone];
  const resolvedRole = role ?? (tone === 'danger' ? 'alert' : 'status');
  const iconNode =
    icon === null
      ? null
      : (icon ?? <Icon aria-hidden className={`${ICON_MD} ${TONE_ICON_CLASS[tone]} mt-px`} />);
  return (
    <div
      role={resolvedRole === 'none' ? undefined : resolvedRole}
      className={[
        'rounded-card flex items-start border',
        size === 'sm' ? 'text-label gap-2 px-2.5 py-2' : 'text-body gap-2.5 px-3 py-2.5',
        TONE_SOFT_CLASS[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {iconNode}
      <div className="min-w-0 flex-1 space-y-0.5">
        {title != null && <p className="text-ink-100 font-semibold">{title}</p>}
        {children != null && <div className="leading-relaxed">{children}</div>}
      </div>
      {action != null && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
