/**
 * Theme bootstrap row for the browser's pre-plugin interval. Each index
 * render embeds the current durable built-in preference and content font size.
 * Head CSS colors the document canvas before script execution; the body script
 * installs the palette selector, the theme's alias tokens, and the font size
 * that the client presenters adopt.
 */

import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import {
  builtinTheme, DEFAULT_FONT_SIZE, DEFAULT_PREFERENCE, THEME_PREFERENCE_ATTRIBUTE,
  type BuiltinTheme, type ThemePreference,
} from './theme-settings.ts'

/** Root attribute publishing the resolved scheme (`light`, `dark`, or `system`) for native chrome mirroring. */
const THEME_SOURCE_ATTRIBUTE = 'data-ds-theme-source'

function canvasStyle(theme: BuiltinTheme): string {
  return `:root{color-scheme:${theme.colorScheme}}body{background-color:${theme.canvas};--dsh-boot-bg:${theme.canvas}}`
}

/** CSS that colors the document canvas before any script executes. */
function bootThemeStyle(preference: ThemePreference): string {
  if (preference !== 'system') return canvasStyle(builtinTheme(preference))
  return `${canvasStyle(builtinTheme('light'))}@media(prefers-color-scheme:dark){${canvasStyle(builtinTheme('dark'))}}`
}

/**
 * Build the body script that installs the palette selector, the theme's
 * alias tokens, and the content size. The theme source attribute publishes
 * the resolved scheme (never a tinted id) because the Electron preload
 * forwards it to `nativeTheme.themeSource`.
 */
function bootThemeBodyScript(preference: ThemePreference, fontSize: number): string {
  const theme = preference === 'system' ? null : builtinTheme(preference)
  return `(() => {
  const preference = ${JSON.stringify(preference)}
  const theme = ${JSON.stringify(theme === null ? null : { colorScheme: theme.colorScheme, tokens: theme.tokens })}
  const systemDark = preference === 'system'
    && typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === null ? systemDark : theme.colorScheme === 'dark'
  const root = document.documentElement
  root.setAttribute(${JSON.stringify(THEME_PREFERENCE_ATTRIBUTE)}, preference)
  root.setAttribute(${JSON.stringify(THEME_SOURCE_ATTRIBUTE)}, preference === 'system' ? 'system' : (dark ? 'dark' : 'light'))
  document.body.toggleAttribute('data-ds-dark-theme', dark)
  document.body.style.setProperty('--dsh-content-font-size', ${JSON.stringify(`${fontSize}px`)})
  if (theme !== null) {
    for (const [name, value] of Object.entries(theme.tokens)) document.body.style.setProperty(name, value)
  }
})()`
}

/**
 * Theme bootstrap rows: head CSS colors the document canvas before
 * first paint, then the body script installs the palette selector, the
 * theme's alias tokens, and the font size before the shell mount and module
 * script.
 * @param preference - Current Host-backed built-in preference.
 * @param fontSize - Current Host-backed content font size in px.
 * @returns head and body script rows in execution order.
 */
export function bootThemeInjections(
  preference: ThemePreference = DEFAULT_PREFERENCE,
  fontSize: number = DEFAULT_FONT_SIZE,
): IndexInjection[] {
  return [
    { kind: 'style', text: bootThemeStyle(preference) },
    { kind: 'script', placement: 'body', text: bootThemeBodyScript(preference, fontSize) },
  ]
}
