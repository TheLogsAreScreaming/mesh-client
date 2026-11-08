import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** A 20-24px icon (aria-hidden). */
  icon?: ReactNode;
  title: ReactNode;
  /** One or two sentences: why it is empty and what to do next. */
  description?: ReactNode;
  /** Primary next step (a Button). */
  action?: ReactNode;
  /** `compact` for side lists and small panes. */
  size?: 'compact' | 'default';
  className?: string;
}

/**
 * Empty, first-run or nothing-matches view. Always says what to do next, so a blank pane is
 * never a dead end.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'default',
  className,
}: EmptyStateProps) {
  const compact = size === 'compact';
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon != null && (
        <span
          aria-hidden
          className={[
            'bg-ink-800 text-ink-400 flex items-center justify-center rounded-full',
            compact ? 'h-9 w-9' : 'h-12 w-12',
          ].join(' ')}
        >
          {icon}
        </span>
      )}
      <p className={`text-ink-100 font-semibold ${compact ? 'text-body' : 'text-title'}`}>
        {title}
      </p>
      {description != null && (
        <p
          className={`text-muted max-w-sm leading-relaxed ${compact ? 'text-label' : 'text-body'}`}
        >
          {description}
        </p>
      )}
      {action != null && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
