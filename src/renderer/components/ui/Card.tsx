import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `raised` adds Level 1 elevation; `inset` is a sunken well for grouped rows. */
  variant?: 'default' | 'raised' | 'inset';
  /** Inner padding. `none` when the card holds its own rows. */
  padding?: 'none' | 'sm' | 'md';
  children: ReactNode;
}

const CARD_VARIANT: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-deep-black border-ink-800',
  raised: 'bg-deep-black border-ink-800 shadow-level-1',
  inset: 'bg-app-bg border-ink-800',
};

const CARD_PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
};

/** Surface container for a group of related content (settings group, stat block, detail). */
export function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={['rounded-card border', CARD_VARIANT[variant], CARD_PADDING[padding], className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Trailing controls. */
  action?: ReactNode;
  icon?: ReactNode;
  /** Heading level for document outline; defaults to h3. */
  as?: 'h2' | 'h3' | 'h4';
  id?: string;
}

/** Title row for a Card: icon, title, one-line description, trailing actions. */
export function CardHeader({ title, description, action, icon, as = 'h3', id }: CardHeaderProps) {
  const Heading = as;
  return (
    <div className="mb-3 flex items-start gap-3">
      {icon != null && <span className="text-ink-400 mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        <Heading id={id} className="text-ink-100 text-title font-semibold">
          {title}
        </Heading>
        {description != null && (
          <p className="text-muted text-body mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {action != null && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
