// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CHART_PALETTES, type ChartPalette, chartPalette, useChartPalette } from './chartPalette';
import { THEME_SURFACES } from './themePresets';
import { contrastRatio } from './wcagContrast';

const daylight = THEME_SURFACES.find((s) => s.id === 'daylight');
if (!daylight) throw new Error('Daylight surface missing');
// Charts sit on panels (900) and the window (950).
const LIGHT_BACKGROUNDS = [daylight.scale[900], daylight.scale[950]];

/** Decorative fills that carry no information on their own (grid, empty track, tooltip chrome). */
const DECORATIVE: (keyof ChartPalette)[] = [
  'grid',
  'gridSubtle',
  'track',
  'tooltipBg',
  'tooltipBorder',
];
const TEXT: (keyof ChartPalette)[] = ['label', 'text', 'textMuted', 'textOnMark'];

describe('chart palette', () => {
  afterEach(() => {
    delete document.documentElement.dataset.tone;
  });

  it('defines the same keys for both tones', () => {
    expect(Object.keys(CHART_PALETTES.light).sort()).toEqual(
      Object.keys(CHART_PALETTES.dark).sort(),
    );
  });

  it.each(Object.keys(CHART_PALETTES.light) as (keyof ChartPalette)[])(
    'light %s keeps its contrast on Daylight surfaces',
    (key) => {
      if (DECORATIVE.includes(key)) return;
      const min = TEXT.includes(key) ? 4.5 : 3;
      for (const bg of LIGHT_BACKGROUNDS) {
        expect(contrastRatio(CHART_PALETTES.light[key], bg)).toBeGreaterThanOrEqual(min);
      }
    },
  );

  it('follows html[data-tone] and re-renders when it changes', async () => {
    const { result } = renderHook(() => useChartPalette());
    expect(result.current).toBe(CHART_PALETTES.dark);
    await act(async () => {
      document.documentElement.dataset.tone = 'light';
      await Promise.resolve();
    });
    expect(result.current).toBe(CHART_PALETTES.light);
    expect(chartPalette()).toBe(CHART_PALETTES.light);
  });
});
