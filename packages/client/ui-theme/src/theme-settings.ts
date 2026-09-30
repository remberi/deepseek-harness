/**
 * Theme preferences stored in the Host user-settings document, and the
 * built-in theme catalog both halves read: the Host boot script paints the
 * canvas and tokens of the durable preference before any plugin runs, and the
 * browser registry seeds its themes from the same rows.
 */

import z from '@deepseek-ai/schemastery'

/** Built-in preferences accepted at the registry and settings boundaries. */
export const THEME_PREFERENCES = ['light', 'dark', 'system', 'claudeCode', 'codex'] as const

/** Settings namespace owned by the theme plugin. */
export const THEME_SETTINGS_NAMESPACE = 'ui-theme'

/** Field carrying the selected built-in theme preference. */
export const THEME_PREFERENCE_FIELD = 'preference'

/** Field carrying the conversation content font size. */
export const FONT_SIZE_FIELD = 'fontSize'

/**
 * Root attribute the boot script writes with the durable preference id; the
 * browser registry seeds its initial preference from it so the first snapshot
 * matches first paint.
 */
export const THEME_PREFERENCE_ATTRIBUTE = 'data-ds-theme-preference'

/** Theme preference persisted by the product Appearance row. */
export type ThemePreference = typeof THEME_PREFERENCES[number]

/** Built-in theme ids: every preference except `system`, which resolves to one of them. */
export type BuiltinThemeId = Exclude<ThemePreference, 'system'>

/** Default preference when the user-settings document has no override. */
export const DEFAULT_PREFERENCE: ThemePreference = 'system'

/** Smallest accepted content font size (px). */
export const FONT_SIZE_MIN = 10

/** Largest accepted content font size (px). */
export const FONT_SIZE_MAX = 22

/** Content font size when the user-settings document has no override (px). */
export const DEFAULT_FONT_SIZE = 14

/** Durable theme section shared by the Host schema and the browser scope. */
export interface ThemeSettings {
  /** Selected built-in preference. */
  preference: ThemePreference
  /** Conversation content font size in px (integer within {@link FONT_SIZE_MIN}..{@link FONT_SIZE_MAX}). */
  fontSize: number
}

/** Durable theme schema; also the wire envelope the browser scope validates against. */
export const ThemeSettingsSchema: z<ThemeSettings> = z.object({
  [THEME_PREFERENCE_FIELD]: z.union([...THEME_PREFERENCES]).default(DEFAULT_PREFERENCE),
  [FONT_SIZE_FIELD]: z.number().step(1).min(FONT_SIZE_MIN).max(FONT_SIZE_MAX).default(DEFAULT_FONT_SIZE),
})

/**
 * Narrow one wire or registry value to a persistable preference.
 * @param value - value crossing the settings or registry boundary.
 * @returns whether the value is a built-in preference.
 */
export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.some(preference => preference === value)
}

/** One built-in theme as both halves see it. */
export interface BuiltinTheme {
  /** Persisted preference id. */
  id: BuiltinThemeId
  /** Base palette the theme builds on; selects `body[data-ds-dark-theme]`. */
  colorScheme: 'light' | 'dark'
  /** Document canvas color painted by the boot stylesheet before the token sheets load. */
  canvas: string
  /** Brand accent (`--dsw-alias-brand-primary`); the Appearance swatch pairs it with the canvas. */
  accent: string
  /** Alias-token overrides applied as inline CSS variables over the base palette. */
  tokens: Readonly<Record<string, string>>
}

/**
 * Role colors one tinted built-in theme supplies; {@link paletteTokens}
 * expands them to the alias tokens every tinted theme overrides, so the
 * tinted themes stay symmetric and no theme can miss a token another one sets.
 */
