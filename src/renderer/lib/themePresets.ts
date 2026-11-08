import type { ThemeColorKey } from './themeColors';

export const THEME_SURFACE_STORAGE_KEY = 'mesh-client:themeSurface';

export const INK_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type InkStep = (typeof INK_STEPS)[number];
export type InkScale = Record<InkStep, string>;

export type ThemeSurfaceId =
  | 'charcoal'
  | 'midnight'
  | 'slate'
  | 'zinc'
  | 'graphite'
  | 'deepSea'
  | 'dusk'
  | 'evergreen'
  | 'highContrast'
  | 'daylight';

/** Whether a surface is a dark or a light family; sets `data-tone` on <html>. */
export type ThemeTone = 'dark' | 'light';

export type ThemeAccentId = 'signature' | 'meshtastic' | 'meshcore' | 'sky' | 'classic';

/** A neutral family: the values behind every `ink-*` class (`--color-ink-*`). */
export interface ThemeSurface {
  id: ThemeSurfaceId;
  labelKey: string;
  scale: InkScale;
  /**
   * `light` flips the meaning of the ink scale (950 is the lightest background, 50 the darkest
   * text) and makes styles.css flip the status and categorical scales too
   * (`html[data-tone='light']`). Omitted means dark.
   */
  tone?: ThemeTone;
}

export interface ThemeAccent {
  id: ThemeAccentId;
  labelKey: string;
  /** Accent text, icons and outlines on the dark surfaces (a protocol scale's 500 step). */
  base: string;
  /** Fills under white text (the 700 step). */
  fill: string;
  /**
   * Accent text, icons and primary fills on light surfaces (Daylight): 4.5:1 against the light
   * window, panel and control-fill steps, and under white text.
   */
  light: string;
}

function scale(values: readonly string[]): InkScale {
  return Object.fromEntries(INK_STEPS.map((step, i) => [step, values[i]])) as InkScale;
}

/**
 * Surface families for App > Appearance > Colors. Every family but Daylight is dark. Charcoal (the Mesh Hub palette) is the default and must match the `--color-ink-*` values
 * in styles.css. The other families pass the same text and border contrast pairs
 * (`themePresets.test.ts`).
 */
