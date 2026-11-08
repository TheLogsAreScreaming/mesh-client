import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

import { SpinnerIcon } from '@/renderer/lib/icons/spinnerIcon';

/**
 * Buttons from the v6 style guide (`docs/style-guide.md`, Controls). One primary per view; danger
 * is an outline sized to its label, never a full-width red bar.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex shrink-0 items-center justify-center rounded-control border font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green disabled:cursor-not-allowed disabled:opacity-50';

export const BUTTON_VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-brand-green text-app-bg hover:bg-brand-green/90',
  secondary: 'border-secondary-dark bg-sidebar-active-bg text-ink-200 hover:bg-secondary-dark',
  danger: 'border-danger-400/45 bg-transparent text-danger-400 hover:bg-danger-400/10',
  /** Solid red, for the confirm button of a destructive dialog only (one per dialog). */
  destructive: 'border-transparent bg-danger-700 text-white hover:bg-danger-600',
  ghost:
    'border-transparent bg-transparent text-ink-300 hover:bg-sidebar-active-bg hover:text-ink-100',
};

export const BUTTON_SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-7.5 gap-1.5 px-3 text-control',
  md: 'h-8 gap-1.5 px-3.5 text-body',
  /** Dialog footers, onboarding and empty-state calls to action. */
  lg: 'h-9 gap-2 px-4 text-body-lg',
};

/**
 * Full-width danger row for a stacked list of destructive actions whose label carries a second
 * line (App > Danger zone). Outline like `danger`, left-aligned, wraps instead of truncating.
 */
export const DANGER_ROW_CLASS =
  'flex w-full flex-col items-start gap-0.5 rounded-control border border-danger-400/45 bg-transparent px-3.5 py-2 text-left text-body font-medium text-danger-400 transition-colors hover:bg-danger-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green disabled:cursor-not-allowed disabled:opacity-50';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon (aria-hidden, 14 to 16px). */
  icon?: ReactNode;
  /** Shows a spinner in place of the icon, sets aria-busy and blocks clicks. */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function buttonClassName(
  variant: ButtonVariant = 'secondary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return [BUTTON_BASE, BUTTON_VARIANT_CLASS[variant], BUTTON_SIZE_CLASS[size], extra]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  className,
  children,
  type = 'button',
  disabled,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName(variant, size, className)}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <SpinnerIcon className="h-3.5 w-3.5 shrink-0" /> : icon}
      {children}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Required: icon-only controls need an accessible name. */
  'aria-label': string;
  icon: ReactNode;
  /** `ghost` (default) is borderless; `secondary` matches toolbar buttons. */
  variant?: 'ghost' | 'secondary' | 'danger';
  size?: ButtonSize;
  /**
   * Toggled-on look for toolbar toggles (pair with `aria-pressed`): `brand` for an active view,
   * `warn` for a state worth noticing (muted). Replaces the variant colors.
   */
  active?: 'brand' | 'warn' | false;
  ref?: Ref<HTMLButtonElement>;
}

const ICON_BUTTON_ACTIVE: Record<'brand' | 'warn', string> = {
  brand: 'border-transparent bg-sidebar-active-bg text-bright-green',
  warn: 'border-transparent bg-transparent text-warning-400 hover:bg-sidebar-active-bg',
};

const ICON_BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-7.5 w-7.5',
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
};

const ICON_BUTTON_VARIANT: Record<NonNullable<IconButtonProps['variant']>, string> = {
  ghost:
    'border-transparent bg-transparent text-muted hover:bg-sidebar-active-bg hover:text-ink-200',
  secondary:
    'border-secondary-dark bg-sidebar-active-bg text-ink-300 hover:bg-secondary-dark hover:text-ink-100',
  danger: 'border-transparent bg-transparent text-danger-400 hover:bg-danger-400/10',
};

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  active = false,
  className,
  title,
  type = 'button',
  ref,
  ...rest
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      title={title ?? rest['aria-label']}
      className={[
        'focus-visible:outline-brand-green rounded-control inline-flex shrink-0 items-center justify-center border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        ICON_BUTTON_SIZE[size],
        active ? ICON_BUTTON_ACTIVE[active] : ICON_BUTTON_VARIANT[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon}
    </button>
  );
}