interface ThemePalette {
  /** Document canvas and base background (`--dsw-alias-bg-base`). */
  canvas: string
  /** Primary raised surface (layer 1) and text inputs. */
  surface: string
  /** Nested surface (layer 2). */
  surfaceRaised: string
  /** Topmost surface (layer 3: menus, elevated buttons). */
  surfaceTop: string
  /** Overlay and popover background. */
  overlay: string
  /** Module platform, selector, tip, tag, and solid hover fill. */
  platform: string
  /** `r, g, b` triple mixed into the translucent borders and hover washes. */
  ink: string
  /** Brand accent: primary buttons, links, business state. */
  accent: string
  /** Primary-button hover fill. */
  accentHover: string
  /** Tertiary business fill and the active sidebar accent. */
  accentSoft: string
  /** Primary text. */
  textPrimary: string
  /** Secondary text. */
  textSecondary: string
  /** Tertiary text. */
  textTertiary: string
  /** Caption and placeholder text. */
  textCaption: string
  /** Markdown code block and its banner. */
  codeBlock: string
  /** Markdown inline code. */
  inlineCode: string
  /** User bubble. */
  bubble: string
  /** Highlighted user bubble. */
  bubbleHighlight: string
  /** Sidebar column and title row. */
  sidebar: string
  /** Active sidebar navigation item. */
  sidebarActive: string
  /** Hovered sidebar navigation item. */
  sidebarHover: string
}

function paletteTokens(palette: ThemePalette): Readonly<Record<string, string>> {
  const wash = (alpha: number): string => `rgba(${palette.ink}, ${alpha})`
  return Object.freeze({
    '--dsw-alias-bg-base': palette.canvas,
    '--dsw-alias-bg-layer-1': palette.surface,
    '--dsw-alias-bg-layer-2': palette.surfaceRaised,
    '--dsw-alias-bg-layer-3': palette.surfaceTop,
    '--dsw-alias-bg-overlay': palette.overlay,
    '--dsw-alias-bg-module-platform': palette.platform,
    '--dsw-alias-bg-multi-select': palette.platform,
    '--dsw-alias-border-l1': wash(0.06),
    '--dsw-alias-border-l2': wash(0.12),
    '--dsw-alias-border-l2-darkmode-thin': wash(0.08),
    '--dsw-alias-border-l3': wash(0.16),
    '--dsw-alias-border-l4': wash(0.2),
    '--dsw-alias-brand-primary': palette.accent,
    '--dsw-alias-brand-primary-invert': palette.accent,
    '--dsw-alias-brand-text': palette.accent,
    '--dsw-alias-button-primary-hover': palette.accentHover,
    '--dsw-alias-button-elevated-fill': palette.surfaceTop,
    '--dsw-alias-button-floating-fill': palette.surface,
    '--dsw-alias-button-floating-hover': palette.platform,
    '--dsw-alias-interactive-bg-hover': wash(0.08),
    '--dsw-alias-interactive-bg-hover-accent': wash(0.2),
    '--dsw-alias-interactive-bg-hover-solid': palette.platform,
    '--dsw-alias-interactive-bg-active': wash(0.14),
    '--dsw-alias-label-primary': palette.textPrimary,
    '--dsw-alias-label-secondary': palette.textSecondary,
    '--dsw-alias-label-tertiary': palette.textTertiary,
    '--dsw-alias-label-caption': palette.textCaption,
    '--dsw-alias-link': palette.accent,
    '--dsw-alias-markdown-code-block': palette.codeBlock,
    '--dsw-alias-markdown-code-block-banner': palette.codeBlock,
    '--dsw-alias-markdown-inline-code': palette.inlineCode,
    '--dsw-alias-markdown-placeholder': palette.platform,
    '--dsw-alias-markdown-tag': palette.platform,
    '--dsw-alias-state-business-primary': palette.accent,
    '--dsw-alias-state-business-tertiary': palette.accentSoft,
    '--dsw-specific-bubble': palette.bubble,
    '--dsw-specific-bubble-highlight': palette.bubbleHighlight,
    '--dsw-specific-input-major': palette.surface,
    '--dsw-specific-login-input': palette.platform,
    '--dsw-specific-selector': palette.platform,
    '--dsw-specific-sidebar-fill': palette.sidebar,
    '--dsw-specific-sidebar-nav-item-active': palette.sidebarActive,
    '--dsw-specific-sidebar-nav-item-active-accent': palette.accentSoft,
    '--dsw-specific-sidebar-nav-item-hover': palette.sidebarHover,
    '--dsw-specific-tip': palette.platform,
  })
}

function tintedTheme(id: BuiltinThemeId, colorScheme: BuiltinTheme['colorScheme'], palette: ThemePalette): BuiltinTheme {
  return Object.freeze({ id, colorScheme, canvas: palette.canvas, accent: palette.accent, tokens: paletteTokens(palette) })
}