export const THEME_SURFACES: readonly ThemeSurface[] = [
  {
    id: 'charcoal',
    labelKey: 'appPanel.themeSurfaces.charcoal',
    scale: scale([
      '#ffffff',
      '#f2f2f2',
      '#e0e0e0',
      '#c7c7c7',
      '#a3a3a3',
      '#808080',
      '#5c5c5c',
      '#424242',
      '#333333',
      '#292929',
      '#1b1b1b',
    ]),
  },
  {
    id: 'midnight',
    labelKey: 'appPanel.themeSurfaces.midnight',
    scale: scale([
      '#f9fafc',
      '#f2f5f9',
      '#e3e8f0',
      '#cdd4e2',
      '#93a0b7',
      '#65738c',
      '#48556a',
      '#364156',
      '#212d40',
      '#19212d',
      '#11151c',
    ]),
  },
  {
    id: 'slate',
    labelKey: 'appPanel.themeSurfaces.slate',
    scale: scale([
      '#f8fafc',
      '#f1f5f9',
      '#e2e8f0',
      '#cbd5e1',
      '#94a3b8',
      '#64748b',
      '#475569',
      '#334155',
      '#1e293b',
      '#0f172a',
      '#020617',
    ]),
  },
  {
    id: 'zinc',
    labelKey: 'appPanel.themeSurfaces.zinc',
    scale: scale([
      '#fafafa',
      '#f4f4f5',
      '#e4e4e7',
      '#d4d4d8',
      '#a1a1aa',
      '#71717a',
      '#52525b',
      '#3f3f46',
      '#27272a',
      '#18181b',
      '#09090b',
    ]),
  },
  {
    id: 'graphite',
    labelKey: 'appPanel.themeSurfaces.graphite',
    scale: scale([
      '#fafafa',
      '#f5f5f5',
      '#e5e5e5',
      '#d4d4d4',
      '#a3a3a3',
      '#737373',
      '#525252',
      '#404040',
      '#262626',
      '#171717',
      '#0a0a0a',
    ]),
  },
  {
    id: 'deepSea',
    labelKey: 'appPanel.themeSurfaces.deepSea',
    scale: scale([
      '#f8fafb',
      '#f1f5f7',
      '#e1e9ed',
      '#c9d6dc',
      '#8da4ad',
      '#5d7782',
      '#425861',
      '#2f454d',
      '#1b3038',
      '#162328',
      '#0f1619',
    ]),
  },
  {
    id: 'dusk',
    labelKey: 'appPanel.themeSurfaces.dusk',
    scale: scale([
      '#fafafb',
      '#f5f4f8',
      '#e8e6ee',
      '#d4d2de',
      '#a09cb0',
      '#746f85',
      '#555164',
      '#423e50',
      '#2e2a3b',
      '#211f2a',
      '#15141a',
    ]),
  },
  {
    id: 'evergreen',
    labelKey: 'appPanel.themeSurfaces.evergreen',
    scale: scale([
      '#f9fafa',
      '#f3f6f4',
      '#e3e9e6',
      '#cdd7d2',
      '#93a49c',
      '#65786f',
      '#495951',
      '#36453e',
      '#22302a',
      '#1a231f',
      '#111614',
    ]),
  },
  {
    // Midnight with body text near white, muted text one step brighter and lighter edges, for low vision. Backgrounds stay put
    // so the extra contrast goes to text and edges. 700 is field borders and control fills: 3:1
    // against panels and field backgrounds (WCAG 1.4.11) and 4.5:1 under ink-300 and ink-200 text.
    id: 'highContrast',
    labelKey: 'appPanel.themeSurfaces.highContrast',
    scale: scale([
      '#f9fafc',
      '#f9fafc',
      '#f9fafc',
      '#f2f5f9',
      '#cdd4e2',
      '#93a0b7',
      '#78859d',
      '#636f86',
      '#364156',
      '#19212d',
      '#11151c',
    ]),
  },
  {
    // Daylight: a light family for sunlight and bright rooms. Same step roles as the dark families
    // (950 window, 900 panels, 800 control fills, 700 borders, 400 muted text, 50-200 body text),
    // with the values running light to dark. 400 keeps 4.5:1 on 900 and 950.
    id: 'daylight',
    labelKey: 'appPanel.themeSurfaces.daylight',
    tone: 'light',
    scale: scale([
      '#111110',
      '#1c1c1b',
      '#2b2b2a',
      '#3d3d3b',
      '#575755',
      '#7a7a77',
      '#a3a3a0',
      '#d6d6d3',
      '#ebebe8',
      '#ffffff',
      '#f5f5f3',
    ]),
  },
];

/** Signature orange (default), the protocol scales, plus two extras; any accent pairs with any surface. */
export const THEME_ACCENTS: readonly ThemeAccent[] = [
  {
    id: 'signature',
    labelKey: 'appPanel.themeAccents.signature',
    base: '#ffa31a',
    fill: '#b35f00',
    light: '#8f4a00',
  },
  {
    id: 'meshtastic',
    labelKey: 'appPanel.themeAccents.meshtastic',
    base: '#67e8b4',
    fill: '#047857',
    light: '#046c4e',
  },
  {
    id: 'meshcore',
    labelKey: 'appPanel.themeAccents.meshcore',
    base: '#00d3f2',
    fill: '#0e7490',
    light: '#0a6178',
  },
  {
    id: 'sky',
    labelKey: 'appPanel.themeAccents.sky',
    base: '#38bdf8',
    fill: '#0369a1',
    light: '#035d8f',
  },
  // The pre-v6 green.
  {
    id: 'classic',
    labelKey: 'appPanel.themeAccents.classic',
    base: '#86efac',
    fill: '#15803d',
    light: '#146c34',
  },
];

export const DEFAULT_THEME_SURFACE_ID: ThemeSurfaceId = 'charcoal';
export const DEFAULT_THEME_ACCENT_ID: ThemeAccentId = 'signature';

/** Which ink step each surface theme token takes. */
const SURFACE_TOKEN_STEPS = {
  appBg: 950,
  deepBlack: 900,
  sidebarActiveBg: 800,
  secondaryDark: 700,
  muted: 400,
  chatIncomingBg: 800,
  chatIncomingBorder: 700,
  messageActionsBarBg: 900,
  messageActionButtonHover: 400,
} as const satisfies Partial<Record<ThemeColorKey, InkStep>>;

