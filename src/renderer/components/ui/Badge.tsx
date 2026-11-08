import type { HTMLAttributes, ReactNode } from 'react';

import { type Tone, TONE_SOFT_CLASS, TONE_SOLID_CLASS } from './tone';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** `soft` (default) is a tinted pill; `solid` is a filled pill for counts and severities. */
  variant?: 'soft' | 'solid';
  /** Leading icon or dot (aria-hidden). */
  icon?: ReactNode;
  children: ReactNode;
}

/** Small status pill: a tag, a state, a count. Text is never the 2xs size on its own meaning. */
export function Badge({
  tone = 'neutral',
  variant = 'soft',
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        'rounded-badge text-2xs inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 leading-none font-medium whitespace-nowrap',
        variant === 'solid' ? TONE_SOLID_CLASS[tone] : TONE_SOFT_CLASS[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
