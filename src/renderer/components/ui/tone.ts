/**
 * Semantic tones shared by Callout, Badge, Toast and status UI (docs/style-guide.md, Status).
 * One table per surface treatment, so every banner, pill and toast reads the same way and a
 * restyle happens here, not in each panel.
 */
export type Tone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

/** Tinted container: banners, inline notices (border + 10% fill + readable text). */
export const TONE_SOFT_CLASS: Record<Tone, string> = {
  neutral: 'border-ink-700 bg-ink-800/60 text-ink-200',
  accent: 'border-brand-green/40 bg-brand-green/10 text-ink-100',
  info: 'border-info-500/35 bg-info-500/10 text-info-200',
  success: 'border-success-500/35 bg-success-500/10 text-success-200',
  warning: 'border-warning-500/40 bg-warning-500/10 text-warning-200',
  danger: 'border-danger-500/40 bg-danger-500/10 text-danger-200',
};

/** Icon / emphasis color inside a soft container or on a plain surface. */
export const TONE_ICON_CLASS: Record<Tone, string> = {
  neutral: 'text-ink-400',
  accent: 'text-bright-green',
  info: 'text-info-400',
  success: 'text-success-400',
  warning: 'text-warning-400',
  danger: 'text-danger-400',
};

/** Solid fill under white text (each keeps 4.5:1); accent uses dark text per the style guide. */
export const TONE_SOLID_CLASS: Record<Tone, string> = {
  neutral: 'border-transparent bg-ink-700 text-ink-100',
  accent: 'border-transparent bg-brand-green text-app-bg',
  info: 'border-transparent bg-info-700 text-white',
  success: 'border-transparent bg-success-700 text-white',
  warning: 'border-transparent bg-warning-700 text-white',
  danger: 'border-transparent bg-danger-700 text-white',
};

/** Left stripe color for cards and toasts that carry a tone. */
export const TONE_STRIPE_CLASS: Record<Tone, string> = {
  neutral: 'bg-ink-600',
  accent: 'bg-brand-green',
  info: 'bg-info-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
};