type SurfaceTokenKey = keyof typeof SURFACE_TOKEN_STEPS;
type AccentTokenKey = Exclude<ThemeColorKey, SurfaceTokenKey>;

export function themeSurface(id: ThemeSurfaceId): ThemeSurface {
  return THEME_SURFACES.find((s) => s.id === id) ?? THEME_SURFACES[0];
}

export function surfaceThemeColors(surface: ThemeSurface): Record<SurfaceTokenKey, string> {
  const out = {} as Record<SurfaceTokenKey, string>;
  for (const key of Object.keys(SURFACE_TOKEN_STEPS) as SurfaceTokenKey[]) {
    out[key] = surface.scale[SURFACE_TOKEN_STEPS[key]];
  }
  return out;
}

/** The surface's tone (dark unless the family says otherwise). */
export function themeSurfaceTone(surface: ThemeSurface): ThemeTone {
  return surface.tone ?? 'dark';
}

/**
 * Accent tokens for one tone. On a light surface the bright base step fails contrast, so accent
 * text and primary fills take the accent's `light` step instead.
 */
export function accentThemeColors(
  accent: ThemeAccent,
  tone: ThemeTone = 'dark',
): Record<AccentTokenKey, string> {
  const base = tone === 'light' ? accent.light : accent.base;
  return {
    brandGreen: base,
    brightGreen: base,
    readableGreen: accent.fill,
    chatOutgoingBg: accent.fill,
    chatOutgoingBorder: accent.base,
  };
}

export function themeColorsFor(
  surface: ThemeSurface,
  accent: ThemeAccent,
): Record<ThemeColorKey, string> {
  return {
    ...surfaceThemeColors(surface),
    ...accentThemeColors(accent, themeSurfaceTone(surface)),
  };
}

function sameColors(expected: Record<string, string>, colors: Record<ThemeColorKey, string>) {
  return Object.entries(expected).every(
    ([key, hex]) => colors[key as ThemeColorKey].toLowerCase() === hex.toLowerCase(),
  );
}

/** The chosen surface, or null when single surface colors were changed by hand afterwards. */
export function matchThemeSurface(
  colors: Record<ThemeColorKey, string>,
  surfaceId: ThemeSurfaceId,
): ThemeSurfaceId | null {
  return sameColors(surfaceThemeColors(themeSurface(surfaceId)), colors) ? surfaceId : null;
}

/** The accent whose colors match exactly, or null for a custom accent. */
export function matchThemeAccent(colors: Record<ThemeColorKey, string>): ThemeAccentId | null {
  return (
    THEME_ACCENTS.find(
      (a) =>
        sameColors(accentThemeColors(a, 'dark'), colors) ||
        sameColors(accentThemeColors(a, 'light'), colors),
    )?.id ?? null
  );
}

/** A stored surface id, or the default when it is missing or unknown. */
export function toThemeSurfaceId(value: unknown): ThemeSurfaceId {
  return THEME_SURFACES.find((s) => s.id === value)?.id ?? DEFAULT_THEME_SURFACE_ID;
}

export function loadThemeSurfaceId(): ThemeSurfaceId {
  return toThemeSurfaceId(localStorage.getItem(THEME_SURFACE_STORAGE_KEY));
}

export function persistThemeSurfaceId(id: ThemeSurfaceId): void {
  if (id === DEFAULT_THEME_SURFACE_ID) {
    localStorage.removeItem(THEME_SURFACE_STORAGE_KEY);
  } else {
    localStorage.setItem(THEME_SURFACE_STORAGE_KEY, id);
  }
}

/** Point every `ink-*` class at this surface's scale. */
export function applyThemeSurface(id: ThemeSurfaceId): void {
  const surface = themeSurface(id);
  const root = document.documentElement;
  for (const step of INK_STEPS) {
    root.style.setProperty(`--color-ink-${step}`, surface.scale[step]);
  }
  root.dataset.tone = themeSurfaceTone(surface);
  root.style.colorScheme = themeSurfaceTone(surface);
}