/**
 * The light and dark base themes: the token stylesheets carry both palettes,
 * so they override nothing. Their canvas and accent colors match the
 * stylesheets' `--dsw-alias-bg-base` and `--dsw-alias-brand-primary`.
 */
export const BUILTIN_BASE_THEMES: readonly BuiltinTheme[] = Object.freeze([
  Object.freeze({ id: 'light' as const, colorScheme: 'light' as const, canvas: '#fff', accent: '#0f1115', tokens: Object.freeze({}) }),
  Object.freeze({ id: 'dark' as const, colorScheme: 'dark' as const, canvas: '#151517', accent: '#f9fafb', tokens: Object.freeze({}) }),
])

/**
 * Tinted built-in themes: each overrides the same alias-token set over its
 * base palette. The Appearance row renders these with their product marks.
 */
export const BUILTIN_STYLE_THEMES: readonly BuiltinTheme[] = Object.freeze([
  tintedTheme('claudeCode', 'light', {
    canvas: 'rgb(250, 248, 245)',
    surface: 'rgb(255, 255, 253)',
    surfaceRaised: 'rgb(246, 241, 235)',
    surfaceTop: 'rgb(255, 255, 255)',
    overlay: 'rgb(255, 255, 255)',
    platform: 'rgb(243, 237, 230)',
    ink: '65, 48, 39',
    accent: 'rgb(171, 74, 43)',
    accentHover: 'rgb(145, 57, 31)',
    accentSoft: 'rgb(251, 230, 218)',
    textPrimary: 'rgb(41, 37, 32)',
    textSecondary: 'rgb(99, 88, 78)',
    textTertiary: 'rgb(112, 100, 89)',
    textCaption: 'rgb(112, 100, 89)',
    codeBlock: 'rgb(243, 239, 234)',
    inlineCode: 'rgb(246, 235, 227)',
    bubble: 'rgb(250, 233, 222)',
    bubbleHighlight: 'rgb(246, 219, 203)',
    sidebar: 'rgb(246, 242, 237)',
    sidebarActive: 'rgb(247, 224, 209)',
    sidebarHover: 'rgb(239, 231, 221)',
  }),
  tintedTheme('codex', 'light', {
    canvas: 'rgb(247, 249, 252)',
    surface: 'rgb(255, 255, 255)',
    surfaceRaised: 'rgb(240, 244, 250)',
    surfaceTop: 'rgb(255, 255, 255)',
    overlay: 'rgb(255, 255, 255)',
    platform: 'rgb(236, 242, 250)',
    ink: '31, 50, 84',
    accent: 'rgb(43, 84, 176)',
    accentHover: 'rgb(31, 69, 155)',
    accentSoft: 'rgb(224, 233, 252)',
    textPrimary: 'rgb(28, 39, 59)',
    textSecondary: 'rgb(79, 95, 120)',
    textTertiary: 'rgb(104, 118, 140)',
    textCaption: 'rgb(104, 118, 140)',
    codeBlock: 'rgb(237, 242, 249)',
    inlineCode: 'rgb(230, 238, 249)',
    bubble: 'rgb(231, 240, 254)',
    bubbleHighlight: 'rgb(214, 230, 253)',
    sidebar: 'rgb(240, 245, 252)',
    sidebarActive: 'rgb(222, 233, 250)',
    sidebarHover: 'rgb(232, 240, 251)',
  }),
])

/** Every built-in theme in Appearance-row order: the base pair, then the tinted themes. */
export const BUILTIN_THEMES: readonly BuiltinTheme[] = Object.freeze([...BUILTIN_BASE_THEMES, ...BUILTIN_STYLE_THEMES])

/**
 * Look up one built-in theme by preference id.
 * @param id - a built-in theme id (never `system`).
 * @returns the catalog row; the catalog covers every {@link BuiltinThemeId}.
 */
export function builtinTheme(id: BuiltinThemeId): BuiltinTheme {
  const theme = BUILTIN_THEMES.find(row => row.id === id)
  /* v8 ignore next -- the catalog covers every BuiltinThemeId; the static type excludes other inputs */
  if (theme === undefined) throw new Error(`built-in theme "${id}" is missing from the catalog`)
  return theme
}
