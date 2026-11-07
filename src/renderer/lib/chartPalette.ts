import { useSyncExternalStore } from 'react';

import type { ThemeTone } from './themePresets';

/**
 * Colours for charts, graphs and other drawn (SVG / canvas) data views, per theme tone.
 *
 * SVG presentation attributes and canvas cannot read the Tailwind tokens, so drawn views take
 * their colours from here instead of hard-coding hex. Dark values are the long-standing chart
 * colours; light values are the same hues darkened so lines and marks keep at least 3:1 against
 * the Daylight surfaces (WCAG 1.4.11 non-text contrast) and labels keep 4.5:1.
 */
export interface ChartPalette {
  /** Grid lines and hairlines. */
  grid: string;
  /** Fainter rules (minor grid, node outlines). */
  gridSubtle: string;
  /** Axis lines and tick labels. */
  axis: string;
  /** Secondary labels on the plot. */
  label: string;
  /** Primary text drawn on the plot. */
  text: string;
  /** Muted text drawn on the plot. */
  textMuted: string;
  /** Text on a coloured mark (always the strongest contrast). */
  textOnMark: string;
  /** Empty track behind bars / meters. */
  track: string;
  /** Inactive / offline mark. */
  inactive: string;
  tooltipBg: string;
  tooltipBorder: string;
  // Series hues (named by their dark-theme Tailwind step).
  blue500: string;
  blue400: string;
  violet500: string;
  violet400: string;
  violet300: string;
  purple400: string;
  amber500: string;
  amber400: string;
  yellow400: string;
  yellow500: string;
  orange400: string;
  cyan500: string;
  cyan400: string;
  emerald400: string;
  green400: string;
  green500: string;
  red400: string;
  red500: string;
  pink400: string;
}

export const CHART_PALETTES: Record<ThemeTone, ChartPalette> = {
  dark: {
    grid: '#424242',
    gridSubtle: '#333333',
    axis: '#808080',
    label: '#a3a3a3',
    text: '#e0e0e0',
    textMuted: '#c7c7c7',
    textOnMark: '#ffffff',
    track: '#5c5c5c',
    inactive: '#48556a',
    tooltipBg: '#292929',
    tooltipBorder: '#424242',
    blue500: '#3b82f6',
    blue400: '#60a5fa',
    violet500: '#8b5cf6',
    violet400: '#a78bfa',
    violet300: '#c4b5fd',
    purple400: '#c084fc',
    amber500: '#f59e0b',
    amber400: '#fbbf24',
    yellow400: '#facc15',
    yellow500: '#eab308',
    orange400: '#fb923c',
    cyan500: '#06b6d4',
    cyan400: '#22d3ee',
    emerald400: '#34d399',
    green400: '#4ade80',
    green500: '#22c55e',
    red400: '#f87171',
    red500: '#ef4444',
    pink400: '#f472b6',
  },
  light: {
    grid: '#d6d6d3',
    gridSubtle: '#ebebe8',
    axis: '#575755',
    label: '#3d3d3b',
    text: '#1c1c1b',
    textMuted: '#3d3d3b',
    textOnMark: '#111110',
    track: '#c4c4c0',
    inactive: '#6b7385',
    tooltipBg: '#ffffff',
    tooltipBorder: '#d6d6d3',
    blue500: '#1d4ed8',
    blue400: '#2563eb',
    violet500: '#6d28d9',
    violet400: '#7c3aed',
    violet300: '#7c3aed',
    purple400: '#9333ea',
    amber500: '#b45309',
    amber400: '#a16207',
    yellow400: '#a16207',
    yellow500: '#854d0e',
    orange400: '#c2410c',
    cyan500: '#0e7490',
    cyan400: '#0891b2',
    emerald400: '#047857',
    green400: '#15803d',
    green500: '#15803d',
    red400: '#dc2626',
    red500: '#b91c1c',
    pink400: '#db2777',
  },
};

function currentTone(): ThemeTone {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.tone === 'light' ? 'light' : 'dark';
}

function subscribeTone(onChange: () => void): () => void {
  if (typeof MutationObserver === 'undefined') return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tone'] });
  return () => {
    observer.disconnect();
  };
}

/** Palette for the active theme tone, outside React (one-off reads, canvas setup). */
export function chartPalette(): ChartPalette {
  return CHART_PALETTES[currentTone()];
}

/** Palette for the active theme tone; re-renders when the user switches between dark and Daylight. */
export function useChartPalette(): ChartPalette {
  const tone = useSyncExternalStore(subscribeTone, currentTone, () => 'dark' as const);
  return CHART_PALETTES[tone];
}
